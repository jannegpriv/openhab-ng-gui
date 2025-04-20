# openhab-ng-gui: React + TypeScript + Vite

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

## Deploying to GitHub Pages

You can deploy this app as a static site to GitHub Pages. Follow these steps:

### Prerequisites
- Your project must be in a public GitHub repository (e.g., `https://github.com/your-username/openhab-ng-gui`).
- You must have `gh-pages` installed (already included in devDependencies).

### Configuration
1. The Vite config (`vite.config.ts`) is set with the correct base path for GitHub Pages:
   ```js
   base: '/openhab-ng-gui/', // repo name
   ```
2. The following scripts are in your `package.json`:
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```

### Deployment Steps
1. Commit and push all your changes.
2. Run:
   ```sh
   npm run deploy
   ```
   This will build the app and publish the `dist/` folder to the `gh-pages` branch.
3. Go to your GitHub repository settings → Pages, and set the source to the `gh-pages` branch and `/ (root)` folder.
4. Your app will be available at:
   ```
   https://<your-username>.github.io/openhab-ng-gui/
   ```

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

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
