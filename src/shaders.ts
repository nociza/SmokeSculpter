import * as THREE from "three";

export interface Shaders {
  initializeSmokeProgram;
  initializeVelocityProgram;
  addBuoyancyForceProgram;
  advectVelocityProgram;
  computePressureProgram;
  addPressureForceProgram;
  decayVelocityProgram;
  advectSmokeProgram;
  addSmokeProgram;
  renderVelocityProgram;
  renderDensityProgram;
  renderTemperatureProgram;
  initializeSmokeUniforms;
  addBuoyancyForceUniforms;
  advectVelocityUniforms;
  computePressureUniforms;
  addPressureForceUniforms;
  decayVelocityUniforms;
  advectSmokeUniforms;
  addSmokeUniforms;
  renderVelocityUniforms;
  renderDensityUniforms;
  renderTemperatureUniforms;
}

export async function loadShaderFile(shaderPath: string): Promise<string> {
  const response = await fetch(shaderPath);
  return response.text();
}

function createShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) + source);
    }
    return shader;
}

function createProgramFromSource(gl, vertexShaderSource, fragmentShaderSource) {
  const program = gl.createProgram();
  gl.attachShader(
    program,
    createShader(gl, vertexShaderSource, gl.VERTEX_SHADER)
  );
  gl.attachShader(
    program,
    createShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER)
  );
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  return program;
}

function getUniformLocations(gl, program, keys) {
  const locations = {};
  keys.forEach((key) => {
    locations[key] = gl.getUniformLocation(program, key);
  });
  return locations;
}

export async function loadShaders(
  gl: WebGL2RenderingContext
): Promise<Shaders> {
  const initializeVelocityProgram = createProgramFromSource(
    gl,
    await loadShaderFile("shaders/fill_viewport.vert"),
    await loadShaderFile("shaders/initialize_velocity.frag")
  );
  const initializeSmokeProgram = createProgramFromSource(
    gl,
    await loadShaderFile("shaders/fill_viewport.vert"),
    await loadShaderFile("shaders/initialize_smoke.frag")
  );
  const addBuoyancyForceProgram = createProgramFromSource(
    gl,
    await loadShaderFile("shaders/fill_viewport.vert"),
    await loadShaderFile("shaders/add_buoyancy_force.frag")
  );
  const advectVelocityProgram = createProgramFromSource(
    gl,
    await loadShaderFile("shaders/fill_viewport.vert"),
    await loadShaderFile("shaders/advect_velocity.frag")
  );
  const computePressureProgram = createProgramFromSource(
    gl,
    await loadShaderFile("shaders/fill_viewport.vert"),
    await loadShaderFile("shaders/compute_pressure.frag")
  );
  const addPressureForceProgram = createProgramFromSource(
    gl,
    await loadShaderFile("shaders/fill_viewport.vert"),
    await loadShaderFile("shaders/add_pressure_force.frag")
  );
  const decayVelocityProgram = createProgramFromSource(
    gl,
    await loadShaderFile("shaders/fill_viewport.vert"),
    await loadShaderFile("shaders/decay_velocity.frag")
  );
  const advectSmokeProgram = createProgramFromSource(
    gl,
    await loadShaderFile("shaders/fill_viewport.vert"),
    await loadShaderFile("shaders/advect_smoke.frag")
  );
  const addSmokeProgram = createProgramFromSource(
    gl,
    await loadShaderFile("shaders/fill_viewport.vert"),
    await loadShaderFile("shaders/add_smoke.frag")
  );
  const renderVelocityProgram = createProgramFromSource(
    gl,
    await loadShaderFile("shaders/raymarch.vert"),
    await loadShaderFile("shaders/render_velocity.frag")
  );
  const renderDensityProgram = createProgramFromSource(
    gl,
    await loadShaderFile("shaders/raymarch.vert"),
    await loadShaderFile("shaders/render_density.frag")
  );
  const renderTemperatureProgram = createProgramFromSource(
    gl,
    await loadShaderFile("shaders/raymarch.vert"),
    await loadShaderFile("shaders/render_temperature.frag")
  );

  const initializeSmokeUniforms = getUniformLocations(
    gl,
    initializeSmokeProgram,
    [
      "u_cellNum",
      "u_cellTextureSize",
      "u_resolution",
      "u_gridSpacing",
      "u_simulationSpace",
    ]
  );
  const addBuoyancyForceUniforms = getUniformLocations(
    gl,
    addBuoyancyForceProgram,
    [
      "u_cellNum",
      "u_cellTextureSize",
      "u_velocityTexture",
      "u_smokeTexture",
      "u_deltaTime",
      "u_densityScale",
      "u_temperatureScale",
    ]
  );
  const advectVelocityUniforms = getUniformLocations(
    gl,
    advectVelocityProgram,
    [
      "u_cellNum",
      "u_cellTextureSize",
      "u_resolution",
      "u_velocityTexture",
      "u_deltaTime",
      "u_gridSpacing",
    ]
  );
  const computePressureUniforms = getUniformLocations(
    gl,
    computePressureProgram,
    [
      "u_cellNum",
      "u_cellTextureSize",
      "u_resolution",
      "u_velocityTexture",
      "u_pressureTexture",
      "u_deltaTime",
      "u_gridSpacing",
      "u_density",
    ]
  );
  const addPressureForceUniforms = getUniformLocations(
    gl,
    addPressureForceProgram,
    [
      "u_cellNum",
      "u_cellTextureSize",
      "u_resolution",
      "u_velocityTexture",
      "u_pressureTexture",
      "u_deltaTime",
      "u_gridSpacing",
      "u_density",
    ]
  );
  const decayVelocityUniforms = getUniformLocations(gl, decayVelocityProgram, [
    "u_velocityTexture",
    "u_deltaTime",
    "u_velocityDecay",
  ]);
  const advectSmokeUniforms = getUniformLocations(gl, advectSmokeProgram, [
    "u_cellNum",
    "u_cellTextureSize",
    "u_resolution",
    "u_velocityTexture",
    "u_smokeTexture",
    "u_deltaTime",
    "u_gridSpacing",
  ]);
  const addSmokeUniforms = getUniformLocations(gl, addSmokeProgram, [
    "u_cellNum",
    "u_cellTextureSize",
    "u_resolution",
    "u_simulationSpace",
    "u_smokeTexture",
    "u_deltaTime",
    "u_gridSpacing",
    "u_addHeat",
    "u_mousePosition",
    "u_heatSourceRadius",
    "u_heatSourceIntensity",
    "u_densityDecay",
    "u_temperatureDecay",
  ]);
  const renderVelocityUniforms = getUniformLocations(
    gl,
    renderVelocityProgram,
    [
      "u_mvpMatrix",
      "u_modelMatrix",
      "u_invModelMatrix",
      "u_scale",
      "u_cameraPosition",
      "u_cellTextureSize",
      "u_resolution",
      "u_simulationSpace",
      "u_velocityTexture",
      "u_gridSpacing",
    ]
  );
  const renderDensityUniforms = getUniformLocations(gl, renderDensityProgram, [
    "u_mvpMatrix",
    "u_modelMatrix",
    "u_invModelMatrix",
    "u_scale",
    "u_cameraPosition",
    "u_cellTextureSize",
    "u_resolution",
    "u_simulationSpace",
    "u_smokeTexture",
    "u_gridSpacing",
  ]);
  const renderTemperatureUniforms = getUniformLocations(
    gl,
    renderTemperatureProgram,
    [
      "u_mvpMatrix",
      "u_modelMatrix",
      "u_invModelMatrix",
      "u_scale",
      "u_cameraPosition",
      "u_cellTextureSize",
      "u_resolution",
      "u_simulationSpace",
      "u_smokeTexture",
      "u_gridSpacing",
    ]
  );

  const shaders = {
    initializeSmokeProgram,
    initializeVelocityProgram,
    addBuoyancyForceProgram,
    advectVelocityProgram,
    computePressureProgram,
    addPressureForceProgram,
    decayVelocityProgram,
    advectSmokeProgram,
    addSmokeProgram,
    renderVelocityProgram,
    renderDensityProgram,
    renderTemperatureProgram,
    initializeSmokeUniforms,
    addBuoyancyForceUniforms,
    advectVelocityUniforms,
    computePressureUniforms,
    addPressureForceUniforms,
    decayVelocityUniforms,
    advectSmokeUniforms,
    addSmokeUniforms,
    renderVelocityUniforms,
    renderDensityUniforms,
    renderTemperatureUniforms,
  };

  return shaders;
}

