import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';

/**
 * VRDebugPanel Component
 * Shows debug info using a CanvasTexture on a Plane.
 * This is the most robust method for VR as it doesn't rely on DOM overlays or external fonts.
 */
export default function VRDebugPanel({ sphereRef }) {
    const { isPresenting, session } = useXR();
    const meshRef = useRef();
    const textureRef = useRef();
    const canvasRef = useRef(document.createElement('canvas'));
    const frameCount = useRef(0);

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = 512;
        canvas.height = 512;

        // Create texture once
        const texture = new THREE.CanvasTexture(canvas);
        textureRef.current = texture;

        if (meshRef.current) {
            meshRef.current.material.map = texture;
            meshRef.current.material.needsUpdate = true;
        }
    }, []);

    useFrame((state) => {
        // Update every 10 frames to save performance
        frameCount.current++;
        if (frameCount.current % 10 !== 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Clear background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Text settings
        ctx.fillStyle = '#00ff00';
        ctx.font = '24px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const lineHeight = 30;
        let y = 20;
        const x = 20;

        // Helper to add line
        const addLine = (text) => {
            ctx.fillText(text, x, y);
            y += lineHeight;
        };

        // Show state regardless of isPresenting
        addLine(`State: ${isPresenting ? 'VR' : 'MONITOR'}`);
        addLine(`Session: ${session ? 'Active' : 'Null'}`);

        if (session) {
            addLine(`VisState: ${session.visibilityState}`);
            addLine(`Sources: ${session.inputSources?.length || 0}`);

            let leftHand = null;
            let rightHand = null;

            if (session.inputSources) {
                for (const source of session.inputSources) {
                    const kind = source.hand ? "Hand" : "Other";
                    addLine(`${source.handedness}: ${kind}`);
                    if (source.hand && source.handedness === 'left') leftHand = source;
                    if (source.hand && source.handedness === 'right') rightHand = source;
                }
            }
            addLine("----------------");

            // Get positions
            const frame = state.gl.xr?.getFrame?.();
            const refSpace = state.gl.xr?.getReferenceSpace?.();

            if (frame && refSpace && leftHand && rightHand) {
                try {
                    const lWrist = leftHand.hand.get('wrist');
                    const rWrist = rightHand.hand.get('wrist');

                    if (lWrist && rWrist) {
                        const lPose = frame.getJointPose(lWrist, refSpace);
                        const rPose = frame.getJointPose(rWrist, refSpace);

                        if (lPose && rPose) {
                            const dist = Math.sqrt(
                                Math.pow(lPose.transform.position.x - rPose.transform.position.x, 2) +
                                Math.pow(lPose.transform.position.y - rPose.transform.position.y, 2) +
                                Math.pow(lPose.transform.position.z - rPose.transform.position.z, 2)
                            );
                            addLine(`Hand Dist: ${dist.toFixed(2)}m`);

                            // --- ADVANCED DEBUG ---

                            // Helper for 3-point Normal
                            const getNormal = (hand, frame, ref, isRight) => {
                                const w = hand.get('wrist');
                                const i = hand.get('index-finger-metacarpal');
                                const p = hand.get('pinky-finger-metacarpal');
                                if (!w || !i || !p) return null;
                                const wp = frame.getJointPose(w, ref);
                                const ip = frame.getJointPose(i, ref);
                                const pp = frame.getJointPose(p, ref);
                                if (!wp || !ip || !pp) return null;

                                const v1 = new THREE.Vector3().subVectors(ip.transform.position, wp.transform.position);
                                const v2 = new THREE.Vector3().subVectors(pp.transform.position, wp.transform.position);
                                const n = new THREE.Vector3();
                                if (isRight) n.crossVectors(v1, v2).normalize(); // Flipped
                                else n.crossVectors(v2, v1).normalize(); // Flipped
                                return n;
                            };

                            const ln = getNormal(leftHand.hand, frame, refSpace, false);
                            const rn = getNormal(rightHand.hand, frame, refSpace, true);

                            let faceScore = "N/A";
                            if (ln && rn) {
                                // Dot product with direction to other hand
                                const lPos = new THREE.Vector3(lPose.transform.position.x, lPose.transform.position.y, lPose.transform.position.z);
                                const rPos = new THREE.Vector3(rPose.transform.position.x, rPose.transform.position.y, rPose.transform.position.z);
                                const lDir = new THREE.Vector3().subVectors(rPos, lPos).normalize();
                                const rDir = new THREE.Vector3().subVectors(lPos, rPos).normalize();

                                const ld = ln.dot(lDir);
                                const rd = rn.dot(rDir);
                                faceScore = `L:${ld.toFixed(1)} R:${rd.toFixed(1)}`;
                            }
                            addLine(`Face: ${faceScore} (>0.5 needed)`);

                            // Check Pinch
                            const checkP = (h) => {
                                const t = h.get('thumb-tip'); const i = h.get('index-finger-tip');
                                if (!t || !i) return false;
                                const tp = frame.getJointPose(t, refSpace); const ip = frame.getJointPose(i, refSpace);
                                if (!tp || !ip) return false;
                                const d = Math.sqrt(Math.pow(tp.transform.position.x - ip.transform.position.x, 2) +
                                    Math.pow(tp.transform.position.y - ip.transform.position.y, 2) +
                                    Math.pow(tp.transform.position.z - ip.transform.position.z, 2));
                                return d < 0.025;
                            };
                            const lp = checkP(leftHand.hand);
                            const rp = checkP(rightHand.hand);
                            addLine(`Pinch: L:${lp ? 'YES' : 'NO'} R:${rp ? 'YES' : 'NO'}`);

                            // Check Sphere Radius
                            if (sphereRef?.current?.getSphereRadius) {
                                const r = sphereRef.current.getSphereRadius();
                                addLine(`Radius: ${r.toFixed(2)}`);
                            }

                            // Visualize Alignment check (same logic as SupernovaGesture)
                            const dy = Math.abs(lPose.transform.position.y - rPose.transform.position.y);
                            const dz = Math.abs(lPose.transform.position.z - rPose.transform.position.z);
                            const isPositionAligned = dy < 0.8 && dz < 0.8;

                            addLine(`Align: ${isPositionAligned ? 'OK' : 'BAD'} (dy:${dy.toFixed(2)} dz:${dz.toFixed(2)})`);

                            // Check Logic Status
                            // Re-evaluate local logic for debug display
                            let faceOK = false;
                            if (ln && rn) {
                                // Re-calc face logic locally for display
                                const lPos = new THREE.Vector3(lPose.transform.position.x, lPose.transform.position.y, lPose.transform.position.z);
                                const rPos = new THREE.Vector3(rPose.transform.position.x, rPose.transform.position.y, rPose.transform.position.z);
                                const lDir = new THREE.Vector3().subVectors(rPos, lPos).normalize();
                                const rDir = new THREE.Vector3().subVectors(lPos, rPos).normalize();
                                const ld = ln.dot(lDir);
                                const rd = rn.dot(rDir);
                                faceOK = ld > 0.5 && rd > 0.5;
                            }

                            const pinchOK = lp && rp;
                            const isActive = isPositionAligned && (faceOK || pinchOK);

                            addLine(`Active: ${isActive ? 'YES!!!' : 'NO'} (Face:${faceOK} Pinch:${pinchOK})`);

                            // Verify Math
                            const norm = Math.max(0, Math.min(1, (dist - 0.05) / (0.6 - 0.05)));
                            const theoreticalRadius = 1.0 + norm * (6.0 - 1.0);

                            addLine(`Math: Dist=${dist.toFixed(2)} -> Radius=${theoreticalRadius.toFixed(2)}`);

                            // Check Sphere Radius from Ref
                            if (sphereRef?.current?.getSphereRadius) {
                                const r = sphereRef.current.getSphereRadius();
                                addLine(`Ref Radius: ${r.toFixed(2)}`);
                            }

                        } else {
                            addLine("Poses: Lost");
                        }
                    } else {
                        addLine("Joints: Missing");
                    }
                } catch (e) {
                    addLine(`Err: ${e.message}`);
                }
            } else {
                addLine("Waiting for hands...");
            }
        } else {
            addLine("Enter VR to see data");
        }

        // Trigger texture update
        if (textureRef.current) {
            textureRef.current.needsUpdate = true;
        }
    });

    // Always render (for testing)
    // if (!isPresenting) return null;

    return (
        <mesh
            ref={meshRef}
            position={[0, 1.6, -2.0]} // 2 meters in front, eye level
            rotation={[0, 0, 0]}
            scale={[1, 1, 1]} // Normal scale
        >
            <planeGeometry args={[1, 0.5]} /> {/* Wider aspect ratio */}
            <meshBasicMaterial transparent opacity={0.9} side={THREE.DoubleSide} color="white" />
        </mesh>
    );
}
