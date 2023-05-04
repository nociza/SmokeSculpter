#version 300 es

const vec3[8] CUBE_POSITIONS = vec3[](
  vec3(-1.0, -1.0,  1.0),
  vec3( 1.0, -1.0,  1.0),
  vec3( 1.0, -1.0, -1.0),
  vec3(-1.0, -1.0, -1.0),
  vec3(-1.0,  1.0,  1.0),
  vec3( 1.0,  1.0,  1.0),
  vec3( 1.0,  1.0, -1.0),
  vec3(-1.0,  1.0, -1.0)
);

const vec3[6] CUBE_NORMALS = vec3[](
  vec3(0.0, 0.0, 1.0),
  vec3(1.0, 0.0, 0.0),
  vec3(0.0, 0.0, -1.0),
  vec3(-1.0, 0.0, 0.0),
  vec3(0.0, 1.0, 0.0),
  vec3(0.0, -1.0, 0.0)
);

const int[36] CUBE_INDICES = int[](
  0, 5, 4, 0, 1, 5,
  1, 6, 5, 1, 2, 6,
  2, 7, 6, 2, 3, 7,
  3, 4, 7, 3, 0, 4,
  4, 6, 7, 4, 5, 6,
  3, 1, 0, 3, 2, 1
);

out vec3 v_position;
out vec3 v_normal;

uniform mat4 u_mvpMatrix;
uniform mat4 u_modelMatrix;
uniform vec3 u_scale;

void main(void) {
  vec3 position = u_scale * CUBE_POSITIONS[CUBE_INDICES[gl_VertexID]];
  vec3 normal = CUBE_NORMALS[gl_VertexID / 6];
  v_position = (u_modelMatrix * vec4(position, 1.0)).xyz;
  v_normal = (u_modelMatrix * vec4(normal, 0.0)).xyz;
  gl_Position = u_mvpMatrix * vec4(position, 1.0);
}