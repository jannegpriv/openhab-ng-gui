import React, { useEffect, useState } from "react";

interface Thing {
  UID: string;
  label: string;
  thingTypeUID: string;
  channels: { uid: string; label: string }[];
}

interface Item {
  name: string;
  label: string;
  state: string;
  type: string;
  link: string;
  channel?: string;
}

interface LynkcoPageProps {
  email: string;
  password: string;
  ohToken: string;
}

const LynkcoPage: React.FC<LynkcoPageProps> = ({ email, password, ohToken }) => {
  const [things, setThings] = useState<Thing[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all things
    fetch("http://localhost:3001/rest/things", {
      headers: {
        "Authorization": "Basic " + btoa(email + ":" + password),
        "X-OPENHAB-TOKEN": ohToken,
        "Accept": "application/json",
      },
    })
      .then((r) => r.json())
      .then((allThings) => {
        // Filter for LynkCo things
        const lynkcoThings = allThings.filter(
          (t: any) => t.thingTypeUID && t.thingTypeUID.startsWith("lynkco:")
        );
        console.log("[LynkcoPage] LynkCo things:", lynkcoThings);
        setThings(lynkcoThings);
        // Get all LynkCo channel linked item names
        const lynkcoChannelLinkedItemNames = lynkcoThings.flatMap((t: any) =>
          t.channels.flatMap((c: any) => (c.linkedItems || []))
        );
        console.log("[LynkcoPage] LynkCo linked item names:", lynkcoChannelLinkedItemNames);
        // Fetch all items
        fetch("http://localhost:3001/rest/items", {
          headers: {
            "Authorization": "Basic " + btoa(email + ":" + password),
            "X-OPENHAB-TOKEN": ohToken,
            "Accept": "application/json",
          },
        })
          .then((r) => r.json())
          .then((allItems) => {
            console.log("[LynkcoPage] All items:", allItems);
            // Filter items whose name is in the LynkCo linked item names
            const lynkcoItems = allItems.filter((item: any) =>
              lynkcoChannelLinkedItemNames.includes(item.name)
            );
            console.log("[LynkcoPage] Filtered LynkCo items:", lynkcoItems);
            setItems(lynkcoItems);
            setLoading(false);
          });
      });
  }, []);

  if (loading) return <div className="flex justify-center items-center min-h-full text-blue-600">Loading LynkCo items...</div>;

  // console.log("Items to render:", items);
  return (
    <div className="p-8">

      <h2 className="text-2xl font-bold mb-4">LynkCo Binding Items</h2>
      {items.length === 0 ? (
        <div>No LynkCo items found.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow-lg bg-blue-100 border-4 border-red-500" style={{ outline: "3px solid orange" }}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Label</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">State</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item, idx) => (
                <tr key={item.name} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.label}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.state}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LynkcoPage;
