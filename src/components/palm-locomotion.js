/* global AFRAME, THREE */

/**
 * Palm Locomotion (Air Drag)
 * Allows the user to "pull" the world by pinching and dragging.
 */


// Let's rewrite tick for Frame-to-Frame logic, it's more robust for moving parents.
AFRAME.registerComponent('palm-locomotion', {
    schema: {
        hand: { type: 'string', default: 'right' },
        speed: { type: 'number', default: 1.5 } // Multiplier
    },

    init: function () {
        this.pinching = false;
        this.previousHandPos = new THREE.Vector3();
        this.currentHandPos = new THREE.Vector3();
        this.delta = new THREE.Vector3();

        this.rigEl = document.getElementById('rig');

        this.onPinchStart = this.onPinchStart.bind(this);
        this.onPinchEnd = this.onPinchEnd.bind(this);

        this.el.addEventListener('pinchstarted', this.onPinchStart);
        this.el.addEventListener('pinchended', this.onPinchEnd);
    },

    onPinchStart: function () {
        this.pinching = true;
        this.el.object3D.getWorldPosition(this.previousHandPos);
    },

    onPinchEnd: function () {
        this.pinching = false;
    },

    tick: function () {
        if (!this.pinching || !this.rigEl) return;

        this.el.object3D.getWorldPosition(this.currentHandPos);

        // Calculate movement of hand since last frame
        this.delta.subVectors(this.currentHandPos, this.previousHandPos);

        // If hand moved Left (negative X), we want Rig to move Left?
        // No, if I grab the world and pull Left, the world moves Left relative to me.
        // Meaning *I* move Right?
        // Let's stick to: I grab air. I pull air BACK. I move FORWARD.
        // Hand Delta: Back (-Z). Rig Move: -Z.

        // We strictly apply the inverse of the hand movement to the rig position
        // BUT we must be careful: moving the rig moves the hand (child)!
        // This creates a feedback loop if we use world positions blindly.

        // Solution:
        // 1. Store local position of hand relative to rig?
        // 2. Or just apply the delta and accept that frame-rate matches?

        // A simpler "Swim" logic that serves most interaction needs:
        // Move Rig by -1 * delta.

        this.rigEl.object3D.position.sub(this.delta.multiplyScalar(this.data.speed));

        // Update previous for next frame. 
        // CRITICAL: We need to re-read world position because we just moved the rig!
        this.el.object3D.getWorldPosition(this.previousHandPos);
    }
});
