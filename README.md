# 260506_StrangeAttractor

260506_StrangeAttractor is a Vite + TypeScript + Three.js WebGPU strange-attractor generator for exploring chaotic systems as gradient curves and high-density flowing particle simulations. It ships with a compact draggable control panel, strict WebGPU rendering, editable algorithm parameters, keyboard undo/redo history, screenshot export, and a GitHub Pages-ready static deployment path.

## Features
- Strict Three.js WebGPU renderer with no intentional WebGL fallback.
- CPU-generated RK4 attractor curves normalized into a realtime 3D scene and rendered with editable gradient colors.
- Presets for Thomas, Aizawa, Lorenz, Dadras, Chen, Lorenz83, Rossler, Halvorsen, Rabinovich-Fabrikant, Three-Scroll Unified Chaotic System, Sprott, and Four-Wing.
- Per-preset parameter sliders with clickable number fields, plus Randomize and Default actions for the active attractor.
- WebGPU particle flow using Three.js TSL compute and storage buffers, with particle counts from 1,000 up to the current 5,000,000 test cap.
- Particle controls for amount, size, spread, speed, reset behavior, and curve display.
- Material controls for gradient start/end color, contrast, bias, and blur.
- Camera controls match the project UI language: Wheel zoom, MMB pan, RMB orbit, with left mouse camera orbit disabled and browser context menus blocked.
- Runtime stats show WebGPU status, FPS, and particle count above the particle simulation buttons.
- Keyboard-only history: Ctrl+Z undo, Ctrl+Y and Ctrl+Shift+Z redo.
- Export Screenshot saves the current canvas view as numbered PNG files.

## Getting Started
1. `npm install`
2. `npm run dev` to start Vite on `http://127.0.0.1:6223`
3. Open the app in a current Chromium-based browser with WebGPU enabled
4. `npm test` to run the unit test suite
5. `npm run build` to type-check and emit a production bundle

## Controls
- **Camera:** `Wheel` zooms, `MMB` pans, and `RMB` orbits. Left mouse camera orbit is disabled.
- **Particles:** Start/Pause toggles motion. Reset clears particles until Start is clicked again. Particle Amount reallocates GPU buffers, Particle Size changes the soft sprite scale, Particle Spread offsets each particle from the curve, Particle Speed controls flow rate, and Curve Display toggles the attractor curve.
- **Attractor:** Preset selects the algorithm. Only that preset's editable parameters are shown. Click a value label to type an exact number, Randomize samples the preset range, and Default restores the source defaults.
- **Material:** Gradient Start and Gradient End define the curve and particle color ramp. Gradient Contrast, Bias, and Blur remap the color distribution.
- **Export:** Export Screenshot saves the current WebGPU canvas as `260506_StrangeAttractor_001.png`, `002`, and onward.
- **History:** `Ctrl+Z` undoes parameter and setting changes. `Ctrl+Y` or `Ctrl+Shift+Z` redoes them.

## Deployment
- **Local production preview:** `npm install`, then `npm run build` followed by `npm run preview` to inspect the compiled bundle.
- **Publish to GitHub Pages:** From a clean `main`, run `npm run build -- --base ./`. Checkout or create the `gh-pages` branch in a separate temp clone or worktree, copy everything inside `dist/` to the branch root, keep the flat static structure with `index.html`, `assets/`, `env/`, `.gitignore`, and `.nojekyll`, commit with a descriptive message, `git push origin gh-pages`, then return to `main`.
- **Live demo:** https://ekimroyrp.github.io/260506_StrangeAttractor/
