import { GUI } from "dat.gui";
import * as THREE from "three";
import Stats from "stats.js";
import { Vector2, Vector3, Matrix4 } from "./math";

(async function () {
  function createShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) + source);
    }
    return shader;
  }

  function createProgramFromSource(
    gl,
    vertexShaderSource,
    fragmentShaderSource
  ) {
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

  function createTexture(gl, width, height, internalFormat, format, type) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      width,
      height,
      0,
      format,
      type,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  }

  function createVelocityFramebuffer(gl, width, height) {
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    const velocityTexture = createTexture(
      gl,
      width,
      height,
      gl.RGBA32F,
      gl.RGBA,
      gl.FLOAT
    );
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      velocityTexture,
      0
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return {
      framebuffer: framebuffer,
      velocityTexture: velocityTexture,
    };
  }

  function createPressureFramebuffer(gl, width, height) {
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    const pressureTexture = createTexture(
      gl,
      width,
      height,
      gl.R32F,
      gl.RED,
      gl.FLOAT
    );
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      pressureTexture,
      0
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return {
      framebuffer: framebuffer,
      pressureTexture: pressureTexture,
    };
  }

  function createSmokeFramebuffer(gl, width, height) {
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    const smokeTexture = createTexture(
      gl,
      width,
      height,
      gl.RG32F,
      gl.RG,
      gl.FLOAT
    );
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      smokeTexture,
      0
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return {
      framebuffer: framebuffer,
      smokeTexture: smokeTexture,
    };
  }

  function setUniformTexture(gl, index, texture, location) {
    gl.activeTexture(gl.TEXTURE0 + index);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(location, index);
  }

  let mousePosition = new THREE.Vector2(0.0, 0.0);
  let mousePressing = false;
  window.addEventListener("mousemove", (event) => {
    mousePosition = new Vector2(
      event.clientX,
      window.innerHeight - event.clientY
    );
  });
  window.addEventListener("mousedown", (_) => {
    mousePressing = true;
  });
  window.addEventListener("mouseup", (_) => {
    mousePressing = false;
  });

  const stats = new Stats();
  document.body.appendChild(stats.dom);

  const parameters = {
    "air density": 2.354,
    "density force": 0.02,
    "temperature force": 0.0001,
    "heat radius": 0.05,
    "heat intensity": 1000.0,
    "velocity decay": 0.1,
    "density decay": 0.3,
    "temperature decay": 0.5,
    "time step": 0.005,
    "time scale": 0.5,
    render: "density",
    reset: (_) => reset(),
  };

  const gui = new GUI();
  gui.add(parameters, "density force", 0.0, 0.1).step(0.0001);
  gui.add(parameters, "temperature force", 0.0, 0.0003).step(0.00001);
  gui.add(parameters, "heat radius", 0.0, 0.1).step(0.001);
  gui.add(parameters, "heat intensity", 0.0, 2000.0).step(1.0);
  gui.add(parameters, "velocity decay", 0.0, 2.0).step(0.1);
  gui.add(parameters, "density decay", 0.0, 2.0).step(0.1);
  gui.add(parameters, "temperature decay", 0.0, 2.0).step(0.1);
  gui.add(parameters, "time step", 0.0001, 0.01).step(0.0001);
  gui.add(parameters, "time scale", 0.5, 2.0).step(0.001);
  gui.add(parameters, "render", ["density", "temperature", "velocity"]);
  gui.add(parameters, "reset");

  const SIMULATION_RESOLUTION = new Vector3(50, 50, 50);
  const GRID_SPACING = 0.005;
  const SIMULATION_SPACE = Vector3.mul(SIMULATION_RESOLUTION, GRID_SPACING);
  const CELL_NUM =
    SIMULATION_RESOLUTION.x * SIMULATION_RESOLUTION.y * SIMULATION_RESOLUTION.z;

  let cellTextureSize;
  for (let i = 0; ; i++) {
    cellTextureSize = 2 ** i;
    if (cellTextureSize * cellTextureSize >= CELL_NUM) {
      break;
    }
  }

  const canvas = document.getElementById("canvas");
  const resizeCanvas = function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener("resize", (_) => {
    resizeCanvas();
  });
  resizeCanvas();

  const gl = canvas.getContext("webgl2");

  gl.getExtension("EXT_color_buffer_float");
  gl.clearColor(0.7, 0.7, 0.7, 1.0);

  const initializeVelocityProgram = createProgramFromSource(
    gl,
    await (await fetch("shaders/fill_viewport.vert")).text(),
    await (await fetch("shaders/initialize_velocity.frag")).text()
  );
  const initializeSmokeProgram = createProgramFromSource(
    gl,
    await (await fetch("shaders/fill_viewport.vert")).text(),
    await (await fetch("shaders/initialize_smoke.frag")).text()
  );
  const addBuoyancyForceProgram = createProgramFromSource(
    gl,
    await (await fetch("shaders/fill_viewport.vert")).text(),
    await (await fetch("shaders/add_buoyancy_force.frag")).text()
  );
  const advectVelocityProgram = createProgramFromSource(
    gl,
    await (await fetch("shaders/fill_viewport.vert")).text(),
    await (await fetch("shaders/advect_velocity.frag")).text()
  );
  const computePressureProgram = createProgramFromSource(
    gl,
    await (await fetch("shaders/fill_viewport.vert")).text(),
    await (await fetch("shaders/compute_pressure.frag")).text()
  );
  const addPressureForceProgram = createProgramFromSource(
    gl,
    await (await fetch("shaders/fill_viewport.vert")).text(),
    await (await fetch("shaders/add_pressure_force.frag")).text()
  );
  const decayVelocityProgram = createProgramFromSource(
    gl,
    await (await fetch("shaders/fill_viewport.vert")).text(),
    await (await fetch("shaders/decay_velocity.frag")).text()
  );
  const advectSmokeProgram = createProgramFromSource(
    gl,
    await (await fetch("shaders/fill_viewport.vert")).text(),
    await (await fetch("shaders/advect_smoke.frag")).text()
  );
  const addSmokeProgram = createProgramFromSource(
    gl,
    await (await fetch("shaders/fill_viewport.vert")).text(),
    await (await fetch("shaders/add_smoke.frag")).text()
  );
  const renderVelocityProgram = createProgramFromSource(
    gl,
    await (await fetch("shaders/raymarch.vert")).text(),
    await (await fetch("shaders/render_velocity.frag")).text()
  );
  const renderDensityProgram = createProgramFromSource(
    gl,
    await (await fetch("shaders/raymarch.vert")).text(),
    await (await fetch("shaders/render_density.frag")).text()
  );
  const renderTemperatureProgram = createProgramFromSource(
    gl,
    await (await fetch("shaders/raymarch.vert")).text(),
    await (await fetch("shaders/render_temperature.frag")).text()
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

  let requestId = null;
  const reset = function () {
    if (requestId !== null) {
      cancelAnimationFrame(requestId);
      requestId = null;
    }

    let velocityFbObjR = createVelocityFramebuffer(
      gl,
      cellTextureSize,
      cellTextureSize
    );
    let velocityFbObjW = createVelocityFramebuffer(
      gl,
      cellTextureSize,
      cellTextureSize
    );
    const swapVelocityFbObj = function () {
      const tmp = velocityFbObjR;
      velocityFbObjR = velocityFbObjW;
      velocityFbObjW = tmp;
    };

    let pressureFbObjR = createPressureFramebuffer(
      gl,
      cellTextureSize,
      cellTextureSize
    );
    let pressureFbObjW = createPressureFramebuffer(
      gl,
      cellTextureSize,
      cellTextureSize
    );
    const swapPressureFbObj = function () {
      const tmp = pressureFbObjR;
      pressureFbObjR = pressureFbObjW;
      pressureFbObjW = tmp;
    };

    let smokeFbObjR = createSmokeFramebuffer(
      gl,
      cellTextureSize,
      cellTextureSize
    );
    let smokeFbObjW = createSmokeFramebuffer(
      gl,
      cellTextureSize,
      cellTextureSize
    );
    const swapSmokeFbObj = function () {
      const tmp = smokeFbObjR;
      smokeFbObjR = smokeFbObjW;
      smokeFbObjW = tmp;
    };

    const initializeVelocity = function () {
      gl.bindFramebuffer(gl.FRAMEBUFFER, velocityFbObjW.framebuffer);
      gl.useProgram(initializeVelocityProgram);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      swapVelocityFbObj();
    };

    const initializeSmoke = function () {
      gl.bindFramebuffer(gl.FRAMEBUFFER, smokeFbObjW.framebuffer);
      gl.useProgram(initializeSmokeProgram);
      gl.uniform1i(initializeSmokeUniforms["u_cellNum"], CELL_NUM);
      gl.uniform1i(
        initializeSmokeUniforms["u_cellTextureSize"],
        cellTextureSize
      );
      gl.uniform3iv(
        initializeSmokeUniforms["u_resolution"],
        SIMULATION_RESOLUTION.toArray()
      );
      gl.uniform1f(initializeSmokeUniforms["u_gridSpacing"], GRID_SPACING);
      gl.uniform3fv(
        initializeSmokeUniforms["u_simulationSpace"],
        SIMULATION_SPACE.toArray()
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      swapSmokeFbObj();
    };

    const addBuoyancyForce = function (deltaTime) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, velocityFbObjW.framebuffer);
      gl.useProgram(addBuoyancyForceProgram);
      gl.uniform1i(addBuoyancyForceUniforms["u_cellNum"], CELL_NUM);
      gl.uniform1i(
        addBuoyancyForceUniforms["u_cellTextureSize"],
        cellTextureSize
      );
      setUniformTexture(
        gl,
        0,
        velocityFbObjR.velocityTexture,
        addBuoyancyForceUniforms["u_velocityTexture"]
      );
      setUniformTexture(
        gl,
        1,
        smokeFbObjR.smokeTexture,
        addBuoyancyForceUniforms["u_smokeTexture"]
      );
      gl.uniform1f(addBuoyancyForceUniforms["u_deltaTime"], deltaTime);
      gl.uniform1f(
        addBuoyancyForceUniforms["u_densityScale"],
        parameters["density force"]
      );
      gl.uniform1f(
        addBuoyancyForceUniforms["u_temperatureScale"],
        parameters["temperature force"]
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      swapVelocityFbObj();
    };

    const advectVelocity = function (deltaTime) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, velocityFbObjW.framebuffer);
      gl.useProgram(advectVelocityProgram);
      gl.uniform1i(advectVelocityUniforms["u_cellNum"], CELL_NUM);
      gl.uniform1i(
        advectVelocityUniforms["u_cellTextureSize"],
        cellTextureSize
      );
      gl.uniform3iv(
        advectVelocityUniforms["u_resolution"],
        SIMULATION_RESOLUTION.toArray()
      );
      setUniformTexture(
        gl,
        0,
        velocityFbObjR.velocityTexture,
        advectVelocityUniforms["u_velocityTexture"]
      );
      gl.uniform1f(advectVelocityUniforms["u_deltaTime"], deltaTime);
      gl.uniform1f(advectVelocityUniforms["u_gridSpacing"], GRID_SPACING);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      swapVelocityFbObj();
    };

    const computePressure = function (deltaTime) {
      gl.useProgram(computePressureProgram);
      gl.uniform1i(computePressureUniforms["u_cellNum"], CELL_NUM);
      gl.uniform1i(
        computePressureUniforms["u_cellTextureSize"],
        cellTextureSize
      );
      gl.uniform3iv(
        computePressureUniforms["u_resolution"],
        SIMULATION_RESOLUTION.toArray()
      );
      setUniformTexture(
        gl,
        0,
        velocityFbObjR.velocityTexture,
        computePressureUniforms["u_velocityTexture"]
      );
      gl.uniform1f(computePressureUniforms["u_deltaTime"], deltaTime);
      gl.uniform1f(computePressureUniforms["u_gridSpacing"], GRID_SPACING);
      gl.uniform1f(
        computePressureUniforms["u_density"],
        parameters["air density"]
      );
      for (let i = 0; i < 10; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, pressureFbObjW.framebuffer);
        setUniformTexture(
          gl,
          1,
          pressureFbObjR.pressureTexture,
          computePressureUniforms["u_pressureTexture"]
        );
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        swapPressureFbObj();
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    const addPressureForce = function (deltaTime) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, velocityFbObjW.framebuffer);
      gl.useProgram(addPressureForceProgram);
      gl.uniform1i(addPressureForceUniforms["u_cellNum"], CELL_NUM);
      gl.uniform1i(
        addPressureForceUniforms["u_cellTextureSize"],
        cellTextureSize
      );
      gl.uniform3iv(
        addPressureForceUniforms["u_resolution"],
        SIMULATION_RESOLUTION.toArray()
      );
      setUniformTexture(
        gl,
        0,
        velocityFbObjR.velocityTexture,
        addPressureForceUniforms["u_velocityTexture"]
      );
      setUniformTexture(
        gl,
        1,
        pressureFbObjR.pressureTexture,
        addPressureForceUniforms["u_pressureTexture"]
      );
      gl.uniform1f(addPressureForceUniforms["u_deltaTime"], deltaTime);
      gl.uniform1f(addPressureForceUniforms["u_gridSpacing"], GRID_SPACING);
      gl.uniform1f(
        addPressureForceUniforms["u_density"],
        parameters["air density"]
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      swapVelocityFbObj();
    };

    const decayVelocity = function (deltaTime) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, velocityFbObjW.framebuffer);
      gl.useProgram(decayVelocityProgram);
      setUniformTexture(
        gl,
        0,
        velocityFbObjR.velocityTexture,
        decayVelocityUniforms["u_velocityTexture"]
      );
      gl.uniform1f(decayVelocityUniforms["u_deltaTime"], deltaTime);
      gl.uniform1f(
        decayVelocityUniforms["u_velocityDecay"],
        parameters["velocity decay"]
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      swapVelocityFbObj();
    };

    const updateVelocity = function (deltaTime) {
      addBuoyancyForce(deltaTime);
      advectVelocity(deltaTime);
      computePressure(deltaTime);
      addPressureForce(deltaTime);
      decayVelocity(deltaTime);
    };

    const advectSmoke = function (deltaTime) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, smokeFbObjW.framebuffer);
      gl.useProgram(advectSmokeProgram);
      gl.uniform1i(advectSmokeUniforms["u_cellNum"], CELL_NUM);
      gl.uniform1i(advectSmokeUniforms["u_cellTextureSize"], cellTextureSize);
      gl.uniform3iv(
        advectSmokeUniforms["u_resolution"],
        SIMULATION_RESOLUTION.toArray()
      );
      setUniformTexture(
        gl,
        0,
        velocityFbObjR.velocityTexture,
        advectSmokeUniforms["u_velocityTexture"]
      );
      setUniformTexture(
        gl,
        1,
        smokeFbObjR.smokeTexture,
        advectSmokeUniforms["u_smokeTexture"]
      );
      gl.uniform1f(advectSmokeUniforms["u_deltaTime"], deltaTime);
      gl.uniform1f(advectSmokeUniforms["u_gridSpacing"], GRID_SPACING);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      swapSmokeFbObj();
    };

    const addSmoke = function (deltaTime) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, smokeFbObjW.framebuffer);
      gl.useProgram(addSmokeProgram);
      gl.uniform1i(addSmokeUniforms["u_cellNum"], CELL_NUM);
      gl.uniform1i(addSmokeUniforms["u_cellTextureSize"], cellTextureSize);
      gl.uniform3iv(
        addSmokeUniforms["u_resolution"],
        SIMULATION_RESOLUTION.toArray()
      );
      gl.uniform3fv(
        addSmokeUniforms["u_simulationSpace"],
        SIMULATION_SPACE.toArray()
      );
      setUniformTexture(
        gl,
        0,
        smokeFbObjR.smokeTexture,
        addSmokeUniforms["u_smokeTexture"]
      );
      gl.uniform1f(addSmokeUniforms["u_deltaTime"], deltaTime);
      gl.uniform1f(addSmokeUniforms["u_gridSpacing"], GRID_SPACING);
      gl.uniform1i(addSmokeUniforms["u_addHeat"], mousePressing);
      const heatSourceCenter = new Vector2(
        mousePosition.x / canvas.width,
        mousePosition.y / canvas.height
      );
      gl.uniform2fv(
        addSmokeUniforms["u_mousePosition"],
        heatSourceCenter.toArray()
      );
      gl.uniform1f(
        addSmokeUniforms["u_heatSourceRadius"],
        parameters["heat radius"]
      );
      gl.uniform1f(
        addSmokeUniforms["u_heatSourceIntensity"],
        parameters["heat intensity"]
      );
      gl.uniform1f(
        addSmokeUniforms["u_densityDecay"],
        parameters["density decay"]
      );
      gl.uniform1f(
        addSmokeUniforms["u_temperatureDecay"],
        parameters["temperature decay"]
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      swapSmokeFbObj();
    };

    const updateSmoke = function (deltaTime) {
      advectSmoke(deltaTime);
      addSmoke(deltaTime);
    };

    const stepSimulation = function (deltaTime) {
      gl.viewport(0.0, 0.0, cellTextureSize, cellTextureSize);
      updateVelocity(deltaTime);
      updateSmoke(deltaTime);
    };

    const RENDER_SCALE = Vector3.mul(
      SIMULATION_SPACE,
      75.0 / SIMULATION_SPACE.y
    );
    const CAMERA_POSITION = new Vector3(100.0, 100.0, 150.0);
    const MODEL_MATRIX = Matrix4.identity;
    const iNV_MODEL_MATRIX = Matrix4.identity;
    const VIEW_MATRIX = Matrix4.inverse(
      Matrix4.lookAt(CAMERA_POSITION, Vector3.zero, new Vector3(0.0, 1.0, 0.0))
    );
    let mvpMatrix;
    const setMvpMatrix = function () {
      const projectionMatrix = Matrix4.perspective(
        canvas.width / canvas.height,
        60.0,
        0.01,
        1000.0
      );
      mvpMatrix = Matrix4.mul(VIEW_MATRIX, projectionMatrix);
    };
    setMvpMatrix();
    window.addEventListener("resize", (_) => {
      setMvpMatrix();
    });

    const renderVelocity = function () {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(renderVelocityProgram);
      gl.uniformMatrix4fv(
        renderVelocityUniforms["u_mvpMatrix"],
        false,
        mvpMatrix.elements
      );
      gl.uniformMatrix4fv(
        renderVelocityUniforms["u_modelMatrix"],
        false,
        MODEL_MATRIX.elements
      );
      gl.uniformMatrix4fv(
        renderVelocityUniforms["u_invModelMatrix"],
        false,
        iNV_MODEL_MATRIX.elements
      );
      gl.uniform3fv(renderVelocityUniforms["u_scale"], RENDER_SCALE.toArray());
      gl.uniform3fv(
        renderVelocityUniforms["u_cameraPosition"],
        CAMERA_POSITION.toArray()
      );
      gl.uniform1i(
        renderVelocityUniforms["u_cellTextureSize"],
        cellTextureSize
      );
      gl.uniform3iv(
        renderVelocityUniforms["u_resolution"],
        SIMULATION_RESOLUTION.toArray()
      );
      gl.uniform3fv(
        renderVelocityUniforms["u_simulationSpace"],
        SIMULATION_SPACE.toArray()
      );
      setUniformTexture(
        gl,
        0,
        velocityFbObjR.velocityTexture,
        renderVelocityUniforms["u_velocityTexture"]
      );
      gl.uniform1f(renderVelocityUniforms["u_gridSpacing"], GRID_SPACING);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLES, 0, 36);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
    };

    const renderDensity = function () {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(renderDensityProgram);
      gl.uniformMatrix4fv(
        renderDensityUniforms["u_mvpMatrix"],
        false,
        mvpMatrix.elements
      );
      gl.uniformMatrix4fv(
        renderDensityUniforms["u_modelMatrix"],
        false,
        MODEL_MATRIX.elements
      );
      gl.uniformMatrix4fv(
        renderDensityUniforms["u_invModelMatrix"],
        false,
        iNV_MODEL_MATRIX.elements
      );
      gl.uniform3fv(renderDensityUniforms["u_scale"], RENDER_SCALE.toArray());
      gl.uniform3fv(
        renderDensityUniforms["u_cameraPosition"],
        CAMERA_POSITION.toArray()
      );
      gl.uniform1i(renderDensityUniforms["u_cellTextureSize"], cellTextureSize);
      gl.uniform3iv(
        renderDensityUniforms["u_resolution"],
        SIMULATION_RESOLUTION.toArray()
      );
      gl.uniform3fv(
        renderDensityUniforms["u_simulationSpace"],
        SIMULATION_SPACE.toArray()
      );
      setUniformTexture(
        gl,
        0,
        smokeFbObjR.smokeTexture,
        renderDensityUniforms["u_smokeTexture"]
      );
      gl.uniform1f(renderDensityUniforms["u_gridSpacing"], GRID_SPACING);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLES, 0, 36);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
    };

    const renderTemperature = function () {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(renderTemperatureProgram);
      gl.uniformMatrix4fv(
        renderTemperatureUniforms["u_mvpMatrix"],
        false,
        mvpMatrix.elements
      );
      gl.uniformMatrix4fv(
        renderTemperatureUniforms["u_modelMatrix"],
        false,
        MODEL_MATRIX.elements
      );
      gl.uniformMatrix4fv(
        renderTemperatureUniforms["u_invModelMatrix"],
        false,
        iNV_MODEL_MATRIX.elements
      );
      gl.uniform3fv(
        renderTemperatureUniforms["u_scale"],
        RENDER_SCALE.toArray()
      );
      gl.uniform3fv(
        renderTemperatureUniforms["u_cameraPosition"],
        CAMERA_POSITION.toArray()
      );
      gl.uniform1i(
        renderTemperatureUniforms["u_cellTextureSize"],
        cellTextureSize
      );
      gl.uniform3iv(
        renderTemperatureUniforms["u_resolution"],
        SIMULATION_RESOLUTION.toArray()
      );
      gl.uniform3fv(
        renderTemperatureUniforms["u_simulationSpace"],
        SIMULATION_SPACE.toArray()
      );
      setUniformTexture(
        gl,
        0,
        smokeFbObjR.smokeTexture,
        renderTemperatureUniforms["u_smokeTexture"]
      );
      gl.uniform1f(renderTemperatureUniforms["u_gridSpacing"], GRID_SPACING);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLES, 0, 36);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
    };

    const render = function () {
      gl.viewport(0.0, 0.0, canvas.width, canvas.height);
      if (parameters["render"] === "velocity") {
        renderVelocity();
      } else if (parameters["render"] === "temperature") {
        renderTemperature();
      } else {
        renderDensity();
      }
    };

    initializeVelocity();
    initializeSmoke();
    let simulationSeconds = 0.0;
    let remaindedSimulationSeconds = 0.0;
    let previousRealSeconds = performance.now() * 0.001;
    const loop = function () {
      stats.update();

      const currentRealSeconds = performance.now() * 0.001;
      const nextSimulationSeconds =
        simulationSeconds +
        remaindedSimulationSeconds +
        parameters["time scale"] *
          Math.min(0.02, currentRealSeconds - previousRealSeconds);
      previousRealSeconds = currentRealSeconds;
      const timeStep = parameters["time step"];
      while (nextSimulationSeconds - simulationSeconds > timeStep) {
        stepSimulation(timeStep);
        simulationSeconds += timeStep;
      }
      remaindedSimulationSeconds = nextSimulationSeconds - simulationSeconds;

      render();
      requestId = requestAnimationFrame(loop);
    };
    loop();
  };
  reset();
})();
