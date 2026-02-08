import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { OrbitControls } from '@react-three/drei';
import Background from './components/Background';
import Stars from './components/Stars';
import InstancedSphere from './components/InstancedSphere';
import RaycastHighlight from './components/RaycastHighlight';
import SupernovaGesture from './components/SupernovaGesture';
import GravitySwirlGesture from './components/GravitySwirlGesture';
import VRDebugPanel from './components/VRDebugPanel';
import * as THREE from 'three';

// Detect if using WebXR emulator/polyfill (causes crashes with hand tracking)
// The Immersive Web Emulator sets this when overriding native WebXR
const isEmulator = typeof window !== 'undefined' &&
    window.__WEBXR_POLYFILL_INSTALLED__ === true;

// Log for debugging
if (typeof window !== 'undefined') {
    console.log('[XR Setup] Emulator detected:', isEmulator);
    console.log('[XR Setup] Hand tracking enabled:', true); // Always enable now
}

// Always enable hands - emulator crashes are acceptable during development
// The actual Quest 3 needs hand tracking to work
// IMPORTANT: Must request 'hand-tracking' feature for Quest 3
const store = createXRStore({
    hand: true,  // Enable hand tracking
    controller: false,  // Disable controllers - we use hand tracking
    // Request hand-tracking feature explicitly for Quest 3
    sessionInit: {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['hand-tracking', 'bounded-floor']
    }
});

// Inner scene component to access refs
function Scene() {
    const sphereRef = useRef();

    // Test ripple on click - random position on sphere surface
    const handleTestRipple = () => {
        if (sphereRef.current?.triggerRipple) {
            // Random point on unit sphere, scaled to 1.5 radius
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const origin = new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * 1.5,
                Math.cos(phi) * 1.5,
                Math.sin(phi) * Math.sin(theta) * 1.5
            );
            console.log('[Test] Triggering ripple at:', origin);
            sphereRef.current.triggerRipple(origin);
        }
    };

    // Desktop keyboard controls removed to prevent interference with VR gestures
    React.useEffect(() => {
        // Clean up any remaining listeners if needed, but for now we just don't add them.
        return () => { };
    }, []);

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[-5, 5, 5]} castShadow intensity={1} shadow-mapSize={[1024, 1024]} />

            {/* Background */}
            <Background />

            {/* Stars */}
            <Stars />

            {/* Raycast-based highlight (works on desktop) */}
            <RaycastHighlight sphereRef={sphereRef} />

            {/* Supernova gesture - two-hand spread to explode sphere */}
            <SupernovaGesture sphereRef={sphereRef} />

            {/* Gravity Swirl - right hand pinch to twist sphere */}
            <GravitySwirlGesture sphereRef={sphereRef} />

            {/* VR Debug Panel - shows hand tracking status (Hidden for now) */}
            {false && <VRDebugPanel sphereRef={sphereRef} />}

            {/* Main Visual - Click to trigger test ripple */}
            <group position={[0, 1.6, -8]} onClick={handleTestRipple}>
                <InstancedSphere ref={sphereRef} />
            </group>

            {/* OrbitControls: standard mouse controls */}
            <OrbitControls enablePan={false} />
        </>
    );
}

export default function Experience() {
    return (
        <>
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 10,
                pointerEvents: 'none'
            }}>
                <a href="index.html" style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    pointerEvents: 'auto',
                    background: 'rgba(0, 0, 0, 0.6)',
                    padding: '10px 20px',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    fontFamily: 'sans-serif',
                    backdropFilter: 'blur(5px)'
                }}>
                    ← Vissza a Menübe
                </a>

                {/* VR Toggle Button */}
                <button onClick={() => setTimeout(() => store.enterVR(), 100)} style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    pointerEvents: 'auto',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    padding: '12px 24px',
                    color: 'white',
                    borderRadius: '30px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                }}>
                    Enter VR
                </button>
            </div>

            <Canvas shadows camera={{ position: [0, 1.6, 0] }}>
                <XR store={store}>
                    <Scene />
                </XR>
            </Canvas>
        </>
    );
}
