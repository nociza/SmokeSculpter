#version 300 es

precision highp float;

out vec2 o_smoke;

uniform int u_cellNum;
uniform int u_cellTextureSize;
uniform ivec3 u_resolution;
uniform float u_gridSpacing;
uniform vec3 u_simulationSpace;

#define AMBIENT_TEMPERATURE 273.0

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
  vec3 position = convertCellIdToPosition(cellId);
  float density = 0.0;
  float temperature = AMBIENT_TEMPERATURE;
  o_smoke = vec2(density, temperature);
}