/* global AFRAME, THREE */

/**
 * Dimension Warp - Neon Shader Edition
 * 
 * Implements a custom GLSL shader to mathematically emulate the "Neon Tube" look
 * found in high-end WebGL demos (like the user's CodePen).
 * 
 * Technique:
 * - Calculates "View-Facing Ratio" (Fresnel) per pixel.
 * - Center of Capsule = Hot White (High view dot product).
 * - Edge of Capsule = Deep Cyan (Low view dot product).
 * - Smooth falloff = Bloom illusion without post-processing.
 */
AFRAME.registerComponent('dimension-warp', {
    schema: {
        count: { type: 'number', default: 400 }
    },

    init: function () {
        this.audioSystem = this.el.sceneEl.systems['audio-analyzer'];
        this.dummy = new THREE.Object3D();

        this.createTunnel();
        this.tick = this.tick.bind(this);
    },

    createTunnel: function () {
        // 1. GEOMETRY: Long Capsules
        const geometry = new THREE.CapsuleGeometry(0.04, 6.0, 8, 16);
        geometry.rotateX(Math.PI / 2);

        // 2. SHADER MATERIAL
        // "Boytchev" style glow usually relies on the interplay of viewing angle and color.
        this.uniforms = {
            uTime: { value: 0 },
            uBass: { value: 0.0 },
            uColor: { value: new THREE.Color(0x00ffff) }, // Cyan Glow
            uCoreColor: { value: new THREE.Color(0xffffff) } // White Core
        };

        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
                    vViewPosition = -mvPosition.xyz;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                uniform vec3 uCoreColor;
                uniform float uBass;
                
                varying vec3 vNormal;
                varying vec3 vViewPosition;

                void main() {
                    // Normalize View Direction
                    vec3 viewDir = normalize(vViewPosition);
                    vec3 normal = normalize(vNormal);

                    // Calculate "Facing Ratio" (0.0 at edge, 1.0 at center)
                    float facing = max(0.0, dot(normal, viewDir));
                    
                    // "Fresnel" inverse -> Bloom Core logic
                    // High power = tight core. varying with bass.
                    float coreSharpness = 3.0 - (uBass * 2.0); // Bass makes core grow (sharper -> softer)
                    float core = pow(facing, coreSharpness);

                    // Mix Glow and White Core
                    // Edge is uColor, Center approaches uCoreColor
                    vec3 finalColor = mix(uColor, uCoreColor, core);
                    
                    // Boost intensity (Neon Brightness) for Additive Blend
                    float intensity = 1.5 + (uBass * 5.0);
                    
                    // Soft edges to prevent "net" artifacts
                    float alpha = pow(facing, 0.5); 

                    gl_FragColor = vec4(finalColor * intensity, alpha);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthWrite: false, // Essential for transparency overlap
            transparent: true,
            side: THREE.FrontSide
        });

        const count = this.data.count;

        // InstancedMesh
        this.mesh = new THREE.InstancedMesh(geometry, material, count);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        this.particles = [];

        for (let i = 0; i < count; i++) {
            // Distribution: Wide and Deep
            const x = (Math.random() - 0.5) * 60;
            const y = (Math.random() - 0.5) * 60;
            const z = (Math.random() * 200) - 150;

            this.particles.push({
                x, y, z,
                rotation: Math.random() * Math.PI,
                speedOffset: Math.random() * 0.5 + 0.8
            });

            this.dummy.position.set(x, y, z);
            this.dummy.rotation.z = this.particles[i].rotation;
            this.dummy.scale.set(1, 1, 1);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }

        this.el.setObject3D('warp-tunnel', this.mesh);
    },

    tick: function (time, timeDelta) {
        if (!this.mesh) return;

        // Audio Uniforms
        let bass = 0;
        if (this.audioSystem && this.audioSystem.isPlaying) {
            const bands = this.audioSystem.getBands();
            if (bands) bass = bands.bass;
        } else {
            bass = (Math.sin(time * 0.003) * 0.5 + 0.5) * 0.1;
        }

        // Update Shader Uniforms
        this.uniforms.uBass.value = bass;
        this.uniforms.uTime.value = time;

        const deltaSeconds = timeDelta / 1000;
        const warpSpeed = 30.0 + (bass * 200.0);
        const traverse = warpSpeed * deltaSeconds;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            p.z += traverse * p.speedOffset;

            // Reset Loop
            if (p.z > 20) {
                p.z = -150;
                p.x = (Math.random() - 0.5) * 60;
                p.y = (Math.random() - 0.5) * 60;
                p.rotation = Math.random() * Math.PI;
            }

            this.dummy.position.set(p.x, p.y, p.z);
            this.dummy.rotation.z = p.rotation;

            // Pulse Thickness with shader (Uniform does color, scale does physical size)
            // Combined effect creates the "Ballooning" neon look
            const thickness = 1.0 + (bass * 1.5);
            this.dummy.scale.set(thickness, thickness, 1);

            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
    }
});
