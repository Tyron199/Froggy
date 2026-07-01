import * as THREE from 'three';
import {
  WATER_COLOR_BASE,
  WATER_COLOR_CREST,
  WATER_COLOR_TROUGH,
  WATER_NORMAL_STRENGTH,
  WATER_SHIMMER_AMPLITUDE,
  WATER_SHIMMER_FREQUENCY,
  WATER_SHIMMER_SECONDARY_AMPLITUDE,
  WATER_SHIMMER_SECONDARY_FREQUENCY,
  WATER_SHIMMER_SECONDARY_SPEED,
  WATER_SHIMMER_SPEED,
  WATER_SIZE,
} from '../game/constants.ts';

const MAX_SHIMMER = WATER_SHIMMER_AMPLITUDE + WATER_SHIMMER_SECONDARY_AMPLITUDE;

/** Formats a number as a GLSL float literal (always includes a decimal point). */
function glslFloat(n: number): string {
  return Number.isInteger(n) ? `${n}.0` : `${n}`;
}

const WAVE_FIELD_GLSL = `
  float waterWave(vec2 p, float t) {
    return sin(p.x * ${glslFloat(WATER_SHIMMER_FREQUENCY)} + p.y * ${glslFloat(WATER_SHIMMER_FREQUENCY * 0.6)} + t * ${glslFloat(WATER_SHIMMER_SPEED)}) * ${glslFloat(WATER_SHIMMER_AMPLITUDE)}
         + sin(p.x * ${glslFloat(WATER_SHIMMER_SECONDARY_FREQUENCY * 1.3)} - p.y * ${glslFloat(WATER_SHIMMER_SECONDARY_FREQUENCY)} + t * ${glslFloat(WATER_SHIMMER_SECONDARY_SPEED)}) * ${glslFloat(WATER_SHIMMER_SECONDARY_AMPLITUDE)};
  }
`;

export class WaterPlane {
  readonly mesh: THREE.Mesh;
  private shaderRef: { uniforms: { uTime: { value: number } } } | null = null;

  constructor(size = WATER_SIZE) {
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshPhongMaterial({ color: WATER_COLOR_BASE, specular: 0x9fd8ff, shininess: 70 });

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uCrestColor = { value: new THREE.Color(WATER_COLOR_CREST) };
      shader.uniforms.uTroughColor = { value: new THREE.Color(WATER_COLOR_TROUGH) };

      shader.vertexShader = shader.vertexShader
        .replace('varying vec3 vViewPosition;', 'varying vec3 vViewPosition;\nvarying vec3 vWaterWorldPos;')
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvWaterWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          'uniform float shininess;',
          `uniform float shininess;
          uniform float uTime;
          uniform vec3 uCrestColor;
          uniform vec3 uTroughColor;
          varying vec3 vWaterWorldPos;
          ${WAVE_FIELD_GLSL}`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          {
            float h = waterWave(vWaterWorldPos.xz, uTime);
            float crestT = clamp(h / ${glslFloat(MAX_SHIMMER)}, -1.0, 1.0);
            diffuseColor.rgb = mix(diffuseColor.rgb, crestT >= 0.0 ? uCrestColor : uTroughColor, abs(crestT) * 0.6);
          }`,
        )
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
          {
            float eps = 0.4;
            vec2 p = vWaterWorldPos.xz;
            float hL = waterWave(p - vec2(eps, 0.0), uTime);
            float hR = waterWave(p + vec2(eps, 0.0), uTime);
            float hD = waterWave(p - vec2(0.0, eps), uTime);
            float hU = waterWave(p + vec2(0.0, eps), uTime);
            normal = normalize(normal + vec3((hL - hR) * ${glslFloat(WATER_NORMAL_STRENGTH)}, 0.0, (hD - hU) * ${glslFloat(WATER_NORMAL_STRENGTH)}));
          }`,
        );

      this.shaderRef = shader as unknown as { uniforms: { uTime: { value: number } } };
    };

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.receiveShadow = true;
  }

  /** Recenters the (finite) water plane under a world XZ point, so it reads as an infinite pond. */
  recenter(x: number, z: number): void {
    this.mesh.position.set(x, 0, z);
  }

  /** Advances the shimmer field's clock; the surface itself never moves, only its lit appearance. */
  update(elapsedTime: number): void {
    if (this.shaderRef) this.shaderRef.uniforms.uTime.value = elapsedTime;
  }
}
