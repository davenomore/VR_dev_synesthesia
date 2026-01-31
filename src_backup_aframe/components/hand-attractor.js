/* global AFRAME, THREE */

/**
 * Hand Attractor
 * Detects PINCH and GRIP gestures and registers as an attractor for the Particle System.
 * 
 * Listens for:
 * - gesture-pinch / gesture-pinch-end (from custom gesture-detector)
 * - pinchstarted / pinchended (native A-Frame)
 * - gripdown / gripup (controller fallback)
 */
AFRAME.registerComponent('hand-attractor', {
    schema: {
        hand: { type: 'string' },
        strength: { default: 1.0 },
        radius: { default: 0.5 }
    },

    init: function () {
        this.isActive = false;

        // Find the particle system component
        const particleEl = document.querySelector('[synesthetic-particles]');
        this.particles = particleEl ? particleEl.components['synesthetic-particles'] : null;

        // Position vector reused by the system
        this.position = new THREE.Vector3();
        this.strength = this.data.strength;
        this.radius = this.data.radius;
        this.hand = this.data.hand;

        console.log(`[HandAttractor] Init ${this.data.hand}`);

        // === EVENT LISTENERS ===
        console.log(`[HandAttractor] Setting up listeners on:`, this.el);

        // 1. Custom Gesture Detector: gesture-pinch
        this.el.addEventListener('gesture-pinch', (evt) => {
            console.log(`[HandAttractor] 🔥 GESTURE-PINCH EVENT RECEIVED (${this.data.hand})`, evt);
            this.activate();
        });

        this.el.addEventListener('gesture-pinch-end', (evt) => {
            console.log(`[HandAttractor] GESTURE-PINCH-END (${this.data.hand})`);
            this.deactivate();
        });

        // 2. Native A-Frame Pinch (fallback)
        this.el.addEventListener('pinchstarted', () => {
            console.log(`[HandAttractor] PINCHSTARTED (${this.data.hand})`);
            this.activate();
        });

        this.el.addEventListener('pinchended', () => {
            console.log(`[HandAttractor] PINCHENDED (${this.data.hand})`);
            this.deactivate();
        });

        // 3. Controller Grip (fallback for controller users)
        this.el.addEventListener('gripdown', () => {
            console.log(`[HandAttractor] GRIPDOWN (${this.data.hand})`);
            this.activate();
        });

        this.el.addEventListener('gripup', () => {
            console.log(`[HandAttractor] GRIPUP (${this.data.hand})`);
            this.deactivate();
        });

        // 4. Custom Gesture Detector: gesture-fist (another way to activate)
        this.el.addEventListener('gesture-fist', () => {
            console.log(`[HandAttractor] GESTURE-FIST (${this.data.hand})`);
            this.activate('freeze');
        });

        this.el.addEventListener('gesture-fist-end', () => {
            console.log(`[HandAttractor] GESTURE-FIST-END (${this.data.hand})`);
            this.deactivate();
        });

        // Fallback: Try to find particles again if not found initially (async load)
        if (!this.particles) {
            this.el.sceneEl.addEventListener('loaded', () => {
                const pEl = document.querySelector('[synesthetic-particles]');
                this.particles = pEl ? pEl.components['synesthetic-particles'] : null;
            });
        }
    },

    activate: function (mode = null) {
        if (this.isActive && this.mode === mode) {
            console.log(`[HandAttractor] Already active (${this.data.hand})`);
            return;
        }
        this.isActive = true;
        this.mode = mode; // Store current mode

        console.log(`[HandAttractor] ✅ ACTIVATING (${this.data.hand}) Mode: ${mode || 'standard'}`);

        // Re-query particles if missing
        if (!this.particles) {
            const pEl = document.querySelector('[synesthetic-particles]');
            const gpuEl = document.querySelector('[gpu-particles]');

            if (pEl) {
                this.particles = pEl.components['synesthetic-particles'];
                this.isGPU = false;
            } else if (gpuEl) {
                this.particles = gpuEl.components['gpu-particles'];
                this.isGPU = true;
            }
        }

        if (this.particles) {
            console.log(`[HandAttractor] 🎯 Adding attractor to particle system (${this.data.hand})`);

            // GPU SYSTEM: Managed by hand-distance system, no manual addAttractor needed.
            if (this.isGPU) {
                // Optional: We could update a uniform here if we wanted specific Pinch support in GPU.
                // For now, simple return avoids the crash.
                return;
            }

            if (mode === 'freeze') {
                // FREEZE SETTINGS
                // We pass 'freeze' mode via data, but strength matters less as we dampen velocity
                this.strength = 0;
                this.radius = 100; // Global effect
            } else {
                // PINCH SETTINGS (Mega)
                // Apply "Mega" settings requested by user (transplanted from two-hand pinch)
                this.strength = 50;
                this.radius = 8.0; // Huge reach to GRAB them
                if (!mode) mode = 'orb'; // Default pinch = Orb/Button mode
            }

            // Inject mode into data so particle system can see it
            this.data.mode = mode;

            this.particles.addAttractor(this);
        } else {
            // Silencing this warning as it floods/confuses if system is initializing
            // console.warn('[HandAttractor] ❌ Particle system NOT found!');
        }

        // Haptic
        const haptics = this.el.components['haptics'];
        if (haptics) haptics.pulse(0.5, 50);
    },

    deactivate: function () {
        if (!this.isActive) return;
        this.isActive = false;
        console.log(`[HandAttractor] 🔴 DEACTIVATING (${this.data.hand})`);

        if (this.particles) {
            this.particles.removeAttractor(this);
        }
    },

    tick: function () {
        if (!this.isActive) return;

        // Try to get position from WebXR hand joints (more reliable)
        const renderer = this.el.sceneEl.renderer;
        if (renderer && renderer.xr) {
            const session = renderer.xr.getSession();
            const frame = renderer.xr.getFrame();
            const refSpace = renderer.xr.getReferenceSpace();

            if (session && frame && refSpace) {
                for (const source of session.inputSources) {
                    if (source.handedness === this.data.hand && source.hand) {
                        const wrist = source.hand.get('wrist');
                        if (wrist) {
                            const pose = frame.getJointPose(wrist, refSpace);
                            if (pose) {
                                this.position.set(
                                    pose.transform.position.x,
                                    pose.transform.position.y,
                                    pose.transform.position.z
                                );
                                return; // Success!
                            }
                        }
                    }
                }
            }
        }

        // Fallback: use A-Frame object3D
        this.el.object3D.getWorldPosition(this.position);
    }
});
