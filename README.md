# openhab-ng-gui

## What is this?

**openhab-ng-gui** is a modern web UI for controlling and monitoring your openHAB smart home system. It provides a fast, mobile-friendly, and visually rich interface to interact with your openHAB items, including advanced color controls, charts, and more.

### Requirements
- You need a [myopenhab.org](https://myopenhab.org) account for remote access and authentication.
- You must generate an API token from your local openHAB installation (see [openHAB docs](https://www.openhab.org/docs/)).
- The app requires both the frontend and a proxy server (for secure API calls), which are run together via Docker Compose or deployed on Render.com.

## 🚀 One-Click Deploy to Render.com

Want to try this app yourself? You can deploy both the frontend and proxy with a single click:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

1. Click the button above and connect your GitHub account.
2. Render will set up both the Express proxy and the frontend for you.
3. **In most cases, everything will work out of the box—no manual configuration needed!**
4. Enjoy your own openHAB dashboard in the cloud!

### FAQ: Do I need to set any environment variables?
- **No, not for standard setups.** The frontend will automatically talk to the proxy using the default Render.com service names.
- **Only set `VITE_API_BASE_URL` if:**
  - You rename your proxy service to something other than `openhab-ng-gui-proxy`.
  - You want to use a custom proxy/backend URL.

If you do need to set it, add `VITE_API_BASE_URL` in your frontend's Render.com Environment settings and set its value to your proxy's public URL.

---

## Running with Docker Compose

You can run both the frontend and proxy together in Docker containers using Docker Compose. This is a convenient way to test the full stack locally without installing Node.js or dependencies directly on your machine.

### 1. Build and start the containers
```sh
docker-compose up --build
```
- This will build both the proxy and frontend images.
- The proxy will be available at http://localhost:3001
- The frontend will be available at http://localhost:5173

### 2. Log in
- Open http://localhost:5173 in your browser.
- Enter your openHAB credentials and API token as usual.

### Notes
- The frontend is served by nginx and will proxy API requests to the `proxy` container.
- You can stop the stack with `Ctrl+C` and remove containers with `docker-compose down`.
- This Docker setup does **not** affect your ability to run locally with `npm run dev` or to deploy on Render.com.

---

## Running Locally

You can run the openHAB NG GUI app locally for development or testing. This is useful if you want to use your own openHAB instance or test changes before deploying.

### Prerequisites
- Node.js (v16 or higher recommended)
- npm (comes with Node.js)
- An openHAB backend or the included proxy running locally (default: http://localhost:3001)

### 1. Clone the repository
```sh
git clone https://github.com/your-username/openhab-ng-gui.git
cd openhab-ng-gui
```

### 2. Install dependencies
```sh
npm install
```

### 3. Start the proxy (if needed)
If you want to use the included Node.js proxy for local openHAB API access, run:
```sh
node openhab-proxy.js
```
This will start the proxy on port 3001 by default.

### 4. Start the frontend
```sh
npm run dev
```
The app will start on http://localhost:5173 (or another port if 5173 is in use).

### 5. Log in
- Enter your openHAB credentials and API token in the login form.
- By default, the frontend will talk to the proxy at http://localhost:3001.
- If you want to use a different backend/proxy, set the `VITE_API_BASE_URL` environment variable before starting the frontend:
  ```sh
  export VITE_API_BASE_URL="http://your-proxy-url"
  npm run dev
  ```

### Troubleshooting
- Make sure your proxy or backend is running and reachable at the configured URL.
- If you see CORS errors, ensure you are using the proxy and not trying to connect directly to a remote openHAB server.
- For further help, check the console output or open an issue.

---

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
