# SecureFix IDE Desktop (Tauri)

AI-Powered Security Code Editor built with Tauri, React, and Monaco Editor.

## Prerequisites

1. **Rust** - Install from https://rustup.rs/
2. **Node.js** >= 18.0.0
3. **System dependencies for Tauri**:
   - **Windows**: WebView2 (usually pre-installed on Windows 10/11)
   - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
   - **Linux**: `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev`

## Setup

```bash
# Install dependencies
npm install

# Generate app icons (optional - from a 1024x1024 PNG)
npx tauri icon path/to/your-icon.png
```

## Development

```bash
# Start development server with hot reload
npm run dev
```

This will:
1. Start the Vite dev server for the frontend
2. Compile and run the Tauri application
3. Enable hot reload for frontend changes

## Build

```bash
# Build for production
npm run build
```

The built application will be in `src-tauri/target/release/bundle/`.

## Project Structure

```
desktop/
├── src/
│   └── renderer/         # React frontend
│       ├── App.tsx       # Main application component
│       ├── tauri-api.ts  # Tauri API bindings
│       └── bridge/       # Message passing layer
├── editor/               # Monaco editor integration
├── src-tauri/            # Tauri/Rust backend
│   ├── src/
│   │   ├── main.rs       # Application entry point
│   │   └── commands.rs   # Tauri commands (IPC handlers)
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri configuration
└── vite.config.ts        # Vite configuration
```

## Why Tauri over Electron?

- **Smaller bundle size**: ~10MB vs ~150MB+
- **Lower memory usage**: Uses native WebView instead of bundled Chromium
- **Better security**: Rust backend with no Node.js in main process
- **Faster startup**: No need to load entire Chromium runtime
- **Windows compatibility**: Uses WebView2 (pre-installed on Windows 10/11)

## Troubleshooting

### Windows: WebView2 not found
Install WebView2 Runtime from Microsoft: https://developer.microsoft.com/en-us/microsoft-edge/webview2/

### Build fails with Rust errors
Make sure you have the latest Rust toolchain:
```bash
rustup update
```

### Hot reload not working
Check that the Vite dev server is running on port 5173. The port must match the `devUrl` in `tauri.conf.json`.
