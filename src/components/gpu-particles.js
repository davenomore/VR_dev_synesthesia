/* global AFRAME, THREE */

/**
 * GPU Particle System (GPGPU)
 * Uses WebGL Fragment Shaders to calculate physics for 65,000+ particles.
 */

// Shader for Simulation (Position/Velocity updates)
const SIMULATION_FRAGMENT_SHADER = `
    uniform float time;
    uniform float delta;
    uniform vec2 resolution; // [Width, Height] of the texture
    uniform sampler2D positions; // Previous positions
    uniform sampler2D positionsOriginal; // Home positions
    
    // Interaction Uniforms
    uniform vec3 leftHandPos;
    uniform vec3 rightHandPos;
    uniform vec3 leftIndexPos;  // For Singularity
    uniform vec3 rightIndexPos; // For Beam/Pointing
    uniform vec3 rightIndexDir; // For Beam Direction
    uniform int leftHandState;     // 0=None, 1=Levitate, 2=Singularity, 3=Freeze, 4=Pinch
    uniform int rightHandState;    // 0=None, 1=Beam, 2=Pinch
    uniform int dualPinch;          // 1 = Both hands pinching (twin orbs)
    uniform float resetFactor;     // 0..1 (1 = Force return to home)
    uniform float audioLevel;      // Audio volume (0..1)
    uniform float orbSize;         // Orb size for right hand pinch
    uniform float leftOrbSize;     // Orb size for left hand pinch
    
    // ASHIMA SIMPLEX NOISE (GLSL)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute( permute( permute( 
                  i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
    }

    vec3 curlNoise(vec3 p) {
        float e = 0.1;
        float n1 = snoise(vec3(p.x, p.y + e, p.z));
        float n2 = snoise(vec3(p.x, p.y - e, p.z));
        float n3 = snoise(vec3(p.x, p.y, p.z + e));
        float n4 = snoise(vec3(p.x, p.y, p.z - e));
        float n5 = snoise(vec3(p.x + e, p.y, p.z));
        float n6 = snoise(vec3(p.x - e, p.y, p.z));
        return vec3(n1 - n2, n3 - n4, n5 - n6);
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec3 pos = texture2D(positions, uv).rgb;
        vec3 home = texture2D(positionsOriginal, uv).rgb;
        
        // --- BASE FLOW ---
        // Add Audio-Driven Turbulence
        float noiseSpeed = 0.1 + audioLevel * 0.5;
        vec3 noiseFunc = curlNoise(pos * 0.3 + time * noiseSpeed) * (0.5 + audioLevel * 1.0);
        vec3 vel = noiseFunc * delta;

        // === DETERMINE IF STRONGLY PULLED (Skip Containment) ===
        bool isStronglyPulled = false;
        
        // Check if Right Pinch is active AND hand is in valid position (not at origin)
        if (rightHandState == 2 && length(rightHandPos) > 0.1) {
            vec3 dir = rightHandPos - pos;
            float d = length(dir);
            if (d < 3.0) isStronglyPulled = true;
        }
        // Check if Left Singularity is active AND hand is valid
        if (leftHandState == 2 && length(leftIndexPos) > 0.1) {
            vec3 dir = leftIndexPos - pos;
            float d = length(dir);
            if (d < 3.0) isStronglyPulled = true;
        }

        // --- GLOBAL CONTAINMENT (Only if NOT strongly pulled) ---
        if (!isStronglyPulled) {
            vec3 center = vec3(0.0, 1.1, 0.0);
            
            float innerWall = 2.0;
            float outerWall = 6.0;
            
            vec3 toCenter = pos - center;
            float dist = length(toCenter) + 0.001;
            vec3 safeDir = toCenter / dist;

            // STRONG HOMING: Spring back to original position (creates "explosion" on release)
            vec3 toHome = home - pos;
            float homeDist = length(toHome);
            if (homeDist > 0.5) {
                // Far from home = strong spring
                vel += normalize(toHome) * homeDist * 3.0 * delta;
            } else if (homeDist > 0.1) {
                // Near home = gentle settling
                vel += toHome * 2.0 * delta;
            }

            // Wall containment
            if (dist < innerWall) {
                float diff = innerWall - dist;
                vel += safeDir * diff * 8.0 * delta;
            } else if (dist > outerWall) {
                float diff = dist - outerWall;
                vel -= safeDir * diff * 4.0 * delta;
            }
        }

        // --- TWO HAND INTERACTION ---
        vec3 midHands = (leftHandPos + rightHandPos) * 0.5;
        float handDist = length(leftHandPos - rightHandPos);
        
        // DUAL PINCH MODE: Two orbs that can interact!
        if (dualPinch == 1) {
            // DAMPING for smooth, stable orbs
            vel *= 0.85;
            
            // Each particle goes to the NEAREST hand
            float distToLeft = length(pos - leftHandPos);
            float distToRight = length(pos - rightHandPos);
            
            vec3 targetHand = (distToLeft < distToRight) ? leftHandPos : rightHandPos;
            float targetOrbSize = (distToLeft < distToRight) ? (0.15 + leftOrbSize * 0.4) : (0.15 + orbSize * 0.4);
            
            vec3 dir = targetHand - pos;
            float d = length(dir) + 0.01;
            
            // WATER DROPLET MERGE: When hands are close, particles flow to center
            if (handDist < 0.6) {
                // Merge factor (0 = far, 1 = touching)
                float mergeFactor = 1.0 - (handDist / 0.6);
                
                // Blend target toward center
                vec3 toMid = midHands - pos;
                float midDist = length(toMid) + 0.01;
                
                // Smooth flow toward center
                float mergeForce = 60.0 * mergeFactor / (midDist + 0.2);
                vel += normalize(toMid) * mergeForce * delta;
                
                // Gentle orbital swirl (like mixing fluids)
                vec3 orbit = cross(normalize(toMid), vec3(0,1,0)) * 2.0 * mergeFactor;
                vel += orbit * delta;
            } else {
                // Normal orb formation - pull to nearest hand
                if (d > targetOrbSize) {
                    float pull = 80.0 / (d + 0.3);
                    vel += normalize(dir) * pull * delta * 0.2;
                } else {
                    // Gently push to surface
                    float pushOut = (targetOrbSize - d) * 5.0;
                    vel -= normalize(dir) * pushOut * delta;
                }
            }
        }
        // OLD: Close hands push (only if NOT dual pinching)
        else if (handDist < 0.3) {
            vec3 dir = pos - midHands;
            float d = length(dir) + 0.1;
            if (d < 2.0) {
                 float push = 15.0 / (d * d);
                 vel += normalize(dir) * push * delta;
            }
        }

        // --- ATTRACTORS (Extended Range) ---

        // 1. LEFT HAND
        if (leftHandState == 2) { // SINGULARITY
            vec3 dir = leftIndexPos - pos;
            float d = length(dir) + 0.1;
            // Extended range: 15m (was 8m)
            if (d < 15.0) {
                float gravity = 80.0 / (d * d + 0.1);
                vel += normalize(dir) * gravity * delta * 0.1;
                
                vec3 swirl = cross(normalize(dir), vec3(0,1,0));
                float swirlSpeed = 8.0 / (d + 0.2);
                vel += swirl * swirlSpeed * delta;
            }
        } else if (leftHandState == 1) { // LEVITATE
            vec3 dir = leftHandPos - pos;
            float d = length(dir);
            
            // GLOBAL effect - no range limit
            // 1. Graceful damping (smooth slowdown)
            vel *= 0.92;
            
            // 2. Move toward the HORIZON PLANE (Y = hand level)
            float targetY = leftHandPos.y;
            float yDiff = targetY - pos.y;
            vel.y += yDiff * 4.0 * delta; // INTENSE flattening
            
            // 3. Gentle horizontal sway (graceful motion)
            vec3 sway = curlNoise(pos * 0.2 + time * 0.3) * 0.8;
            vel += sway * delta;
            
            // 4. Continuous outward drift toward horizon (never stops)
            vec3 toCenter = pos - leftHandPos;
            toCenter.y = 0.0; // Only horizontal
            float hDist = length(toCenter) + 0.1;
            vec3 spreadDir = normalize(toCenter);
            vel += spreadDir * 1.2 * delta; // Stronger continuous push
        } else if (leftHandState == 4) { // VORTEX (Left Pinch)
            // GLOBAL vortex - affects ALL particles
            vec3 dir = leftHandPos - pos;
            float d = length(dir) + 0.1;
            
            // 1. Gentle pull toward center (weaker, so particles don't collapse)
            float pullStr = 2.5; // Stronger pull
            vel += normalize(dir) * pullStr * delta;
            
            // 2. XZ Swirl - GLOBAL SPIN (strong, constant)
            vec3 swirl = vec3(-dir.z, 0.0, dir.x); // Cross product with Y-up
            float swirlLen = length(swirl) + 0.001;
            float swirlStr = 8.0; // MUCH stronger spin
            vel += (swirl / swirlLen) * swirlStr * delta;
        }
        
        // 2. RIGHT HAND (Pinch -> Growing Orb)
        if (rightHandState == 2) { 
            vec3 dir = rightHandPos - pos;
            float d = length(dir) + 0.01;
            
            float currentOrbRadius = 0.15 + orbSize * 0.5;
            
            // Pull ALL particles (no range limit, but falloff with distance)
            if (d > currentOrbRadius) {
                float pull = 65.0 / (d + 0.4); // Balanced pull
                vel += normalize(dir) * pull * delta * 0.12;
            } else {
                float pushOut = (currentOrbRadius - d) * 10.0;
                vel -= normalize(dir) * pushOut * delta;
                
                vec3 swirl = cross(normalize(dir), vec3(0,1,0)) * 3.0;
                vel += swirl * delta;
            }
        } else if (rightHandState == 1) { // BEAM
             vec3 relPos = pos - rightIndexPos;
             float dotP = dot(relPos, rightIndexDir);
             
             if (dotP > 0.0) {
                 vec3 proj = rightIndexPos + rightIndexDir * dotP;
                 vec3 radial = pos - proj;
                 float rDist = length(radial);
                 
                 // Wider beam: 0.1m core, 2m aura (was 0.05m/0.8m)
                 if (rDist < 0.1) {
                     vel += rightIndexDir * 15.0 * delta;
                     vel -= radial * 30.0 * delta;
                 } else if (rDist < 2.0) {
                     vel -= radial * 3.0 * delta;
                 }
             } else {
                 vec3 toTip = rightIndexPos - pos;
                 float tipDist = length(toTip);
                 // Extended suction range: 3m
                 if (tipDist < 3.0) {
                     vel += normalize(toTip) * 20.0 * delta;
                 }
             }
        }
        
        // FREEZE (Right Fist Only)
        if (rightHandState == 3) {
             vel *= 0.1; // Strong damping = freeze
        }

        // --- DAMPING (Like CPU: 0.98 per frame) ---
        vel *= 0.98;

        // --- HOMING RESET ---
        if (resetFactor > 0.01) {
             vec3 toHome = home - pos;
             vel += toHome * resetFactor * 3.0 * delta;
        }

        // === SAFETY ===
        float velMag = length(vel);
        if (velMag > 2.0) {
            vel = normalize(vel) * 2.0;
        }

        pos += vel;

        // Position bounds
        float posMag = length(pos);
        if (posMag > 20.0) {
            pos = normalize(pos) * 20.0;
        }

        // NaN recovery
        if (pos.x != pos.x || pos.y != pos.y || pos.z != pos.z) {
            pos = home;
        }

        gl_FragColor = vec4(pos, 1.0);
    }
`;

// Shader for Rendering (Drawing the points with audio-reactive colors + BLOOM)
const RENDER_VERTEX_SHADER = `
    uniform sampler2D positionTexture;
    uniform float audioBass;
    uniform float audioMid;
    uniform float audioHigh;
    varying vec3 vColor;

void main() {
        vec3 pos = texture2D(positionTexture, position.xy).rgb;

        // Audio-reactive color palette (HDR for bloom)
        // MOMOCHROME PALETTE: Shades of Cyan/Electric Blue
        vec3 cBass = vec3(0.0, 0.1, 0.8);   // Deep Blue (Bass)
        vec3 cMid  = vec3(0.0, 0.8, 1.5);   // Bright Cyan (Mids)
        vec3 cHigh = vec3(0.8, 0.9, 1.2);   // Pale/White Blue (Highs)
        
        vec3 finalColor = vec3(0.0, 0.0, 0.0);

        // VISUAL VARIATION: Split particles into "bands" based on their ID (position.x)
        // This prevents the "whole cloud changes color at once" effect.
        
        float pID = position.x; // 0.0 to 1.0 (Texture UV coordinate acts as ID)

    // Soft mixing between zones to avoid harsh lines
    if (pID < 0.35) {
        // BASS ZONE (Inner/First group)
        finalColor = cBass * audioBass * 4.0; 
        finalColor += vec3(0.0, 0.02, 0.1); // Dark blue base
    } else if (pID < 0.7) {
        // MID ZONE (Middle group)
        finalColor = cMid * audioMid * 2.5; 
        finalColor += vec3(0.0, 0.1, 0.1); // Teal base
    } else {
        // HIGH ZONE (Outer/Last group)
        finalColor = cHigh * audioHigh * 5.0; 
        finalColor += vec3(0.05, 0.1, 0.1); // Brighter base
    }

    vColor = finalColor;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float size = 5.0 / -mvPosition.z; // Slightly larger particles
    gl_PointSize = clamp(size, 1.0, 35.0);
    gl_Position = projectionMatrix * mvPosition;
}
`;

const RENDER_FRAGMENT_SHADER = `
    varying vec3 vColor;
void main() {
        // Soft circle with glow falloff
        float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

        // Soft edge for bloom effect
        float alpha = 1.0 - smoothstep(0.3, 0.5, dist);

    gl_FragColor = vec4(vColor * alpha, alpha);
}
`;


AFRAME.registerComponent('gpu-particles', {
    schema: {
        count: { default: 256 }, // Width of texture (256x256 = 65k)
    },

    init: function () {
        this.size = this.data.count; // Texture width
        this.particleCount = this.size * this.size;

        console.log(`[GPU Particles]Init: ${this.particleCount} particles(Thick Shell)`);

        // 1. Setup GPGPU Scenes (Off-screen rendering)
        // We need two scenes/cameras or just raw FBOs?
        // Three.js 'GPUComputationRenderer' is best if available.
        // Checking for it... likely needs import.
        // For raw implementation:
        // We need 2 textures for Position (Read/Write)
        // We need 2 textures for Velocity (Read/Write)

        this.initComputeRenderer();
        this.initParticles();

        // Synchronized pinch tracking
        this.leftPinchStartTime = 0;
        this.rightPinchStartTime = 0;
        this.wasLeftPinching = false;
        this.wasRightPinching = false;
    },

    initComputeRenderer: function () {
        // Create Data Textures
        // Use Float32Array for data content, but Texture can be HalfFloat for storage if needed.
        // DataTexture expects the array type to match the type param if possible, 
        // but typically Float32Array works with HalfFloatType (Three.js converts).
        const data = new Float32Array(this.particleCount * 4);

        // INITIALIZE IN MULTI-LAYER CONCENTRIC SHELLS ("Több rétegű gömbhéj")
        const layers = [
            { radius: 2.5, weight: 0.25 },  // Inner shell
            { radius: 4.0, weight: 0.50 },  // Middle shell (most particles)
            { radius: 5.5, weight: 0.25 }   // Outer shell
        ];
        const centerY = 1.1;
        const shellThickness = 0.3; // Each layer is thin

        for (let i = 0; i < this.particleCount; i++) {
            const idx = i * 4;

            // Pick layer based on weight distribution
            const rand = Math.random();
            let layer;
            if (rand < layers[0].weight) {
                layer = layers[0];
            } else if (rand < layers[0].weight + layers[1].weight) {
                layer = layers[1];
            } else {
                layer = layers[2];
            }

            // Random point on sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = layer.radius + (Math.random() - 0.5) * shellThickness;

            data[idx] = r * Math.sin(phi) * Math.cos(theta); // X
            data[idx + 1] = centerY + r * Math.sin(phi) * Math.sin(theta); // Y
            data[idx + 2] = r * Math.cos(phi); // Z
            data[idx + 3] = 1.0; // W
        }

        // CRITICAL FIX: Use FloatType for the INPUT textures because we pass Float32Array.
        // The FBOs will still use HalfFloatType for performance/storage on the GPU.
        this.posTexture1 = new THREE.DataTexture(data, this.size, this.size, THREE.RGBAFormat, THREE.FloatType);
        this.posTexture1.minFilter = THREE.NearestFilter;
        this.posTexture1.magFilter = THREE.NearestFilter;
        this.posTexture1.generateMipmaps = false;
        this.posTexture1.needsUpdate = true;

        // Store Original Positions for Reset
        this.posTextureOriginal = new THREE.DataTexture(Float32Array.from(data), this.size, this.size, THREE.RGBAFormat, THREE.FloatType);
        this.posTextureOriginal.minFilter = THREE.NearestFilter;
        this.posTextureOriginal.magFilter = THREE.NearestFilter;
        this.posTextureOriginal.generateMipmaps = false;
        this.posTextureOriginal.needsUpdate = true;

        this.posTexture2 = this.posTexture1.clone();
        this.posTexture2.minFilter = THREE.NearestFilter;
        this.posTexture2.magFilter = THREE.NearestFilter;
        this.posTexture2.generateMipmaps = false;
        this.posTexture2.needsUpdate = true;

        // Create Simulation Material
        this.simMaterial = new THREE.ShaderMaterial({
            uniforms: {
                positions: { value: this.posTexture1 },
                positionsOriginal: { value: this.posTextureOriginal },
                time: { value: 0 },
                delta: { value: 0 },
                resolution: { value: new THREE.Vector2(this.size, this.size) },
                resetFactor: { value: 0 },
                audioLevel: { value: 0 },
                orbSize: { value: 0 },
                leftOrbSize: { value: 0 },
                dualPinch: { value: 0 },
                // Interaction
                leftHandPos: { value: new THREE.Vector3() },
                rightHandPos: { value: new THREE.Vector3() },
                leftIndexPos: { value: new THREE.Vector3() },
                rightIndexPos: { value: new THREE.Vector3() },
                rightIndexDir: { value: new THREE.Vector3(0, 0, -1) },
                leftHandState: { value: 0 },
                rightHandState: { value: 0 }
            },
            vertexShader: `void main() { gl_Position = vec4(position, 1.0); } `, // Full screen quad
            fragmentShader: SIMULATION_FRAGMENT_SHADER
        });

        // Setup FBOs with matching settings
        this.fbo1 = new THREE.WebGLRenderTarget(this.size, this.size, {
            depthBuffer: false,
            stencilBuffer: false,
            type: THREE.HalfFloatType,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat
        });
        this.fbo2 = this.fbo1.clone();

        // Quad Camera for simulation
        this.simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.simScene = new THREE.Scene();
        this.simMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.simMaterial);
        this.simScene.add(this.simMesh);

        // SEED THE FBOs!
        // We must render the initial data (posTexture1) into fbo1 and fbo2
        // otherwise they are empty (black) and particles collapse to 0,0,0.
        this.fillTextures();
    },

    fillTextures: function () {
        const renderer = this.el.sceneEl.renderer;
        // Use the sim material to copy data
        // Delta = 0 means no movement, just copy "positions" to gl_FragColor
        this.simMaterial.uniforms.positions.value = this.posTexture1;
        this.simMaterial.uniforms.delta.value = 0;
        this.simMaterial.uniforms.time.value = 0;

        const currentRenderTarget = renderer.getRenderTarget();

        // GPU VR FIX: Disable XR for seed rendering too!
        // If initializing inside a VR session, we must render flat.
        const currentXrEnabled = renderer.xr.enabled;
        renderer.xr.enabled = false;

        // Fill FBO 1
        renderer.setRenderTarget(this.fbo1);
        renderer.render(this.simScene, this.simCamera);

        // Fill FBO 2
        renderer.setRenderTarget(this.fbo2);
        renderer.render(this.simScene, this.simCamera);

        // Restore XR
        renderer.xr.enabled = currentXrEnabled;

        renderer.setRenderTarget(currentRenderTarget);
    },

    initParticles: function () {
        // Create the Geometry for the points
        // We pass the "UV" coordinates as the position attribute!
        // Because each vertex needs to know WHICH pixel to read from the texture.
        const geometry = new THREE.BufferGeometry();
        const uvs = new Float32Array(this.particleCount * 3);

        for (let i = 0; i < this.particleCount; i++) {
            // UV mapping: Center of pixel (Important for precise lookup)
            const x = (i % this.size) + 0.5;
            const y = Math.floor(i / this.size) + 0.5;

            uvs[i * 3] = x / this.size;
            uvs[i * 3 + 1] = y / this.size;
            uvs[i * 3 + 2] = 0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(uvs, 3));

        // Material reads from the COMPUTED texture
        this.renderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                positionTexture: { value: this.posTexture1 },
                audioBass: { value: 0 },
                audioMid: { value: 0 },
                audioHigh: { value: 0 }
            },
            vertexShader: RENDER_VERTEX_SHADER,
            fragmentShader: RENDER_FRAGMENT_SHADER,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.points = new THREE.Points(geometry, this.renderMaterial);

        // CRITICAL: Disable Frustum Culling!
        // Since we move particles in Vertex Shader, the CPU bounding box is wrong (it thinks they are all at 0,0).
        this.points.frustumCulled = false;

        this.el.setObject3D('mesh', this.points);
    },

    // Exposed Reset method for external systems
    reset: function () {
        console.log('[GPU Particles] Smooth Reset Triggered');
        this.isResetting = true;
        this.resetTime = 0;
    },

    tick: function (time, delta) {
        const dt = delta / 1000;
        const renderer = this.el.sceneEl.renderer;

        // 0. UPDATE UNIFORMS (Interaction)
        const handSys = this.el.sceneEl.systems['hand-distance'];
        const audioSys = this.el.sceneEl.systems['audio-analyzer'];
        const uniforms = this.simMaterial.uniforms;

        if (handSys) {
            uniforms.leftHandPos.value.copy(handSys.leftPos);
            uniforms.rightHandPos.value.copy(handSys.rightPos);
            uniforms.leftIndexPos.value.copy(handSys.leftIndexTip);
            uniforms.rightIndexPos.value.copy(handSys.rightIndexTip);
            
            // Update direction for beam
            if (handSys.rightIndexDir) {
                uniforms.rightIndexDir.value.copy(handSys.rightIndexDir);
            }

            // --- LEFT HAND STATE ---
            // Priority: Fist (Freeze) > Point (Singularity) > Pinch (Vortex) > Palm Up (Levitate)
            if (handSys.leftFist) {
                uniforms.leftHandState.value = 3; // Freeze
            } else if (handSys.isLeftPointing) {
                uniforms.leftHandState.value = 2; // Singularity
            } else if (handSys.leftPinching) {
                uniforms.leftHandState.value = 4; // Vortex
            } else if (handSys.leftPalmUp) { // Proper palm up detection
                uniforms.leftHandState.value = 1; // Levitate
            } else {
                uniforms.leftHandState.value = 0;
            }

            // --- RIGHT HAND STATE ---
            // Priority: Fist (Freeze) > Pinch (Orb) > Beam
            if (handSys.rightFist) {
                uniforms.rightHandState.value = 3; // Freeze
                uniforms.orbSize.value *= 0.85;
            } else if (handSys.rightPinching) {
                uniforms.rightHandState.value = 2; // Pinch (Orb)
                uniforms.orbSize.value = Math.min(uniforms.orbSize.value + dt * 1.5, 1.0);
            } else if (handSys.isRightPointing) {
                uniforms.rightHandState.value = 1; // Beam
                uniforms.orbSize.value *= 0.85;
            } else {
                uniforms.rightHandState.value = 0;
                uniforms.orbSize.value *= 0.85;
            }

            // --- DUAL PINCH MODE (Twin Orbs) ---
            // Only activate if both pinches started within 500ms of each other
            const now = time;
            const SYNC_WINDOW = 500; // ms

            // Track pinch start times
            if (handSys.leftPinching && !this.wasLeftPinching) {
                this.leftPinchStartTime = now;
            }
            if (handSys.rightPinching && !this.wasRightPinching) {
                this.rightPinchStartTime = now;
            }
            this.wasLeftPinching = handSys.leftPinching;
            this.wasRightPinching = handSys.rightPinching;

            // Check if synchronized
            const timeDiff = Math.abs(this.leftPinchStartTime - this.rightPinchStartTime);
            const isSynced = timeDiff < SYNC_WINDOW;

            if (handSys.leftPinching && handSys.rightPinching && isSynced) {
                uniforms.dualPinch.value = 1;
                // DISABLE individual hand effects during dual mode
                uniforms.leftHandState.value = 0;
                uniforms.rightHandState.value = 0;
                // Grow both orbs
                uniforms.orbSize.value = Math.min(uniforms.orbSize.value + dt * 1.0, 0.8);
                uniforms.leftOrbSize.value = Math.min(uniforms.leftOrbSize.value + dt * 1.0, 0.8);
            } else {
                uniforms.dualPinch.value = 0;
                uniforms.leftOrbSize.value *= 0.9; // Decay left orb
            }
        }

        // --- RESET LOGIC ---
        if (this.isResetting) {
            this.resetTime += dt;
            // Ramp up reset factor (0 -> 1) quickly, then hold
            uniforms.resetFactor.value = Math.min(this.resetTime * 2.0, 1.0);

            if (this.resetTime > 2.0) {
                this.isResetting = false;
            }
        } else {
            // Decay reset factor
            uniforms.resetFactor.value *= 0.95;
        }

        // Audio Interaction (with safety)
        if (audioSys) {
            const bands = audioSys.getBands();
            if (bands && typeof bands.bass === 'number') {
                const volume = (bands.bass + bands.mid + bands.high) / 3.0;
                uniforms.audioLevel.value = Math.min(Math.max(volume, 0), 1.0) * 0.5;

                // Pass bands to render shader for coloring
                this.renderMaterial.uniforms.audioBass.value = bands.bass;
                this.renderMaterial.uniforms.audioMid.value = bands.mid;
                this.renderMaterial.uniforms.audioHigh.value = bands.high;
            } else {
                uniforms.audioLevel.value = 0;
            }
        } else {
            uniforms.audioLevel.value = 0;
        }

        // BEAT REACTIVITY (Pulse on beat)
        if (audioSys && audioSys.isBeat) {
            // Create a momentary flash/expansion force
            uniforms.resetFactor.value = 0.1; // Slight ripple
            // We could add a specific 'beatFlash' uniform if desired
        }

        // DEBUG: Check values every ~1 sec (assuming 60fps)
        if (Math.random() < 0.01) {
            const bands = audioSys ? audioSys.getBands() : null;
            console.log('[GPU Debug] Audio:',
                'Bass:', bands ? bands.bass.toFixed(2) : 'N/A',
                'Mid:', bands ? bands.mid.toFixed(2) : 'N/A',
                'High:', bands ? bands.high.toFixed(2) : 'N/A',
                'Vol:', audioSys ? audioSys.volume.toFixed(2) : 'N/A',
                'Beat:', audioSys ? audioSys.isBeat : false
            );
        }

        // 1. SIMULATION STEP
        const input = this.fbo1;
        const output = this.fbo2;

        uniforms.positions.value = input.texture;
        uniforms.time.value = time / 1000;
        uniforms.delta.value = dt;

        const currentRenderTarget = renderer.getRenderTarget();

        // CRITICAL VR FIX: Disable XR for off-screen GPGPU rendering
        // Otherwise WebXR applies stereo viewports to the simulation FBO, breaking the 1:1 pixel mapping.
        const currentXrEnabled = renderer.xr.enabled;
        renderer.xr.enabled = false;

        renderer.setRenderTarget(output);
        renderer.render(this.simScene, this.simCamera);
        renderer.setRenderTarget(currentRenderTarget);

        // Restore XR
        renderer.xr.enabled = currentXrEnabled;

        // 2. RENDER STEP
        this.renderMaterial.uniforms.positionTexture.value = output.texture;

        this.fbo1 = output;
        this.fbo2 = input;
    }
});
