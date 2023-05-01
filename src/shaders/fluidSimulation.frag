precision highp float;

uniform float u_time;
uniform float u_deltaTime;
uniform vec3 u_gridSize;
precision highp sampler3D;
uniform sampler3D u_velocityTexture;
uniform sampler3D u_smokeDensityTexture;

layout(location = 0) out vec4 fragColor;

// Helper function to sample velocities
vec3 sampleVelocity(sampler3D tex, vec3 coord) {
  return texture(tex, coord).xyz;
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

  // Combine advection and diffusion
  vec3 updatedVelocity = advectedVelocity + diffuseVelocity;

  // Add smoke density as a visual representation
  float smokeDensity = texture(u_smokeDensityTexture, texCoord).r;
  vec3 outputColor = mix(vec3(0.0), vec3(1.0), smokeDensity);

  // Use smoke density as the output color
  fragColor = vec4(vec3(smokeDensity), 1.0);
}
