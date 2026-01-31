import React from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { OrbitControls } from '@react-three/drei';
import Background from './components/Background';
import InstancedSphere from './components/InstancedSphere';

// Disable hands/controllers to avoid 404s and polyfill crashes during visual dev
const store = createXRStore({ hand: false, controller: false });

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

                {/* VR Toggle Button (Bottom Right or elsewhere custom) */}
                <button onClick={() => store.enterVR()} style={{
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
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[-5, 5, 5]} castShadow intensity={1} shadow-mapSize={[1024, 1024]} />

                    {/* Background */}
                    <Background />

                    {/* Main Visual */}
                    {/* Positioned at z=-5 to match previous scene */}
                    <group position={[0, 1.6, -5]}>
                        <InstancedSphere />
                    </group>

                    <OrbitControls />
                </XR>
            </Canvas>
        </>
    );
}
