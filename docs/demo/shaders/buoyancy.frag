#version 300 es

precision highp float;

out vec3 o_velocity;

uniform int u_cellNum;
uniform int u_cellTextureSize;
uniform sampler2D u_velocityTexture;
uniform sampler2D u_smokeTexture;
uniform float u_deltaTime;
uniform float u_densityScale;
uniform float u_temperatureScale;

#define GRAVITY vec3(0.0, -9.8, 0.0)
#define AMBIENT_TEMPERATURE 273.0

void main(void) {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  int cellId = coord.x + coord.y * u_cellTextureSize;
  if (cellId >= u_cellNum) {
    return;
  }
  vec3 velocity = texelFetch(u_velocityTexture, coord, 0).xyz;
  vec2 smoke = texelFetch(u_smokeTexture, coord, 0).xy;
  vec3 buoyancy = (u_densityScale * smoke.x
    - u_temperatureScale * (smoke.y - AMBIENT_TEMPERATURE)) * GRAVITY;
  o_velocity = velocity + u_deltaTime * buoyancy;
}