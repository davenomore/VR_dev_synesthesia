/* global AFRAME, THREE */

/**
 * Fluid Sphere - "Dream Material" Style
 * Inspired by AI generated videos: Liquid Chrome / Organic Morphing
 */
AFRAME.registerComponent('fluid-sphere', {
    schema: {
        radius: { default: 0.25 },      // Reduced for handheld feel
        detail: { default: 50 },        // Increased slightly for smoother chrome
        noiseScale: { default: 2.0 },   // Balanced noise
        noiseSpeed: { default: 0.3 },   // Smooth motion
        audioReactivity: { default: 2.0 },
        // Vibrant "Magic" Colors
        colorLow: { type: 'color', default: '#1a0033' },    // Deep Purple
        colorMid: { type: 'color', default: '#00ccff' },    // Bright Blue
        colorHigh: { type: 'color', default: '#ff00ff' }    // Magenta Highlights
    },

    init: function () {
        this.time = 0;
        this.audioAnalyzer = null;
        this.attractors = [];
        this.waves = [];

        // Pre-allocate vectors
        this.vec = new THREE.Vector3();

        this.colorLow = new THREE.Color(this.data.colorLow);
        this.colorMid = new THREE.Color(this.data.colorMid);
        this.colorHigh = new THREE.Color(this.data.colorHigh);

        this.createSphere();

        this.el.sceneEl.addEventListener('loaded', () => {
            this.audioAnalyzer = this.el.sceneEl.systems['audio-analyzer'];
        });

        console.log('[FluidSphere] Dream Material Loaded');
    },

    createSphere: function () {
        const geometry = new THREE.IcosahedronGeometry(this.data.radius, this.data.detail);

        // Store originals & pre-calc normals
        const positions = geometry.attributes.position.array;
        this.originalPositions = new Float32Array(positions.length);
        this.normals = new Float32Array(positions.length);

        for (let i = 0; i < positions.length; i += 3) {
            this.originalPositions[i] = positions[i];
            this.originalPositions[i + 1] = positions[i + 1];
            this.originalPositions[i + 2] = positions[i + 2];

            const len = Math.sqrt(positions[i] ** 2 + positions[i + 1] ** 2 + positions[i + 2] ** 2);
            this.normals[i] = positions[i] / len;
            this.normals[i + 1] = positions[i + 1] / len;
            this.normals[i + 2] = positions[i + 2] / len;
        }

        // --- LIQUID METAL SHADER ---
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                bass: { value: 0 },
                mid: { value: 0 },
                high: { value: 0 },
                touchStrength: { value: 0 },
                colorLow: { value: this.colorLow },
                colorMid: { value: this.colorMid },
                colorHigh: { value: this.colorHigh }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vWorldPosition;
                varying float vDisplacement;
                varying vec2 vUv;
                
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vUv = uv;
                    
                    vec4 worldPos = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPos.xyz;
                    vDisplacement = length(position) - ${this.data.radius.toFixed(3)};
                    
                    gl_Position = projectionMatrix * viewMatrix * worldPos;
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float bass;
                uniform float mid;
                uniform float high;
                uniform float touchStrength;
                uniform vec3 touchPos; // New: track where the touch is happening
                
                uniform vec3 colorLow;
                uniform vec3 colorMid;
                uniform vec3 colorHigh;
                
                varying vec3 vNormal;
                varying vec3 vWorldPosition;
                varying float vDisplacement;
                
                // Fast noise
                float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
                
                void main() {
                    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
                    vec3 normal = normalize(vNormal);
                    
                    // Chrome Reflection
                    vec3 ref = reflect(-viewDir, normal);
                    float fresnel = pow(1.0 - max(0.0, dot(viewDir, normal)), 2.0);
                    
                    // Base Colors
                    vec3 color = mix(colorLow, colorMid, fresnel * 0.8 + mid * 0.4);
                    
                    // Highlights
                    float highlight = pow(max(0.0, dot(ref, vec3(0.0, 1.0, 0.0))), 8.0);
                    color += colorHigh * highlight * (1.0 + high);
                    
                    // Structure shadow
                    float depth = smoothstep(-0.05, 0.1, vDisplacement);
                    color *= (0.5 + 0.5 * depth);
                    
                    // --- PROXIMITY GLOW ---
                    // If touchStrength > 0, glow around that point
                    // We cheat and use view direction for now as we don't pass per-pixel touch pos easily
                    // Instead just flash the whole thing or use fresnel
                    
                    // Global flash on wave
                    color += vec3(0.2, 0.8, 1.0) * touchStrength * depth;
                    
                    gl_FragColor = vec4(color, 0.85 + mid * 0.15);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending, // Solid metallic feel
            depthWrite: true
        });

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.geometry = geometry;

        // Add subtle glow halo
        const haloGeo = new THREE.IcosahedronGeometry(this.data.radius * 1.2, 8);
        const haloMat = new THREE.MeshBasicMaterial({
            color: this.colorHigh,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
        });
        this.halo = new THREE.Mesh(haloGeo, haloMat);
        this.mesh.add(this.halo);

        this.el.setObject3D('mesh', this.mesh);
    },

    addAttractor: function (attractor) { this.attractors.push(attractor); },
    removeAttractor: function (attractor) {
        const idx = this.attractors.indexOf(attractor);
        if (idx > -1) this.attractors.splice(idx, 1);
    },
    addWave: function (worldPos, intensity) {
        this.waves.push({
            x: worldPos.x, y: worldPos.y, z: worldPos.z,
            intensity: Math.min(intensity, 0.5),
            time: 0, maxTime: 1.0
        });
        this.material.uniforms.touchStrength.value = 1.0;
    },

    // Perlin-like noise
    noise3D: function (x, y, z) {
        // Simple sin-based combination for fluid motion
        return (Math.sin(x) + Math.sin(y * 1.2) + Math.sin(z * 0.8) + Math.cos(x * 0.5 + y * 1.5)) * 0.25 + 0.5;
    },

    tick: function (time, delta) {
        if (!this.mesh) return;
        const dt = Math.min(delta / 1000, 0.05);
        this.time += dt * this.data.noiseSpeed;

        if (this.material.uniforms.touchStrength.value > 0)
            this.material.uniforms.touchStrength.value *= 0.92;

        let bass = 0, mid = 0, high = 0;
        if (this.audioAnalyzer) {
            const bands = this.audioAnalyzer.getBands();
            bass = bands.bass; mid = bands.mid; high = bands.high;
        }

        this.material.uniforms.time.value = this.time;
        this.material.uniforms.bass.value = bass;
        this.material.uniforms.mid.value = mid;
        this.material.uniforms.high.value = high;

        // Halo pulse
        this.halo.scale.setScalar(1.0 + bass * 0.8);
        this.halo.material.opacity = 0.05 + mid * 0.1;

        // --- VERTEX PHYSICS ---
        const positions = this.geometry.attributes.position.array;
        const count = positions.length / 3;
        const sphereWorldPos = this.el.object3D.position;
        const noiseScale = this.data.noiseScale;

        // Pre-calc attractors
        const attCount = this.attractors.length;
        const attX = new Float32Array(attCount), attY = new Float32Array(attCount), attZ = new Float32Array(attCount);
        const attRadSq = new Float32Array(attCount), attStr = new Float32Array(attCount);

        for (let k = 0; k < attCount; k++) {
            attX[k] = this.attractors[k].position.x - sphereWorldPos.x;
            attY[k] = this.attractors[k].position.y - sphereWorldPos.y;
            attZ[k] = this.attractors[k].position.z - sphereWorldPos.z;
            attRadSq[k] = this.attractors[k].radius * this.attractors[k].radius;
            attStr[k] = this.attractors[k].strength;
        }

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const ox = this.originalPositions[i3];
            const oy = this.originalPositions[i3 + 1];
            const oz = this.originalPositions[i3 + 2];
            const nx = this.normals[i3], ny = this.normals[i3 + 1], nz = this.normals[i3 + 2];

            // 1. Organic Liquid Noise (Slower, smoother)
            const nVal = this.noise3D(
                ox * noiseScale + this.time,
                oy * noiseScale + this.time * 0.8,
                oz * noiseScale + this.time * 0.5
            );
            let disp = (nVal - 0.5) * (0.1 + bass * 0.6); // Subtle breathing

            // 2. Hand Interaction
            for (let k = 0; k < attCount; k++) {
                const dx = attX[k] - ox, dy = attY[k] - oy, dz = attZ[k] - oz;
                const distSq = dx * dx + dy * dy + dz * dz;

                if (distSq < attRadSq[k]) {
                    const dist = Math.sqrt(distSq);
                    const influence = (1 - dist / Math.sqrt(attRadSq[k]));
                    disp += influence * attStr[k] * 0.015;
                }
            }

            // 3. Waves
            for (const wave of this.waves) {
                const wx = sphereWorldPos.x + ox - wave.x;
                const wy = sphereWorldPos.y + oy - wave.y;
                const wz = sphereWorldPos.z + oz - wave.z;
                const wDist = Math.sqrt(wx * wx + wy * wy + wz * wz);
                const wRad = wave.time * 0.7;
                if (Math.abs(wDist - wRad) < 0.15) {
                    disp += Math.sin((wDist - wRad) * 40) * wave.intensity * (1 - wave.time);
                }
            }

            positions[i3] = ox + nx * disp;
            positions[i3 + 1] = oy + ny * disp;
            positions[i3 + 2] = oz + nz * disp;
        }

        // Update waves
        for (let w = this.waves.length - 1; w >= 0; w--) {
            this.waves[w].time += dt;
            if (this.waves[w].time > 1) this.waves.splice(w, 1);
        }

        this.geometry.attributes.position.needsUpdate = true;
        if (this.time % 0.1 < 0.02) this.geometry.computeVertexNormals();

        this.mesh.rotation.y += dt * 0.05;
        this.mesh.rotation.z = Math.sin(this.time * 0.1) * 0.05;
    },

    remove: function () {
        if (this.mesh) {
            this.el.removeObject3D('mesh');
            this.geometry.dispose();
            this.material.dispose();
        }
    }
});
