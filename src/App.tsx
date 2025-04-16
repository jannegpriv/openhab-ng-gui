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
    fetch("http://localhost:3001/rest/items", {
      headers: {
        "Authorization": "Basic " + btoa(email + ":" + password),
        "X-OPENHAB-TOKEN": ohToken,
        "Accept": "application/json",
      },
    })
      .then((r) => r.json())
      .then((allItems) => {
        // Generic item filtering for all bindings:
        // 1. If item has a 'binding' property matching binding id
        // 2. Fallback: if item.name or item.label includes binding id
        const id = selectedBinding.id.toLowerCase();
        const filteredItems = allItems.filter((item: any) => {
          if (item.binding && typeof item.binding === "string" && item.binding.toLowerCase() === id) return true;
          if (item.name && item.name.toLowerCase().includes(id)) return true;
          if (item.label && item.label.toLowerCase().includes(id)) return true;
          return false;
        });
        setItems(filteredItems);
      })
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
                    {items.filter(item => !typeFilter || item.type === typeFilter).map((item, idx) => (
                      <tr
                        key={item.name}
                        className="hover:bg-[#333] cursor-pointer"
                        onClick={() => setSelectedItem(item)}
                      >
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-100">{item.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-100">{item.label}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-100">{item.state}</td>
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

export default App;
