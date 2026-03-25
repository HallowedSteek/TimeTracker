# AGENTS.md

## Cursor Cloud specific instructions

This is a **Time Tracker** Electron desktop app (Electron + Vite + React + TypeScript). It is a single self-contained product with no external services, databases, or APIs.

### Running the app

- **Dev mode:** `npm run dev` (runs `electron-vite dev` — launches Electron window with Vite HMR for the renderer)
- **Build:** `npm run build` (runs `electron-vite build` — outputs to `out/`)
- **Type check:** `npx tsc --noEmit`

### Important caveats

- **Headless display:** Electron requires a display server. In Cloud Agent VMs, `Xvfb` is available and `DISPLAY=:1` is pre-set. The dbus and GPU errors logged on startup are expected in this environment and do not affect functionality.
- **No ESLint config:** The project does not include an ESLint configuration or lint script. TypeScript type checking (`npx tsc --noEmit`) is the primary static analysis.
- **No automated tests:** There is no test framework or test suite configured. Manual testing via the GUI is the only way to verify behavior.
- **Data storage:** The app stores data as a CSV file (`worked-days.csv`) in Electron's `userData` directory. No database setup is needed.
- **Package manager:** Uses npm (lockfile: `package-lock.json`).
