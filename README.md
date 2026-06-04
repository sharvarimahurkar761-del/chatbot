# Shiva Static Chat

This project is now a fully static HTML/CSS/JavaScript app. It does not use a framework, bundler, typed build step, background caching, browser databases, or simulated local replies.

## Files

- `index.html` - chat UI
- `settings.html` - separate settings page
- `static/css/app.css` - shared styles
- `static/js/settings-data.js` - shared settings defaults and localStorage helpers
- `static/js/app.js` - chat page behavior
- `static/js/settings.js` - settings page behavior
- `proxy.cjs` / `proxy.js` - live model proxy that returns a clear error when the model server is unavailable
- `.vscode/launch.json` - VS Code debug configurations

## Run

Open `index.html` directly in a browser, or use the VS Code launch config named `Debug static app in Chrome`.

For model calls, start the proxy:

```sh
npm run proxy
```

By default it listens on `http://localhost:4245` and forwards to `http://tmlpnewskc31137.tmindia.tatamotors.com:4244`.

Override the target when needed:

```sh
LLAMA_TARGET=http://localhost:4244 npm run proxy
```

On Windows PowerShell:

```powershell
$env:LLAMA_TARGET='http://localhost:4244'
npm run proxy
```
