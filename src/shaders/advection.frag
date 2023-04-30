#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D u_velocity;
uniform sampler2D u_source;
uniform vec2 u_texelSize;
uniform float u_dt;

out vec4 fragColor;

vec4 advect(sampler2D velocity, sampler2D source, vec2 uv, float dt) {
  vec2 v = texture(velocity, uv).xy;
  vec2 displacedUV = uv - dt * v;
  return texture(source, displacedUV);
}

void main() {
  fragColor = advect(u_velocity, u_source, v_uv, u_dt);
}
