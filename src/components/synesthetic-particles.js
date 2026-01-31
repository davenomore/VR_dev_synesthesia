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
        count: { default: 10000 }, // Increased for density
        size: { default: 0.008 },  // Increased from 0.004
        spread: { default: 4.0 }, // Smaller radius to bring it closer
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
        this.scales = new Float32Array(this.data.count);
        this.lifetimes = new Float32Array(this.data.count);
        this.paintLife = new Float32Array(this.data.count); // For Gold Paint effect

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

            // Random point in spherical shell
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);

            // THICK Shell distribution: spread +/- large variation
            // User requested "thick sphere shell"
            const thickness = 2.0;
            const r = spread + (Math.random() - 0.5) * thickness;

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta) + 1.1; // Lowered center (1.1m) to fill lower view
            const z = r * Math.cos(phi);

            this.positions[i3] = x;
            this.positions[i3 + 1] = y;
            this.positions[i3 + 2] = z;

            // Store HOME position for smooth reset
            if (!this.homePositions) this.homePositions = new Float32Array(this.data.count * 3);
            this.homePositions[i3] = x;
            this.homePositions[i3 + 1] = y;
            this.homePositions[i3 + 2] = z;

            // Initial velocity: gently push OUT
            const rx = Math.sin(phi) * Math.cos(theta);
            const ry = Math.sin(phi) * Math.sin(theta);
            const rz = Math.cos(phi);
            const startPush = 0.1; // Gentle Drift

            this.velocities[i3] = rx * startPush;
            this.velocities[i3 + 1] = ry * startPush;
            this.velocities[i3 + 2] = rz * startPush;

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

    smoothReset: function () {
        console.log('[Particles] 🔄 SMOOTH RESET initiated');
        this.isResetting = true;
        this.resetTime = 0;

        // Disable reset after 3 seconds (let them float again)
        setTimeout(() => {
            this.isResetting = false;
        }, 3000);
    },

    reset: function () {
        // ... legacy instant reset (kept for fallback) ...
        console.log('[Particles] 🔄 INSTANT RESET');
        // ... existing implementation ...
        const count = this.data.count;
        const spread = this.data.spread;

        for (let i = 0; i < count; i++) {
            // ... existing reset logic ...
            // Update HOME too just in case
        }
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
        // Prevent duplicates
        if (this.attractors.includes(attractor)) {
            console.log('[Particles] Attractor already in list, skipping');
            return;
        }
        console.log(`[Particles] ➕ Adding attractor: ${attractor.data?.hand || 'unknown'}`);
        this.attractors.push(attractor);
    },

    removeAttractor: function (attractor) {
        const idx = this.attractors.indexOf(attractor);
        if (idx > -1) {
            console.log(`[Particles] ➖ Removing attractor: ${attractor.data?.hand || 'unknown'}`);
            this.attractors.splice(idx, 1);
        }
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

        // --- SMOOTH RESET LOGIC (Natural Flow) ---
        if (this.isResetting) {
            this.time += dt;
            const noiseScale = this.data.noiseScale;
            // "Slower" / "Smaller bounding" requested
            // Reduced turbulence to keep them tighter to the path
            const resetTurbulence = 0.5; // Reduced from 2.0

            for (let i = 0; i < this.data.count; i++) {
                const i3 = i * 3;
                let x = this.positions[i3];
                let y = this.positions[i3 + 1];
                let z = this.positions[i3 + 2];

                // 1. Calculate Flow/Curl (Make them swim)
                const curl = curlNoise4DFast(
                    x * noiseScale,
                    y * noiseScale,
                    z * noiseScale,
                    this.time // animate noise
                );

                // Apply curl force
                this.velocities[i3] += curl[0] * this.data.velocityScale * resetTurbulence * dt;
                this.velocities[i3 + 1] += curl[1] * this.data.velocityScale * resetTurbulence * dt;
                this.velocities[i3 + 2] += curl[2] * this.data.velocityScale * resetTurbulence * dt;

                // 2. Homing Force
                if (this.homePositions) {
                    const hx = this.homePositions[i3];
                    const hy = this.homePositions[i3 + 1];
                    const hz = this.homePositions[i3 + 2];
                    const dx = hx - x;
                    const dy = hy - y;
                    const dz = hz - z;

                    // Tighter spring for "smaller bounding"
                    const spring = 3.0 * dt;
                    this.velocities[i3] += dx * spring;
                    this.velocities[i3 + 1] += dy * spring;
                    this.velocities[i3 + 2] += dz * spring;

                    // Stronger damping to prevent "bouncing" (overshoot)
                    const damp = 0.96;
                    this.velocities[i3] *= damp;
                    this.velocities[i3 + 1] *= damp;
                    this.velocities[i3 + 2] *= damp;
                }

                x += this.velocities[i3];
                y += this.velocities[i3 + 1];
                z += this.velocities[i3 + 2];

                this.positions[i3] = x;
                this.positions[i3 + 1] = y;
                this.positions[i3 + 2] = z;
            }
            this.updateMatrices();
            this.mesh.instanceColor.needsUpdate = true;
            return; // EXIT TICK
        }

        const noiseScale = this.data.noiseScale;
        const velocityScale = this.data.velocityScale * turbulence;
        const spread = this.data.spread;

        // Debug: Log attractor status
        if (this.attractors.length > 0 && Math.random() < 0.01) {
            console.log(`[Particles] 🧲 Active attractors: ${this.attractors.length}`);
            for (const a of this.attractors) {
                const handName = a.data ? a.data.hand : 'unknown';
                console.log(`  - ${handName} hand at (${a.position.x.toFixed(2)}, ${a.position.y.toFixed(2)}, ${a.position.z.toFixed(2)})`);
            }
        }

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
                    const isLeft = attractor.data && attractor.data.hand === 'left';

                    if (isLeft && attractor.data.mode !== 'paint') {
                        // --- VORTEX PHYSICS (Left Hand - Tornado/Palm) ---
                        // 1. Attraction (Pull in)
                        const pull = clampedForce * dt;
                        this.velocities[i3] += (ax / dist) * pull;
                        this.velocities[i3 + 1] += (ay / dist) * pull;
                        this.velocities[i3 + 2] += (az / dist) * pull;

                        // 2. Swirl
                        let sx = -az;
                        let sz = ax;
                        const sLen = Math.sqrt(sx * sx + sz * sz) + 0.001;
                        const swirlStr = 2.0;
                        const spin = (clampedForce * swirlStr * (1.0 / (dist + 0.4))) * dt;

                        this.velocities[i3] += (sx / sLen) * spin;
                        this.velocities[i3 + 2] += (sz / sLen) * spin;

                    } else if (attractor.data && attractor.data.mode === 'freeze') {
                        this.velocities[i3] *= 0.90;
                        this.velocities[i3 + 1] *= 0.90;
                        this.velocities[i3 + 2] *= 0.90;

                    } else if (attractor.data && attractor.data.mode === 'tornado') {
                        const spinSpeed = 5.0 * dt;
                        const liftSpeed = 2.0 * dt;
                        this.velocities[i3] += (az / dist) * spinSpeed;
                        this.velocities[i3 + 2] -= (ax / dist) * spinSpeed;
                        this.velocities[i3 + 1] += liftSpeed;
                        const pull = 2.0 * dt;
                        this.velocities[i3] -= (ax / dist) * pull;
                        this.velocities[i3 + 2] -= (az / dist) * pull;

                    } else if (attractor.data && attractor.data.mode === 'fountain') {
                        const spray = 12.0 * dt;
                        this.velocities[i3 + 1] += spray;
                        const spread = 2.0 * dt;
                        this.velocities[i3] += (ax / dist) * spread;
                        this.velocities[i3 + 2] += (az / dist) * spread;

                    } else if (attractor.data && attractor.data.mode === 'levitate') {
                        // --- ANTI-GRAVITY / LEVITATION (Left Palm Up) ---
                        // 1. Dampen velocity (Zero-G feel)
                        this.velocities[i3] *= 0.95;
                        this.velocities[i3 + 1] *= 0.95;
                        this.velocities[i3 + 2] *= 0.95;

                        // 2. Gentle Rise (Slower & Limited Height)
                        // User requested "slower" and "not so high"
                        const lift = 0.5 * dt; // Reduced from 1.5

                        // Only lift if below ceiling (2.0m)
                        if (y < 2.0) {
                            this.velocities[i3 + 1] += lift;
                        } else {
                            // Soft ceiling: gentle push down if exceeding height
                            this.velocities[i3 + 1] -= lift * 0.5;
                        }

                        // 3. Ethereal Drift
                        this.velocities[i3] += (Math.random() - 0.5) * 0.5 * dt;
                        this.velocities[i3 + 1] += (Math.random() - 0.5) * 0.5 * dt; // Vertical jitter too
                        this.velocities[i3 + 2] += (Math.random() - 0.5) * 0.5 * dt;

                    } else if (attractor.data && attractor.data.mode === 'beam') {
                        // --- BEAM / LASER (Right Index) ---
                        // Shoots particles in a straight line relative to finger direction

                        const dir = attractor.data.direction || { x: 0, y: 0, z: -1 };

                        // Vector from Attractor to Particle
                        const px = -ax; const py = -ay; const pz = -az;

                        // Project onto Direction Axis (How far along the beam?)
                        const dot = px * dir.x + py * dir.y + pz * dir.z;

                        // Calculate center on axis
                        const cx = dir.x * dot; const cy = dir.y * dot; const cz = dir.z * dot;

                        // Radial vector (Distance from beam center)
                        const rx = px - cx; const ry = py - cy; const rz = pz - cz;
                        const rDist = Math.sqrt(rx * rx + ry * ry + rz * rz) + 0.001;

                        // 1. BEAM CONTAINMENT
                        // Define valid beam region: In front of finger (dot > 0)

                        if (dot < 0) {
                            // BEHIND FINGER: Suck into the "Source" (Fingertip)
                            // This creates the supply for the beam
                            const distToTip = Math.sqrt(px * px + py * py + pz * pz);
                            const suction = 15.0 * dt; // Strong suction

                            this.velocities[i3] -= (px / distToTip) * suction;
                            this.velocities[i3 + 1] -= (py / distToTip) * suction;
                            this.velocities[i3 + 2] -= (pz / distToTip) * suction;

                        } else if (rDist < 0.05) {
                            // IN BEAM (Cylinder 5cm): Shoot forward
                            // "Thinner beam" requested
                            const speed = 12.0 * dt;
                            this.velocities[i3] += dir.x * speed;
                            this.velocities[i3 + 1] += dir.y * speed;
                            this.velocities[i3 + 2] += dir.z * speed;

                            // Focus (Keep VERY tight)
                            const focus = (rDist) * 25.0 * dt; // Increased focus
                            this.velocities[i3] -= rx * focus;
                            this.velocities[i3 + 1] -= ry * focus;
                            this.velocities[i3 + 2] -= rz * focus;

                        } else {
                            // NEAR BEAM: Suck towards axis
                            if (rDist < 0.8) {
                                const suction = 5.0 * dt;
                                this.velocities[i3] -= rx * suction;
                                this.velocities[i3 + 1] -= ry * suction;
                                this.velocities[i3 + 2] -= rz * suction;
                            }
                        }

                    } else if (attractor.data && attractor.data.mode === 'orb') {
                        // --- ORB / BUTTON (Right Pinch) ---
                        // Simple strong pull to center to form a SOLID ball
                        const pull = clampedForce * dt;
                        this.velocities[i3] += (ax / dist) * pull;
                        this.velocities[i3 + 1] += (ay / dist) * pull;
                        this.velocities[i3 + 2] += (az / dist) * pull;

                        // Jitter at center to keep it alive
                        if (dist < 0.1) {
                            this.velocities[i3] += (Math.random() - 0.5) * 0.5 * dt;
                            this.velocities[i3 + 1] += (Math.random() - 0.5) * 0.5 * dt;
                            this.velocities[i3 + 2] += (Math.random() - 0.5) * 0.5 * dt;
                        }

                    } else if (attractor.data && attractor.data.mode === 'singularity') {
                        // --- SINGULARITY / BLACK HOLE (Left Index) ---
                        // Extreme gravity + Accretion Disk Swirl + Heat

                        // 1. GRAVITY (Exponential pull)
                        // Closer = Much stronger
                        const gravity = (clampedForce * 2.0) / (dist * dist + 0.1);
                        this.velocities[i3] += (ax / dist) * gravity * dt;
                        this.velocities[i3 + 1] += (ay / dist) * gravity * dt;
                        this.velocities[i3 + 2] += (az / dist) * gravity * dt;

                        // 2. ACCRETION DISK (Swirl)
                        // Tangent axis (approximate 'up' or random axis for chaos)
                        // Let's use Up vector {0,1,0} for horizontal disk, or Camera direction?
                        // Let's make it swirl around the finger-to-particle vector? No.
                        // Standard swirl around Y axis (horizontal disk) looks best for "Galaxy"
                        const sx = -az;
                        const sz = ax;
                        const sLen = Math.sqrt(sx * sx + sz * sz) + 0.001;

                        // Speed increases near center
                        const swirlSpeed = (5.0 / (dist + 0.2)) * dt;

                        this.velocities[i3] += (sx / sLen) * swirlSpeed;
                        this.velocities[i3 + 2] += (sz / sLen) * swirlSpeed;

                        // Flatten disk (pull to y-plane of attractor)
                        const flatter = 5.0 * dt;
                        this.velocities[i3 + 1] += (ay * flatter); // Push back to y=0 relative

                        // 3. HEAT (Coloring)
                        // < 0.5m = Red/Orange
                        if (dist < 0.5) {
                            this.paintLife[i] = 0.2; // Brief flash
                            // We use paintLife to blend color. 
                            // Hack: We'll set a special "heat" flag or repurpose paintLife
                            // Let's use existing paintLife logic but with Fire colors below
                        }

                    } else if (attractor.data && attractor.data.hand === 'right') {

                    } else {
                        // Sphere logic
                        if (Math.abs(attractor.strength) > 20) {
                            const targetRadius = attractor.radius;
                            const diff = dist - targetRadius;
                            const spring = diff * 4.0 * dt;
                            this.velocities[i3] += (ax / dist) * spring;
                            this.velocities[i3 + 1] += (ay / dist) * spring;
                            this.velocities[i3 + 2] += (az / dist) * spring;
                            const swirlSpeed = 2.0 * dt;
                            this.velocities[i3] += (az / dist) * swirlSpeed;
                            this.velocities[i3 + 2] -= (ax / dist) * swirlSpeed;
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

            // --- GLOBAL CONTAINMENT ---
            let isStronglyPulled = false;
            for (const a of this.attractors) {
                const dx = a.position.x - x;
                const dy = a.position.y - y;
                const dz = a.position.z - z;
                const d = Math.sqrt(dx * dx + dy * dy + dz * dz); // Corrected distance calculation
                if (d < a.radius && Math.abs(a.strength) > 25) {
                    isStronglyPulled = true;
                    break;
                }
            }

            if (!isStronglyPulled) {
                const cy = 1.1;
                const dy = y - cy;
                const centerDist = Math.sqrt(x * x + dy * dy + z * z);
                const shellRadius = spread;
                const thickness = 2.0;
                const innerWall = shellRadius - (thickness / 2);
                const outerWall = shellRadius + (thickness / 2);

                if (centerDist < innerWall) {
                    const push = 2.0 * dt;
                    this.velocities[i3] += (x / centerDist) * push;
                    this.velocities[i3 + 1] += (dy / centerDist) * push;
                    this.velocities[i3 + 2] += (z / centerDist) * push;
                } else if (centerDist > outerWall) {
                    const pull = 1.0 * dt;
                    this.velocities[i3] -= (x / centerDist) * pull;
                    this.velocities[i3 + 1] -= (dy / centerDist) * pull;
                    this.velocities[i3 + 2] -= (z / centerDist) * pull;
                }
            }

            this.positions[i3] = x;
            this.positions[i3 + 1] = y;
            this.positions[i3 + 2] = z;

            this.scales[i] = (0.5 + Math.random() * 0.1) * pulseScale;

            if (colorTemp < 0.5) {
                this.tempColor.lerpColors(this.colorLow, this.colorMid, colorTemp * 2);
            } else {
                this.tempColor.lerpColors(this.colorMid, this.colorHigh, (colorTemp - 0.5) * 2);
            }

            // Handle PAINT / HEAT Overlay
            if (this.paintLife[i] > 0) {
                this.paintLife[i] -= dt;

                // Magma / Singularity Color (Red-Orange-White)
                const magma = { r: 1.0, g: 0.3, b: 0.1 };

                const blend = Math.min(1.0, this.paintLife[i]);
                this.tempColor.r = this.tempColor.r * (1 - blend) + magma.r * blend;
                this.tempColor.g = this.tempColor.g * (1 - blend) + magma.g * blend;
                this.tempColor.b = this.tempColor.b * (1 - blend) + magma.b * blend;
            }

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
