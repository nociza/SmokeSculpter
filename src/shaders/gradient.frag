#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D u_pressure;
uniform sampler2D u_velocity;
uniform vec2 u_texelSize;

out vec4 fragColor;

void main() {
  vec2 uvLeft = v_uv - vec2(u_texelSize.x, 0.0);
  vec2 uvRight = v_uv + vec2(u_texelSize.x, 0.0);
  vec2 uvTop = v_uv + vec2(0.0, u_texelSize.y);
  vec2 uvBottom = v_uv - vec2(0.0, u_texelSize.y);

  float left = texture(u_pressure, uvLeft).x;
  float right = texture(u_pressure, uvRight).x;
  float top = texture(u_pressure, uvTop).x;
  float bottom = texture(u_pressure, uvBottom).x;

  vec2 gradient = vec2(right - left, top - bottom);
  vec2 velocity = texture(u_velocity, v_uv).xy;
  fragColor = vec4(velocity - gradient * 0.5, 0.0, 1.0);
}
