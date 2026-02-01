import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';

/**
 * RaycastHighlight Component
 * Desktop: Uses mouse raycaster
 * VR: Uses XR controller/hand ray
 */
export default function RaycastHighlight({ sphereRef }) {
    const { camera, raycaster, pointer } = useThree();
    const { isPresenting, session } = useXR();
    const xrRaycaster = useRef(new THREE.Raycaster());

    useFrame((state) => {
        if (!sphereRef?.current?.mesh || !sphereRef?.current?.setHighlight) {
            return;
        }

        const mesh = sphereRef.current.mesh;
        if (!mesh) return;

        let intersects = [];

        if (isPresenting && session) {
            // VR Mode - use XR input sources
            const frame = state.gl.xr?.getFrame?.();
            const refSpace = state.gl.xr?.getReferenceSpace?.();

            // DEBUG: Log once per second
            if (Math.floor(state.clock.elapsedTime) !== Math.floor(state.clock.elapsedTime - state.clock.getDelta())) {
                console.log('[VR Debug] Sources:', session.inputSources.length,
                    'frame:', !!frame, 'refSpace:', !!refSpace);
                for (const source of session.inputSources) {
                    console.log('  - handedness:', source.handedness, 'hand:', !!source.hand, 'targetRay:', !!source.targetRaySpace);
                }
            }

            if (frame && refSpace) {
                for (const source of session.inputSources) {
                    // Check for hand
                    if (source.hand) {
                        const indexTip = source.hand.get('index-finger-tip');
                        const indexMcp = source.hand.get('index-finger-metacarpal');

                        if (indexTip && indexMcp) {
                            try {
                                const tipPose = frame.getJointPose(indexTip, refSpace);
                                const mcpPose = frame.getJointPose(indexMcp, refSpace);

                                if (tipPose && mcpPose) {
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

                                    const rayDir = tipPos.clone().sub(mcpPos).normalize();
                                    xrRaycaster.current.set(tipPos, rayDir);

                                    const hits = xrRaycaster.current.intersectObject(mesh);
                                    if (hits.length > 0) {
                                        intersects = hits;
                                        break;
                                    }
                                }
                            } catch (e) {
                                // Ignore joint pose errors
                            }
                        }
                    }
                    // Check for controller with targetRaySpace
                    else if (source.targetRaySpace) {
                        try {
                            const rayPose = frame.getPose(source.targetRaySpace, refSpace);
                            if (rayPose) {
                                const pos = new THREE.Vector3(
                                    rayPose.transform.position.x,
                                    rayPose.transform.position.y,
                                    rayPose.transform.position.z
                                );
                                const quat = new THREE.Quaternion(
                                    rayPose.transform.orientation.x,
                                    rayPose.transform.orientation.y,
                                    rayPose.transform.orientation.z,
                                    rayPose.transform.orientation.w
                                );
                                const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);

                                xrRaycaster.current.set(pos, dir);
                                const hits = xrRaycaster.current.intersectObject(mesh);
                                if (hits.length > 0) {
                                    intersects = hits;
                                    break;
                                }
                            }
                        } catch (e) {
                            // Ignore pose errors
                        }
                    }
                }
            }
        } else {
            // Desktop mode - use mouse pointer
            raycaster.setFromCamera(pointer, camera);
            intersects = raycaster.intersectObject(mesh);
        }

        if (intersects.length > 0) {
            // Get hit point in local coords (relative to sphere at [0, 1.6, -8])
            const hitPoint = intersects[0].point;
            const localHit = new THREE.Vector3(
                hitPoint.x - 0,
                hitPoint.y - 1.6,
                hitPoint.z - (-8)
            );
            // Normalize to sphere surface and scale to inner radius
            localHit.normalize().multiplyScalar(1.5);

            sphereRef.current.setHighlight(localHit);
        } else {
            sphereRef.current.clearHighlight?.();
        }
    });

    return null;
}
