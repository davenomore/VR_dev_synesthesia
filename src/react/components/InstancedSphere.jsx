import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { AudioAnalyzer } from '../utils/AudioAnalyzer';

// --- SHADERS (Organic Mode Only) ---
const heroVertexShader = `
    attribute vec3 a_instancePos;
    attribute vec4 a_instanceQuaternions;
    varying vec3 v_worldPosition;
    varying vec2 v_uv;
    varying vec3 v_instancePos;
    varying vec3 v_viewPosition;
    varying vec3 v_viewNormal;
    varying vec3 v_modelPosition;
    varying vec3 v_worldNormal;
    
    // Pass audio data to fragment for coloring
    varying float v_audioStrength; 
    varying float v_heightNorm;

    uniform float u_scale;
    uniform float u_time;
    // Audio Uniforms
    uniform float u_audioBass;
    uniform float u_audioMid;
    uniform float u_audioHigh;
    
    vec3 rotateByQuaternion(vec3 v, vec4 q) {
        return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
    }
    vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) {
        return normalize((vec4(dir, 0.0) * matrix).xyz);
    }

    // Simple pseudo-random for noise
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    // 3D Noise function (approximated for speed)
    float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(random(i.xy + vec2(0,0)), random(i.xy + vec2(1,0)), f.x),
                       mix(random(i.xy + vec2(0,1)), random(i.xy + vec2(1,1)), f.x), f.y),
                   mix(mix(random(i.xy + vec2(0,0)), random(i.xy + vec2(1,0)), f.x),
                       mix(random(i.xy + vec2(0,1)), random(i.xy + vec2(1,1)), f.x), f.y), f.z);
    }

    void main() {
        vec3 pos = position; // Base capsule vertex
        vec3 norm = normal;
        
        // --- ANIMATION LOGIC (ORGANIC MODE) ---
        
        // Normalized Height (-1.5 to 1.5 -> 0.0 to 1.0)
        float yNorm = (a_instancePos.y / 1.5) * 0.5 + 0.5; 
        yNorm = clamp(yNorm, 0.0, 1.0);
        v_heightNorm = yNorm;

        float audioStrength = 0.0;
        float totalDisplacement = 0.0;

        // Use 3D noise to create patches
        // Reduced scale (0.8) for SMOOTHER, larger patches
        float n = noise(a_instancePos * 0.8 + u_time * 0.2); 
        
        // Map noise to bands
        // Low noise val = Bass area, Mid = Mid area, High = High area
        float bassWeight = 1.0 - smoothstep(0.2, 0.4, n);
        float midWeight = smoothstep(0.3, 0.5, n) * (1.0 - smoothstep(0.6, 0.8, n));
        float highWeight = smoothstep(0.7, 1.0, n);

        audioStrength += u_audioBass * bassWeight;
        audioStrength += u_audioMid * midWeight;
        audioStrength += u_audioHigh * highWeight;

        // Organic ripple
        float idleWave = sin(n * 5.0 - u_time) * 0.05; 
        
        // Intense Audio Kick
        float audioKick = audioStrength * 0.6;
        
        totalDisplacement = idleWave + audioKick;
        v_audioStrength = audioStrength; 

        // --- GEOMETRY TRANSFORMATION ---

        float tip = 1.0 - step(-2.5, pos.y);
        if (tip > 0.5) { pos.y = -2.5; norm = vec3(0, -1, 0); }

        // Rotate capsule to align with sphere surface normal
        pos = rotateByQuaternion(pos, a_instanceQuaternions);
        pos *= u_scale; 
        
        // Move the whole capsule outwards from center
        vec3 instanceNormal = normalize(a_instancePos);
        vec3 newInstancePos = a_instancePos + instanceNormal * totalDisplacement;
        
        // Final position
        pos += newInstancePos;
        
        norm = rotateByQuaternion(norm, a_instanceQuaternions);

        vec4 viewPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * viewPosition;

        vec4 worldPosition = (modelMatrix * vec4(pos, 1.0));
        v_uv = uv;
        v_viewNormal = normalize(normalMatrix * norm);
        v_worldPosition = worldPosition.xyz;
        v_modelPosition = position;
        v_viewPosition = -viewPosition.xyz;
        v_instancePos = a_instancePos; 
        v_worldNormal = inverseTransformDirection(v_viewNormal, viewMatrix);
    }
`;

const heroFragmentShader = `
    varying vec3 v_worldPosition;
    varying vec2 v_uv;
    varying vec3 v_instancePos;
    varying vec3 v_viewPosition;
    varying vec3 v_viewNormal;
    varying vec3 v_modelPosition;
    varying vec3 v_worldNormal;
    varying float v_audioStrength; // Received from vertex
    varying float v_heightNorm;    // Received from vertex
    
    uniform vec3 u_lightPosition;
    uniform sampler2D u_noiseTexture;
    uniform vec3 u_color;

    float linearStep(float edge0, float edge1, float x) {
        return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    }

    void main() {
	    vec3 viewNormal = normalize(v_viewNormal);
        
        // Main Light (Key Light)
        vec3 L = normalize(u_lightPosition - v_instancePos);
	    vec3 N = normalize(normalize(v_instancePos) + 0.2 * normalize(v_worldNormal));
        float NdL = max(0.0, dot(N, L));

        // Fill Light (Opposite side, bluish/cool)
        vec3 fillL = -L;
        float fillNdL = max(0.0, dot(N, fillL)) * 0.3; // 30% intensity

        // Rim Light (Fresnel-ish)
        float rim = 1.0 - max(0.0, dot(viewNormal, vec3(0.0, 0.0, 1.0)));
        rim = pow(rim, 3.0) * 0.2;

        float distFromLight = length(u_lightPosition - v_worldPosition);
        // Reduced attenuation falloff for wider light spread
        float attenuation = 1.0 / (0.00025 * pow(distFromLight, 2.0)); 
        float ao = linearStep(-0.5, -3.0, v_modelPosition.y);

        // --- DYNAMIC COLOR MIXING (ORGANIC) ---
        vec3 baseColor = vec3(0.05, 0.05, 0.15); // Dark background
        
        // Target Colors
        vec3 cBass = vec3(1.0, 0.2, 0.0);   // Red/Orange
        vec3 cMid = vec3(0.6, 0.0, 1.0);    // Purple
        vec3 cHigh = vec3(0.0, 1.0, 1.0);   // Cyan
        
        // Simple mapping: Low strength = Cyan glow, High strength = Red burn
        vec3 cMix = mix(cHigh, cMid, v_audioStrength * 2.0);
        cMix = mix(cMix, cBass, smoothstep(0.5, 1.0, v_audioStrength));
        
        vec3 finalColor = mix(baseColor, cMix, v_audioStrength);
        finalColor += cMix * v_audioStrength * 1.2;

        // Apply Lighting
        vec3 color = finalColor;
        
        // Combine Key + Fill + Ambient + Rim
        float totalLight = clamp(attenuation * NdL + fillNdL + 0.2 + rim, 0.0, 1.0);
        
        color *= totalLight;
        
        // Tone Mapping ish
        color = pow(color, vec3(0.8));
        color *= ao * ao;
        
        gl_FragColor = vec4(color, 1.0);
        gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(1.0 / 2.2));
    }
`;


const INSTANCES = 3000;
const RADIUS_MAIN = 1.5;

export default function InstancedSphere() {
    const meshRef = useRef();
    const noiseTexture = useTexture('/bnoise.png');
    const analyzer = useMemo(() => new AudioAnalyzer(), []);

    // Start audio on first user interaction (browser policy)
    useEffect(() => {
        const handleStart = () => {
            if (!analyzer.isReady) analyzer.start();
        };
        window.addEventListener('click', handleStart);
        return () => window.removeEventListener('click', handleStart);
    }, [analyzer]);

    noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;

    // Geometry Generation
    const { geometry } = useMemo(() => {
        const baseGeometry = new THREE.CapsuleGeometry(1, 4, 4, 16);
        const instGeometry = new THREE.InstancedBufferGeometry();
        instGeometry.index = baseGeometry.index;
        instGeometry.attributes = baseGeometry.attributes;

        const pos = new Float32Array(INSTANCES * 3);
        const quat = new Float32Array(INSTANCES * 4);

        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const up = new THREE.Vector3(0, 1, 0);
        const tempPos = new THREE.Vector3();
        const tempQuat = new THREE.Quaternion();

        for (let i = 0; i < INSTANCES; i++) {
            const y = 1 - (i / (INSTANCES - 1)) * 2;
            const radius = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;

            const x = Math.cos(theta) * radius * RADIUS_MAIN;
            const z = Math.sin(theta) * radius * RADIUS_MAIN;
            const posY = y * RADIUS_MAIN;

            const i3 = i * 3;
            pos[i3] = x; pos[i3 + 1] = posY; pos[i3 + 2] = z;

            tempPos.set(-x, -posY, -z).normalize();
            tempQuat.setFromUnitVectors(up, tempPos);
            const i4 = i * 4;
            quat[i4] = tempQuat.x; quat[i4 + 1] = tempQuat.y; quat[i4 + 2] = tempQuat.z; quat[i4 + 3] = tempQuat.w;
        }

        instGeometry.setAttribute('a_instancePos', new THREE.InstancedBufferAttribute(pos, 3));
        instGeometry.setAttribute('a_instanceQuaternions', new THREE.InstancedBufferAttribute(quat, 4));

        return { geometry: instGeometry };
    }, []);

    // Uniforms
    const uniforms = useMemo(() => ({
        u_scale: { value: 0.06 },
        u_lightPosition: { value: new THREE.Vector3(-1, 0.8, 0.25).normalize().multiplyScalar(5) },
        u_noiseTexture: { value: noiseTexture },
        u_noiseTexelSize: { value: new THREE.Vector2(1 / 128, 1 / 128) },
        u_noiseCoordOffset: { value: new THREE.Vector2(0, 0) },
        u_color: { value: new THREE.Color("#FFFFFF") },
        u_time: { value: 0 },
        // Audio Inputs (0.0 to 1.0)
        u_audioBass: { value: 0.0 },
        u_audioMid: { value: 0.0 },
        u_audioHigh: { value: 0.0 }
    }), [noiseTexture]);

    const visualTime = useRef(0);

    // Frame Loop
    useFrame((state, delta) => {
        // Update Audio Analysis
        analyzer.update();
        const bands = analyzer.getBands();

        // Smoothly interpolate uniform values for less jitter
        const smoothFactor = 0.8;
        uniforms.u_audioBass.value += (bands.bass - uniforms.u_audioBass.value) * smoothFactor;
        uniforms.u_audioMid.value += (bands.mid - uniforms.u_audioMid.value) * smoothFactor;
        uniforms.u_audioHigh.value += (bands.high - uniforms.u_audioHigh.value) * smoothFactor;

        // --- BEAT SYNC LOGIC ---
        // Accelerate time based on Bass intensity
        // Base speed: 1.0
        // Max speed boost: +3.0 when bass is maxed
        const speedMultiplier = 1.0 + uniforms.u_audioBass.value * 4.0;
        visualTime.current += delta * speedMultiplier;

        // Update Shader Time
        uniforms.u_time.value = visualTime.current;
        uniforms.u_noiseCoordOffset.value.set(Math.random(), Math.random());

        // Rotate Main Mesh (optional - keeping it static matching reference logic, or slow rotate)
        if (meshRef.current) {
            // meshRef.current.rotation.y += delta * 0.05; 
        }
    });

    return (
        <group>
            <mesh
                ref={meshRef}
                geometry={geometry}
                renderOrder={0}
                onClick={() => { if (!analyzer.isReady) analyzer.start(); }}
            >
                <shaderMaterial
                    vertexShader={heroVertexShader}
                    fragmentShader={heroFragmentShader}
                    uniforms={uniforms}
                />
            </mesh>
        </group>
    );
}
