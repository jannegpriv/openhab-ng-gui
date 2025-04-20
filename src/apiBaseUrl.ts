// Helper to get API base URL for proxy (works on Render and locally)
export function getApiBaseUrl(): string {
  // Render.com provides RENDER_EXTERNAL_URL as an env var in backend, but in frontend we check window.location
  const isRender = window.location.hostname.endsWith('.onrender.com');
  if (isRender) {
    // Assume proxy is deployed as 'openhab-ng-gui-proxy' (default from render.yaml)
    // If user renamed, they can override via VITE_API_BASE_URL
    return `https://openhab-ng-gui-proxy.onrender.com`;
  }
  // Allow override via VITE_API_BASE_URL
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // Default to local dev
  return 'http://localhost:3001';
}
