/* global AFRAME, THREE */

/**
 * GESTURE DETECTOR SYSTEM (Quest 3 Compatible, Orientation-Independent)
 * 
 * Key improvements:
 * 1. Uses wrist-distance based curl detection (orientation independent!)
 * 2. Pinch threshold calibrated for Quest 3 (2.5cm)
 * 3. Frame smoothing for stability
 * 4. Direct WebXR Hand API access
 */
AFRAME.registerSystem('gesture-detector', {
    init: function () {
        this.sceneEl = document.querySelector('a-scene');

        this.hands = { left: null, right: null };
        this.gestures = { left: 'unknown', right: 'unknown' };

        // Smoothing: require gesture to be stable for N frames
        this.gestureCounters = { left: {}, right: {} };
        // Increased from 3 to 8 for better stability
        this.STABILITY_THRESHOLD = 8;

        // State for hysteresis
        this.state = {
            left: { pinching: false },
            right: { pinching: false }
        };

        // Debug
        this.frameCount = 0;
        this.hasSeenXR = false;

        console.log('[GestureDetector] ✅ System initialized (Orientation-Independent + Hysteresis)');
    },

    registerHand: function (side, el) {
        this.hands[side] = el;
        console.log(`[GestureDetector] ✅ Registered ${side} hand`);
    },

    getGesture: function (side) {
        return this.gestures[side];
    },

    tick: function () {
        this.frameCount++;

        const renderer = this.sceneEl.renderer;
        if (!renderer || !renderer.xr) return;

        const session = renderer.xr.getSession();
        if (!session) return;

        const frame = renderer.xr.getFrame();
        const refSpace = renderer.xr.getReferenceSpace();
        if (!frame || !refSpace) return;

        if (!this.hasSeenXR) {
            console.log('[GestureDetector] ✅ XR Session active!');
            this.hasSeenXR = true;
        }

        for (const source of session.inputSources) {
            if (!source.hand) continue;
            this.processHand(source, frame, refSpace);
        }
    },

    processHand: function (source, frame, refSpace) {
        const side = source.handedness;
        const hand = source.hand;

        // Extract all joint positions
        const positions = {};
        const jointNames = [
            'wrist',
            'thumb-tip',
            'index-finger-tip',
            'index-finger-phalanx-proximal',
            'middle-finger-tip',
            'middle-finger-phalanx-proximal',
            'ring-finger-tip',
            'ring-finger-phalanx-proximal',
            'pinky-finger-tip',
            'pinky-finger-phalanx-proximal'
        ];

        for (const jointName of jointNames) {
            const joint = hand.get(jointName);
            if (!joint) continue;

            const pose = frame.getJointPose(joint, refSpace);
            if (pose) {
                positions[jointName] = new THREE.Vector3(
                    pose.transform.position.x,
                    pose.transform.position.y,
                    pose.transform.position.z
                );
            }
        }

        if (!positions.wrist) return;

        const gesture = this.classifyGesture(positions, side);
        this.updateGesture(side, gesture);
    },

    /**
     * ORIENTATION-INDEPENDENT CURL DETECTION
     * A finger is extended if its TIP is further from the WRIST than its BASE (proximal)
     */
    isExtended: function (positions, finger) {
        const tip = positions[`${finger}-finger-tip`];
        const base = positions[`${finger}-finger-phalanx-proximal`];
        const wrist = positions['wrist'];

        if (!tip || !base || !wrist) return null;

        const tipDist = tip.distanceTo(wrist);
        const baseDist = base.distanceTo(wrist);

        // Tip is extended if it's significantly further from wrist than base
        // 1.5cm threshold for Quest 3 accuracy
        return tipDist > baseDist + 0.015;
    },

    /**
     * PINCH DETECTION (With Hysteresis)
     * Thumb tip close to index finger tip
     */
    isPinching: function (positions, side) {
        const thumbTip = positions['thumb-tip'];
        const indexTip = positions['index-finger-tip'];

        if (!thumbTip || !indexTip) return false;

        const dist = thumbTip.distanceTo(indexTip);

        // Log occasionally
        if (this.frameCount % 180 === 0) {
            console.log(`[Gesture] ${side} Pinch dist: ${(dist * 100).toFixed(1)}cm (State: ${this.state[side].pinching})`);
        }

        // HYSTERESIS:
        // Enter pinch if closer than 2.5cm (Relaxed from 2.0cm)
        // Exit pinch if further than 4.0cm
        const PINCH_ENTER = 0.025;
        const PINCH_EXIT = 0.040;

        if (this.state[side].pinching) {
            if (dist > PINCH_EXIT) {
                this.state[side].pinching = false;
            }
        } else {
            if (dist < PINCH_ENTER) {
                this.state[side].pinching = true;
            }
        }

        return this.state[side].pinching;
    },

    classifyGesture: function (positions, side) {
        // Check each finger
        const index = this.isExtended(positions, 'index');
        const middle = this.isExtended(positions, 'middle');
        const ring = this.isExtended(positions, 'ring');
        const pinky = this.isExtended(positions, 'pinky');

        // Log occasionally
        // if (this.frameCount % 180 === 0) {
        //     console.log(`[Gesture] ${side}: index=${index}, middle=${middle}, ring=${ring}, pinky=${pinky}`);
        // }

        if (index && middle && ring && pinky) {
            return 'open';
        }

        if (!index && !middle && !ring && !pinky) {
            return 'fist';
        }

        if (index && !middle && !ring && !pinky) {
            return 'point';
        }

        return 'relaxed';
    },

    updateGesture: function (side, rawGesture) {
        const counters = this.gestureCounters[side];

        counters[rawGesture] = (counters[rawGesture] || 0) + 1;

        for (const g in counters) {
            if (g !== rawGesture) counters[g] = 0;
        }

        if (counters[rawGesture] < this.STABILITY_THRESHOLD) return;

        if (rawGesture === this.gestures[side]) return;

        const prev = this.gestures[side];
        this.gestures[side] = rawGesture;

        const el = this.hands[side];
        if (!el) {
            console.warn(`[GestureDetector] ⚠️ No element registered for ${side} hand!`);
            return;
        }

        // Emit events
        console.log(`[GestureDetector] 📤 Emitting gesture-${rawGesture} on:`, el);
        el.emit('gesture-change', { hand: side, gesture: rawGesture, previous: prev });
        el.emit(`gesture-${rawGesture}`, { hand: side });

        if (prev !== 'unknown') {
            el.emit(`gesture-${prev}-end`, { hand: side });
        }

        console.log(`[Gesture] 🎯 ${side}: ${prev} → ${rawGesture}`);
    }
});

/**
 * Hand Gesture Component
 */
AFRAME.registerComponent('hand-gestures', {
    schema: {
        hand: { type: 'string', default: 'right' }
    },

    init: function () {
        console.log(`[HandGestures] Component init for ${this.data.hand}`);

        this.gestureSystem = null;
        this.registered = false;

        this.tryRegister();

        this.el.sceneEl.addEventListener('loaded', () => this.tryRegister());
        this.el.sceneEl.addEventListener('enter-vr', () => {
            console.log(`[HandGestures] VR entered, re-registering ${this.data.hand}`);
            this.tryRegister();
        });
    },

    tryRegister: function () {
        if (this.registered) return;

        this.gestureSystem = this.el.sceneEl.systems['gesture-detector'];

        if (this.gestureSystem) {
            this.gestureSystem.registerHand(this.data.hand, this.el);
            this.registered = true;
        }
    },

    getGesture: function () {
        return this.gestureSystem ? this.gestureSystem.getGesture(this.data.hand) : 'unknown';
    }
});
