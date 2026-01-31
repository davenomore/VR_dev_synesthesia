/* global AFRAME, THREE */

/**
 * Inline 4D Simplex Noise (Quest browser compatible)
 * Simplified version for performance
 */
const SimplexNoise = (function () {
    const perm = new Uint8Array(512);
    const grad4 = [
        [0, 1, 1, 1], [0, 1, 1, -1], [0, 1, -1, 1], [0, 1, -1, -1],
        [0, -1, 1, 1], [0, -1, 1, -1], [0, -1, -1, 1], [0, -1, -1, -1],
        [1, 0, 1, 1], [1, 0, 1, -1], [1, 0, -1, 1], [1, 0, -1, -1],
        [-1, 0, 1, 1], [-1, 0, 1, -1], [-1, 0, -1, 1], [-1, 0, -1, -1],
        [1, 1, 0, 1], [1, 1, 0, -1], [1, -1, 0, 1], [1, -1, 0, -1],
        [-1, 1, 0, 1], [-1, 1, 0, -1], [-1, -1, 0, 1], [-1, -1, 0, -1],
        [1, 1, 1, 0], [1, 1, -1, 0], [1, -1, 1, 0], [1, -1, -1, 0],
        [-1, 1, 1, 0], [-1, 1, -1, 0], [-1, -1, 1, 0], [-1, -1, -1, 0]
    ];

    // Initialize permutation table
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

    const F4 = (Math.sqrt(5) - 1) / 4;
    const G4 = (5 - Math.sqrt(5)) / 20;

    function noise4D(x, y, z, w) {
        const s = (x + y + z + w) * F4;
        const i = Math.floor(x + s), j = Math.floor(y + s);
        const k = Math.floor(z + s), l = Math.floor(w + s);
        const t = (i + j + k + l) * G4;
        const x0 = x - (i - t), y0 = y - (j - t);
        const z0 = z - (k - t), w0 = w - (l - t);

        let n = 0;
        const t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
        if (t0 > 0) {
            const gi = perm[(i + perm[(j + perm[(k + perm[l & 255]) & 255]) & 255]) & 255] % 32;
            const g = grad4[gi];
            n = t0 * t0 * t0 * t0 * (g[0] * x0 + g[1] * y0 + g[2] * z0 + g[3] * w0);
        }
        return n * 27;
    }

    return {
        curlNoise4DFast: function (x, y, z, w) {
            const n1 = noise4D(x, y, z, w);
            const n2 = noise4D(x + 100, y + 100, z + 100, w);
            const n3 = noise4D(x + 200, y + 200, z + 200, w);
            return [n2 - n3, n3 - n1, n1 - n2];
        }
    };
})();

const curlNoise4DFast = SimplexNoise.curlNoise4DFast;

/**
 * Synesthetic Particles Component
 * 100K GPU-accelerated particles with audio-reactive flow field
 */
AFRAME.registerComponent('synesthetic-particles', {
    schema: {
        count: { default: 30000 },
        size: { default: 0.004 },
        spread: { default: 3 },
        noiseScale: { default: 0.5 },
        noiseSpeed: { default: 0.3 },
        velocityScale: { default: 0.02 },
        // Colors (Cyber-Organic palette)
        colorLow: { type: 'color', default: '#1a0033' },   // Deep Indigo
        colorMid: { type: 'color', default: '#00ff88' },   // Neon Mint
        colorHigh: { type: 'color', default: '#aaddff' }   // Soft Blue White
    },

    init: function () {
        this.time = 0;
        this.audioAnalyzer = null;

        // Particle data arrays
        this.positions = new Float32Array(this.data.count * 3);
        this.velocities = new Float32Array(this.data.count * 3);
        this.colors = new Float32Array(this.data.count * 3);
        this.scales = new Float32Array(this.data.count);
        this.lifetimes = new Float32Array(this.data.count);

        // Color objects for lerping
        this.colorLow = new THREE.Color(this.data.colorLow);
        this.colorMid = new THREE.Color(this.data.colorMid);
        this.colorHigh = new THREE.Color(this.data.colorHigh);
        this.tempColor = new THREE.Color();

        // Attractor points (set by hand-attractor component)
        this.attractors = [];

        // Create particle system
        this.createParticles();

        // Get audio analyzer reference
        this.el.sceneEl.addEventListener('loaded', () => {
            this.audioAnalyzer = this.el.sceneEl.systems['audio-analyzer'];
        });

        console.log(`[SynestheticParticles] Initialized with ${this.data.count} particles`);
    },

    createParticles: function () {
        const count = this.data.count;
        const spread = this.data.spread;

        // Initialize positions randomly in sphere
        for (let i = 0; i < count; i++) {
            const i3 = i * 3;

            // Random point in sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = Math.pow(Math.random(), 0.33) * spread;

            this.positions[i3] = r * Math.sin(phi) * Math.cos(theta);
            this.positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            this.positions[i3 + 2] = r * Math.cos(phi);

            // Initial velocity
            this.velocities[i3] = 0;
            this.velocities[i3 + 1] = 0;
            this.velocities[i3 + 2] = 0;

            // Initial color (deep indigo)
            this.colors[i3] = this.colorLow.r;
            this.colors[i3 + 1] = this.colorLow.g;
            this.colors[i3 + 2] = this.colorLow.b;

            // Random scale variation
            this.scales[i] = 0.5 + Math.random() * 0.5;

            // Random lifetime offset for variation
            this.lifetimes[i] = Math.random() * 10;
        }

        // Create instanced mesh
        const geometry = new THREE.IcosahedronGeometry(this.data.size, 1);

        // Custom shader material for HDR-like additive blending
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.mesh = new THREE.InstancedMesh(geometry, material, count);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        // Add instance colors
        this.mesh.instanceColor = new THREE.InstancedBufferAttribute(this.colors, 3);
        this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);

        // Dummy matrix for transforms
        this.dummy = new THREE.Object3D();

        // Initial matrix update
        this.updateMatrices();

        // Add to scene
        this.el.setObject3D('particles', this.mesh);
    },

    updateMatrices: function () {
        for (let i = 0; i < this.data.count; i++) {
            const i3 = i * 3;

            this.dummy.position.set(
                this.positions[i3],
                this.positions[i3 + 1],
                this.positions[i3 + 2]
            );
            this.dummy.scale.setScalar(this.scales[i]);
            this.dummy.updateMatrix();

            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    },

    /**
     * Add an attractor point (called by hand-attractor)
     */
    addAttractor: function (attractor) {
        this.attractors.push(attractor);
    },

    removeAttractor: function (attractor) {
        const idx = this.attractors.indexOf(attractor);
        if (idx > -1) this.attractors.splice(idx, 1);
    },

    tick: function (time, delta) {
        if (!this.mesh) return;

        const dt = Math.min(delta / 1000, 0.033); // Cap at 30fps minimum
        this.time += dt * this.data.noiseSpeed;

        // Get audio data
        let bass = 0, mid = 0, high = 0;
        if (this.audioAnalyzer) {
            const bands = this.audioAnalyzer.getBands();
            bass = bands.bass;
            mid = bands.mid;
            high = bands.high;
        }

        // Precompute audio-reactive values
        const pulseScale = 1 + bass * 1.5;
        const turbulence = 1 + mid * 5.0;
        const colorTemp = high;

        const noiseScale = this.data.noiseScale;
        const velocityScale = this.data.velocityScale * turbulence;
        const spread = this.data.spread;

        // Update particles
        for (let i = 0; i < this.data.count; i++) {
            const i3 = i * 3;

            let x = this.positions[i3];
            let y = this.positions[i3 + 1];
            let z = this.positions[i3 + 2];

            // 4D Curl noise for flow field
            const curl = curlNoise4DFast(
                x * noiseScale,
                y * noiseScale,
                z * noiseScale,
                this.time + this.lifetimes[i]
            );

            // Apply curl velocity
            this.velocities[i3] += curl[0] * velocityScale * dt;
            this.velocities[i3 + 1] += curl[1] * velocityScale * dt;
            this.velocities[i3 + 2] += curl[2] * velocityScale * dt;

            // Apply attractor forces
            for (const attractor of this.attractors) {
                const ax = attractor.position.x - x;
                const ay = attractor.position.y - y;
                const az = attractor.position.z - z;
                const dist = Math.sqrt(ax * ax + ay * ay + az * az) + 0.01;

                if (dist < attractor.radius) {
                    // Stronger force with smoother falloff
                    const normalizedDist = dist / attractor.radius;
                    const falloff = 1 - normalizedDist; // Linear falloff
                    const force = attractor.strength * falloff * 0.01;
                    const maxForce = 0.5;
                    const clampedForce = Math.min(Math.abs(force), maxForce) * Math.sign(force);

                    // Determine physics mode based on hand
                    // 'left' -> Vortex
                    // 'right' -> Disk / Shell
                    const isLeft = attractor.data && attractor.data.hand === 'left';

                    if (isLeft) {
                        // --- VORTEX PHYSICS (Left Hand) ---
                        // 1. Attraction (Pull in)
                        const pull = clampedForce * dt;
                        this.velocities[i3] += (ax / dist) * pull;
                        this.velocities[i3 + 1] += (ay / dist) * pull;
                        this.velocities[i3 + 2] += (az / dist) * pull;

                        // 2. Swirl (Tangential force)
                        let sx = -az;
                        let sz = ax;

                        // Normalize and apply
                        const sLen = Math.sqrt(sx * sx + sz * sz) + 0.001;
                        const swirlStr = 2.0;
                        const spin = (clampedForce * swirlStr * (1.0 / (dist + 0.4))) * dt;

                        this.velocities[i3] += (sx / sLen) * spin;
                        this.velocities[i3 + 2] += (sz / sLen) * spin;

                    } else {
                        // --- DISK/SHELL PHYSICS (Right Hand) ---
                        // Attraction with Singularity Protection (Repulsion at core)

                        if (dist < 0.2) {
                            // Repel strongly to create empty center (Disk/Ring effect)
                            const repel = clampedForce * 5.0 * dt;
                            this.velocities[i3] -= (ax / dist) * repel;
                            this.velocities[i3 + 1] -= (ay / dist) * repel;
                            this.velocities[i3 + 2] -= (az / dist) * repel;
                        } else {
                            // Normal attraction
                            const pull = clampedForce * dt;
                            this.velocities[i3] += (ax / dist) * pull;
                            this.velocities[i3 + 1] += (ay / dist) * pull;
                            this.velocities[i3 + 2] += (az / dist) * pull;
                        }
                    }
                }
            }

            // Damping
            const damping = 0.98;
            this.velocities[i3] *= damping;
            this.velocities[i3 + 1] *= damping;
            this.velocities[i3 + 2] *= damping;

            // Update position
            x += this.velocities[i3];
            y += this.velocities[i3 + 1];
            z += this.velocities[i3 + 2];

            // Contain within sphere (soft boundary)
            const dist = Math.sqrt(x * x + y * y + z * z);
            if (dist > spread * 1.5) {
                const factor = spread / dist;
                x *= factor;
                y *= factor;
                z *= factor;
            }

            this.positions[i3] = x;
            this.positions[i3 + 1] = y;
            this.positions[i3 + 2] = z;

            // Update scale (bass = pulse)
            this.scales[i] = (0.5 + Math.random() * 0.1) * pulseScale;

            // Update color based on high frequencies
            // Lerp from low -> mid -> high based on colorTemp
            if (colorTemp < 0.5) {
                this.tempColor.lerpColors(this.colorLow, this.colorMid, colorTemp * 2);
            } else {
                this.tempColor.lerpColors(this.colorMid, this.colorHigh, (colorTemp - 0.5) * 2);
            }

            // Add some variation based on position
            const posVariation = (Math.sin(x * 5 + this.time) + 1) * 0.1;
            this.colors[i3] = Math.min(1, this.tempColor.r + posVariation);
            this.colors[i3 + 1] = Math.min(1, this.tempColor.g + posVariation * 0.5);
            this.colors[i3 + 2] = Math.min(1, this.tempColor.b + posVariation * 0.3);
        }

        // Update GPU buffers
        this.updateMatrices();
        this.mesh.instanceColor.needsUpdate = true;
    },

    remove: function () {
        if (this.mesh) {
            this.el.removeObject3D('particles');
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
});
