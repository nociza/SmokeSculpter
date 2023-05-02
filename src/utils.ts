// Rewrite the following minimal javascript code to typescript adding relevant imports and types where needed. Try to be as explicit as possible and add types to everything you can. Avoid using the any type unless it's really necessary. Remove unnecessary code left from the javascript version.

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
