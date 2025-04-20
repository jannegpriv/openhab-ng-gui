import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Brush } from 'recharts';
import { SwitchButton, DimmerSlider } from './App';

interface ItemDetailWithChartProps {
  item: any;
  email: string;
  password: string;
  ohToken: string;
  onBack: () => void;
  onItemUpdate?: () => void;
}

const ItemDetailWithChart: React.FC<ItemDetailWithChartProps> = ({ item, email, password, ohToken, onBack, onItemUpdate }) => {
  // Show image if item is of type Image
  // Show map for Location items
  if (item.type === 'Location') {
    // openHAB Location state format: 'lat,long[,alt]'
    let lat = null, lon = null, alt = null, parseError = false;
    if (typeof item.state === 'string') {
      const parts = item.state.split(',');
      if (parts.length >= 2) {
        lat = parseFloat(parts[0]);
        lon = parseFloat(parts[1]);
        if (parts.length > 2) alt = parseFloat(parts[2]);
        if (isNaN(lat) || isNaN(lon)) parseError = true;
      } else {
        parseError = true;
      }
    } else {
      parseError = true;
    }
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 w-full h-full flex flex-col mx-0 mt-8 items-center justify-center">
        <button
          className="mb-4 px-4 py-2 bg-[#e64a19] text-white rounded hover:bg-[#ff7043] w-fit"
          onClick={onBack}
        >
          ← Back to Items
        </button>
        <div className="text-2xl font-bold text-gray-900 mb-4" title={item.name}>{item.name.replace(/_/g, ' ')}</div>
        {item.label && <div className="text-lg text-gray-600 mb-4">{item.label}</div>}
        {parseError ? (
          <div className="text-red-500">Invalid location format: {String(item.state)}</div>
        ) : (
          <>
            <div className="mb-2 text-gray-700">Lat: {lat}, Lon: {lon}{alt !== null ? `, Alt: ${alt}` : ''}</div>
            {/* Only render map if lat/lon are valid */}
            {(lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) ? (
              <>
                <iframe
                  title="Location Map"
                  width="900"
                  height="600"
                  className="rounded border border-gray-300 shadow-lg"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.01}%2C${lat-0.01}%2C${lon+0.01}%2C${lat+0.01}&layer=mapnik&marker=${lat}%2C${lon}`}
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                />
                <div className="text-xs text-gray-400 mt-2">
                  <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`} target="_blank" rel="noopener noreferrer" className="underline text-[#e64a19]">View on OpenStreetMap</a>
                </div>
              </>
            ) : (
              <div className="text-red-400">Could not parse latitude/longitude.</div>
            )}
          </>
        )}
      </div>
    );
  }

  if (item.type === 'Image') {
    // Use base64 data if present, otherwise fallback to REST API URL
    const isDataUrl = typeof item.state === 'string' && item.state.startsWith('data:image/');
    const imageUrl = isDataUrl
      ? item.state
      : `http://localhost:3001/rest/items/${encodeURIComponent(item.name)}/state`;
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 w-full h-full flex flex-col mx-0 mt-8 items-center justify-center">
        <button
          className="mb-4 px-4 py-2 bg-[#e64a19] text-white rounded hover:bg-[#ff7043] w-fit"
          onClick={onBack}
        >
          ← Back to Items
        </button>
        <div className="text-2xl font-bold text-gray-900 mb-4" title={item.name}>{item.name.replace(/_/g, ' ')}</div>
        {item.label && <div className="text-lg text-gray-600 mb-4">{item.label}</div>}
        <img
          src={imageUrl}
          alt={item.label || item.name}
          className="max-w-full max-h-[60vh] rounded border border-gray-300 shadow-lg"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="text-gray-400 text-xs mt-2">If the image does not load, check the item state or permissions.</div>
        {/* Debug: show src type */}
        <div className="text-xs text-gray-300 mt-1">Source: {isDataUrl ? 'base64 (data URL)' : 'REST API'}</div>
      </div>
    );
  }
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<'1h' | '6h' | '12h' | '1d' | '3d' | '7d' | '14d'>('14d');

  useEffect(() => {
    if (!item || !item.name || !item.type.startsWith('Number:')) return;
    setLoading(true);
    setError(null);
    const now = new Date();
    let start: Date;
    switch (range) {
      case '1h': start = new Date(now.getTime() - 1 * 60 * 60 * 1000); break;
      case '6h': start = new Date(now.getTime() - 6 * 60 * 60 * 1000); break;
      case '12h': start = new Date(now.getTime() - 12 * 60 * 60 * 1000); break;
      case '1d': start = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
      case '3d': start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); break;
      case '7d': start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '14d': start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); break;
      default: start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); break;
    }
    const startStr = start.toISOString();
    const endStr = now.toISOString();
    const url = `http://localhost:3001/rest/persistence/items/${encodeURIComponent(item.name)}?starttime=${startStr}&endtime=${endStr}&boundary=true&itemState=true`;
    console.log('Fetching history:', { url, range });
    fetch(url,
      {
        headers: {
          "Authorization": "Basic " + btoa(email + ":" + password),
          "X-OPENHAB-TOKEN": ohToken,
          "Accept": "application/json",
        }
      }
    )
      .then(r => r.json())
      .then(data => {
        // Filter out-of-range data points in case the backend returns more than requested
        const startMs = new Date(startStr).getTime();
        const endMs = new Date(endStr).getTime();
        let processedHistory = Array.isArray(data.data)
          ? data.data
            .map((d: any) => ({ time: typeof d.time === 'number' ? d.time : new Date(d.time).getTime(), value: parseFloat(d.state) }))
            .filter((d: any) => {
              return d.time >= startMs && d.time <= endMs;
            })
          : [];
        // Always prepend a virtual point at startMs with the first value if there is at least one point
        if (processedHistory.length > 0) {
          const first = processedHistory[0];
          // Always add a virtual point at startMs with the Y value of the first data point
          if (first.time !== startMs) {
            processedHistory.unshift({
              ...first,
              time: startMs
            });
          }
        }
        console.log('Chart debug:', { startMs, endMs, processedHistory });
setHistory(processedHistory);
      })
      .catch(() => setError("Could not load historical data."))
      .finally(() => setLoading(false));
  }, [item, email, password, ohToken, range]);

  // Calculate startMs and endMs for use in XAxis domain
  const now = new Date();
  let start: Date;
  switch (range) {
    case '1h': start = new Date(now.getTime() - 1 * 60 * 60 * 1000); break;
    case '6h': start = new Date(now.getTime() - 6 * 60 * 60 * 1000); break;
    case '12h': start = new Date(now.getTime() - 12 * 60 * 60 * 1000); break;
    case '1d': start = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    case '3d': start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); break;
    case '7d': start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case '14d': start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); break;
    default: start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); break;
  }
  const startMs = start.getTime();
  const endMs = now.getTime();

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 w-full h-full flex flex-col mx-0 mt-8">
      <button
        className="mb-4 px-4 py-2 bg-[#e64a19] text-white rounded hover:bg-[#ff7043] w-fit"
        onClick={onBack}
      >
        ← Back to Items
      </button>

      {item.type.startsWith('Number:') && (
        <div className="flex flex-col w-full">
          {/* Header bar with name, label, and controls */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gray-100 border border-gray-300 rounded-lg px-6 py-4 mb-6">
            <div>
              <div className="text-2xl font-bold text-gray-900" title={item.name}>{item.name.replace(/_/g, ' ')}</div>
              {item.label && <div className="text-lg text-gray-600">{item.label}</div>}
            </div>
            <div className="flex flex-row items-center gap-3 mt-3 md:mt-0 w-full md:w-auto justify-end">
              <label htmlFor="range-select" className="font-semibold text-gray-700 mr-2">History range:</label>
              <select
                id="range-select"
                className="border px-3 py-2 rounded text-base bg-white shadow-sm focus:ring-2 focus:ring-[#e64a19] border-[#e64a19] font-semibold"
                value={range}
                onChange={e => setRange(e.target.value as any)}
                aria-label="Select history range"
                style={{ color: '#222', background: '#fff' }}
              >
                <option value="1h">1 hour</option>
                <option value="6h">6 hours</option>
                <option value="12h">12 hours</option>
                <option value="1d">1 day</option>
                <option value="3d">3 days</option>
                <option value="7d">7 days</option>
                <option value="14d">14 days</option>
              </select>
            </div>
          </div>
          {loading ? (
            <div className="text-[#e64a19]">Loading chart...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : history.length === 0 ? (
            <div className="text-gray-500">No historical data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={history} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={[startMs, endMs]}
                  scale="time"
                  tickFormatter={(v: number) => {
                    const d = new Date(v);
                    // Show as MM/DD HH:mm
                    return d.toLocaleDateString([], { month: '2-digit', day: '2-digit' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  }}
                  minTickGap={80}
                  tick={{ fontSize: 14, fontWeight: 600, fill: '#222' }}
                  allowDuplicatedCategory={false}
                  interval="preserveStartEnd"
                />
                
                <YAxis domain={['dataMin', 'dataMax']} tickFormatter={v => v.toLocaleString('en-US')} width={90} />
                <Tooltip content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = new Date(label);
                    return (
                      <div className="bg-white border border-gray-300 rounded shadow-md px-4 py-2">
                        <div className="text-xs text-gray-600">{d.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' })} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                        <div className="text-sm font-semibold text-[#e64a19]">Value: {payload[0].value}</div>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Line type="monotone" dataKey="value" stroke="#e64a19" strokeWidth={2} dot={false} />
                {/* Add a brush for zooming/panning on large data sets */}
                {history.length > 100 && (
                  <Brush dataKey="time" height={30} stroke="#e64a19"
                    tickFormatter={(v: number) => {
                      const d = new Date(v);
                      return d.toLocaleDateString([], { month: '2-digit', day: '2-digit' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }}
                  />
                )}
                {item.type === 'Switch' ? (
                  <SwitchButton item={item} email={email} password={password} ohToken={ohToken} onItemUpdate={onItemUpdate} />
                ) : item.type === 'Dimmer' ? (
                  <DimmerSlider item={item} email={email} password={password} ohToken={ohToken} onItemUpdate={onItemUpdate} />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemDetailWithChart;
