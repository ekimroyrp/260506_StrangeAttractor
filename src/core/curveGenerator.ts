import type { AttractorParams, AttractorPreset, CurveData, Vec3Tuple } from '../types';
import { addVec3, scaleVec3 } from './attractorPresets';

export type CurveOptions = {
  pointCount?: number;
  sceneRadius?: number;
};

const DEFAULT_POINT_COUNT = 12000;
const DEFAULT_SCENE_RADIUS = 2.35;
const MAX_ABS_COORD = 1e7;

export function rk4Step(
  preset: AttractorPreset,
  state: Vec3Tuple,
  params: AttractorParams,
  dt = preset.dt,
): Vec3Tuple {
  const k1 = preset.derivative(state, params);
  const k2 = preset.derivative(addVec3(state, scaleVec3(k1, dt * 0.5)), params);
  const k3 = preset.derivative(addVec3(state, scaleVec3(k2, dt * 0.5)), params);
  const k4 = preset.derivative(addVec3(state, scaleVec3(k3, dt)), params);
  return [
    state[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    state[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    state[2] + (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
  ];
}

function isFiniteState(state: Vec3Tuple): boolean {
  return state.every((value) => Number.isFinite(value) && Math.abs(value) < MAX_ABS_COORD);
}

export function generateAttractorCurve(
  preset: AttractorPreset,
  params: AttractorParams,
  options: CurveOptions = {},
): CurveData {
  const pointCount = options.pointCount ?? DEFAULT_POINT_COUNT;
  const sceneRadius = options.sceneRadius ?? DEFAULT_SCENE_RADIUS;
  const raw = new Float32Array(pointCount * 3);
  const progress = new Float32Array(pointCount);
  let state: Vec3Tuple = [...preset.initialState];

  for (let i = 0; i < preset.warmupSteps; i += 1) {
    state = rk4Step(preset, state, params);
    if (!isFiniteState(state)) {
      state = [...preset.initialState];
      break;
    }
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  let written = 0;

  for (let i = 0; i < pointCount; i += 1) {
    state = rk4Step(preset, state, params);
    if (!isFiniteState(state)) {
      break;
    }

    const write = i * 3;
    raw[write] = state[0];
    raw[write + 1] = state[1];
    raw[write + 2] = state[2];
    minX = Math.min(minX, state[0]);
    minY = Math.min(minY, state[1]);
    minZ = Math.min(minZ, state[2]);
    maxX = Math.max(maxX, state[0]);
    maxY = Math.max(maxY, state[1]);
    maxZ = Math.max(maxZ, state[2]);
    progress[i] = i / Math.max(1, pointCount - 1);
    written += 1;
  }

  if (written < 2) {
    throw new Error(`Unable to generate a stable curve for ${preset.label}.`);
  }

  const centerX = (minX + maxX) * 0.5;
  const centerY = (minY + maxY) * 0.5;
  const centerZ = (minZ + maxZ) * 0.5;
  const extentX = maxX - minX;
  const extentY = maxY - minY;
  const extentZ = maxZ - minZ;
  const maxExtent = Math.max(extentX, extentY, extentZ, 1e-8);
  const scale = sceneRadius / maxExtent;
  const positions = new Float32Array(written * 3);
  const trimmedProgress = new Float32Array(written);
  let maxRadius = 0;

  for (let i = 0; i < written; i += 1) {
    const read = i * 3;
    const x = (raw[read] - centerX) * scale;
    const y = (raw[read + 1] - centerY) * scale;
    const z = (raw[read + 2] - centerZ) * scale;
    positions[read] = x;
    positions[read + 1] = y;
    positions[read + 2] = z;
    trimmedProgress[i] = i / Math.max(1, written - 1);
    maxRadius = Math.max(maxRadius, Math.sqrt(x * x + y * y + z * z));
  }

  return {
    positions,
    progress: trimmedProgress,
    pointCount: written,
    boundsRadius: maxRadius,
  };
}
