import * as THREE from "three";

export interface Shaders {
  fluidSimulation: THREE.ShaderMaterial;
}

export async function loadShaders(): Promise<Shaders> {
  const fluidSimulationVertexShader = await loadShaderFile(
    "shaders/fluidSimulation.vert"
  );
  const fluidSimulationFragmentShader = await loadShaderFile(
    "shaders/fluidSimulation.frag"
  );

  const fluidSimulation = new THREE.ShaderMaterial({
    vertexShader: fluidSimulationVertexShader,
    fragmentShader: fluidSimulationFragmentShader,
    uniforms: {
      u_resolution: { value: new THREE.Vector2() },
      u_velocityTexture: { value: null },
      u_time: { value: 0.0 },
      u_deltaTime: { value: 0.0 },
    },
  });

  return {
    fluidSimulation,
  };
}

export function createFullscreenQuad(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.MeshBasicMaterial();
  return new THREE.Mesh(geometry, material);
}

async function loadShaderFile(shaderPath: string): Promise<string> {
  const response = await fetch(shaderPath);
  return response.text();
}
