import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';

/**
 * GravitySwirlGesture Component
 * Detects Right Hand Pinch to trigger a "Gravitational Swirl" twist effect on the Pulse Orb.
 * 
 * Logic:
 * - Trigger: Right Hand Pinch (Thumb + Index tip close)
 * - Effect: Increases u_twist uniform on the sphere
 * - Behavior: Ramp up twist while holding, smooth release when letting go.
 */
export default function GravitySwirlGesture({ sphereRef }) {
    const { isPresenting, session } = useXR();

    // Swirl State
    const targetSwirl = useRef(0.0);
    const currentSwirl = useRef(0.0);

    // Configuration
    const MAX_TWIST = 1.0; // Reduced from 3.0 for less intense effect
    const RAMP_SPEED = 1.5; // Slightly slower ramp up
    const DECAY_SPEED = 3.0; // How fast it untwists

    useFrame((state, delta) => {
        // Only run if we can talk to sphere
        if (!sphereRef?.current?.setSwirl) return;

        const frame = state.gl.xr?.getFrame?.();
        const refSpace = state.gl.xr?.getReferenceSpace?.();

        let isRightPinching = false;

        // CHECK: Just need session to find hands, don't enforce isPresenting strictly if session exists
        if (session && frame && refSpace) {
            // Find Right Hand
            let rightHand = null;
            for (const source of session.inputSources) {
                if (source.hand && source.handedness === 'right') {
                    rightHand = source;
                    break;
                }
            }

            if (rightHand) {
                // Check Pinch Algorithm
                try {
                    const thumb = rightHand.hand.get('thumb-tip');
                    const index = rightHand.hand.get('index-finger-tip');

                    if (thumb && index) {
                        const tPose = frame.getJointPose(thumb, refSpace);
                        const iPose = frame.getJointPose(index, refSpace);

                        if (tPose && iPose) {
                            const dist = Math.sqrt(
                                Math.pow(tPose.transform.position.x - iPose.transform.position.x, 2) +
                                Math.pow(tPose.transform.position.y - iPose.transform.position.y, 2) +
                                Math.pow(tPose.transform.position.z - iPose.transform.position.z, 2)
                            );

                            if (dist < 0.04) { // INCREASED to 4cm (was 2.5cm)
                                isRightPinching = true;
                            }
                        }
                    }
                } catch (e) {
                    // Pose error ignore
                }
            }
        }

        // Logic:
        // If pinching, target max twist.
        // If release, target 0.

        if (isRightPinching) {
            targetSwirl.current = MAX_TWIST;
        } else {
            targetSwirl.current = 0.0;
        }

        // Smooth Interpolation
        const diff = targetSwirl.current - currentSwirl.current;
        const speed = isRightPinching ? RAMP_SPEED : DECAY_SPEED;

        currentSwirl.current += diff * speed * delta;

        // Optimize: Stop updating if close to zero and target is zero
        if (Math.abs(currentSwirl.current) < 0.01 && targetSwirl.current === 0.0) {
            currentSwirl.current = 0.0;
        }

        // Apply
        sphereRef.current.setSwirl(currentSwirl.current);
    });

    return null;
}
