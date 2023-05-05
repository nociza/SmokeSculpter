#version 300 es

precision highp float;

out vec2 o_smoke;

uniform int u_cellNum;
uniform int u_cellTextureSize;
uniform ivec3 u_resolution;
uniform vec3 u_simulationSpace;
uniform sampler2D u_smokeTexture;
uniform float u_deltaTime;
uniform float u_gridSpacing;
uniform bool u_addHeat;
uniform vec3 u_mousePosition;
uniform float u_heatSourceRadius;
uniform float u_heatSourceIntensity;
uniform float u_densityDecay;
uniform float u_temperatureDecay;

#define AMBIENT_TEMPERATURE 273.0

ivec2 convertCellIdToCoord(int cellId) {
  return ivec2(cellId % u_cellTextureSize, cellId / u_cellTextureSize);
}

int convertCoordToCellId(ivec2 coord) {
  return coord.x + coord.y * u_cellTextureSize;
}

ivec3 convertCellIdToCellIndex(int cellId) {
  int z = cellId / (u_resolution.x * u_resolution.y);
  int y = (cellId % (u_resolution.x * u_resolution.y)) / u_resolution.x;
  int x = cellId % u_resolution.x;
  return ivec3(x, y, z);
}

vec3 convertCellIdToPosition(int cellId) {
  ivec3 cellIndex = convertCellIdToCellIndex(cellId);
  return (vec3(cellIndex) + 0.5) * u_gridSpacing;
}

void main(void) {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  int cellId = convertCoordToCellId(coord);
  if (cellId >= u_cellNum) {
    return;
  }

  vec2 smoke = texelFetch(u_smokeTexture, convertCellIdToCoord(cellId), 0).xy;
  float density = smoke.x;
  float temperature = smoke.y;

  float nextTemperature = temperature;
  vec3 position = convertCellIdToPosition(cellId);
  if (u_addHeat) {
    vec3 heatCenter = vec3(u_mousePosition.x * u_simulationSpace.x, u_simulationSpace.y * 0.25, u_mousePosition.z * u_simulationSpace.z);
    nextTemperature += smoothstep(u_heatSourceRadius, 0.0, length(position - heatCenter))
      * u_deltaTime * u_heatSourceIntensity;
  }
  nextTemperature += (1.0 - exp(-u_temperatureDecay * u_deltaTime)) * (AMBIENT_TEMPERATURE - nextTemperature);

  float nextDensity = density + u_deltaTime * max(0.0, (nextTemperature - (AMBIENT_TEMPERATURE + 100.0))) * 0.01;
  nextDensity *= exp(-u_densityDecay * u_deltaTime);

  o_smoke = vec2(nextDensity, nextTemperature);
}