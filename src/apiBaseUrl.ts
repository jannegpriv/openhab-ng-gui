// Helper to get API base URL for proxy (works on Render and locally)
export function getApiBaseUrl(): string {
  // Always prefer explicit override if set
  let base = import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : (window.location.hostname.endsWith('.onrender.com')
        ? 'https://openhab-ng-gui-proxy.onrender.com'
        : 'http://localhost:3001');
  // Defensive: strip any accidental /rest/items or /rest/items/
  base = base.replace(/\/rest\/items\/?$/, '');
  return base;
}
