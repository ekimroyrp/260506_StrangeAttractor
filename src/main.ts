import './style.css';
import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  Color,
  Line,
  LineBasicNodeMaterial,
  MOUSE,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGPURenderer,
} from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ATTRACTOR_PRESETS, cloneParams, getParameterRange, getPreset, isAttractorId, randomizeParams } from './core/attractorPresets';
import { generateAttractorCurve } from './core/curveGenerator';
import { buildGradientColors } from './core/gradient';
import { HistoryController } from './core/history';
import { ParticleFlowSystem } from './core/particleFlowSystem';
import type { AttractorId, AttractorParams, CurveData, MaterialSettings, SerializableAppState, SimulationSettings } from './types';

type UiRefs = {
  panel: HTMLDivElement;
  handleTop: HTMLDivElement;
  handleBottom: HTMLDivElement;
  collapseToggle: HTMLButtonElement;
  webgpuWarning: HTMLDivElement;
  start: HTMLButtonElement;
  reset: HTMLButtonElement;
  simulationRate: HTMLInputElement;
  simulationRateValue: HTMLSpanElement;
  particleAmount: HTMLInputElement;
  particleAmountValue: HTMLSpanElement;
  runtimeStats: HTMLDivElement;
  presetSelect: HTMLSelectElement;
  presetTrigger: HTMLButtonElement;
  presetMenu: HTMLUListElement;
  parameterControls: HTMLDivElement;
  randomize: HTMLButtonElement;
  defaults: HTMLButtonElement;
  gradientStart: HTMLInputElement;
  gradientEnd: HTMLInputElement;
  gradientContrast: HTMLInputElement;
  gradientContrastValue: HTMLSpanElement;
  gradientBias: HTMLInputElement;
  gradientBiasValue: HTMLSpanElement;
  gradientBlur: HTMLInputElement;
  gradientBlurValue: HTMLSpanElement;
  particleSize: HTMLInputElement;
  particleSizeValue: HTMLSpanElement;
  curveVisible: HTMLInputElement;
};

function revealUiWhenStyled(maxWaitMs = 1500): void {
  const start = performance.now();
  const tryReveal = (): void => {
    const styled = getComputedStyle(document.documentElement).getPropertyValue('--ui-size-scale').trim().length > 0;
    if (styled || performance.now() - start >= maxWaitMs) {
      document.documentElement.classList.add('ui-ready');
      return;
    }
    requestAnimationFrame(tryReveal);
  };
  tryReveal();
}

function requiredElement<T extends Element>(id: string, check: (element: Element) => element is T): T {
  const element = document.getElementById(id);
  if (!element || !check(element)) {
    throw new Error(`Required element #${id} was not found or has an unexpected type.`);
  }
  return element;
}

function isInput(element: Element): element is HTMLInputElement {
  return element instanceof HTMLInputElement;
}

function isButton(element: Element): element is HTMLButtonElement {
  return element instanceof HTMLButtonElement;
}

function isDiv(element: Element): element is HTMLDivElement {
  return element instanceof HTMLDivElement;
}

function isSelect(element: Element): element is HTMLSelectElement {
  return element instanceof HTMLSelectElement;
}

function isSpan(element: Element): element is HTMLSpanElement {
  return element instanceof HTMLSpanElement;
}

function isUl(element: Element): element is HTMLUListElement {
  return element instanceof HTMLUListElement;
}

function updateRangeProgress(input: HTMLInputElement): void {
  const min = Number.parseFloat(input.min);
  const max = Number.parseFloat(input.max);
  const value = Number.parseFloat(input.value);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || !Number.isFinite(value)) {
    input.style.setProperty('--range-progress', '0%');
    return;
  }
  const progress = ((value - min) / (max - min)) * 100;
  input.style.setProperty('--range-progress', `${Math.min(100, Math.max(0, progress))}%`);
}

function stepDecimals(stepValue: string): number {
  if (!stepValue || stepValue === 'any') {
    return 6;
  }
  const decimal = stepValue.split('.')[1];
  return decimal ? decimal.length : 0;
}

function clampAndSnapInputValue(input: HTMLInputElement, value: number): number {
  const min = Number.parseFloat(input.min);
  const max = Number.parseFloat(input.max);
  const step = Number.parseFloat(input.step);
  let next = value;
  if (Number.isFinite(min)) {
    next = Math.max(min, next);
  }
  if (Number.isFinite(max)) {
    next = Math.min(max, next);
  }
  if (Number.isFinite(step) && step > 0) {
    const base = Number.isFinite(min) ? min : 0;
    next = base + Math.round((next - base) / step) * step;
  }
  if (Number.isFinite(min)) {
    next = Math.max(min, next);
  }
  if (Number.isFinite(max)) {
    next = Math.min(max, next);
  }
  return next;
}

function setRangeValue(input: HTMLInputElement, valueLabel: HTMLSpanElement, value: number, format: (value: number) => string): void {
  const snapped = clampAndSnapInputValue(input, value);
  input.value = snapped.toFixed(stepDecimals(input.step));
  valueLabel.textContent = format(snapped);
  updateRangeProgress(input);
}

function bindRange(
  input: HTMLInputElement,
  valueLabel: HTMLSpanElement,
  format: (value: number) => string,
  onInput: (value: number) => void,
  onCommit: () => void,
): void {
  const commitManualValue = (rawValue: string): void => {
    const parsed = Number.parseFloat(rawValue);
    if (!Number.isFinite(parsed)) {
      setRangeValue(input, valueLabel, Number.parseFloat(input.value), format);
      return;
    }
    const next = clampAndSnapInputValue(input, parsed);
    input.value = next.toFixed(stepDecimals(input.step));
    setRangeValue(input, valueLabel, next, format);
    onInput(next);
    onCommit();
  };

  let isManualEditing = false;
  const beginManualEdit = (): void => {
    if (isManualEditing) {
      return;
    }
    isManualEditing = true;

    const editor = document.createElement('input');
    editor.type = 'number';
    editor.className = 'value-editor';
    editor.value = input.value;
    editor.min = input.min;
    editor.max = input.max;
    editor.step = input.step;
    valueLabel.replaceWith(editor);
    editor.focus();
    editor.select();

    let finalized = false;
    const finish = (commit: boolean): void => {
      if (finalized) {
        return;
      }
      finalized = true;
      const submitted = editor.value;
      editor.replaceWith(valueLabel);
      isManualEditing = false;
      if (commit) {
        commitManualValue(submitted);
      } else {
        setRangeValue(input, valueLabel, Number.parseFloat(input.value), format);
      }
    };

    editor.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    });
    editor.addEventListener('blur', () => {
      finish(true);
    });
  };

  valueLabel.addEventListener('click', (event) => {
    event.stopPropagation();
    beginManualEdit();
  });

  input.addEventListener('input', () => {
    const value = Number.parseFloat(input.value);
    valueLabel.textContent = format(value);
    updateRangeProgress(input);
    onInput(value);
  });
  input.addEventListener('change', onCommit);
  setRangeValue(input, valueLabel, Number.parseFloat(input.value), format);
}

function createCurveGeometry(curve: CurveData, colors: Float32Array): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(curve.positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.setDrawRange(0, curve.pointCount);
  geometry.computeBoundingSphere();
  return geometry;
}

function formatFixed(decimals: number): (value: number) => string {
  return (value: number) => value.toFixed(decimals);
}

function formatInteger(value: number): string {
  return `${Math.round(value)}`;
}

function formatStatsNumber(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

function showWarning(ui: UiRefs, message: string): void {
  ui.webgpuWarning.textContent = message;
  ui.webgpuWarning.hidden = false;
}

const ui: UiRefs = {
  panel: requiredElement('ui-panel', isDiv),
  handleTop: requiredElement('ui-handle', isDiv),
  handleBottom: requiredElement('ui-handle-bottom', isDiv),
  collapseToggle: requiredElement('collapse-toggle', isButton),
  webgpuWarning: requiredElement('webgpu-warning', isDiv),
  start: requiredElement('start-sim', isButton),
  reset: requiredElement('reset-sim', isButton),
  simulationRate: requiredElement('simulation-rate', isInput),
  simulationRateValue: requiredElement('simulation-rate-value', isSpan),
  particleAmount: requiredElement('particle-amount', isInput),
  particleAmountValue: requiredElement('particle-amount-value', isSpan),
  runtimeStats: requiredElement('runtime-stats', isDiv),
  presetSelect: requiredElement('attractor-preset', isSelect),
  presetTrigger: requiredElement('attractor-preset-trigger', isButton),
  presetMenu: requiredElement('attractor-preset-menu', isUl),
  parameterControls: requiredElement('parameter-controls', isDiv),
  randomize: requiredElement('randomize-attractor', isButton),
  defaults: requiredElement('default-attractor', isButton),
  gradientStart: requiredElement('gradient-start-color', isInput),
  gradientEnd: requiredElement('gradient-end-color', isInput),
  gradientContrast: requiredElement('gradient-contrast', isInput),
  gradientContrastValue: requiredElement('gradient-contrast-value', isSpan),
  gradientBias: requiredElement('gradient-bias', isInput),
  gradientBiasValue: requiredElement('gradient-bias-value', isSpan),
  gradientBlur: requiredElement('gradient-blur', isInput),
  gradientBlurValue: requiredElement('gradient-blur-value', isSpan),
  particleSize: requiredElement('particle-size', isInput),
  particleSizeValue: requiredElement('particle-size-value', isSpan),
  curveVisible: requiredElement('curve-visible', isInput),
};

const queriedCanvas = document.querySelector<HTMLCanvasElement>('#app-canvas');
if (!queriedCanvas) {
  throw new Error('Canvas #app-canvas was not found.');
}
const appCanvas: HTMLCanvasElement = queriedCanvas;

revealUiWhenStyled();

let selectedPresetId: AttractorId = 'thomas';
let currentParams: AttractorParams = cloneParams(getPreset(selectedPresetId).defaultParams);
const materialSettings: MaterialSettings = {
  gradientStart: ui.gradientStart.value,
  gradientEnd: ui.gradientEnd.value,
  gradientContrast: Number.parseFloat(ui.gradientContrast.value),
  gradientBias: Number.parseFloat(ui.gradientBias.value),
  gradientBlur: Number.parseFloat(ui.gradientBlur.value),
  particleSize: Number.parseFloat(ui.particleSize.value),
  curveVisible: ui.curveVisible.checked,
};
const simulationSettings: SimulationSettings = {
  running: false,
  simulationRate: Number.parseFloat(ui.simulationRate.value),
  particleAmount: Number.parseInt(ui.particleAmount.value, 10),
};

let history: HistoryController;
let curveData: CurveData;
let curveColors: Float32Array;
let curveGeometry: BufferGeometry;
let curveLine: Line;
let particleSystem: ParticleFlowSystem | null = null;
let renderer: WebGPURenderer;
let scene: Scene;
let controls: OrbitControls;
let draggingPanel = false;
const dragOffset = { x: 0, y: 0 };

function getSerializableState(): SerializableAppState {
  return {
    presetId: selectedPresetId,
    params: cloneParams(currentParams),
    material: { ...materialSettings },
    simulationRate: simulationSettings.simulationRate,
    particleAmount: simulationSettings.particleAmount,
  };
}

function setStartButtonState(running: boolean): void {
  ui.start.textContent = running ? 'Pause' : 'Start';
  ui.start.classList.toggle('is-stop-state', running);
  ui.start.classList.toggle('is-start-state', !running);
}

function stopSimulation(): void {
  simulationSettings.running = false;
  setStartButtonState(false);
}

function updateStats(fps = 0): void {
  const preset = getPreset(selectedPresetId);
  const pointCount = curveData?.pointCount ?? 0;
  ui.runtimeStats.textContent =
    `FPS ${Math.round(fps)} | Particles ${formatStatsNumber(simulationSettings.particleAmount)} | ` +
    `Points ${formatStatsNumber(pointCount)} | ${preset.label} | WebGPU`;
}

function setPresetSelection(presetId: AttractorId): void {
  const preset = getPreset(presetId);
  ui.presetSelect.value = presetId;
  ui.presetTrigger.textContent = preset.label;
  Array.from(ui.presetMenu.querySelectorAll<HTMLButtonElement>('.select-option')).forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.presetId === presetId);
  });
}

function rebuildParticleSystem(): void {
  if (!renderer || !scene || !curveData) {
    return;
  }
  particleSystem?.dispose();
  particleSystem = new ParticleFlowSystem(
    renderer,
    scene,
    curveData,
    curveColors,
    simulationSettings.particleAmount,
    materialSettings.particleSize,
  );
  particleSystem.setSimulationRate(simulationSettings.simulationRate);
}

function rebuildCurveAndParticles(): void {
  const preset = getPreset(selectedPresetId);
  curveData = generateAttractorCurve(preset, currentParams);
  curveColors = buildGradientColors(curveData.progress, materialSettings);

  if (curveLine) {
    const nextGeometry = createCurveGeometry(curveData, curveColors);
    curveGeometry.dispose();
    curveGeometry = nextGeometry;
    curveLine.geometry = curveGeometry;
    curveLine.visible = materialSettings.curveVisible;
  }

  rebuildParticleSystem();
  stopSimulation();
  updateStats();
}

function commitHistoryIfChanged(): void {
  history.commit(getSerializableState());
  updateStats();
}

function renderParameterControls(): void {
  ui.parameterControls.replaceChildren();
  const preset = getPreset(selectedPresetId);

  for (const [key, defaultValue] of Object.entries(preset.defaultParams)) {
    const range = getParameterRange(defaultValue);
    const label = document.createElement('label');
    label.className = 'control';

    const row = document.createElement('div');
    row.className = 'control-row';

    const name = document.createElement('span');
    name.textContent = key;

    const valueLabel = document.createElement('span');
    valueLabel.id = `param-${key}-value`;

    const input = document.createElement('input');
    input.type = 'range';
    input.id = `param-${key}`;
    input.min = `${range.min}`;
    input.max = `${range.max}`;
    input.step = `${range.step}`;
    input.value = `${currentParams[key] ?? defaultValue}`;

    const decimals = stepDecimals(input.step);
    const formatter = formatFixed(decimals);
    row.append(name, valueLabel);
    label.append(row, input);
    ui.parameterControls.append(label);

    bindRange(
      input,
      valueLabel,
      formatter,
      (value) => {
        currentParams[key] = value;
        rebuildCurveAndParticles();
      },
      commitHistoryIfChanged,
    );
    setRangeValue(input, valueLabel, currentParams[key] ?? defaultValue, formatter);
  }
}

function syncStaticControlsFromState(): void {
  setRangeValue(ui.simulationRate, ui.simulationRateValue, simulationSettings.simulationRate, formatFixed(2));
  setRangeValue(ui.particleAmount, ui.particleAmountValue, simulationSettings.particleAmount, formatInteger);
  setRangeValue(ui.gradientContrast, ui.gradientContrastValue, materialSettings.gradientContrast, formatFixed(2));
  setRangeValue(ui.gradientBias, ui.gradientBiasValue, materialSettings.gradientBias, formatFixed(2));
  setRangeValue(ui.gradientBlur, ui.gradientBlurValue, materialSettings.gradientBlur, formatFixed(2));
  setRangeValue(ui.particleSize, ui.particleSizeValue, materialSettings.particleSize, formatFixed(3));
  ui.gradientStart.value = materialSettings.gradientStart;
  ui.gradientEnd.value = materialSettings.gradientEnd;
  ui.curveVisible.checked = materialSettings.curveVisible;
  setPresetSelection(selectedPresetId);
}

function applySerializableState(state: SerializableAppState): void {
  selectedPresetId = state.presetId;
  currentParams = cloneParams(state.params);
  materialSettings.gradientStart = state.material.gradientStart;
  materialSettings.gradientEnd = state.material.gradientEnd;
  materialSettings.gradientContrast = state.material.gradientContrast;
  materialSettings.gradientBias = state.material.gradientBias;
  materialSettings.gradientBlur = state.material.gradientBlur;
  materialSettings.particleSize = state.material.particleSize;
  materialSettings.curveVisible = state.material.curveVisible;
  simulationSettings.simulationRate = state.simulationRate;
  simulationSettings.particleAmount = state.particleAmount;
  syncStaticControlsFromState();
  renderParameterControls();
  rebuildCurveAndParticles();
}

function openPresetMenu(): void {
  ui.presetMenu.hidden = false;
  ui.presetTrigger.closest('.select-control')?.classList.add('is-open');
}

function closePresetMenu(): void {
  ui.presetMenu.hidden = true;
  ui.presetTrigger.closest('.select-control')?.classList.remove('is-open');
}

function togglePresetMenu(): void {
  if (ui.presetMenu.hidden) {
    openPresetMenu();
  } else {
    closePresetMenu();
  }
}

function bindPresetSelect(): void {
  ui.presetSelect.replaceChildren();
  ui.presetMenu.replaceChildren();

  ATTRACTOR_PRESETS.forEach((preset) => {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.label;
    ui.presetSelect.append(option);

    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'select-option';
    button.dataset.presetId = preset.id;
    button.textContent = preset.label;
    button.addEventListener('click', () => {
      if (preset.id === selectedPresetId) {
        closePresetMenu();
        return;
      }
      selectedPresetId = preset.id;
      currentParams = cloneParams(preset.defaultParams);
      setPresetSelection(selectedPresetId);
      renderParameterControls();
      rebuildCurveAndParticles();
      commitHistoryIfChanged();
      closePresetMenu();
    });
    item.append(button);
    ui.presetMenu.append(item);
  });

  ui.presetTrigger.addEventListener('click', (event) => {
    event.stopPropagation();
    togglePresetMenu();
  });
  ui.presetSelect.addEventListener('change', () => {
    const value = ui.presetSelect.value;
    if (!isAttractorId(value) || value === selectedPresetId) {
      return;
    }
    selectedPresetId = value;
    currentParams = cloneParams(getPreset(value).defaultParams);
    setPresetSelection(selectedPresetId);
    renderParameterControls();
    rebuildCurveAndParticles();
    commitHistoryIfChanged();
  });
  window.addEventListener('click', closePresetMenu);
  setPresetSelection(selectedPresetId);
}

function bindSectionCollapseToggles(): void {
  const headers = ui.panel.querySelectorAll<HTMLDivElement>('.panel-section-header');
  headers.forEach((header) => {
    const section = header.closest('.panel-section');
    if (!section) {
      return;
    }

    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', section.classList.contains('is-collapsed') ? 'false' : 'true');

    const toggle = (): void => {
      const collapsed = section.classList.toggle('is-collapsed');
      header.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    };

    header.addEventListener('click', toggle);
    header.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }
    });
  });
}

function clampPanelToViewport(): void {
  const panelRect = ui.panel.getBoundingClientRect();
  const width = panelRect.width;
  const height = panelRect.height;
  const left = Number.parseFloat(ui.panel.style.left || '0');
  const top = Number.parseFloat(ui.panel.style.top || '0');
  const maxLeft = Math.max(0, window.innerWidth - width);
  const maxTop = Math.max(0, window.innerHeight - height);
  ui.panel.style.left = `${Math.min(maxLeft, Math.max(0, left))}px`;
  ui.panel.style.top = `${Math.min(maxTop, Math.max(0, top))}px`;
}

function bindPanelDrag(): void {
  const beginPanelDrag = (event: PointerEvent): void => {
    if (event.target instanceof Element && event.target.closest('.collapse-button')) {
      return;
    }
    draggingPanel = true;
    const rect = ui.panel.getBoundingClientRect();
    ui.panel.style.left = `${rect.left}px`;
    ui.panel.style.top = `${rect.top}px`;
    ui.panel.style.right = 'auto';
    ui.panel.style.bottom = 'auto';
    dragOffset.x = event.clientX - rect.left;
    dragOffset.y = event.clientY - rect.top;
  };

  ui.handleTop.addEventListener('pointerdown', beginPanelDrag);
  ui.handleBottom.addEventListener('pointerdown', beginPanelDrag);
  window.addEventListener('pointermove', (event) => {
    if (!draggingPanel) {
      return;
    }
    ui.panel.style.left = `${event.clientX - dragOffset.x}px`;
    ui.panel.style.top = `${event.clientY - dragOffset.y}px`;
    clampPanelToViewport();
  });
  window.addEventListener('pointerup', () => {
    draggingPanel = false;
  });
  window.addEventListener('pointercancel', () => {
    draggingPanel = false;
  });
}

function bindStaticControls(): void {
  bindRange(
    ui.simulationRate,
    ui.simulationRateValue,
    formatFixed(2),
    (value) => {
      simulationSettings.simulationRate = value;
      particleSystem?.setSimulationRate(value);
    },
    commitHistoryIfChanged,
  );
  bindRange(
    ui.particleAmount,
    ui.particleAmountValue,
    formatInteger,
    (value) => {
      simulationSettings.particleAmount = Math.round(value);
      updateStats();
    },
    () => {
      rebuildParticleSystem();
      commitHistoryIfChanged();
    },
  );
  bindRange(
    ui.gradientContrast,
    ui.gradientContrastValue,
    formatFixed(2),
    (value) => {
      materialSettings.gradientContrast = value;
      rebuildCurveAndParticles();
    },
    commitHistoryIfChanged,
  );
  bindRange(
    ui.gradientBias,
    ui.gradientBiasValue,
    formatFixed(2),
    (value) => {
      materialSettings.gradientBias = value;
      rebuildCurveAndParticles();
    },
    commitHistoryIfChanged,
  );
  bindRange(
    ui.gradientBlur,
    ui.gradientBlurValue,
    formatFixed(2),
    (value) => {
      materialSettings.gradientBlur = value;
      rebuildCurveAndParticles();
    },
    commitHistoryIfChanged,
  );
  bindRange(
    ui.particleSize,
    ui.particleSizeValue,
    formatFixed(3),
    (value) => {
      materialSettings.particleSize = value;
      particleSystem?.setParticleSize(value);
    },
    commitHistoryIfChanged,
  );

  ui.gradientStart.addEventListener('input', () => {
    materialSettings.gradientStart = ui.gradientStart.value;
    rebuildCurveAndParticles();
  });
  ui.gradientStart.addEventListener('change', commitHistoryIfChanged);
  ui.gradientEnd.addEventListener('input', () => {
    materialSettings.gradientEnd = ui.gradientEnd.value;
    rebuildCurveAndParticles();
  });
  ui.gradientEnd.addEventListener('change', commitHistoryIfChanged);
  ui.curveVisible.addEventListener('change', () => {
    materialSettings.curveVisible = ui.curveVisible.checked;
    curveLine.visible = materialSettings.curveVisible;
    commitHistoryIfChanged();
  });

  ui.start.addEventListener('click', () => {
    simulationSettings.running = !simulationSettings.running;
    setStartButtonState(simulationSettings.running);
  });
  ui.reset.addEventListener('click', () => {
    stopSimulation();
    particleSystem?.reset();
  });
  ui.randomize.addEventListener('click', () => {
    currentParams = randomizeParams(getPreset(selectedPresetId).defaultParams);
    renderParameterControls();
    rebuildCurveAndParticles();
    commitHistoryIfChanged();
  });
  ui.defaults.addEventListener('click', () => {
    currentParams = cloneParams(getPreset(selectedPresetId).defaultParams);
    renderParameterControls();
    rebuildCurveAndParticles();
    commitHistoryIfChanged();
  });
  ui.collapseToggle.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
  });
  ui.collapseToggle.addEventListener('click', () => {
    const collapsed = ui.panel.classList.toggle('is-collapsed');
    ui.collapseToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  });
}

function bindHistoryShortcuts(): void {
  window.addEventListener('keydown', (event) => {
    if (document.activeElement instanceof HTMLInputElement && document.activeElement.classList.contains('value-editor')) {
      return;
    }
    const key = event.key.toLowerCase();
    const undoRequested = event.ctrlKey && key === 'z' && !event.shiftKey;
    const redoRequested = event.ctrlKey && (key === 'y' || (key === 'z' && event.shiftKey));
    if (!undoRequested && !redoRequested) {
      return;
    }
    event.preventDefault();
    const state = undoRequested ? history.undo() : history.redo();
    if (state) {
      applySerializableState(state);
    }
  });
}

function handleResize(camera: PerspectiveCamera): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio * 1.5, 3));
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  clampPanelToViewport();
}

async function initApp(): Promise<void> {
  if (!('gpu' in navigator)) {
    showWarning(ui, 'WebGPU is required for this project. Open it in a current Chromium-based browser with WebGPU enabled.');
    return;
  }

  scene = new Scene();
  scene.background = new Color(0x111622);

  const camera = new PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.01, 100);
  camera.position.set(0, 0.2, 5.2);

  renderer = new WebGPURenderer({ antialias: true, canvas: appCanvas });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio * 1.5, 3));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  await renderer.init();

  const backend = renderer.backend as { isWebGPUBackend?: boolean };
  if (!backend.isWebGPUBackend) {
    throw new Error('Strict WebGPU mode is required, but Three.js initialized a fallback backend.');
  }

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.target.set(0, 0, 0);
  controls.mouseButtons = {
    LEFT: -1 as unknown as MOUSE,
    MIDDLE: MOUSE.PAN,
    RIGHT: MOUSE.ROTATE,
  };
  controls.update();

  renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('contextmenu', (event) => event.preventDefault());

  curveData = generateAttractorCurve(getPreset(selectedPresetId), currentParams);
  curveColors = buildGradientColors(curveData.progress, materialSettings);
  curveGeometry = createCurveGeometry(curveData, curveColors);
  const curveMaterial = new LineBasicNodeMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
  });
  curveLine = new Line(curveGeometry, curveMaterial);
  curveLine.frustumCulled = false;
  curveLine.visible = materialSettings.curveVisible;
  scene.add(curveLine);

  history = new HistoryController(getSerializableState());
  bindPresetSelect();
  bindSectionCollapseToggles();
  bindPanelDrag();
  bindStaticControls();
  bindHistoryShortcuts();
  renderParameterControls();
  syncStaticControlsFromState();
  rebuildParticleSystem();
  setStartButtonState(false);
  updateStats();

  window.addEventListener('resize', () => handleResize(camera));
  handleResize(camera);

  let lastTime = performance.now();
  let fpsAccumulator = 0;
  let fpsFrames = 0;
  let fpsValue = 0;

  renderer.setAnimationLoop((now) => {
    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    controls.update();

    if (simulationSettings.running) {
      particleSystem?.step(delta, simulationSettings.simulationRate);
    }

    fpsAccumulator += delta;
    fpsFrames += 1;
    if (fpsAccumulator >= 0.25) {
      fpsValue = fpsFrames / fpsAccumulator;
      fpsAccumulator = 0;
      fpsFrames = 0;
      updateStats(fpsValue);
    }

    renderer.render(scene, camera);
  });
}

void initApp().catch((error: unknown) => {
  console.error(error);
  showWarning(ui, error instanceof Error ? error.message : 'Unable to initialize WebGPU renderer.');
});
