import * as THREE from "three";

export interface Shaders {
  fluidSimulation: {
    vertexShader: string;
    fragmentShader: string;
  };
  smokeVertexShader: string;
  smokeFragmentShader: string;
}

export async function loadShaders(): Promise<Shaders> {
  const fluidSimulationVertexShader = await loadShaderFile(
    "shaders/fluidSimulation.vert"
  );
  const fluidSimulationFragmentShader = await loadShaderFile(
    "shaders/fluidSimulation.frag"
  );
  const smokeVertexShader = await loadShaderFile(
    "shaders/smokeVertexShader.vert"
  );
  const smokeFragmentShader = await loadShaderFile(
    "shaders/smokeFragmentShader.frag"
  );

  return {
    fluidSimulation: {
      vertexShader: fluidSimulationVertexShader,
      fragmentShader: fluidSimulationFragmentShader,
    },
    smokeVertexShader,
    smokeFragmentShader,
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
