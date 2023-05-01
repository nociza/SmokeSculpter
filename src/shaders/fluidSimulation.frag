#version 300 es
precision highp float;

uniform float u_time;
uniform float u_deltaTime;
uniform vec3 u_gridSize;
uniform sampler2D u_velocityTexture;

out vec4 fragColor;

// Helper function to sample velocities
vec3 sampleVelocity(sampler2D texture, vec3 coord) {
  return texture2D(texture, coord.xy / u_gridSize.xy).xyz;
}

void main() {
  // Calculate cell coordinates
  vec3 cell = gl_FragCoord.xyz;
  vec3 texCoord = cell / u_gridSize;

  // Sample current velocity
  vec3 velocity = sampleVelocity(u_velocityTexture, texCoord);

  // Calculate advection
  vec3 advectedVelocity = sampleVelocity(u_velocityTexture, texCoord - velocity * u_deltaTime);

  // Perform diffusion (using central differences)
  vec3 diffuseVelocity = (
    sampleVelocity(u_velocityTexture, texCoord + vec3(1.0, 0.0, 0.0)) +
    sampleVelocity(u_velocityTexture, texCoord - vec3(1.0, 0.0, 0.0)) +
    sampleVelocity(u_velocityTexture, texCoord + vec3(0.0, 1.0, 0.0)) +
    sampleVelocity(u_velocityTexture, texCoord - vec3(0.0, 1.0, 0.0)) +
    sampleVelocity(u_velocityTexture, texCoord + vec3(0.0, 0.0, 1.0)) +
    sampleVelocity(u_velocityTexture, texCoord - vec3(0.0, 0.0, 1.0))
  ) / 6.0;

  // Calculate the next velocity
  vec3 nextVelocity = advectedVelocity + diffuseVelocity;

  // Store the result in the output fragment color
  fragColor = vec4(nextVelocity, 1.0);
}
