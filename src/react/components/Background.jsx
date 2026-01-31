import React, { useMemo } from 'react';
import * as THREE from 'three';

export default function Background() {
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
      uniform vec3 u_color0;
      uniform vec3 u_color1;

      void main() {
        gl_FragColor = vec4(mix(u_color0, u_color1, v_uv.x), 1.0);
      }
    `,
        uniforms: {
            u_color0: { value: new THREE.Color("#AEB2B5") },
            u_color1: { value: new THREE.Color("#939A9D") }
        },
        side: THREE.BackSide,
        depthWrite: false
    }), []);

    return (
        <mesh>
            <sphereGeometry args={[100, 32, 32]} />
            <shaderMaterial args={[shader]} />
        </mesh>
    );
}
