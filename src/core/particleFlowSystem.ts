import {
  AdditiveBlending,
  BufferGeometry,
  Scene,
  Sprite,
  SpriteNodeMaterial,
  WebGPURenderer,
} from 'three/webgpu';
import {
  Fn,
  attributeArray,
  float,
  hash,
  instanceIndex,
  instancedArray,
  mix,
  shapeCircle,
  uniform,
  uint,
  vec4,
} from 'three/tsl';
import type { CurveData } from '../types';

export class ParticleFlowSystem {
  readonly object: Sprite;

  private readonly amount: number;
  private readonly renderer: WebGPURenderer;
  private readonly scene: Scene;
  private readonly simulationRate = uniform(1);
  private readonly deltaTime = uniform(1 / 60);
  private readonly particleSize = uniform(0.045);
  private readonly initCompute: Parameters<WebGPURenderer['compute']>[0];
  private readonly updateCompute: Parameters<WebGPURenderer['compute']>[0];
  private readonly material: SpriteNodeMaterial;
  private readonly geometry: BufferGeometry;

  constructor(
    renderer: WebGPURenderer,
    scene: Scene,
    curve: CurveData,
    curveColors: Float32Array,
    amount: number,
    particleSize: number,
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.amount = amount;
    this.particleSize.value = particleSize;

    const pathPositions = attributeArray(curve.positions, 'vec3');
    const pathColors = attributeArray(curveColors, 'vec3');
    const pathT = instancedArray(amount, 'float');
    const pathIndex = instancedArray(amount, 'float');
    const particleSpeed = instancedArray(amount, 'float');
    const particlePosition = instancedArray(amount, 'vec3');
    const particleColor = instancedArray(amount, 'vec3');
    const lastPathIndex = Math.max(1, curve.pointCount - 1);
    const maxFloorIndex = Math.max(0, curve.pointCount - 2);

    const samplePath = Fn(() => {
      const t = pathT.element(instanceIndex);
      const speed = particleSpeed.element(instanceIndex);
      const nextT = t.add(this.deltaTime.mul(this.simulationRate).mul(speed).mul(0.035)).mod(1).toVar();
      t.assign(nextT);

      const scaled = nextT.mul(float(lastPathIndex)).toVar();
      const floorIndex = scaled.floor().min(float(maxFloorIndex)).max(0).toVar();
      const readIndex = uint(floorIndex);
      const nextIndex = readIndex.add(uint(1));
      const blend = scaled.sub(floorIndex).toVar();
      const p0 = pathPositions.element(readIndex);
      const p1 = pathPositions.element(nextIndex);
      const c0 = pathColors.element(readIndex);
      const c1 = pathColors.element(nextIndex);

      pathIndex.element(instanceIndex).assign(floorIndex);
      particlePosition.element(instanceIndex).assign(mix(p0, p1, blend));
      particleColor.element(instanceIndex).assign(mix(c0, c1, blend));
    });

    const init = Fn(() => {
      pathT.element(instanceIndex).assign(hash(instanceIndex.add(uint(17))));
      particleSpeed.element(instanceIndex).assign(hash(instanceIndex.add(uint(811))).mul(0.75).add(0.45));
      samplePath();
    });

    this.initCompute = (init() as unknown as { compute: (count: number, workgroupSize: number[]) => { setName: (name: string) => unknown } })
      .compute(amount, [128])
      .setName('Init Attractor Particles') as Parameters<WebGPURenderer['compute']>[0];
    this.updateCompute = (samplePath() as unknown as { compute: (count: number, workgroupSize: number[]) => { setName: (name: string) => unknown } })
      .compute(amount, [128])
      .setName('Update Attractor Particles') as Parameters<WebGPURenderer['compute']>[0];

    this.material = new SpriteNodeMaterial({
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.72,
    });
    this.material.positionNode = particlePosition.toAttribute();
    this.material.colorNode = vec4(particleColor.toAttribute(), 1);
    this.material.opacityNode = shapeCircle();
    this.material.scaleNode = this.particleSize;
    this.material.alphaToCoverage = true;

    this.geometry = new BufferGeometry();
    this.object = new Sprite(this.material);
    this.object.count = amount;
    this.object.frustumCulled = false;
    this.scene.add(this.object);
    this.reset();
  }

  get particleAmount(): number {
    return this.amount;
  }

  setSimulationRate(value: number): void {
    this.simulationRate.value = value;
  }

  setParticleSize(value: number): void {
    this.particleSize.value = value;
  }

  reset(): void {
    this.renderer.compute(this.initCompute);
  }

  step(deltaSeconds: number, simulationRate: number): void {
    this.deltaTime.value = Math.min(1 / 20, Math.max(0, deltaSeconds));
    this.simulationRate.value = simulationRate;
    this.renderer.compute(this.updateCompute);
  }

  dispose(): void {
    this.scene.remove(this.object);
    this.geometry.dispose();
    this.material.dispose();
  }
}
