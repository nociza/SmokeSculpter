#version 300 es

precision highp float;

out vec2 o_smoke;

uniform int u_cellNum;
uniform int u_cellTextureSize;
uniform ivec3 u_resolution;
uniform sampler2D u_velocityTexture;
uniform sampler2D u_smokeTexture;
uniform float u_deltaTime;
uniform float u_gridSpacing;

#define AMBIENT_TEMPERATURE 273.0

ivec2 convertCellIdToCoord(int cellId) {
  return ivec2(cellId % u_cellTextureSize, cellId / u_cellTextureSize);
}

int convertCoordToCellId(ivec2 coord) {
  return coord.x + coord.y * u_cellTextureSize;
}

int convertCellIndexToCellId(ivec3 cellIndex) {
  return  cellIndex.x + cellIndex.y * u_resolution.x + cellIndex.z * (u_resolution.x * u_resolution.y);
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

ivec3 convertPositionToCellIndex(vec3 position) {
  return ivec3(position / u_gridSpacing - 0.5);
}

int convertPositionToCellId(vec3 position) {
  ivec3 cellIndex = convertPositionToCellIndex(position);
  return convertCellIndexToCellId(cellIndex);
}

ivec2 convertPositionToCoord(vec3 position) {
  int cellId = convertPositionToCellId(position);
  return convertCellIdToCoord(cellId);
}

ivec2 convertCellIndexToCoord(ivec3 cellIndex) {
  int cellId = convertCellIndexToCellId(cellIndex);
  return convertCellIdToCoord(cellId);
}

vec2 sampleSmoke(ivec3 cellIndex) {
  if (cellIndex.x < 0 || cellIndex.x >= u_resolution.x ||
      cellIndex.y < 0 || cellIndex.y >= u_resolution.y ||
      cellIndex.z < 0 || cellIndex.z >= u_resolution.z) {
    return vec2(0.0, AMBIENT_TEMPERATURE);
  }
  ivec2 coord = convertCellIndexToCoord(cellIndex);
  return texelFetch(u_smokeTexture, coord, 0).xy;
}

void main(void) {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  int cellId = convertCoordToCellId(coord);
  if (cellId >= u_cellNum) {
    return;
  }
  vec3 position = convertCellIdToPosition(cellId);
  vec3 velocity = texelFetch(u_velocityTexture, coord, 0).xyz;

  vec3 prevPos = position - u_deltaTime * velocity;
  vec3 prevCellIndex = prevPos / u_gridSpacing - 0.5;
  ivec3 i = ivec3(prevCellIndex);
  vec3 f = fract(prevCellIndex);

  vec2 smoke000 = sampleSmoke(i);
  vec2 smoke100 = sampleSmoke(i + ivec3(1, 0, 0));
  vec2 smoke010 = sampleSmoke(i + ivec3(0, 1, 0));
  vec2 smoke110 = sampleSmoke(i + ivec3(1, 1, 0));
  vec2 smoke001 = sampleSmoke(i + ivec3(0, 0, 1));
  vec2 smoke101 = sampleSmoke(i + ivec3(1, 0, 1));
  vec2 smoke011 = sampleSmoke(i + ivec3(0, 1, 1));
  vec2 smoke111 = sampleSmoke(i + ivec3(1, 1, 1));

  o_smoke = mix(
    mix(mix(smoke000, smoke100, f.x), mix(smoke010, smoke110, f.x), f.y),
    mix(mix(smoke001, smoke101, f.x), mix(smoke011, smoke111, f.x), f.y),
    f.z
  );
}