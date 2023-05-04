#version 300 es

precision highp float;

out vec3 o_velocity;

uniform sampler2D u_velocityTexture;
uniform float u_deltaTime;
uniform float u_velocityDecay;

void main(void) {
  vec3 velocity = texelFetch(u_velocityTexture, ivec2(gl_FragCoord.xy), 0).xyz;
  velocity *= exp(-u_velocityDecay * u_deltaTime);
  o_velocity = velocity;
}