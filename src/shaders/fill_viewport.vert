#version 300 es

const vec3[4] POSITIONS = vec3[](
  vec3(-1.0, -1.0, 0.0),
  vec3(1.0, -1.0, 0.0),
  vec3(-1.0, 1.0, 0.0),
  vec3(1.0, 1.0, 0.0)
);

const int[6] INDICES = int[](
  0, 1, 2,
  3, 2, 1
);

void main(void) {
  vec3 position = POSITIONS[INDICES[gl_VertexID]];
  gl_Position = vec4(position, 1.0);
}
