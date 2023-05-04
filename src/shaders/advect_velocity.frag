#version 300 es

precision highp float;

out vec3 o_velocity;

uniform int u_cellNum;
uniform int u_cellTextureSize;
uniform ivec3 u_resolution;
uniform sampler2D u_velocityTexture;
uniform float u_deltaTime;
uniform float u_gridSpacing;

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

vec3 sampleVelocity(ivec3 cellIndex) {
  if (cellIndex.x < 0 || cellIndex.x >= u_resolution.x ||
      cellIndex.y < 0 || cellIndex.y >= u_resolution.y ||
      cellIndex.z < 0 || cellIndex.z >= u_resolution.z) {
    return vec3(0.0);
  }
  ivec2 coord = convertCellIndexToCoord(cellIndex);
  return texelFetch(u_velocityTexture, coord, 0).xyz;
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

  vec3 vel000 = sampleVelocity(i);
  vec3 vel100 = sampleVelocity(i + ivec3(1, 0, 0));
  vec3 vel010 = sampleVelocity(i + ivec3(0, 1, 0));
  vec3 vel110 = sampleVelocity(i + ivec3(1, 1, 0));
  vec3 vel001 = sampleVelocity(i + ivec3(0, 0, 1));
  vec3 vel101 = sampleVelocity(i + ivec3(1, 0, 1));
  vec3 vel011 = sampleVelocity(i + ivec3(0, 1, 1));
  vec3 vel111 = sampleVelocity(i + ivec3(1, 1, 1));

  o_velocity = mix(
    mix(mix(vel000, vel100, f.x), mix(vel010, vel110, f.x), f.y),
    mix(mix(vel001, vel101, f.x), mix(vel011, vel111, f.x), f.y),
    f.z
  );
}