/* global AFRAME, THREE */

/**
 * Hand Attractor
 * Detects GRIP gestures (Fist) and registers as an attractor for the Particle System.
 */
AFRAME.registerComponent('hand-attractor', {
    schema: {
        hand: { type: 'string' },
        strength: { default: 1.0 },
        radius: { default: 0.5 }
    },

    init: function () {
        this.isPinching = false;
        // Find the particle system component
        const particleEl = document.querySelector('[synesthetic-particles]');
        this.particles = particleEl ? particleEl.components['synesthetic-particles'] : null;

        // Position vector reused by the system
        this.position = new THREE.Vector3();
        this.strength = this.data.strength;
        this.radius = this.data.radius;
        this.hand = this.data.hand;

        console.log(`[HandAttractor] Init ${this.data.hand}`);

        // Listeners for Pinch (Csiptetés)
        this.el.addEventListener('pinchstarted', () => {
            console.log(`[HandAttractor] Pinch Started (${this.data.hand})`);
            this.isPinching = true;

            // Re-query particles if missing (sometimes init order varies)
            if (!this.particles) {
                const pEl = document.querySelector('[synesthetic-particles]');
                if (pEl) this.particles = pEl.components['synesthetic-particles'];
            }

            if (this.particles) {
                this.particles.addAttractor(this);
            } else {
                console.warn('[HandAttractor] Particle system not found!');
            }

            // Haptic
            const haptics = this.el.components['haptics'];
            if (haptics) haptics.pulse(0.5, 50);
        });

        this.el.addEventListener('pinchended', () => {
            console.log(`[HandAttractor] Pinch Ended (${this.data.hand})`);
            this.isPinching = false;
            if (this.particles) this.particles.removeAttractor(this);
        });

        // Also Force-Enable FIST (Grip) as alternative if Pinch is tricky
        this.el.addEventListener('gripdown', () => {
            console.log(`[HandAttractor] Grip/Fist Started (${this.data.hand})`);
            // Treat Grip as Pinch for now to ensure interaction works
            this.el.emit('pinchstarted');
        });

        this.el.addEventListener('gripup', () => {
            this.el.emit('pinchended');
        });

        // Fallback: Try to find particles again if not found initially (async load)
        if (!this.particles) {
            this.el.sceneEl.addEventListener('loaded', () => {
                const pEl = document.querySelector('[synesthetic-particles]');
                this.particles = pEl ? pEl.components['synesthetic-particles'] : null;
            });
        }
    },

    tick: function () {
        if (this.isPinching) {
            this.el.object3D.getWorldPosition(this.position);
        }
    }
});
