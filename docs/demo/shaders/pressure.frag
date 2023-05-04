#version 300 es

precision highp float;

out vec3 o_velocity;

uniform int u_cellNum;
uniform int u_cellTextureSize;
uniform ivec3 u_resolution;
uniform sampler2D u_velocityTexture;
uniform sampler2D u_pressureTexture;
uniform float u_deltaTime;
uniform float u_gridSpacing;
uniform float u_density;

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

ivec2 convertCellIndexToCoord(ivec3 cellIndex) {
  int cellId = convertCellIndexToCellId(cellIndex);
  return convertCellIdToCoord(cellId);
}

float samplePressure(ivec3 cellIndex) {
  if (cellIndex.x < 0) {
    cellIndex.x = 0;
  }
  if (cellIndex.x >= u_resolution.x) {
    cellIndex.x = u_resolution.x - 1;
  }
  if (cellIndex.y < 0) {
    cellIndex.y = 0;
  }
  if (cellIndex.y >= u_resolution.y) {
    cellIndex.y = u_resolution.y - 1;
  }
  if (cellIndex.z < 0) {
    cellIndex.z = 0;
  }
  if (cellIndex.z >= u_resolution.z) {
    cellIndex.z = u_resolution.z - 1;
  }
  ivec2 coord = convertCellIndexToCoord(cellIndex);
  return texelFetch(u_pressureTexture, coord, 0).x;
}

void main(void) {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  int cellId = convertCoordToCellId(coord);
  if (cellId >= u_cellNum) {
    return;
  }

  vec3 velocity = texelFetch(u_velocityTexture, coord, 0).xyz;

  ivec3 cellIndex = convertCellIdToCellIndex(cellId);
  float pl = samplePressure(cellIndex + ivec3(-1, 0, 0));
  float pr = samplePressure(cellIndex + ivec3(1, 0, 0));
  float pd = samplePressure(cellIndex + ivec3(0, -1, 0));
  float pu = samplePressure(cellIndex + ivec3(0, 1, 0));
  float pn = samplePressure(cellIndex + ivec3(0, 0, -1));
  float pf = samplePressure(cellIndex + ivec3(0, 0, 1));

  o_velocity = velocity - 0.5 * u_deltaTime * vec3(pr - pl, pu - pd, pf - pn) / (u_gridSpacing * u_density);
}