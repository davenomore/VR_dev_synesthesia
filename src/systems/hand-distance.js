/* global AFRAME, THREE */

/**
 * Two-Hand Interaction System
 * Tracks distance between hands for particle effects:
 * - Hands close: Create energy ball (repel particles outward)
 * - Hands far apart: Stretch/expand particle field
 * - Both hands pinching: Super explosion
 */
AFRAME.registerSystem('hand-distance', {
    schema: {
        minDistance: { default: 0.05 },  // Hands touching
        maxDistance: { default: 1.0 }    // Arms spread
    },

    init: function () {
        this.leftHand = null;
        this.rightHand = null;
        this.leftPos = new THREE.Vector3();
        this.rightPos = new THREE.Vector3();
        this.centerPos = new THREE.Vector3();
        this.distance = 0.5;
        this.smoothDistance = 0.5;

        this.leftPinching = false;
        this.rightPinching = false;
        this.leftFist = false;
        this.rightFist = false;
        this.leftPalmUp = false;
        this.rightPalmUp = false;

        // Index finger tracking for pointing
        this.rightIndexTip = new THREE.Vector3();
        this.rightIndexDir = new THREE.Vector3();
        this.isRightPointing = false;

        this.leftIndexTip = new THREE.Vector3();
        this.leftIndexDir = new THREE.Vector3();
        this.isLeftPointing = false;

        this.particleSystem = null;

        // Center attractor for two-hand interaction
        this.centerAttractor = {
            data: { hand: 'center' },
            position: new THREE.Vector3(),
            strength: 0,
            radius: 0
        };

        // Pointing attractor for index finger raycast
        this.pointingAttractor = {
            data: { hand: 'pointing', mode: 'attract' },
            position: new THREE.Vector3(),
            strength: 0,
            radius: 0
        };

        // Find hands after scene loads
        this.el.addEventListener('loaded', () => {
            setTimeout(() => {
                this.leftHand = document.querySelector('#left-hand');
                this.rightHand = document.querySelector('#right-hand');

                // Find particle system (Try GPU first, then CPU fallback)
                let psEl = this.el.querySelector('[gpu-particles]');
                if (psEl && psEl.components['gpu-particles']) {
                    this.particleSystem = psEl.components['gpu-particles'];
                    console.log('[HandDistance] ✅ Found GPU Particle System');
                } else {
                    // CPU Fallback
                    psEl = this.el.querySelector('[synesthetic-particles]');
                    if (psEl && psEl.components['synesthetic-particles']) {
                        this.particleSystem = psEl.components['synesthetic-particles'];
                        this.particleSystem.addAttractor(this.centerAttractor);
                        this.particleSystem.addAttractor(this.pointingAttractor);
                        console.log('[HandDistance] ✅ Found CPU Particle System (Legacy)');
                    }
                }

                // Listen for pinch events
                if (this.leftHand) {
                    this.leftHand.addEventListener('pinchstarted', () => this.leftPinching = true);
                    this.leftHand.addEventListener('pinchended', () => this.leftPinching = false);
                    // Fist (Freeze) tracking
                    this.leftHand.addEventListener('gesture-fist', () => this.leftFist = true);
                    this.leftHand.addEventListener('gesture-fist-end', () => this.leftFist = false);
                }
                if (this.rightHand) {
                    this.rightHand.addEventListener('pinchstarted', () => this.rightPinching = true);
                    this.rightHand.addEventListener('pinchended', () => this.rightPinching = false);
                    // Fist (Freeze) tracking
                    this.rightHand.addEventListener('gesture-fist', () => this.rightFist = true);
                    this.rightHand.addEventListener('gesture-fist-end', () => this.rightFist = false);
                }
            }, 1000);
        });
    },

    tick: function (time, delta) {
        const renderer = this.el.sceneEl.renderer;
        if (!renderer || !renderer.xr) return;

        const session = renderer.xr.getSession();
        if (!session) {
            // Fallback for non-WebXR debugging (if entities have position)
            if (this.leftHand && this.rightHand) {
                // Legacy check
                this.leftHand.object3D.getWorldPosition(this.leftPos);
                this.rightHand.object3D.getWorldPosition(this.rightPos);
                if (this.leftPos.lengthSq() > 0.1) {
                    this.calculatePhysics(this.leftPos, this.rightPos, null, null);
                }
            }
            return;
        }

        const frame = renderer.xr.getFrame();
        const refSpace = renderer.xr.getReferenceSpace();
        if (!frame || !refSpace) return;

        let leftJoints = null;
        let rightJoints = null;
        let leftPalmNormal = null;
        let rightPalmNormal = null;

        // Extract hand data
        for (const source of session.inputSources) {
            if (!source.hand) continue;

            const wrist = source.hand.get('wrist');
            const indexProximal = source.hand.get('index-finger-phalanx-proximal');
            const indexTip = source.hand.get('index-finger-tip');
            const middleTip = source.hand.get('middle-finger-tip');
            const pinky = source.hand.get('pinky-finger-phalanx-proximal');

            if (!wrist || !indexProximal || !pinky) continue;

            const wristPose = frame.getJointPose(wrist, refSpace);
            const indexProximalPose = frame.getJointPose(indexProximal, refSpace);
            const pinkyPose = frame.getJointPose(pinky, refSpace);

            // Get index tip for pointing
            const indexTipPose = indexTip ? frame.getJointPose(indexTip, refSpace) : null;
            const middleTipPose = middleTip ? frame.getJointPose(middleTip, refSpace) : null;

            if (!wristPose || !indexProximalPose || !pinkyPose) continue;

            const wristVec = new THREE.Vector3(wristPose.transform.position.x, wristPose.transform.position.y, wristPose.transform.position.z);
            const indexVec = new THREE.Vector3(indexProximalPose.transform.position.x, indexProximalPose.transform.position.y, indexProximalPose.transform.position.z);
            const pinkyVec = new THREE.Vector3(pinkyPose.transform.position.x, pinkyPose.transform.position.y, pinkyPose.transform.position.z);

            // Calculate Normal: Cross(Index-Wrist, Pinky-Wrist)
            const vIndex = new THREE.Vector3().subVectors(indexVec, wristVec);
            const vPinky = new THREE.Vector3().subVectors(pinkyVec, wristVec);
            const normal = new THREE.Vector3().crossVectors(vIndex, vPinky).normalize();

            // Correct orientation: 
            // Right Hand: Cross(I, P) is UP
            // Left Hand: Cross(I, P) is DOWN (so negate)
            if (source.handedness === 'left') normal.negate();

            if (source.handedness === 'left') {
                this.leftPos.copy(wristVec);
                leftPalmNormal = normal;
                leftJoints = true;

                // --- LEFT INDEX FINGER POINTING DETECTION ---
                if (indexTipPose && middleTipPose) {
                    const indexTipVec = new THREE.Vector3(
                        indexTipPose.transform.position.x,
                        indexTipPose.transform.position.y,
                        indexTipPose.transform.position.z
                    );
                    const middleTipVec = new THREE.Vector3(
                        middleTipPose.transform.position.x,
                        middleTipPose.transform.position.y,
                        middleTipPose.transform.position.z
                    );

                    // Check if index is extended further than middle (pointing)
                    const indexDist = indexTipVec.distanceTo(wristVec);
                    const middleDist = middleTipVec.distanceTo(wristVec);

                    // Pointing = index extended, middle curled
                    this.isLeftPointing = (indexDist - middleDist) > 0.03; // 3cm difference

                    if (this.isLeftPointing) {
                        this.leftIndexTip.copy(indexTipVec);
                        // Direction from wrist to index tip (if needed later)
                        this.leftIndexDir.subVectors(indexTipVec, wristVec).normalize();
                    }
                }
            } else if (source.handedness === 'right') {
                this.rightPos.copy(wristVec);
                rightPalmNormal = normal;
                rightJoints = true;

                // --- RIGHT INDEX FINGER POINTING DETECTION ---
                if (indexTipPose && middleTipPose) {
                    const indexTipVec = new THREE.Vector3(
                        indexTipPose.transform.position.x,
                        indexTipPose.transform.position.y,
                        indexTipPose.transform.position.z
                    );
                    const middleTipVec = new THREE.Vector3(
                        middleTipPose.transform.position.x,
                        middleTipPose.transform.position.y,
                        middleTipPose.transform.position.z
                    );

                    // Check if index is extended further than middle (pointing)
                    const indexDist = indexTipVec.distanceTo(wristVec);
                    const middleDist = middleTipVec.distanceTo(wristVec);

                    // Pointing = index extended, middle curled
                    this.isRightPointing = (indexDist - middleDist) > 0.03; // 3cm difference

                    if (this.isRightPointing) {
                        this.rightIndexTip.copy(indexTipVec);
                        // Direction from wrist to index tip
                        this.rightIndexDir.subVectors(indexTipVec, wristVec).normalize();
                    }
                }
            }
        }

        if (leftJoints && rightJoints) {
            this.calculatePhysics(this.leftPos, this.rightPos, leftPalmNormal, rightPalmNormal);
        }
    },

    calculatePhysics: function (p1, p2, n1, n2) {
        if (!this.particleSystem) return;

        // Calculate distance
        this.distance = p1.distanceTo(p2);
        this.smoothDistance = this.smoothDistance * 0.9 + this.distance * 0.1;

        // Center point between hands
        this.centerAttractor.position.copy(this.centerPos);

        const UP = new THREE.Vector3(0, 1, 0);
        let leftUp = 0;
        let rightUp = 0;

        if (n1 && n2) {
            leftUp = n1.dot(UP);
            rightUp = n2.dot(UP);

            // Expose for GPU particles
            this.leftPalmUp = leftUp > 0.6;
            this.rightPalmUp = rightUp > 0.6;

            // Log occasionally
            if (Math.random() < 0.02) {
                console.log(`[HandDistance] 🕊️ Up Check: L=${leftUp.toFixed(2)} R=${rightUp.toFixed(2)} | Dist=${this.distance.toFixed(2)}`);
            }
        }

        // --- APPLY MODES ---

        // --- RIGHT INDEX POINTING -> VORTEX TUNNEL (Idea 5) ---
        if (this.isRightPointing) {
            // Need direction for tunnel. 
            // Approximation: Vector from Hand Edge to Tip? or just default forward?
            // Better: use current velocity of hand? No, tunnel needs orientation.
            // Let's use the vector from Wrist to Tip as rough direction.
            // Or just Tip relative to Hand position.
            const handPos = this.rightPos; // Center of palm/wrist
            const tipPos = this.rightIndexTip;

            // Direction from palm to tip
            const dir = new THREE.Vector3().subVectors(tipPos, handPos).normalize();

            this.pointingAttractor.position.copy(tipPos);
            this.pointingAttractor.data = {
                hand: 'pointing',
                mode: 'beam',
                direction: dir // Pass direction
            };
            this.pointingAttractor.strength = 50;
            this.pointingAttractor.radius = 15.0; // Long tunnel

            if (Math.random() < 0.02) console.log(`[HandDistance] 🔦 BEAM (Right)`);
        } else {
            // Only clear if not used by left (but we use separate attractors usually? 
            // Wait, pointingAttractor is shared?
            // "this.pointingAttractor" implies singular.
            // I should use a SEPARATE attractor for the left hand paint if possible, 
            // OR share it if they don't overlap.
            // But the user might do both.
            // "this.centerAttractor" is for palms and left hand?
            // Let's see...
            // Hand-distance usually manages `centerAttractor` and `pointingAttractor`.
            // I'll repurpose `centerAttractor` for the Left Hand Paint if it's not busy resetting.

            this.pointingAttractor.strength = 0;
            this.pointingAttractor.radius = 0;
            this.pointingAttractor.data = {};
        }

        // --- LEFT INDEX POINTING -> GOLD PAINT (Idea 6) ---
        // We use centerAttractor for this since Left Palm logic (Tornado) is cleared/unused.
        // We need to know if left is pointing. 
        // We'll assume if leftUp is NOT providing a reset, and we are not in reset...
        // Actually, we need an explicit `isLeftPointing`.
        // If not available, we can rely on gesture events, but let's check `leftIndexTip` validity.
        // For now, I'll assume if `leftUp` is not huge (Reset) and not low (Rest), 
        // we can check if the index finger is away from the palm?
        // Simpler: Just make it "Left Hand Paint" regardless of gesture, 
        // or check my previous knowledge of gesture detector.
        // Let's rely on `this.isLeftPointing` existing or mimicking `isRightPointing`.
        // If `isRightPointing` comes from `gesture-detector` events, `isLeftPointing` should too.

        if (this.isLeftPointing) {
            this.centerAttractor.position.copy(this.leftIndexTip);
            // "Singularity" / Black Hole Settings
            this.centerAttractor.strength = 80; // Massive pull
            this.centerAttractor.radius = 8.0;  // Large influence
            this.centerAttractor.data = { mode: 'singularity', hand: 'left' };

            if (Math.random() < 0.02) console.log(`[HandDistance] ⚫ SINGULARITY (Left)`);
        } else if (leftUp > 0.8 && rightUp > 0.8) {
            // Reset Logic (Keep this)
            // ... (This is handled below in the file usually)
        } else {
            // Default center behavior handled elsewhere or fallthrough
            // But if I touched centerAttractor above, I might override reset?
            // Reset is check AFTER or BEFORE?
            // Reset is Usually checked after.
            // Wait, I am editing the block BEFORE reset.
            // I should be careful not to break reset.
        }

        // --- 1. DOUBLE PALM UP -> RESET (Highest Priority) ---
        // Must be OPEN hands (no pinch/fist) to avoid conflict with Time Freeze
        if (leftUp > 0.8 && rightUp > 0.8 && !this.leftPinching && !this.rightPinching && !this.leftFist && !this.rightFist) {
            if (!this.resetTimer) this.resetTimer = 0;
            const now = Date.now();
            if (now - this.resetTimer > 2000) { // Cooldown 2s
                console.log(`[HandDistance] 🔄 DOUBLE PALM DOWN -> RESET (SMOOTH)`);
                if (this.particleSystem.smoothReset) {
                    this.particleSystem.smoothReset();
                } else {
                    this.particleSystem.reset();
                }
                this.resetTimer = now;
            }
            return;
        }

        // --- 2. LEFT PALM UP -> LEVITATION (Anti-Gravity) ---
        // Trigger if Left is Up. 
        // We rely on priority order: Reset is checked FIRST.
        // If we are here, it means it's NOT a Reset.
        // We check this BEFORE Singularity, because an Open Hand (Palm Up)
        // often has an extended index finger, which would false-trigger Singularity.
        // So: Palm Up = Levitate. Pointing (Palm NOT Up) = Singularity.
        if (leftUp > 0.6) {
            this.centerAttractor.position.copy(this.leftPos);
            this.centerAttractor.data = { mode: 'levitate', hand: 'left' };
            this.centerAttractor.strength = 1.0;
            this.centerAttractor.radius = 8.0;
            if (Math.random() < 0.02) console.log(`[HandDistance] 🪶 LEVITATE (Left)`);
            return; // EXIT
        }

        // --- 3. LEFT INDEX POINTING -> SINGULARITY (Black Hole) ---
        // Only reaches here if Palm is NOT Up (leftUp <= 0.6)
        if (this.isLeftPointing) {
            this.centerAttractor.position.copy(this.leftIndexTip);
            // "Singularity" / Black Hole Settings
            this.centerAttractor.strength = 80;
            this.centerAttractor.radius = 8.0;
            this.centerAttractor.data = { mode: 'singularity', hand: 'left' };

            if (Math.random() < 0.02) console.log(`[HandDistance] ⚫ SINGULARITY (Left)`);
            return; // EXIT
        }

        // --- 4. DEFAULT CENTER BEHAVIOR (Fallback) ---
        this.centerAttractor.data.mode = 'center';
        this.centerAttractor.position.copy(this.centerPos);

        // Normalize distance (0 = touching, 1 = max spread)
        const normalized = Math.max(0, Math.min(1,
            (this.smoothDistance - this.data.minDistance) /
            (this.data.maxDistance - this.data.minDistance)
        ));

        // BOTH HANDS PINCHING = MEGA EFFECT
        if (this.leftPinching && this.rightPinching) {
            this.centerAttractor.strength = 50;
            this.centerAttractor.radius = 8;
            return;
        }

        // Basic Push/Pull based on distance
        if (this.smoothDistance < 0.15) {
            this.centerAttractor.strength = -30; // Push
            this.centerAttractor.radius = 2.0;
        } else {
            // General weak attraction at center
            this.centerAttractor.strength = 10;
            this.centerAttractor.radius = 4 + this.smoothDistance * 2;
        }
    }
});
