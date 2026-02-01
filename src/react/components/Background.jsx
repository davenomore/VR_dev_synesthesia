import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Background() {
  const materialRef = useRef();

  const shader = useMemo(() => ({
    vertexShader: `
            varying vec2 v_uv;
            void main() {
                v_uv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
    fragmentShader: `
            varying vec2 v_uv;
            uniform float u_time;

            void main() {
                // Simple cosmic gradient
                vec3 deepBlue = vec3(0.01, 0.01, 0.06);
                vec3 purple = vec3(0.04, 0.01, 0.08);
                vec3 color = mix(deepBlue, purple, v_uv.y);
                
                gl_FragColor = vec4(color, 1.0);
            }
        `,
    uniforms: {
      u_time: { value: 0.0 }
    },
    side: THREE.BackSide,
    depthWrite: false
  }), []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[100, 32, 32]} />
      <shaderMaterial ref={materialRef} args={[shader]} />
    </mesh>
  );
}
