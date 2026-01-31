/* global AFRAME, THREE */

/**
 * Direct XR Tracker - With Pinch Detection
 * Reads position and pinch state directly from WebXR
 */
AFRAME.registerComponent('direct-tracker', {
    init: function () {
        this.hands = { left: null, right: null };
        // Remove debug text if not needed, or keep for safety (user can see it)
        // I will hide it or make it smaller/less intrusive
        this.debugText = document.querySelector('a-text');
        if (this.debugText) this.debugText.setAttribute('visible', false); // Hide debug

        console.log("Direct Tracker: Initialized with Pinch Detection");
    },

    tick: function () {
        const scene = this.el.sceneEl;
        if (!scene.renderer.xr.isPresenting) return;

        const session = scene.renderer.xr.getSession();
        if (!session) return;

        for (const source of session.inputSources) {
            if (source.hand) { // It is a hand
                const handedness = source.handedness;

                // 1. Get Position (Wrist/Index Tip)
                // Using Index Tip is better for interaction!
                const joint = source.hand.get('index-finger-tip') || source.hand.get('wrist');

                if (joint) {
                    const frame = scene.renderer.xr.getFrame();
                    const refSpace = scene.renderer.xr.getReferenceSpace();

                    if (frame && refSpace) {
                        const pose = frame.getJointPose(joint, refSpace);
                        if (pose) {
                            const p = pose.transform.position;

                            // 2. Get Pinch State
                            // On Quest, gamepad.buttons[0] is the pinch/select signal
                            let isPinching = false;
                            if (source.gamepad && source.gamepad.buttons.length > 0) {
                                isPinching = source.gamepad.buttons[0].pressed;
                            }

                            // 3. Update Attractor
                            this.updateAttractor(handedness, p, isPinching);
                        }
                    }
                }
            }
        }
    },

    updateAttractor: function (hand, pos, isPinching) {
        const handEl = document.querySelector(hand === 'left' ? '#left-hand' : '#right-hand');
        if (handEl && handEl.components['sphere-attractor']) {
            handEl.components['sphere-attractor'].forceUpdate(pos, isPinching);
        }
    }
});
