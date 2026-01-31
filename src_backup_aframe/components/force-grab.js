/* global AFRAME, THREE */

/**
 * Force Grab Component
 * Allows pulling objects from a distance and holding them in front of the hand.
 */
AFRAME.registerComponent('force-grab', {
    schema: {
        target: { type: 'selector' },
        speed: { type: 'number', default: 10 },
        distance: { type: 'number', default: 2 } // Distance to hold object at
    },

    init: function () {
        this.grabbedObject = null;
        this.originalDamping = 0;

        // Helper vector
        this.targetPosition = new THREE.Vector3();
        this.direction = new THREE.Vector3();
    },

    grab: function (el) {
        if (this.grabbedObject) return;

        this.grabbedObject = el;

        // Store original physics settings if available
        if (el.body) {
            this.originalDamping = el.body.linearDamping;
            el.body.linearDamping = 0.9; // Add drag to stop it from oscillating too much
            el.body.angularDamping = 0.9;
        }
    },

    release: function () {
        if (!this.grabbedObject) return;

        // Restore physics settings
        if (this.grabbedObject.body) {
            this.grabbedObject.body.linearDamping = this.originalDamping;
            this.grabbedObject.body.angularDamping = 0.01;

            // Optional: Add a little "throw" impulse if needed, but physics usually handles momentum
        }

        this.grabbedObject = null;
    },

    tick: function (time, timeDelta) {
        if (!this.grabbedObject || !this.grabbedObject.body) return;

        // Calculate where we want the object to be
        // Default: 2 meters in front of the hand
        this.el.object3D.getWorldPosition(this.targetPosition);
        this.el.object3D.getWorldDirection(this.direction);
        this.direction.multiplyScalar(-1); // A-Frame cameras look down negative Z, hands might vary

        // For hands, Z is usually out of palm, Y is up from wrist. 
        // We'll trust the world position calculation.
        // Let's assume we want it relative to the hand's current position/rotation.

        // Simpler: Get position just in front of hand
        const holdPoint = this.el.object3D.localToWorld(new THREE.Vector3(0, 0, -this.distance));

        // Physics magic: Apply velocity towards the target point
        const objectPos = this.grabbedObject.object3D.position;

        // Vector from object to hold point
        const force = new THREE.Vector3().copy(holdPoint).sub(objectPos);

        // Proportional control (spring-like)
        // Velocity = Distance * Speed
        const velocity = force.multiplyScalar(this.data.speed);

        // Apply to Cannon.js body directly
        this.grabbedObject.body.velocity.set(velocity.x, velocity.y, velocity.z);

        // Optional: Rotate object to face player?
        // For now, let it rotate freely or damp rotation
    }
});
