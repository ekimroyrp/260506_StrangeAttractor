# 260506_StrangeAttractor

260506_StrangeAttractor is a Three.js WebGPU strange-attractor generator with editable chaotic-system presets, gradient curve rendering, and a GPU particle simulation that flows along the selected attractor path. It uses a compact draggable control panel styled after the DiscreteVectors reference project, strict WebGPU rendering, and keyboard undo/redo for parameter edits.

## Features

- Strict WebGPU renderer with no intentional WebGL fallback.
- CPU-generated RK4 attractor curves normalized into a realtime 3D scene.
- Presets for Thomas, Aizawa, Lorenz, Dadras, Chen, Lorenz83, Rössler, Halvorsen, Rabinovich-Fabrikant, Three-Scroll Unified Chaotic System, Sprott, and Four-Wing.
- Per-preset editable parameters with slider controls and clickable number edit fields.
- Randomize and Default actions for the active preset parameters.
- WebGPU particle flow using storage buffers and TSL compute nodes.
- Gradient start/end, contrast, bias, blur, particle size, particle spread, and curve visibility controls.
- Runtime stats for FPS, particle count, curve points, active preset, and renderer status.
- Keyboard-only undo/redo history for app state changes.

## Getting Started

Clone the repository:

```bash
git clone https://github.com/ekimroyrp/260506_StrangeAttractor.git
cd 260506_StrangeAttractor
```

Install dependencies:

```bash
npm install
```

Run the local dev server:

```bash
npm run dev
```

Build the production bundle:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Open the app in a current Chromium-based browser with WebGPU enabled.

## Controls

- Camera:
  - `Wheel` = Zoom
  - `MMB` = Pan
  - `RMB` = Orbit
- Simulation:
  - `Start` / `Pause` toggles particle motion.
  - `Reset` restarts particles on the current attractor curve.
  - `Simulation Rate` controls particle flow speed.
  - `Particle Amount` reallocates the GPU particle buffers.
  - `Particle Size` controls the soft particle sprite scale.
  - `Particle Spread` sets the maximum random offset distance from the attractor path.
- Attractor:
  - `Preset` selects the attractor algorithm.
  - Parameter sliders edit only the selected preset's parameters.
  - Click a value label to type an exact number.
  - `Randomize` samples the active preset's allowed parameter ranges.
  - `Default` restores the active preset defaults.
- Material:
  - `Gradient Start` / `Gradient End` set the curve and particle color ramp.
  - `Gradient Contrast`, `Gradient Bias`, and `Gradient Blur` remap the ramp.
  - `Curve Visibility` toggles the attractor curve.
- History:
  - `Ctrl+Z` = Undo
  - `Ctrl+Y` or `Ctrl+Shift+Z` = Redo
