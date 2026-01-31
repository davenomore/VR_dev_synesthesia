/* global AFRAME, THREE */

// Clean up debug UI component (hidden but functional)
AFRAME.registerComponent('debug-ui', {
    init: function () {
        this.textEl = document.createElement('a-text');
        this.textEl.setAttribute('position', '0 2 -1'); // Move out of view
        this.textEl.setAttribute('visible', false);
        this.el.sceneEl.appendChild(this.textEl);
    }
});

/**
 * Magnetic Hand Attractor - Final "Magic" Version
 * Controlled by Direct Tracker
 * Supports: Proximity Pull, Pinch Grab, Push, Wave
 */
AFRAME.registerComponent('sphere-attractor', {
    schema: {
        hand: { type: 'string', default: 'right' },
        strength: { default: 30 },
        radius: { default: 0.5 }
    },

    init: function () {
        this.attractor = { position: new THREE.Vector3(), strength: 0, radius: this.data.radius };
        this.worldPos = new THREE.Vector3();
        this.fluidSphere = null;

        // Connection logic
        this.connectInterval = setInterval(() => {
            const sphereEl = document.querySelector('[fluid-sphere]');
            if (sphereEl && sphereEl.components['fluid-sphere']) {
                this.fluidSphere = sphereEl.components['fluid-sphere'];
                this.fluidSphere.addAttractor(this.attractor);
                clearInterval(this.connectInterval);
            }
        }, 1000);
    },

    // CALLED BY direct-tracker.js
    forceUpdate: function (pos, isPinching) {
        // Update position
        this.worldPos.set(pos.x, pos.y, pos.z);
        this.attractor.position.copy(this.worldPos);

        // Interaction Logic
        if (this.fluidSphere) {
            const spherePos = this.fluidSphere.el.object3D.position;
            const dist = this.attractor.position.distanceTo(spherePos);
            const surfaceDist = dist - 0.15; // Approx surface distance

            // 1. PINCH (GRAB)
            if (isPinching) {
                // If close enough to grab, or already grabbing
                if (dist < 0.6) {
                    this.attractor.strength = 80; // SUPER STRONG PULL
                    this.attractor.radius = 0.8;
                }
            }
            // 2. RELEASE / HOVER
            else {
                if (dist < 0.5) {
                    // INSIDE OR CLOSE
                    if (dist < 0.20) {
                        // Touching -> PUSH
                        this.attractor.strength = -50;
                        this.attractor.radius = 0.35;

                        // Wave
                        if (Math.random() < 0.1 && this.fluidSphere.addWave) this.fluidSphere.addWave(this.attractor.position, 0.2);
                    } else {
                        // Nearby -> Magnetic Pull
                        const f = 1.0 - (dist / 0.5);
                        this.attractor.strength = 35 * f;
                        this.attractor.radius = 0.5;
                    }
                } else {
                    // Too far
                    this.attractor.strength = 0;
                }
            }
        }
    },

    tick: function () { }, // Disabled
    remove: function () {
        clearInterval(this.connectInterval);
        if (this.fluidSphere) this.fluidSphere.removeAttractor(this.attractor);
    }
});
