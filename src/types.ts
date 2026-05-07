export type Vec3Tuple = [number, number, number];

export type AttractorParams = Record<string, number>;

export type AttractorId =
  | 'thomas'
  | 'aizawa'
  | 'lorenz'
  | 'dadras'
  | 'chen'
  | 'lorenz83'
  | 'rossler'
  | 'halvorsen'
  | 'rabinovichFabrikant'
  | 'threeScroll'
  | 'sprott'
  | 'fourWing';

export type AttractorPreset = {
  id: AttractorId;
  label: string;
  defaultParams: AttractorParams;
  initialState: Vec3Tuple;
  dt: number;
  warmupSteps: number;
  derivative: (state: Vec3Tuple, params: AttractorParams) => Vec3Tuple;
};

export type ParameterRange = {
  min: number;
  max: number;
  step: number;
};

export type CurveData = {
  positions: Float32Array;
  progress: Float32Array;
  pointCount: number;
  boundsRadius: number;
};

export type MaterialSettings = {
  gradientStart: string;
  gradientEnd: string;
  gradientContrast: number;
  gradientBias: number;
  gradientBlur: number;
  particleSize: number;
  particleSpread: number;
  curveVisible: boolean;
};

export type SimulationSettings = {
  running: boolean;
  simulationRate: number;
  particleAmount: number;
};

export type SerializableAppState = {
  presetId: AttractorId;
  params: AttractorParams;
  material: MaterialSettings;
  simulationRate: number;
  particleAmount: number;
};
