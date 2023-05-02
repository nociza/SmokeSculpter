#version 300 es

precision highp float;

in vec3 v_position;
in vec3 v_normal;

out vec4 o_color;

uniform mat4 u_mvpMatrix;
uniform mat4 u_modelMatrix;
uniform mat4 u_invModelMatrix;
uniform vec3 u_scale;
uniform vec3 u_cameraPosition;
uniform int u_cellTextureSize;
uniform ivec3 u_resolution;
uniform vec3 u_simulationSpace;
uniform sampler2D u_velocityTexture;
uniform float u_gridSpacing;

struct Ray {
  vec3 origin;
  vec3 dir;
};

Ray convertRayFromWorldToObject(Ray ray) {
  vec3 origin = (u_invModelMatrix * vec4(ray.origin, 1.0)).xyz;
  vec3 dir = normalize((u_invModelMatrix * vec4(ray.dir, 0.0)).xyz);
  return Ray(origin, dir);
}

void getRange(Ray ray, inout float tmin, inout float tmax) {
  for (int i = 0; i < 3; i++) {
    float t1 = (u_scale[i] - ray.origin[i]) / ray.dir[i];
    float t2 = (-u_scale[i] - ray.origin[i]) / ray.dir[i];
    tmin = max(tmin, min(t1, t2));
    tmax = min(tmax, max(t1, t2));
  }
}

int convertCellIndexToCellId(ivec3 cellIndex) {
  return  cellIndex.x + cellIndex.y * u_resolution.x + cellIndex.z * (u_resolution.x * u_resolution.y);
}

ivec2 convertCellIdToCoord(int cellId) {
  return ivec2(cellId % u_cellTextureSize, cellId / u_cellTextureSize);
}

ivec2 convertCellIndexToCoord(ivec3 cellIndex) {
  int cellId = convertCellIndexToCellId(cellIndex);
  return convertCellIdToCoord(cellId);
}

ivec3 convertPositionToCellIndex(vec3 position) {
  return ivec3(position / u_gridSpacing - 0.5);
}

vec3 convertToSimulationSpace(vec3 p) {
  p /= u_scale;
  p *= u_simulationSpace;
  p = (p + u_simulationSpace) * 0.5;
  return p;
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

vec3 sampleVelocity(vec3 p) {
  vec3 cellIndex = convertToSimulationSpace(p) / u_gridSpacing;

  ivec3 i = ivec3(cellIndex) - (1 - int(step(0.5, cellIndex)));
  vec3 f = smoothstep(0.0, 1.0, fract(cellIndex + 0.5));

  vec3 vel000 = sampleVelocity(i);
  vec3 vel100 = sampleVelocity(i + ivec3(1, 0, 0));
  vec3 vel010 = sampleVelocity(i + ivec3(0, 1, 0));
  vec3 vel110 = sampleVelocity(i + ivec3(1, 1, 0));
  vec3 vel001 = sampleVelocity(i + ivec3(0, 0, 1));
  vec3 vel101 = sampleVelocity(i + ivec3(1, 0, 1));
  vec3 vel011 = sampleVelocity(i + ivec3(0, 1, 1));
  vec3 vel111 = sampleVelocity(i + ivec3(1, 1, 1));

  return mix(
    mix(mix(vel000, vel100, f.x), mix(vel010, vel110, f.x), f.y),
    mix(mix(vel001, vel101, f.x), mix(vel011, vel111, f.x), f.y),
    f.z
  );
}

#define RAYMARCH_ITERATIONS 48

vec4 raymarch(vec3 ro, vec3 rd, float tmin, float tmax) {
  float raymarchSize = (2.0 * length(u_scale)) / float(RAYMARCH_ITERATIONS);
  vec3 p = ro + (tmin + (raymarchSize - mod(tmin, raymarchSize))) * rd;
  vec3 color = vec3(0.0);
  float transmittance = 1.0;
  for (int ri = 0; ri < RAYMARCH_ITERATIONS; ri++) {
    vec3 velocity = sampleVelocity(p);
    float density = clamp(length(velocity) * 20.0, 0.0, 1.0);
    color += (clamp(velocity * 20.0, -1.0, 1.0) * 0.5 + 0.5) * transmittance * density;
    transmittance *= 1.0 - density;
    if (transmittance < 0.001) {
      break;
    }
    p += raymarchSize * rd;
  }
  return vec4(color, 1.0 - transmittance);
}

void main(void) {
  vec3 dir = normalize(v_position - u_cameraPosition);
  Ray ray = convertRayFromWorldToObject(Ray(u_cameraPosition, dir));
  float tmin = 0.0;
  float tmax = 1e16;
  getRange(ray, tmin, tmax);
  vec4 c = raymarch(ray.origin, ray.dir, tmin, tmax);
  if (c.w > 0.0) {
    o_color = vec4(c.rgb, c.a);
  } else {
    discard;
  }
}