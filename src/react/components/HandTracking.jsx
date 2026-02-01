import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';

/**
 * HandTracking Component
 * Tracks right hand pointing gesture and updates highlight position.
 * ONLY ACTIVE IN VR MODE.
 */
export default function HandTracking({ sphereRef }) {
    const { isPresenting, session } = useXR();

    // Sphere center in world space (matching Experience.jsx position)
    const sphereCenter = new THREE.Vector3(0, 1.6, -8);
    const sphereRadius = 1.5 * 1.2;

    useFrame((state) => {
        // Only run in VR mode with active session
        if (!isPresenting || !session) {
            return;
        }

        // Make sure ref is available
        if (!sphereRef?.current?.setHighlight) {
            return;
        }

        const frame = state.gl.xr?.getFrame?.();
        const refSpace = state.gl.xr?.getReferenceSpace?.();

        if (!frame || !refSpace) return;

        // Find right hand input source
        let rightHand = null;
        for (const source of session.inputSources) {
            if (source.hand && source.handedness === 'right') {
                rightHand = source;
                break;
            }
        }

        if (!rightHand?.hand) {
            sphereRef.current.clearHighlight?.();
            return;
        }

        // Get finger joints
        const indexTip = rightHand.hand.get('index-finger-tip');
        const indexMcp = rightHand.hand.get('index-finger-metacarpal');

        if (!indexTip || !indexMcp) {
            sphereRef.current.clearHighlight?.();
            return;
        }

        let tipPose, mcpPose;
        try {
            tipPose = frame.getJointPose(indexTip, refSpace);
            mcpPose = frame.getJointPose(indexMcp, refSpace);
        } catch (e) {
            return;
        }

        if (!tipPose || !mcpPose) {
            sphereRef.current.clearHighlight?.();
            return;
        }

        // Finger positions
        const tipPos = new THREE.Vector3(
            tipPose.transform.position.x,
            tipPose.transform.position.y,
            tipPose.transform.position.z
        );
        const mcpPos = new THREE.Vector3(
            mcpPose.transform.position.x,
            mcpPose.transform.position.y,
            mcpPose.transform.position.z
        );

        // Ray from finger base through tip
        const rayDir = tipPos.clone().sub(mcpPos).normalize();

        // Ray-sphere intersection math
        const toSphere = sphereCenter.clone().sub(tipPos);
        const projLen = toSphere.dot(rayDir);

        // Only if sphere is ahead
        if (projLen < 0) {
            sphereRef.current.clearHighlight?.();
            return;
        }

        // Closest point on ray to sphere center
        const closestPoint = tipPos.clone().add(rayDir.clone().multiplyScalar(projLen));
        const distToCenter = closestPoint.distanceTo(sphereCenter);

        // Check if ray intersects sphere
        if (distToCenter < sphereRadius) {
            // Calculate hit point on sphere surface (local coords)
            const hitDir = closestPoint.clone().sub(sphereCenter).normalize();
            const hitPoint = hitDir.multiplyScalar(1.5); // Inner sphere radius

            sphereRef.current.setHighlight(hitPoint);
        } else {
            sphereRef.current.clearHighlight?.();
        }
    });

    return null;
}
