/* global AFRAME, CANNON */

/**
 * Hand Physics Component (Kinematic Body)
 * Ensures the hand entity has a physics body that moves with the hand.
 * This is required because standard 'static-body' doesn't update position automatically,
 * and 'kinematic-body' can be flaky with WebXR hand tracking updates.
 */
AFRAME.registerComponent('hand-physics', {
    schema: {
        radius: { default: 0.05 },
        offset: { type: 'vec3', default: { x: 0, y: 0, z: 0 } }
    },

    init: function () {
        this.system = this.el.sceneEl.systems.physics;

        if (!this.system) {
            console.error("Physics system not found!");
            return;
        }

        // Wait for body to be initialized if we used dynamic-body/static-body
        // But here we create our own simple body integration if needed
        // For simplicity, we'll try to use the existing 'static-body' and update it manually
        // OR we can rely on this component to manage the sync.

        // Let's force a body if one doesn't exist
        if (!this.el.body) {
            this.el.setAttribute('static-body', { shape: 'sphere', sphereRadius: this.data.radius });
        }

        // We need to set it to KINEMATIC to allow movement but push dynamic bodies
        this.el.addEventListener('body-loaded', (e) => {
            try {
                this.body = e.detail.body;
                // Switch to KINEMATIC
                if (window.CANNON) {
                    this.body.type = window.CANNON.Body.KINEMATIC;
                    this.body.mass = 0;
                    this.body.updateMassProperties();
                    this.body.collisionFilterGroup = 1;
                    this.body.collisionFilterMask = 1;
                    console.log("Hand Physics Body Loaded (Kinematic)", this.el.id);
                } else {
                    console.warn("CANNON global not found! Physics body might behave unexpectedly.");
                }
            } catch (err) {
                console.error("Error setting up hand physics body:", err);
            }
        });
    },

    tick: function () {
        if (!this.body) return;

        // Sync Physics Body to Entity Position
        // Hand tracking updates the entity position. We must copy this to the CANNON body.
        const pos = this.el.object3D.position;
        const rot = this.el.object3D.quaternion;

        this.body.position.set(pos.x + this.data.offset.x, pos.y + this.data.offset.y, pos.z + this.data.offset.z);
        this.body.quaternion.set(rot.x, rot.y, rot.z, rot.w);

        // Velocity (Optional - helps with impact)
        // Calculating velocity from position delta would make interactions better...
        // But for now, direct position set "teleports" the body which pushes things nicely in Cannon (usually)
    }
});
