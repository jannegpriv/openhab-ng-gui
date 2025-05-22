import { useState, useEffect } from "react";
import { getApiBaseUrl } from './apiBaseUrl';

// Helper to join URLs safely (avoids double slashes)
function joinUrl(base: string, path: string) {
  if (!base.endsWith("/")) base += "/";
  if (path.startsWith("/")) path = path.slice(1);
  return base + path;
}

import ItemDetailWithChart from './ItemDetailWithChart';

// Import CSS
import './App.css'


function App() {
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [stringFilter, setStringFilter] = useState<string>("");
  const [email, setEmail] = useState(() => localStorage.getItem("oh_email") || "");
  const [password, setPassword] = useState(() => localStorage.getItem("oh_password") || "");
  const [ohToken, setOhToken] = useState(() => localStorage.getItem("oh_token") || "");
  
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
      const url = joinUrl(getApiBaseUrl(), `/rest/addons?serviceId=${serviceId}`);
console.log('[fetchAddons] Fetching:', url);
const res = await fetch(url, {
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
      const thingsUrl = joinUrl(getApiBaseUrl(), '/rest/things');
console.log('[fetchThings] Fetching:', thingsUrl);
const thingsRes = await fetch(thingsUrl, {
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
      const itemsUrl = joinUrl(getApiBaseUrl(), '/rest/items');
console.log('[fetchItems] Fetching:', itemsUrl);
const itemsRes = await fetch(itemsUrl, {
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
           {(email && password && ohToken) && (
             <button
               className="ml-2 px-4 py-2 bg-[#e64a19] text-white rounded hover:bg-[#ff7043] text-xs shadow transition-colors duration-150"
               onClick={() => {
                 localStorage.removeItem("oh_email");
                 localStorage.removeItem("oh_password");
                 localStorage.removeItem("oh_token");
                 setEmail("");
                 setPassword("");
                 setOhToken("");
                 setSelected(null);
               }}
             >
               Log out
             </button>
           )}
         </div>
         {(email && password && ohToken) && (
           <div className="text-xs text-gray-400 mb-2 ml-1">Logged in as <span className="font-semibold">{email}</span></div>
         )}
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
            <div className="text-xs" style={{ color: '#e64a19' }}>
              Use your credentials @myopenhab.org. Create an API token on your local instance.
            </div>
          </div>
        ) : (loading) ? (
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
                onItemUpdate={async () => {
                  // Fetch updated item state and update selectedItem
                  const res = await fetch(`${getApiBaseUrl()}/rest/items/${encodeURIComponent(selectedItem.name)}`, {
                    headers: {
                      'Authorization': 'Basic ' + btoa(email + ':' + password),
                      'X-OPENHAB-TOKEN': ohToken,
                      'Accept': 'application/json',
                    },
                  });
                  if (res.ok) {
                    const updated = await res.json();
                    setSelectedItem(updated);
                  }
                }}
              />
            </div>
          ) : items.length > 0 ? (
            
  <div className="w-full h-full flex-grow rounded-xl shadow-xl flex flex-col">
  {/* Sticky Filter + Table Header */}
  <div className="sticky top-0 z-30 bg-[#232323]/95 pt-2 pb-2 w-full flex flex-col md:flex-row md:items-center md:justify-between border-b-2 border-orange-400 shadow-lg backdrop-blur-sm transition-colors h-16 sticky-header">
    <div className="font-bold text-lg text-white mb-2 md:mb-0">Items Table</div>
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
        placeholder="Name/Label (wildcard: *)"
        value={stringFilter}
        onChange={e => setStringFilter(e.target.value)}
      />
    </div>
  </div>
  <div className="overflow-auto w-full h-full flex-grow">
    <table className="w-full table-fixed divide-y divide-gray-700 bg-[#222]">
      <colgroup>
        <col style={{ width: '24%' }} />
        <col style={{ width: '36%' }} />
        <col style={{ width: '20%' }} />
        <col style={{ width: '20%' }} />
      </colgroup>
      <thead>
        <tr>
          <th className="px-4 py-3 text-left text-xs font-bold text-orange-400 uppercase tracking-wider">Item name</th>
          <th className="px-4 py-3 text-left text-xs font-bold text-orange-400 uppercase tracking-wider">Label</th>
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
            if (!filter.includes('*')) filter = `*${filter}*`;
            const pattern = '^' + filter.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$';
            const regex = new RegExp(pattern, 'i');
            return regex.test(item.name) || regex.test(item.label || '');
          })
          .map((item) => (
            <tr
               key={item.name}
               className={`${['String', 'Switch', 'Dimmer', 'Contact', 'DateTime'].includes(item.type) ? '' : 'hover:bg-[#333] cursor-pointer'}`}
               onClick={e => {
                 // Only open detail if the click is NOT on a button or input
                 if (['String', 'Switch', 'Dimmer', 'Contact', 'DateTime'].includes(item.type)) return;
                 if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'INPUT') return;
                 setSelectedItem(item);
               }}
             >
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-100 overflow-hidden text-ellipsis max-w-[16rem]">{item.name}</td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-100 overflow-hidden text-ellipsis max-w-[24rem]">{item.label}</td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-100">{
                item.type === 'Switch' ? (
                  <SwitchButton item={item} email={email} password={password} ohToken={ohToken} onItemUpdate={async () => {
  // Fetch updated item state and update items array
  const url = joinUrl(getApiBaseUrl(), `/rest/items/${encodeURIComponent(item.name)}`);
console.log('[fetchItem] Fetching:', url);
const res = await fetch(url, {
    headers: {
      'Authorization': 'Basic ' + btoa(email + ':' + password),
      'X-OPENHAB-TOKEN': ohToken,
      'Accept': 'application/json',
    },
  });
  if (res.ok) {
    const updated = await res.json();
    setItems(prev => prev.map(it => it.name === item.name ? updated : it));
  }
}} />
                ) : item.type === 'Dimmer' ? (
                  <DimmerSlider item={item} email={email} password={password} ohToken={ohToken} onItemUpdate={async () => {
                    // Fetch updated item state and update items array
                    const url = joinUrl(getApiBaseUrl(), `/rest/items/${encodeURIComponent(item.name)}`);
console.log('[fetchItem] Fetching:', url);
const res = await fetch(url, {
                      headers: {
                        'Authorization': 'Basic ' + btoa(email + ':' + password),
                        'X-OPENHAB-TOKEN': ohToken,
                        'Accept': 'application/json',
                      },
                    });
                    if (res.ok) {
                      const updated = await res.json();
                      setItems(prev => prev.map(it => it.name === item.name ? updated : it));
                    }
                  }} />
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
            <>
              <div className="bg-[#181818] rounded-xl shadow-2xl flex items-center justify-center grow mx-8 my-12 h-[60vh] min-h-[260px]">
                <div className="text-gray-400 text-lg text-center w-full">No items found for this binding.</div>
              </div>
            </>
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
export function SwitchButton({ item, email, password, ohToken, onItemUpdate }: { item: any, email: string, password: string, ohToken: string, onItemUpdate?: () => void }) {
  const [loading, setLoading] = useState<null | 'ON' | 'OFF'>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCommand(command: 'ON' | 'OFF', e: React.MouseEvent) {
    e.stopPropagation();
    setLoading(command);
    setError(null);
    try {
      const url = joinUrl(getApiBaseUrl(), `/rest/items/${encodeURIComponent(item.name)}`);
console.log('[fetchItem] Fetching:', url);
const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(email + ':' + password),
          'X-OPENHAB-TOKEN': ohToken,
          'Content-Type': 'text/plain',
        },
        body: command,
      });
      if (!res.ok) throw new Error(await res.text());
      // Poll for state update up to 5 times
      
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 400));
        const stateRes = await fetch(`${getApiBaseUrl()}/rest/items/${encodeURIComponent(item.name)}`, {
          headers: {
            'Authorization': 'Basic ' + btoa(email + ':' + password),
            'X-OPENHAB-TOKEN': ohToken,
            'Accept': 'application/json',
          },
        });
        if (stateRes.ok) {
          const data = await stateRes.json();
          if (data.state === command) {
            break;
          }
        }
      }
      if (onItemUpdate) {
        await onItemUpdate();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send command');
    } finally {
      setLoading(null);
    }
  }

  const isOn = item.state === 'ON';
  const isOff = item.state === 'OFF';

  return (
    <div className="flex flex-row items-center gap-2">
      <button
        className={`px-3 py-1 rounded font-semibold shadow transition-colors text-xs border-2 ${
          isOn ? 'bg-[#e64a19] text-white border-[#e64a19]' : 'bg-gray-200 text-gray-700 border-gray-300'
        } hover:${isOn ? 'bg-[#ff7043]' : 'bg-gray-300'} ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
        disabled={!!loading}
        onClick={e => handleCommand('ON', e)}
        title="Send ON command"
        style={isOn ? { boxShadow: '0 0 0 2px #e64a19' } : {}}
      >
        {loading === 'ON' ? 'Sending...' : 'ON'}
      </button>
      <button
        className={`px-3 py-1 rounded font-semibold shadow transition-colors text-xs border-2 ${
          isOff ? 'bg-[#e64a19] text-white border-[#e64a19]' : 'bg-gray-200 text-gray-700 border-gray-300'
        } hover:${isOff ? 'bg-[#ff7043]' : 'bg-gray-300'} ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
        disabled={!!loading}
        onClick={e => handleCommand('OFF', e)}
        title="Send OFF command"
        style={isOff ? { boxShadow: '0 0 0 2px #e64a19' } : {}}
      >
        {loading === 'OFF' ? 'Sending...' : 'OFF'}
      </button>
      {error && <span className="text-red-400 text-xs" title={error}>✖</span>}
    </div>
  );
}


// DimmerSlider: Slider for Dimmer items to send value 0-100
export function DimmerSlider({ item, email, password, ohToken, onItemUpdate }: { item: any, email: string, password: string, ohToken: string, onItemUpdate?: () => void }) {
  const [value, setValue] = useState<number>(() => {
    const v = parseInt(item.state, 10);
    return isNaN(v) ? 0 : v;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [localValue, setLocalValue] = useState<number | null>(null);

  // Update value from backend only when not dragging
  useEffect(() => {
    if (!loading && !dragging) {
      const v = parseInt(item.state, 10);
      console.log('[DimmerSlider] Backend state (item.state):', item.state, 'parsed:', v);
      setValue(isNaN(v) ? 0 : v);
      setLocalValue(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.state, loading, dragging]);

  // Slider event handlers
  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = parseInt(e.target.value, 10);
    setLocalValue(newValue);
  }
  function handleSliderStart() {
    setDragging(true);
  }
  function handleSliderEnd() {
    setDragging(false);
    if (localValue !== null) {
      setValue(localValue);
    console.log('[DimmerSlider] setValue in frontend:', localValue);
      // Send value to backend only on drag end
      console.log('[DimmerSlider] Sending value to backend:', localValue);
      (async (finalValue: number) => {
        setLoading(true);
        
        setError(null);
        try {
          // 1. Send the value to the backend
          const url = joinUrl(getApiBaseUrl(), `/rest/items/${encodeURIComponent(item.name)}`);
console.log('[fetchItem] Fetching:', url);
const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(email + ':' + password),
              'X-OPENHAB-TOKEN': ohToken,
              'Content-Type': 'text/plain',
            },
            body: String(finalValue),
          });
          let backendResponse;
          try {
            backendResponse = await res.text();
          } catch (e) {
            backendResponse = '[Could not read response body]';
          }
          console.log('[DimmerSlider] Backend POST response:', backendResponse, 'Status:', res.status);
          if (!res.ok) throw new Error(backendResponse);
          
          // 2. Immediately fetch the latest state from the backend
          const stateRes = await fetch(`${getApiBaseUrl()}/rest/items/${encodeURIComponent(item.name)}`, {
            headers: {
              'Authorization': 'Basic ' + btoa(email + ':' + password),
              'X-OPENHAB-TOKEN': ohToken,
              'Accept': 'application/json',
            },
          });
          if (stateRes.ok) {
            const updated = await stateRes.json();
            const v = parseInt(updated.state, 10);
            setValue(isNaN(v) ? 0 : v);
            console.log('[DimmerSlider] Refetched backend state:', updated.state, 'parsed:', v);
          } else {
            console.warn('[DimmerSlider] Failed to refetch item state after POST');
          }

          if (onItemUpdate) onItemUpdate();
        } catch (err: any) {
          setError(err.message || 'Failed to send command');
        } finally {
          setLoading(false);
        }
      })(localValue);
      setLocalValue(null);
    }
  }

  return (
    <div className="flex flex-row items-center gap-2 w-full min-w-[170px]">
      <input
        type="range"
        min={0}
        max={100}
        value={dragging && localValue !== null ? localValue : value}
        disabled={loading}
        onChange={handleSliderChange}
        onMouseDown={handleSliderStart}
        onMouseUp={handleSliderEnd}
        onTouchStart={handleSliderStart}
        onTouchEnd={handleSliderEnd}
        className="w-28 accent-orange-500 flex-shrink-0"
        style={{ minWidth: '7rem', maxWidth: '7rem' }}
        title="Set dimmer value"
      />
      <span className="text-xs text-gray-200 w-10 text-right font-mono inline-block" style={{ minWidth: '2ch' }}>{value}</span>
      <button
        className="px-2 py-1 rounded bg-[#e64a19] text-white text-xs font-semibold hover:bg-[#ff7043]"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          
          setError(null);
          try {
            const url = joinUrl(getApiBaseUrl(), `/rest/items/${encodeURIComponent(item.name)}`);
console.log('[fetchItem] Fetching:', url);
const res = await fetch(url, {
              method: 'POST',
              headers: {
                'Authorization': 'Basic ' + btoa(email + ':' + password),
                'X-OPENHAB-TOKEN': ohToken,
                'Content-Type': 'text/plain',
              },
              body: 'ON',
            });
            if (!res.ok) throw new Error(await res.text());
            if (onItemUpdate) onItemUpdate();
          } catch (err: any) {
            setError(err.message || 'Failed to send ON');
          } finally {
            setLoading(false);
          }
        }}
        title="Send ON to dimmer (test)"
      >ON</button>
      <button
        className="px-2 py-1 rounded bg-gray-600 text-white text-xs font-semibold hover:bg-gray-800"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          
          setError(null);
          try {
            const url = joinUrl(getApiBaseUrl(), `/rest/items/${encodeURIComponent(item.name)}`);
console.log('[fetchItem] Fetching:', url);
const res = await fetch(url, {
              method: 'POST',
              headers: {
                'Authorization': 'Basic ' + btoa(email + ':' + password),
                'X-OPENHAB-TOKEN': ohToken,
                'Content-Type': 'text/plain',
              },
              body: 'OFF',
            });
            if (!res.ok) throw new Error(await res.text());
            if (onItemUpdate) onItemUpdate();
          } catch (err: any) {
            setError(err.message || 'Failed to send OFF');
          } finally {
            setLoading(false);
          }
        }}
        title="Send OFF to dimmer (test)"
      >OFF</button>
      {/* Removed loading indicator to eliminate visual artifact */}
      
      {error && <span className="text-red-400 text-xs" title={error}>✖</span>}
    </div>
  );
}

export default App;
