precision highp float;

out vec4 v_worldPos;

void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    v_worldPos = worldPos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
