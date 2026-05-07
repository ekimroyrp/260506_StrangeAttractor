import { describe, expect, it } from 'vitest';
import { ATTRACTOR_PRESETS, getParameterRange, getPreset, randomizeParams } from '../src/core/attractorPresets';
import { generateAttractorCurve, rk4Step } from '../src/core/curveGenerator';
import { HistoryController } from '../src/core/history';
import { getParticleOpacityForAmount } from '../src/core/particleFlowSystem';
import type { AttractorParams, SerializableAppState, Vec3Tuple } from '../src/types';

function closeVec3(actual: Vec3Tuple, expected: Vec3Tuple, tolerance = 1e-9): void {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < actual.length; i += 1) {
    expect(Math.abs(actual[i] - expected[i])).toBeLessThan(tolerance);
  }
}

function baseState(params: AttractorParams = { b: 0.208186 }): SerializableAppState {
  return {
    presetId: 'thomas',
    params,
    material: {
      gradientStart: '#b19eff',
      gradientEnd: '#ffae00',
      gradientContrast: 1.4,
      gradientBias: -0.4,
      gradientBlur: 0.35,
      particleSize: 0.03,
      particleSpread: 0.1,
      curveVisible: true,
    },
    simulationRate: 0.3,
    particleAmount: 500000,
  };
}

describe('attractor presets', () => {
  it('defines all requested attractors with finite defaults', () => {
    expect(ATTRACTOR_PRESETS.map((preset) => preset.id)).toEqual([
      'thomas',
      'aizawa',
      'lorenz',
      'dadras',
      'chen',
      'lorenz83',
      'rossler',
      'halvorsen',
      'rabinovichFabrikant',
      'threeScroll',
      'sprott',
      'fourWing',
    ]);

    for (const preset of ATTRACTOR_PRESETS) {
      expect(Object.keys(preset.defaultParams).length).toBeGreaterThan(0);
      expect(preset.dt).toBeGreaterThan(0);
      expect(preset.warmupSteps).toBeGreaterThan(0);
      expect(preset.initialState.every(Number.isFinite)).toBe(true);
      for (const value of Object.values(preset.defaultParams)) {
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });

  it('matches known derivative values for Thomas and Lorenz', () => {
    const thomas = getPreset('thomas');
    closeVec3(
      thomas.derivative([1, 2, 3], thomas.defaultParams),
      [
        Math.sin(2) - 0.208186,
        Math.sin(3) - 0.208186 * 2,
        Math.sin(1) - 0.208186 * 3,
      ],
    );

    const lorenz = getPreset('lorenz');
    closeVec3(lorenz.derivative([1, 2, 3], lorenz.defaultParams), [10, 23, 2 - 8]);
  });

  it('creates deterministic RK4 steps', () => {
    const preset = getPreset('rossler');
    const a = rk4Step(preset, preset.initialState, preset.defaultParams);
    const b = rk4Step(preset, preset.initialState, preset.defaultParams);
    closeVec3(a, b);
  });
});

describe('parameter ranges', () => {
  it('uses requested default-relative ranges and step sizes', () => {
    expect(getParameterRange(10)).toEqual({ min: 5, max: 15, step: 0.01 });
    expect(getParameterRange(-10)).toEqual({ min: -15, max: -5, step: 0.01 });
    expect(getParameterRange(0.2)).toEqual({ min: 0.1, max: 0.30000000000000004, step: 0.001 });
  });

  it('randomizes within each default range', () => {
    const randomized = randomizeParams({ a: 2, b: -4, c: 0.2 }, () => 0.5);
    expect(randomized.a).toBe(2);
    expect(randomized.b).toBe(-4);
    expect(randomized.c).toBeCloseTo(0.2);
  });
});

describe('curve generation', () => {
  it('normalizes every preset into a finite bounded curve', () => {
    for (const preset of ATTRACTOR_PRESETS) {
      const curve = generateAttractorCurve(preset, preset.defaultParams, { pointCount: 900, sceneRadius: 2.35 });
      expect(curve.pointCount).toBeGreaterThan(100);
      expect(curve.positions.length).toBe(curve.pointCount * 3);
      expect(curve.progress.length).toBe(curve.pointCount);
      expect(curve.boundsRadius).toBeGreaterThan(0);
      expect(curve.boundsRadius).toBeLessThan(3.2);
      for (const value of curve.positions) {
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });
});

describe('history controller', () => {
  it('supports undo and redo state transitions', () => {
    const first = baseState();
    const second = baseState({ b: 0.25 });
    const history = new HistoryController(first);

    history.commit(second);
    expect(history.undoCount).toBe(1);
    expect(history.redoCount).toBe(0);
    expect(history.undo()).toEqual(first);
    expect(history.undoCount).toBe(0);
    expect(history.redoCount).toBe(1);
    expect(history.redo()).toEqual(second);
  });

  it('ignores duplicate commits', () => {
    const state = baseState();
    const history = new HistoryController(state);
    history.commit(state);
    expect(history.undoCount).toBe(0);
    expect(history.redoCount).toBe(0);
  });
});

describe('particle display tuning', () => {
  it('reduces additive opacity as particle counts rise', () => {
    const low = getParticleOpacityForAmount(1000);
    const defaultAmount = getParticleOpacityForAmount(500000);
    const high = getParticleOpacityForAmount(5000000);

    expect(low).toBeGreaterThan(defaultAmount);
    expect(defaultAmount).toBeGreaterThan(high);
    expect(high).toBeGreaterThanOrEqual(0.0015);
    expect(low).toBeLessThanOrEqual(0.035);
  });
});
