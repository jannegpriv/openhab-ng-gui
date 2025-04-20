// Helper to get API base URL for proxy (works on Render and locally)
export function getApiBaseUrl(): string {
  // Always prefer explicit override if set
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // Render.com detection (fallback)
  const isRender = window.location.hostname.endsWith('.onrender.com');
  if (isRender) {
    // Default proxy name; update if you rename your proxy service
    return `https://openhab-ng-gui-proxy.onrender.com`;
  }
  // Default to local dev
  return 'http://localhost:3001';
}
