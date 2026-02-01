import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';

/**
 * SupernovaGesture Component
 * Detects two-hand spread gesture to "explode" the Pulse Orb.
 * 
 * When both hands are detected and spread apart, the sphere expands.
 * When hands come together, the sphere contracts back to normal.
 * 
 * ONLY ACTIVE IN VR MODE.
 */
export default function SupernovaGesture({ sphereRef }) {
    const { isPresenting, session } = useXR();

    // Smoothing for natural animation
    const targetRadius = useRef(1.5);
    const currentRadius = useRef(1.5);

    // Configuration
    const DEFAULT_RADIUS = 1.5;  // Default state
    const MIN_RADIUS = 1.0;      // Compressed state
    const MAX_RADIUS = 8.0;      // More intense expansion (was 6.0)

    // Hand distance thresholds (in meters)
    const MIN_HAND_DISTANCE = 0.05;  // Hands close together (5cm)
    const MAX_HAND_DISTANCE = 0.45;   // Hands spread wide (45cm) - smaller range for easier activation

    useFrame((state, delta) => {
        // SAFETY BYPASS: Don't check isPresenting/session, just check if we can talk to sphere
        if (!sphereRef?.current?.setSphereRadius) return;

        const frame = state.gl.xr?.getFrame?.();
        const refSpace = state.gl.xr?.getReferenceSpace?.();

        if (!frame || !refSpace) return;

        // Find both hands
        let leftHand = null;
        let rightHand = null;

        for (const source of session.inputSources) {
            if (source.hand) {
                if (source.handedness === 'left') leftHand = source;
                if (source.handedness === 'right') rightHand = source;
            }
        }

        let handsDetected = false;
        if (leftHand?.hand && rightHand?.hand) {
            const leftWrist = leftHand.hand.get('wrist');
            const rightWrist = rightHand.hand.get('wrist');

            if (leftWrist && rightWrist) {
                const leftPose = frame.getJointPose(leftWrist, refSpace);
                const rightPose = frame.getJointPose(rightWrist, refSpace);

                if (leftPose && rightPose) {
                    handsDetected = true;
                    const leftPos = new THREE.Vector3().copy(leftPose.transform.position);
                    const rightPos = new THREE.Vector3().copy(rightPose.transform.position);

                    // 1. Calculate distance
                    const handDistance = leftPos.distanceTo(rightPos);

                    // 2. LOGIC RESTORED: Palm Facing & Pinch

                    // Helper to check Pinch
                    const checkPinch = (hand) => {
                        const t = hand.get('thumb-tip'); const i = hand.get('index-finger-tip');
                        if (!t || !i) return false;
                        const tp = frame.getJointPose(t, refSpace); const ip = frame.getJointPose(i, refSpace);
                        if (!tp || !ip) return false;
                        const d = Math.sqrt(Math.pow(tp.transform.position.x - ip.transform.position.x, 2) +
                            Math.pow(tp.transform.position.y - ip.transform.position.y, 2) +
                            Math.pow(tp.transform.position.z - ip.transform.position.z, 2));
                        return d < 0.025;
                    };

                    const isPinching = checkPinch(leftHand.hand) && checkPinch(rightHand.hand);

                    // Helper for Palm Direction
                    const checkPalmFacing = (isRedHand, hand, otherHandPos) => {
                        const w = hand.get('wrist'); const i = hand.get('index-finger-metacarpal'); const p = hand.get('pinky-finger-metacarpal');
                        if (!w || !i || !p) return false;
                        const wp = frame.getJointPose(w, refSpace); const ip = frame.getJointPose(i, refSpace); const pp = frame.getJointPose(p, refSpace);
                        if (!wp || !ip || !pp) return false;

                        const v1 = new THREE.Vector3().subVectors(ip.transform.position, wp.transform.position);
                        const v2 = new THREE.Vector3().subVectors(pp.transform.position, wp.transform.position);
                        const n = new THREE.Vector3();
                        // ADJUSTED: Swapped logic based on verification (L: v2,v1 | R: v1,v2)
                        if (isRedHand) n.crossVectors(v1, v2).normalize();
                        else n.crossVectors(v2, v1).normalize();

                        const toOther = new THREE.Vector3().subVectors(otherHandPos, wp.transform.position).normalize();
                        return n.dot(toOther) > 0.5;
                    };

                    const isPalmsFacing = checkPalmFacing(false, leftHand.hand, rightPos) && checkPalmFacing(true, rightHand.hand, leftPos);

                    // Alignment check
                    const dy = Math.abs(leftPos.y - rightPos.y);
                    const dz = Math.abs(leftPos.z - rightPos.z);
                    const isAligned = dy < 0.6 && dz < 0.6; // Relaxed

                    // ACTIVATION DECISION: Needs Alignment AND (Palms Facing OR Pinching)
                    const isActive = isAligned && (isPalmsFacing || isPinching);

                    // Map distance to radius ONLY if active
                    if (isActive) {
                        const normalizedDist = Math.max(0, Math.min(1,
                            (handDistance - MIN_HAND_DISTANCE) / (MAX_HAND_DISTANCE - MIN_HAND_DISTANCE)
                        ));
                        // Apply intensity curve (exponential for more dramatic effect)
                        const intenseDist = Math.pow(normalizedDist, 1.5);
                        targetRadius.current = MIN_RADIUS + intenseDist * (MAX_RADIUS - MIN_RADIUS);
                    } else {
                        targetRadius.current = DEFAULT_RADIUS;
                    }
                }
            }
        }

        if (!handsDetected) {
            targetRadius.current = DEFAULT_RADIUS;
        }

        // Smooth interpolation
        // Standard LERP: current + (target - current) * speed * dt
        const smoothSpeed = 3.0;
        let diff = targetRadius.current - currentRadius.current;

        // Safety check for NaNs
        if (isNaN(diff)) diff = 0;

        currentRadius.current += diff * smoothSpeed * delta;

        // Sanity Clamp
        if (currentRadius.current < 1.0) currentRadius.current = 1.0;
        if (currentRadius.current > 7.0) currentRadius.current = 7.0;

        if (Math.abs(diff) > 0.01 && Math.random() < 0.05) {
            console.log(`[Supernova] Updating Sphere Radius to: ${currentRadius.current.toFixed(2)}`);
        }

        sphereRef.current.setSphereRadius(currentRadius.current);
    });

    return null;
}
