#version 300 es

precision highp float;

out float o_pressure;

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

ivec2 convertCellIndexToCoord(ivec3 cellIndex) {
  int cellId = convertCellIndexToCellId(cellIndex);
  return convertCellIdToCoord(cellId);
}

ivec3 convertCellIdToCellIndex(int cellId) {
  int z = cellId / (u_resolution.x * u_resolution.y);
  int y = (cellId % (u_resolution.x * u_resolution.y)) / u_resolution.x;
  int x = cellId % u_resolution.x;
  return ivec3(x, y, z);
}

void sampleVelocityAndPressure(ivec3 cellIndex, out vec3 velocity, out float pressure) {
  if (cellIndex.x < 0 || cellIndex.x >= u_resolution.x ||
      cellIndex.y < 0 || cellIndex.y >= u_resolution.y ||
      cellIndex.z < 0 || cellIndex.z >= u_resolution.z) {
    velocity = vec3(0.0);
    pressure = 0.0;
    return;
  }
  ivec2 coord = convertCellIndexToCoord(cellIndex);
  velocity = texelFetch(u_velocityTexture, coord, 0).xyz;
  pressure = texelFetch(u_pressureTexture, coord, 0).x;
}

void main(void) {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  int cellId = convertCoordToCellId(coord);
  if (cellId >= u_cellNum) {
    return;
  }

  ivec3 cellIndex = convertCellIdToCellIndex(cellId);
  vec3 vl, vr, vd, vu, vn, vf;
  float pl, pr, pd, pu, pn, pf;
  sampleVelocityAndPressure(cellIndex + ivec3(-1, 0, 0), vl, pl);
  sampleVelocityAndPressure(cellIndex + ivec3(1, 0, 0), vr, pr);
  sampleVelocityAndPressure(cellIndex + ivec3(0, -1, 0), vd, pd);
  sampleVelocityAndPressure(cellIndex + ivec3(0, 1, 0), vu, pu);
  sampleVelocityAndPressure(cellIndex + ivec3(0, 0, -1), vn, pn);
  sampleVelocityAndPressure(cellIndex + ivec3(0, 0, 1), vf, pf);

  o_pressure = (pl + pr + pd + pu + pn + pf
    - 0.5 * (vr.x - vl.x + vu.y - vd.y + vf.z - vn.z)
    * u_gridSpacing * u_density / u_deltaTime) / 6.0;
}