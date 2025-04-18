import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import ItemDetailWithChart from './ItemDetailWithChart';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import LynkcoPage from './LynkcoPage';

interface Binding {
  id: string;
  name: string;
  description: string;
}

function App() {
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [stringFilter, setStringFilter] = useState<string>("");
  const [email, setEmail] = useState(() => localStorage.getItem("oh_email") || "");
  const [password, setPassword] = useState(() => localStorage.getItem("oh_password") || "");
  const [ohToken, setOhToken] = useState(() => localStorage.getItem("oh_token") || "");
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addonType, setAddonType] = useState<string>("binding");
  const [allAddons, setAllAddons] = useState<any[]>([]);
  const [addonTypes, setAddonTypes] = useState<string[]>([]);

  useEffect(() => {
    if (!email || !password || !ohToken) return;
    setLoading(true);
    setError(null);

    const fetchAddons = async (serviceId: string) => {
      const res = await fetch(`http://localhost:3001/rest/addons?serviceId=${serviceId}`, {
        headers: {
          "Authorization": "Basic " + btoa(email + ":" + password),
          "X-OPENHAB-TOKEN": ohToken,
          "Accept": "application/json",
        },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return data.map((addon: any) => ({ ...addon, source: serviceId }));
    };

    Promise.all([
      fetchAddons("karaf"),
      fetchAddons("marketplace"),
      fetchAddons("jar"),
    ])
      .then((results) => {
        // Flatten, dedupe by id+source, and filter installed
        // Merge by id+type, set installed=true if any source has it
        const mergedMap = new Map<string, any>();
        ([] as any[]).concat(...results).forEach((addon) => {
          const key = addon.id + ":" + (addon.type || "unknown");
          if (!mergedMap.has(key)) {
            mergedMap.set(key, { ...addon });
          } else {
            const existing = mergedMap.get(key);
            // If any source is installed, set installed true
            if (addon.installed) existing.installed = true;
            // Optionally, merge other fields as needed
            mergedMap.set(key, { ...existing, ...addon });
          }
        });
        let merged = Array.from(mergedMap.values()).map(a => ({ ...a, type: a.type || "unknown" }));
        // Assign fallback type if missing
        merged = merged.map(a => ({ ...a, type: a.type || "unknown" }));
        setAllAddons(merged);
        // Debug: log full merged data
        console.log("Merged addons:", merged);
        // Set types for the filter dropdown
        const types = Array.from(new Set(merged.map(a => a.type))).filter(Boolean).sort();
        setAddonTypes(types);
        // Debug: log available types and their counts
        const typeCounts = types.map(type => ({ type, count: merged.filter(a => a.type === type).length }));
        console.log("Available addon types:", typeCounts);
        setAddonType(types.includes("binding") ? "binding" : (types[0] || "unknown"));
      })
      .catch((err) => {
        if (err.message.includes("Failed to fetch")) {
          setError(
            "CORS error: myopenHAB.org does not allow direct browser access. You can try a browser extension to disable CORS for testing, or run a local proxy."
          );
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, [email, password, ohToken]);

  // Only show addons matching selected type
  // Only show installed addons of the selected type
  const visibleAddons = allAddons.filter(
    (a) => a.type === addonType && a.installed
  );
  const selectedBinding = visibleAddons.find((b) => b.id === selected);

  // Fetch items when a binding is selected
  useEffect(() => {
    if (!selectedBinding) {
      setItems([]);
      return;
    }
    setTypeFilter(""); // Reset type filter when switching binding
    setSelectedItem(null); // Clear selected item when switching binding
    setItemsLoading(true);

    // Helper: Get all items linked to things of this binding
    async function fetchBindingItems() {
      // 1. Fetch all things
      const thingsRes = await fetch("http://localhost:3001/rest/things", {
        headers: {
          "Authorization": "Basic " + btoa(email + ":" + password),
          "X-OPENHAB-TOKEN": ohToken,
          "Accept": "application/json",
        },
      });
      const allThings = await thingsRes.json();
      // 2. Find things for this binding
      const bindingId = selectedBinding.id.toLowerCase();
      const bindingThings = allThings.filter((thing: any) =>
        thing.thingTypeUID && thing.thingTypeUID.toLowerCase().startsWith(bindingId + ":")
      );
      // 3. Gather all linked item names from channels
      const linkedItemNames = new Set();
      bindingThings.forEach((thing: any) => {
        if (thing.channels) {
          thing.channels.forEach((channel: any) => {
            if (channel.linkedItems && Array.isArray(channel.linkedItems)) {
              channel.linkedItems.forEach((itemName: string) => linkedItemNames.add(itemName));
            }
          });
        }
      });
      // 4. Fetch all items
      const itemsRes = await fetch("http://localhost:3001/rest/items", {
        headers: {
          "Authorization": "Basic " + btoa(email + ":" + password),
          "X-OPENHAB-TOKEN": ohToken,
          "Accept": "application/json",
        },
      });
      const allItems = await itemsRes.json();
      // 5. Filter items to only those linked to binding's things
      const filteredItems = allItems.filter((item: any) => linkedItemNames.has(item.name));
      return filteredItems;
    }

    fetchBindingItems()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setItemsLoading(false));
  }, [selectedBinding, email, password, ohToken]);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 h-screen bg-[#181818] border-r-2 border-[#e64a19] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Add-ons</h2>
          <button
            className="ml-2 px-4 py-2 bg-[#e64a19] text-white rounded hover:bg-[#ff7043] text-xs shadow transition-colors duration-150"
            onClick={() => {
              localStorage.removeItem("oh_email");
              localStorage.removeItem("oh_password");
              localStorage.removeItem("oh_token");
              setEmail("");
              setPassword("");
              setOhToken("");
              setBindings([]);
              setSelected(null);
            }}
          >
            Log out
          </button>
        </div>
        {(!email || !password || !ohToken) ? (
          <div className="space-y-2">
            <input
              type="email"
              className="w-full px-3 py-2 border rounded"
              placeholder="myopenHAB.org email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                localStorage.setItem("oh_email", e.target.value);
              }}
              autoComplete="username"
            />
            <input
              type="password"
              className="w-full px-3 py-2 border rounded"
              placeholder="myopenHAB.org password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                localStorage.setItem("oh_password", e.target.value);
              }}
              autoComplete="current-password"
            />
            <input
              type="password"
              className="w-full px-3 py-2 border rounded"
              placeholder="openHAB API token (from local instance)"
              value={ohToken}
              onChange={(e) => {
                setOhToken(e.target.value);
                localStorage.setItem("oh_token", e.target.value);
              }}
              autoComplete="off"
            />
            <div className="text-xs text-gray-500">
              <a
                href="https://myopenhab.org/account"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Get myopenHAB credentials
              </a>
              <br />
              <a
                href="https://your-openhab-instance:8080/settings/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Get openHAB API token (local instance)
              </a>
            </div>
          </div>
        ) : (loading && !email) ? (
          <div className="flex justify-center items-center h-full text-blue-600">Loading bindings...</div>
        ) : error ? (
          <div className="text-red-600 text-xs whitespace-pre-line">{error}</div>
        ) : (
          <div className="flex flex-col gap-2 overflow-y-auto">
            {addonTypes.length > 0 && (
              <select
                className="w-full px-3 py-2 border rounded"
                value={addonType}
                onChange={(e) => setAddonType(e.target.value)}
              >
                {addonTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            )}
            {visibleAddons.length === 0 ? (
              <div className="text-gray-500 mt-4">No installed {addonType}s found.</div>
            ) : (
              visibleAddons.map((binding: any) => (
                <button
                  key={binding.id}
                  className={`w-full px-3 py-2 mb-2 rounded-lg text-left font-medium shadow-sm transition-colors duration-150 border ${selected === binding.id ? "bg-[#e64a19] text-white border-[#e64a19]" : "bg-[#232323] text-white hover:bg-[#333] border-[#232323] hover:border-[#e64a19]"}`}
                  onClick={() => setSelected(binding.id)}
                >
                  {binding.label || binding.id}
                </button>
              ))
            )}
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen bg-[#181818] flex items-center justify-center">
        {loading && (
          <div className="text-[#e64a19] text-lg text-center w-full font-semibold">Loading bindings...</div>
        )}
        {(!email || !password || !ohToken) ? (
          <div className="flex flex-1 justify-center items-center">
            <div className="text-gray-500 text-lg">
              <h1 className="text-3xl font-bold mb-4 text-gray-900">openHAB Dashboard</h1>
              <div>Please log in to view add-ons and items.</div>
            </div>
          </div>
        ) : error ? (
          <div className="text-red-600 text-lg mt-16">{error}</div>
        ) : selectedBinding ? (
          itemsLoading ? (
            <div className="flex-1 flex justify-center items-center">
              <div className="text-[#e64a19] text-lg font-semibold">Loading items...</div>
            </div>
          ) : selectedItem ? (
            <div className="flex flex-col w-full h-full">
              <ItemDetailWithChart
                item={selectedItem}
                email={email}
                password={password}
                ohToken={ohToken}
                onBack={() => setSelectedItem(null)}
              />
            </div>
          ) : items.length > 0 ? (
            <div className="flex flex-col w-full h-full items-center justify-start pt-8">
              {/* Table Header with Column Descriptions */}
              <div className="mb-4 w-full max-w-4xl flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="font-bold text-lg text-white mb-2 md:mb-0">Items Table</div>
                {/* Filter Dropdown */}
                <div className="flex items-center space-x-2">
                  <label htmlFor="typeFilter" className="text-gray-300 font-medium">Filter by Type:</label>
                  <select
                    id="typeFilter"
                    className="bg-[#232323] text-white px-3 py-2 rounded border border-[#e64a19] focus:outline-none"
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    {Array.from(new Set(items.map(item => item.type))).sort().map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <label htmlFor="stringFilter" className="text-gray-300 font-medium ml-4">Name/Label:</label>
                  <input
                    id="stringFilter"
                    className="bg-[#232323] text-white px-3 py-2 rounded border border-[#e64a19] focus:outline-none"
                    type="text"
                    placeholder="Filter (wildcard: *)"
                    value={stringFilter}
                    onChange={e => setStringFilter(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-auto w-full max-w-4xl rounded-xl shadow-xl">
                <table className="w-full divide-y divide-gray-700 bg-[#222]">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-orange-400 uppercase tracking-wider">Item name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-orange-400 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-orange-400 uppercase tracking-wider">Value</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-orange-400 uppercase tracking-wider">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {items
  .filter(item => !typeFilter || item.type === typeFilter)
  .filter(item => {
    if (!stringFilter) return true;
    let filter = stringFilter;
    // If no wildcard, match as substring: wrap with *
    if (!filter.includes('*')) filter = `*${filter}*`;
    // Convert wildcard string to regexp: * -> .*
    const pattern = '^' + filter.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$';
    const regex = new RegExp(pattern, 'i');
    return regex.test(item.name);
  })
  .map((item, idx) => (
                      <tr
                        key={item.name}
                        className="hover:bg-[#333] cursor-pointer"
                        onClick={() => setSelectedItem(item)}
                      >
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-100">{item.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-100">{item.label}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-100">{
  item.type === 'Switch' ? (
    <SwitchButton item={item} email={email} password={password} ohToken={ohToken} />
  ) : item.type === 'Dimmer' ? (
    <DimmerSlider item={item} email={email} password={password} ohToken={ohToken} />
  ) : (
    item.state
  )
}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-100">{item.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-[#181818] rounded-xl shadow-2xl flex items-center justify-center grow mx-8 my-12 h-[60vh] min-h-[260px]">
              <div className="text-gray-400 text-lg text-center w-full">No items found for this binding.</div>
            </div>
          )
        ) : (
          !loading && (
            <div className="text-gray-400 text-lg text-center w-full">Select an add-on in the sidebar to view its items.</div>
          )
        )}
      </main>
    </div>
  );
}

// SwitchButton: Button for Switch items to send ON command
function SwitchButton({ item, email, password, ohToken }: { item: any, email: string, password: string, ohToken: string }) {
  const [loading, setLoading] = useState<null | 'ON' | 'OFF'>(null);
  const [success, setSuccess] = useState<null | 'ON' | 'OFF'>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCommand(command: 'ON' | 'OFF', e: React.MouseEvent) {
    e.stopPropagation();
    setLoading(command);
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch(`http://localhost:3001/rest/items/${encodeURIComponent(item.name)}`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(email + ':' + password),
          'X-OPENHAB-TOKEN': ohToken,
          'Content-Type': 'text/plain',
        },
        body: command,
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess(command);
      setTimeout(() => setSuccess(null), 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to send command');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-row items-center gap-2">
      <button
        className={`px-3 py-1 rounded bg-[#e64a19] text-white font-semibold shadow hover:bg-[#ff7043] transition-colors text-xs ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
        disabled={!!loading}
        onClick={e => handleCommand('ON', e)}
        title="Send ON command"
      >
        {loading === 'ON' ? 'Sending...' : 'ON'}
      </button>
      <button
        className={`px-3 py-1 rounded bg-gray-500 text-white font-semibold shadow hover:bg-gray-700 transition-colors text-xs ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
        disabled={!!loading}
        onClick={e => handleCommand('OFF', e)}
        title="Send OFF command"
      >
        {loading === 'OFF' ? 'Sending...' : 'OFF'}
      </button>
      {success && <span className="text-green-400 text-xs">✔</span>}
      {error && <span className="text-red-400 text-xs" title={error}>✖</span>}
    </div>
  );
}


// DimmerSlider: Slider for Dimmer items to send value 0-100
function DimmerSlider({ item, email, password, ohToken }: { item: any, email: string, password: string, ohToken: string }) {
  const [value, setValue] = useState<number>(() => {
    const v = parseInt(item.state, 10);
    return isNaN(v) ? 0 : v;
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the latest state after a successful command
  async function refreshState() {
    try {
      const res = await fetch(`http://localhost:3001/rest/items/${encodeURIComponent(item.name)}`, {
        headers: {
          'Authorization': 'Basic ' + btoa(email + ':' + password),
          'X-OPENHAB-TOKEN': ohToken,
          'Accept': 'application/json',
        },
      });
      if (res.ok) {
        const updated = await res.json();
        const v = parseInt(updated.state, 10);
        setValue(isNaN(v) ? 0 : v);
      }
    } catch {}
  }

  async function sendValue(newValue: number | string) {
    setLoading(true);
    setSuccess(false);
    setError(null);
    try {
      const res = await fetch(`http://localhost:3001/rest/items/${encodeURIComponent(item.name)}`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(email + ':' + password),
          'X-OPENHAB-TOKEN': ohToken,
          'Content-Type': 'text/plain',
        },
        body: String(newValue),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1200);
      await refreshState(); // update value after successful command
    } catch (err: any) {
      setError(err.message || 'Failed to send command');
    } finally {
      setLoading(false);
    }
  }

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = parseInt(e.target.value, 10);
    setValue(newValue);
    sendValue(newValue);
  }

  return (
    <div className="flex flex-row items-center gap-2 w-full">
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={loading}
        onChange={handleSliderChange}
        className="w-24 accent-orange-500"
        title="Set dimmer value"
      />
      <span className="text-xs text-gray-200 w-8 text-right">{value}</span>
      <button
        className="px-2 py-1 rounded bg-[#e64a19] text-white text-xs font-semibold hover:bg-[#ff7043]"
        disabled={loading}
        onClick={() => sendValue('ON')}
        title="Send ON to dimmer (test)"
      >ON</button>
      <button
        className="px-2 py-1 rounded bg-gray-600 text-white text-xs font-semibold hover:bg-gray-800"
        disabled={loading}
        onClick={() => sendValue('OFF')}
        title="Send OFF to dimmer (test)"
      >OFF</button>
      {loading && <span className="text-orange-400 text-xs">...</span>}
      {success && <span className="text-green-400 text-xs">✔</span>}
      {error && <span className="text-red-400 text-xs" title={error}>✖</span>}
    </div>
  );
}

export default App;
