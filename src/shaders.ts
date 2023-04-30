import * as THREE from "three";

export interface Shaders {
  advection: THREE.ShaderMaterial;
  splat: THREE.ShaderMaterial;
  divergence: THREE.ShaderMaterial;
  jacobi: THREE.ShaderMaterial;
  pressure: THREE.ShaderMaterial;
  gradientSubtract: THREE.ShaderMaterial;
}

async function loadShaderFile(shaderPath: string): Promise<string> {
  const response = await fetch(shaderPath);
  return response.text();
}

export function createFullscreenQuad(): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    -1.0, -1.0, 0.0, 3.0, -1.0, 0.0, -1.0, 3.0, 0.0,
  ]);
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  const material = new THREE.MeshBasicMaterial();
  return new THREE.Mesh(geometry, material);
}

function createShaderMaterial(
  vertexShader: string,
  fragmentShader: string,
  uniforms: any
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  });
}

export async function loadShaders(): Promise<Shaders> {
  const shaders: Shaders = {
    advection: null,
    splat: null,
    divergence: null,
    jacobi: null,
    pressure: null,
    gradientSubtract: null,
  };

  const advectionVertexShader = await loadShaderFile("shaders/advection.vert");
  const advectionFragmentShader = await loadShaderFile(
    "shaders/advection.frag"
  );
  shaders.advection = createShaderMaterial(
    advectionVertexShader,
    advectionFragmentShader,
    {
      velocity: { value: null },
      source: { value: null },
      dissipation: { value: null },
      dt: { value: null },
    }
  );

  const splatVertexShader = await loadShaderFile("shaders/splat.vert");
  const splatFragmentShader = await loadShaderFile("shaders/splat.frag");
  shaders.splat = createShaderMaterial(splatVertexShader, splatFragmentShader, {
    uTarget: { value: null },
    aspectRatio: { value: null },
    point: { value: null },
    color: { value: null },
    radius: { value: null },
  });

  const divergenceVertexShader = await loadShaderFile(
    "shaders/divergence.vert"
  );
  const divergenceFragmentShader = await loadShaderFile(
    "shaders/divergence.frag"
  );
  shaders.divergence = createShaderMaterial(
    divergenceVertexShader,
    divergenceFragmentShader,
    {
      velocity: { value: null },
    }
  );

  const jacobiVertexShader = await loadShaderFile("shaders/jacobi.vert");
  const jacobiFragmentShader = await loadShaderFile("shaders/jacobi.frag");
  shaders.jacobi = createShaderMaterial(
    jacobiVertexShader,
    jacobiFragmentShader,
    {
      pressure: { value: null },
      divergence: { value: null },
    }
  );

  const pressureVertexShader = await loadShaderFile("shaders/pressure.vert");
  const pressureFragmentShader = await loadShaderFile("shaders/pressure.frag");
  shaders.pressure = createShaderMaterial(
    pressureVertexShader,
    pressureFragmentShader,
    {
      pressure: { value: null },
      gradient: { value: null },
    }
  );

  const gradientSubtractVertexShader = await loadShaderFile(
    "shaders/gradientSubtract.vert"
  );
  const gradientSubtractFragmentShader = await loadShaderFile(
    "shaders/gradientSubtract.frag"
  );
  shaders.gradientSubtract = createShaderMaterial(
    gradientSubtractVertexShader,
    gradientSubtractFragmentShader,
    {
      velocity: { value: null },
      pressure: { value: null },
    }
  );

  return shaders;
}
