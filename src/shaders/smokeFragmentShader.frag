precision highp float;
precision highp sampler3D;

uniform sampler3D u_smokeDensityTexture;

in vec4 v_worldPos;

layout(location = 1) out vec4 outColor;

void main() {
    vec3 texCoord = (v_worldPos.xyz + 1.0) / 2.0;
    float density = texture(u_smokeDensityTexture, texCoord).r;
    outColor = vec4(vec3(0.5), density);
}
