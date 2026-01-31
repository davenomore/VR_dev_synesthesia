/* global AFRAME, THREE */

/**
 * Invito Summon Component
 * Pulls a target object rapidly towards the entity (wand/hand).
 */
AFRAME.registerComponent('invito-summon', {
    schema: {
        speed: { type: 'number', default: 20 },
        arrivalDistance: { type: 'number', default: 0.5 } // Stop pulling when close
    },

    init: function () {
        this.targetObject = null;
        this.originalDamping = 0;
        this.vectorToTarget = new THREE.Vector3();
    },

    summon: function (el) {
        if (this.targetObject) return;
        this.targetObject = el;

        if (el.body) {
            this.originalDamping = el.body.linearDamping;
            el.body.linearDamping = 0.1; // Low damping for fast travel
            el.body.angularDamping = 0.1;
            // Wake up
            el.body.wakeUp();
        }
    },

    release: function () {
        if (!this.targetObject) return;

        if (this.targetObject.body) {
            this.targetObject.body.linearDamping = this.originalDamping;
            // Stop momentum?
            this.targetObject.body.velocity.set(0, 0, 0);
        }
        this.targetObject = null;
    },

    tick: function (time, timeDelta) {
        if (!this.targetObject || !this.targetObject.body) return;

        const myPos = this.el.object3D.getWorldPosition(new THREE.Vector3());
        const targetPos = this.targetObject.object3D.getWorldPosition(new THREE.Vector3());

        const distance = myPos.distanceTo(targetPos);

        if (distance < this.data.arrivalDistance) {
            // Arrived!
            // Optional: Auto-grab if hand is open?
            this.release();
            return;
        }

        // Calculate direction towards me
        this.vectorToTarget.subVectors(myPos, targetPos).normalize();

        // Apply Velocity
        const velocity = this.vectorToTarget.multiplyScalar(this.data.speed);
        this.targetObject.body.velocity.set(velocity.x, velocity.y, velocity.z);
    }
});
