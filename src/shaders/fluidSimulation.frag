precision highp float;

uniform float u_time;
uniform float u_deltaTime;
uniform vec3 u_gridSize;
uniform sampler2DArray u_velocityTexture;
uniform sampler2DArray u_smokeDensityTexture;

// Helper function to sample velocities
vec3 sampleVelocity(sampler2DArray tex, vec3 coord) {
  float layer = floor(coord.z * u_gridSize.z);
  vec2 uv = coord.xy;
  return texture(tex, vec3(uv, layer)).xyz;
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
  float layer = floor(texCoord.z * u_gridSize.z);
  float smokeDensity = texture(u_smokeDensityTexture, vec3(texCoord.xy, layer)).r;
  vec3 outputColor = mix(vec3(0.0), vec3(1.0), smokeDensity);

  // Use smoke density as the output color
  gl_FragColor = vec4(outputColor, 1.0);
}
