precision highp float;

uniform sampler2D u_target;
uniform vec2 u_point;
uniform float u_radius;
uniform float u_amount;
uniform vec3 u_color;

varying vec2 v_uv;

void main() {
  float distance = length(u_point - v_uv) * u_radius;
  float falloff = max(0.0, 1.0 - distance * distance);
  vec3 splatColor = u_color * u_amount * falloff;
  vec3 baseColor = texture2D(u_target, v_uv).xyz;
  gl_FragColor = vec4(baseColor + splatColor, 1.0);
}
