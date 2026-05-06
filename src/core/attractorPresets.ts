import type { AttractorId, AttractorParams, AttractorPreset, ParameterRange, Vec3Tuple } from '../types';

function p(params: AttractorParams, key: string): number {
  const value = params[key];
  if (!Number.isFinite(value)) {
    throw new Error(`Attractor parameter "${key}" is missing or invalid.`);
  }
  return value;
}

export const ATTRACTOR_PRESETS: AttractorPreset[] = [
  {
    id: 'thomas',
    label: 'Thomas',
    defaultParams: { b: 0.208186 },
    initialState: [1.1, 1.1, -0.01],
    dt: 0.025,
    warmupSteps: 300,
    derivative: ([x, y, z], params) => {
      const b = p(params, 'b');
      return [Math.sin(y) - b * x, Math.sin(z) - b * y, Math.sin(x) - b * z];
    },
  },
  {
    id: 'aizawa',
    label: 'Aizawa',
    defaultParams: { a: 0.95, b: 0.7, c: 0.6, d: 3.5, e: 0.25, f: 0.1 },
    initialState: [0.12, 0.1, 0.1],
    dt: 0.01,
    warmupSteps: 600,
    derivative: ([x, y, z], params) => {
      const a = p(params, 'a');
      const b = p(params, 'b');
      const c = p(params, 'c');
      const d = p(params, 'd');
      const e = p(params, 'e');
      const f = p(params, 'f');
      const radiusSq = x * x + y * y;
      return [
        (z - b) * x - d * y,
        d * x + (z - b) * y,
        c + a * z - (z * z * z) / 3 - radiusSq * (1 + e * z) + f * z * x * x * x,
      ];
    },
  },
  {
    id: 'lorenz',
    label: 'Lorenz',
    defaultParams: { sigma: 10, rho: 28, beta: 8 / 3 },
    initialState: [0.1, 0, 0],
    dt: 0.006,
    warmupSteps: 900,
    derivative: ([x, y, z], params) => {
      const sigma = p(params, 'sigma');
      const rho = p(params, 'rho');
      const beta = p(params, 'beta');
      return [sigma * (-x + y), -x * z + rho * x - y, x * y - beta * z];
    },
  },
  {
    id: 'dadras',
    label: 'Dadras',
    defaultParams: { a: 3, b: 2.7, c: 1.7, d: 2, e: 9 },
    initialState: [0.2, 0.1, 0.2],
    dt: 0.004,
    warmupSteps: 900,
    derivative: ([x, y, z], params) => {
      const a = p(params, 'a');
      const b = p(params, 'b');
      const c = p(params, 'c');
      const d = p(params, 'd');
      const e = p(params, 'e');
      return [y - a * x + b * y * z, c * y - x * z + z, d * x * y - e * z];
    },
  },
  {
    id: 'chen',
    label: 'Chen',
    defaultParams: { alpha: 5, beta: -10, delta: -0.38 },
    initialState: [0.4, 0.1, 0.3],
    dt: 0.008,
    warmupSteps: 700,
    derivative: ([x, y, z], params) => {
      const alpha = p(params, 'alpha');
      const beta = p(params, 'beta');
      const delta = p(params, 'delta');
      return [alpha * x - y * z, beta * y + x * z, delta * z + (x * y) / 3];
    },
  },
  {
    id: 'lorenz83',
    label: 'Lorenz83',
    defaultParams: { a: 0.95, b: 7.91, f: 4.83, g: 4.66 },
    initialState: [0.1, 0.1, 0.1],
    dt: 0.006,
    warmupSteps: 800,
    derivative: ([x, y, z], params) => {
      const a = p(params, 'a');
      const b = p(params, 'b');
      const f = p(params, 'f');
      const g = p(params, 'g');
      return [-a * x - y * y - z * z + a * f, -y + x * y - b * x * z + g, -z + b * x * y + x * z];
    },
  },
  {
    id: 'rossler',
    label: 'Rössler',
    defaultParams: { a: 0.2, b: 0.2, c: 5.7 },
    initialState: [0.1, 0, 0],
    dt: 0.02,
    warmupSteps: 900,
    derivative: ([x, y, z], params) => {
      const a = p(params, 'a');
      const b = p(params, 'b');
      const c = p(params, 'c');
      return [-(y + z), x + a * y, b + z * (x - c)];
    },
  },
  {
    id: 'halvorsen',
    label: 'Halvorsen',
    defaultParams: { a: 1.89 },
    initialState: [0.1, 0, 0],
    dt: 0.006,
    warmupSteps: 900,
    derivative: ([x, y, z], params) => {
      const a = p(params, 'a');
      return [-a * x - 4 * y - 4 * z - y * y, -a * y - 4 * z - 4 * x - z * z, -a * z - 4 * x - 4 * y - x * x];
    },
  },
  {
    id: 'rabinovichFabrikant',
    label: 'Rabinovich-Fabrikant',
    defaultParams: { alpha: 0.14, gamma: 0.1 },
    initialState: [0.1, 0.1, 0.1],
    dt: 0.004,
    warmupSteps: 1200,
    derivative: ([x, y, z], params) => {
      const alpha = p(params, 'alpha');
      const gamma = p(params, 'gamma');
      return [
        y * (z - 1 + x * x) + gamma * x,
        x * (3 * z + 1 - x * x) + gamma * y,
        -2 * z * (alpha + x * y),
      ];
    },
  },
  {
    id: 'threeScroll',
    label: 'Three-Scroll Unified Chaotic System',
    defaultParams: { a: 32.48, b: 45.84, c: 1.18, d: 0.13, e: 0.57, f: 14.7 },
    initialState: [0.1, 0.1, 0.1],
    dt: 0.0016,
    warmupSteps: 1600,
    derivative: ([x, y, z], params) => {
      const a = p(params, 'a');
      const b = p(params, 'b');
      const c = p(params, 'c');
      const d = p(params, 'd');
      const e = p(params, 'e');
      const f = p(params, 'f');
      return [a * (y - x) + d * x * z, b * x - x * z + f * y, c * z + x * y - e * x * x];
    },
  },
  {
    id: 'sprott',
    label: 'Sprott',
    defaultParams: { a: 2.07, b: 1.79 },
    initialState: [0.1, 0.1, 0.1],
    dt: 0.006,
    warmupSteps: 1000,
    derivative: ([x, y, z], params) => {
      const a = p(params, 'a');
      const b = p(params, 'b');
      return [y + a * x * y + x * z, 1 - b * x * x + y * z, x - x * x - y * y];
    },
  },
  {
    id: 'fourWing',
    label: 'Four-Wing',
    defaultParams: { a: 0.2, b: 0.01, c: -0.4 },
    initialState: [0.2, 0.1, 0.1],
    dt: 0.012,
    warmupSteps: 900,
    derivative: ([x, y, z], params) => {
      const a = p(params, 'a');
      const b = p(params, 'b');
      const c = p(params, 'c');
      return [a * x + y * z, b * x + c * y - x * z, -z - x * y];
    },
  },
];

export function getPreset(id: AttractorId): AttractorPreset {
  const preset = ATTRACTOR_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) {
    throw new Error(`Unknown attractor preset: ${id}`);
  }
  return preset;
}

export function cloneParams(params: AttractorParams): AttractorParams {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, value]));
}

export function getParameterRange(defaultValue: number): ParameterRange {
  const min = defaultValue < 0 ? defaultValue * 1.5 : defaultValue * 0.5;
  const max = defaultValue < 0 ? defaultValue * 0.5 : defaultValue * 1.5;
  const step = Math.abs(defaultValue) < 1 ? 0.001 : 0.01;
  if (defaultValue === 0) {
    return { min: -1, max: 1, step: 0.001 };
  }
  return { min, max, step };
}

export function randomizeParams(params: AttractorParams, random = Math.random): AttractorParams {
  const randomized: AttractorParams = {};
  for (const [key, defaultValue] of Object.entries(params)) {
    const range = getParameterRange(defaultValue);
    randomized[key] = range.min + (range.max - range.min) * random();
  }
  return randomized;
}

export function isAttractorId(value: string): value is AttractorId {
  return ATTRACTOR_PRESETS.some((preset) => preset.id === value);
}

export function addVec3(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function scaleVec3(v: Vec3Tuple, scale: number): Vec3Tuple {
  return [v[0] * scale, v[1] * scale, v[2] * scale];
}
