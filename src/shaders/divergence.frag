#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D u_velocity;
uniform vec2 u_texelSize;

out vec4 fragColor;

void main() {
  vec2 uvLeft = v_uv - vec2(u_texelSize.x, 0.0);
  vec2 uvRight = v_uv + vec2(u_texelSize.x, 0.0);
  vec2 uvTop = v_uv + vec2(0.0, u_texelSize.y);
  vec2 uvBottom = v_uv - vec2(0.0, u_texelSize.y);

  float left = texture(u_velocity, uvLeft).x;
  float right = texture(u_velocity, uvRight).x;
  float top = texture(u_velocity, uvTop).y;
  float bottom = texture(u_velocity, uvBottom).y;

  float divergence = (right - left + top - bottom) * 0.5;
  fragColor = vec4(divergence, 0.0, 0.0, 1.0);
}
