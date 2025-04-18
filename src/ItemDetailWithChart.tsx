import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Brush } from 'recharts';

interface ItemDetailWithChartProps {
  item: any;
  email: string;
  password: string;
  ohToken: string;
  onBack: () => void;
}

const ItemDetailWithChart: React.FC<ItemDetailWithChartProps> = ({ item, email, password, ohToken, onBack }) => {
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
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemDetailWithChart;
