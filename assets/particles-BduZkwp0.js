import"./music-store-Da5ddBIB.js";import"./auto-music-CU4BUEO4.js";AFRAME.registerSystem("hand-distance",{schema:{minDistance:{default:.05},maxDistance:{default:1}},init:function(){this.leftHand=null,this.rightHand=null,this.leftPos=new THREE.Vector3,this.rightPos=new THREE.Vector3,this.centerPos=new THREE.Vector3,this.distance=.5,this.smoothDistance=.5,this.leftPinching=!1,this.rightPinching=!1,this.leftFist=!1,this.rightFist=!1,this.leftPalmUp=!1,this.rightPalmUp=!1,this.rightIndexTip=new THREE.Vector3,this.rightIndexDir=new THREE.Vector3,this.isRightPointing=!1,this.leftIndexTip=new THREE.Vector3,this.leftIndexDir=new THREE.Vector3,this.isLeftPointing=!1,this.particleSystem=null,this.centerAttractor={data:{hand:"center"},position:new THREE.Vector3,strength:0,radius:0},this.pointingAttractor={data:{hand:"pointing",mode:"attract"},position:new THREE.Vector3,strength:0,radius:0},this.el.addEventListener("loaded",()=>{setTimeout(()=>{this.leftHand=document.querySelector("#left-hand"),this.rightHand=document.querySelector("#right-hand");let t=this.el.querySelector("[gpu-particles]");t&&t.components["gpu-particles"]?(this.particleSystem=t.components["gpu-particles"],console.log("[HandDistance] ✅ Found GPU Particle System")):(t=this.el.querySelector("[synesthetic-particles]"),t&&t.components["synesthetic-particles"]&&(this.particleSystem=t.components["synesthetic-particles"],this.particleSystem.addAttractor(this.centerAttractor),this.particleSystem.addAttractor(this.pointingAttractor),console.log("[HandDistance] ✅ Found CPU Particle System (Legacy)"))),this.leftHand&&(this.leftHand.addEventListener("pinchstarted",()=>this.leftPinching=!0),this.leftHand.addEventListener("pinchended",()=>this.leftPinching=!1),this.leftHand.addEventListener("gesture-fist",()=>this.leftFist=!0),this.leftHand.addEventListener("gesture-fist-end",()=>this.leftFist=!1)),this.rightHand&&(this.rightHand.addEventListener("pinchstarted",()=>this.rightPinching=!0),this.rightHand.addEventListener("pinchended",()=>this.rightPinching=!1),this.rightHand.addEventListener("gesture-fist",()=>this.rightFist=!0),this.rightHand.addEventListener("gesture-fist-end",()=>this.rightFist=!1))},1e3)})},tick:function(t,s){const n=this.el.sceneEl.renderer;if(!n||!n.xr)return;const r=n.xr.getSession();if(!r){this.leftHand&&this.rightHand&&(this.leftHand.object3D.getWorldPosition(this.leftPos),this.rightHand.object3D.getWorldPosition(this.rightPos),this.leftPos.lengthSq()>.1&&this.calculatePhysics(this.leftPos,this.rightPos,null,null));return}const e=n.xr.getFrame(),o=n.xr.getReferenceSpace();if(!e||!o)return;let i=null,h=null,c=null,d=null;for(const l of r.inputSources){if(!l.hand)continue;const a=l.hand.get("wrist"),m=l.hand.get("index-finger-phalanx-proximal"),y=l.hand.get("index-finger-tip"),v=l.hand.get("middle-finger-tip"),D=l.hand.get("pinky-finger-phalanx-proximal");if(!a||!m||!D)continue;const x=e.getJointPose(a,o),E=e.getJointPose(m,o),T=e.getJointPose(D,o),u=y?e.getJointPose(y,o):null,g=v?e.getJointPose(v,o):null;if(!x||!E||!T)continue;const f=new THREE.Vector3(x.transform.position.x,x.transform.position.y,x.transform.position.z),w=new THREE.Vector3(E.transform.position.x,E.transform.position.y,E.transform.position.z),z=new THREE.Vector3(T.transform.position.x,T.transform.position.y,T.transform.position.z),A=new THREE.Vector3().subVectors(w,f),b=new THREE.Vector3().subVectors(z,f),P=new THREE.Vector3().crossVectors(A,b).normalize();if(l.handedness==="left"&&P.negate(),l.handedness==="left"){if(this.leftPos.copy(f),c=P,i=!0,u&&g){const p=new THREE.Vector3(u.transform.position.x,u.transform.position.y,u.transform.position.z),H=new THREE.Vector3(g.transform.position.x,g.transform.position.y,g.transform.position.z),S=p.distanceTo(f),R=H.distanceTo(f);this.isLeftPointing=S-R>.03,this.isLeftPointing&&(this.leftIndexTip.copy(p),this.leftIndexDir.subVectors(p,f).normalize())}}else if(l.handedness==="right"&&(this.rightPos.copy(f),d=P,h=!0,u&&g)){const p=new THREE.Vector3(u.transform.position.x,u.transform.position.y,u.transform.position.z),H=new THREE.Vector3(g.transform.position.x,g.transform.position.y,g.transform.position.z),S=p.distanceTo(f),R=H.distanceTo(f);this.isRightPointing=S-R>.03,this.isRightPointing&&(this.rightIndexTip.copy(p),this.rightIndexDir.subVectors(p,f).normalize())}}i&&h&&this.calculatePhysics(this.leftPos,this.rightPos,c,d)},calculatePhysics:function(t,s,n,r){if(!this.particleSystem)return;this.distance=t.distanceTo(s),this.smoothDistance=this.smoothDistance*.9+this.distance*.1,this.centerAttractor.position.copy(this.centerPos);const e=new THREE.Vector3(0,1,0);let o=0,i=0;if(n&&r&&(o=n.dot(e),i=r.dot(e),this.leftPalmUp=o>.6,this.rightPalmUp=i>.6,Math.random()<.02&&console.log(`[HandDistance] 🕊️ Up Check: L=${o.toFixed(2)} R=${i.toFixed(2)} | Dist=${this.distance.toFixed(2)}`)),this.isRightPointing){const h=this.rightPos,c=this.rightIndexTip,d=new THREE.Vector3().subVectors(c,h).normalize();this.pointingAttractor.position.copy(c),this.pointingAttractor.data={hand:"pointing",mode:"beam",direction:d},this.pointingAttractor.strength=50,this.pointingAttractor.radius=15,Math.random()<.02&&console.log("[HandDistance] 🔦 BEAM (Right)")}else this.pointingAttractor.strength=0,this.pointingAttractor.radius=0,this.pointingAttractor.data={};if(this.isLeftPointing&&(this.centerAttractor.position.copy(this.leftIndexTip),this.centerAttractor.strength=80,this.centerAttractor.radius=8,this.centerAttractor.data={mode:"singularity",hand:"left"},Math.random()<.02&&console.log("[HandDistance] ⚫ SINGULARITY (Left)")),o>.8&&i>.8&&!this.leftPinching&&!this.rightPinching&&!this.leftFist&&!this.rightFist){this.resetTimer||(this.resetTimer=0);const h=Date.now();h-this.resetTimer>2e3&&(console.log("[HandDistance] 🔄 DOUBLE PALM DOWN -> RESET (SMOOTH)"),this.particleSystem.smoothReset?this.particleSystem.smoothReset():this.particleSystem.reset(),this.resetTimer=h);return}if(o>.6){this.centerAttractor.position.copy(this.leftPos),this.centerAttractor.data={mode:"levitate",hand:"left"},this.centerAttractor.strength=1,this.centerAttractor.radius=8,Math.random()<.02&&console.log("[HandDistance] 🪶 LEVITATE (Left)");return}if(this.isLeftPointing){this.centerAttractor.position.copy(this.leftIndexTip),this.centerAttractor.strength=80,this.centerAttractor.radius=8,this.centerAttractor.data={mode:"singularity",hand:"left"},Math.random()<.02&&console.log("[HandDistance] ⚫ SINGULARITY (Left)");return}if(this.centerAttractor.data.mode="center",this.centerAttractor.position.copy(this.centerPos),Math.max(0,Math.min(1,(this.smoothDistance-this.data.minDistance)/(this.data.maxDistance-this.data.minDistance))),this.leftPinching&&this.rightPinching){this.centerAttractor.strength=50,this.centerAttractor.radius=8;return}this.smoothDistance<.15?(this.centerAttractor.strength=-30,this.centerAttractor.radius=2):(this.centerAttractor.strength=10,this.centerAttractor.radius=4+this.smoothDistance*2)}});AFRAME.registerSystem("gesture-detector",{init:function(){this.sceneEl=document.querySelector("a-scene"),this.hands={left:null,right:null},this.gestures={left:"unknown",right:"unknown"},this.gestureCounters={left:{},right:{}},this.STABILITY_THRESHOLD=8,this.state={left:{pinching:!1},right:{pinching:!1}},this.frameCount=0,this.hasSeenXR=!1,console.log("[GestureDetector] ✅ System initialized (Orientation-Independent + Hysteresis)")},registerHand:function(t,s){this.hands[t]=s,console.log(`[GestureDetector] ✅ Registered ${t} hand`)},getGesture:function(t){return this.gestures[t]},tick:function(){this.frameCount++;const t=this.sceneEl.renderer;if(!t||!t.xr)return;const s=t.xr.getSession();if(!s)return;const n=t.xr.getFrame(),r=t.xr.getReferenceSpace();if(!(!n||!r)){this.hasSeenXR||(console.log("[GestureDetector] ✅ XR Session active!"),this.hasSeenXR=!0);for(const e of s.inputSources)e.hand&&this.processHand(e,n,r)}},processHand:function(t,s,n){const r=t.handedness,e=t.hand,o={},i=["wrist","thumb-tip","index-finger-tip","index-finger-phalanx-proximal","middle-finger-tip","middle-finger-phalanx-proximal","ring-finger-tip","ring-finger-phalanx-proximal","pinky-finger-tip","pinky-finger-phalanx-proximal"];for(const c of i){const d=e.get(c);if(!d)continue;const l=s.getJointPose(d,n);l&&(o[c]=new THREE.Vector3(l.transform.position.x,l.transform.position.y,l.transform.position.z))}if(!o.wrist)return;const h=this.classifyGesture(o,r);this.updateGesture(r,h)},isExtended:function(t,s){const n=t[`${s}-finger-tip`],r=t[`${s}-finger-phalanx-proximal`],e=t.wrist;if(!n||!r||!e)return null;const o=n.distanceTo(e),i=r.distanceTo(e);return o>i+.015},isPinching:function(t,s){const n=t["thumb-tip"],r=t["index-finger-tip"];if(!n||!r)return!1;const e=n.distanceTo(r);return this.frameCount%180===0&&console.log(`[Gesture] ${s} Pinch dist: ${(e*100).toFixed(1)}cm (State: ${this.state[s].pinching})`),this.state[s].pinching?e>.04&&(this.state[s].pinching=!1):e<.025&&(this.state[s].pinching=!0),this.state[s].pinching},classifyGesture:function(t,s){const n=this.isExtended(t,"index"),r=this.isExtended(t,"middle"),e=this.isExtended(t,"ring"),o=this.isExtended(t,"pinky");return n&&r&&e&&o?"open":!n&&!r&&!e&&!o?"fist":n&&!r&&!e&&!o?"point":"relaxed"},updateGesture:function(t,s){const n=this.gestureCounters[t];n[s]=(n[s]||0)+1;for(const o in n)o!==s&&(n[o]=0);if(n[s]<this.STABILITY_THRESHOLD||s===this.gestures[t])return;const r=this.gestures[t];this.gestures[t]=s;const e=this.hands[t];if(!e){console.warn(`[GestureDetector] ⚠️ No element registered for ${t} hand!`);return}console.log(`[GestureDetector] 📤 Emitting gesture-${s} on:`,e),e.emit("gesture-change",{hand:t,gesture:s,previous:r}),e.emit(`gesture-${s}`,{hand:t}),r!=="unknown"&&e.emit(`gesture-${r}-end`,{hand:t}),console.log(`[Gesture] 🎯 ${t}: ${r} → ${s}`)}});AFRAME.registerComponent("hand-gestures",{schema:{hand:{type:"string",default:"right"}},init:function(){console.log(`[HandGestures] Component init for ${this.data.hand}`),this.gestureSystem=null,this.registered=!1,this.tryRegister(),this.el.sceneEl.addEventListener("loaded",()=>this.tryRegister()),this.el.sceneEl.addEventListener("enter-vr",()=>{console.log(`[HandGestures] VR entered, re-registering ${this.data.hand}`),this.tryRegister()})},tryRegister:function(){this.registered||(this.gestureSystem=this.el.sceneEl.systems["gesture-detector"],this.gestureSystem&&(this.gestureSystem.registerHand(this.data.hand,this.el),this.registered=!0))},getGesture:function(){return this.gestureSystem?this.gestureSystem.getGesture(this.data.hand):"unknown"}});const M=`
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
`,I=`
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
`,F=`
    varying vec3 vColor;
void main() {
        // Soft circle with glow falloff
        float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

        // Soft edge for bloom effect
        float alpha = 1.0 - smoothstep(0.3, 0.5, dist);

    gl_FragColor = vec4(vColor * alpha, alpha);
}
`;AFRAME.registerComponent("gpu-particles",{schema:{count:{default:256}},init:function(){this.size=this.data.count,this.particleCount=this.size*this.size,console.log(`[GPU Particles]Init: ${this.particleCount} particles(Thick Shell)`),this.initComputeRenderer(),this.initParticles(),this.leftPinchStartTime=0,this.rightPinchStartTime=0,this.wasLeftPinching=!1,this.wasRightPinching=!1},initComputeRenderer:function(){const t=new Float32Array(this.particleCount*4),s=[{radius:2.5,weight:.25},{radius:4,weight:.5},{radius:5.5,weight:.25}],n=1.1,r=.3;for(let e=0;e<this.particleCount;e++){const o=e*4,i=Math.random();let h;i<s[0].weight?h=s[0]:i<s[0].weight+s[1].weight?h=s[1]:h=s[2];const c=Math.random()*Math.PI*2,d=Math.acos(2*Math.random()-1),l=h.radius+(Math.random()-.5)*r;t[o]=l*Math.sin(d)*Math.cos(c),t[o+1]=n+l*Math.sin(d)*Math.sin(c),t[o+2]=l*Math.cos(d),t[o+3]=1}this.posTexture1=new THREE.DataTexture(t,this.size,this.size,THREE.RGBAFormat,THREE.FloatType),this.posTexture1.minFilter=THREE.NearestFilter,this.posTexture1.magFilter=THREE.NearestFilter,this.posTexture1.generateMipmaps=!1,this.posTexture1.needsUpdate=!0,this.posTextureOriginal=new THREE.DataTexture(Float32Array.from(t),this.size,this.size,THREE.RGBAFormat,THREE.FloatType),this.posTextureOriginal.minFilter=THREE.NearestFilter,this.posTextureOriginal.magFilter=THREE.NearestFilter,this.posTextureOriginal.generateMipmaps=!1,this.posTextureOriginal.needsUpdate=!0,this.posTexture2=this.posTexture1.clone(),this.posTexture2.minFilter=THREE.NearestFilter,this.posTexture2.magFilter=THREE.NearestFilter,this.posTexture2.generateMipmaps=!1,this.posTexture2.needsUpdate=!0,this.simMaterial=new THREE.ShaderMaterial({uniforms:{positions:{value:this.posTexture1},positionsOriginal:{value:this.posTextureOriginal},time:{value:0},delta:{value:0},resolution:{value:new THREE.Vector2(this.size,this.size)},resetFactor:{value:0},audioLevel:{value:0},orbSize:{value:0},leftOrbSize:{value:0},dualPinch:{value:0},leftHandPos:{value:new THREE.Vector3},rightHandPos:{value:new THREE.Vector3},leftIndexPos:{value:new THREE.Vector3},rightIndexPos:{value:new THREE.Vector3},rightIndexDir:{value:new THREE.Vector3(0,0,-1)},leftHandState:{value:0},rightHandState:{value:0}},vertexShader:"void main() { gl_Position = vec4(position, 1.0); } ",fragmentShader:M}),this.fbo1=new THREE.WebGLRenderTarget(this.size,this.size,{depthBuffer:!1,stencilBuffer:!1,type:THREE.HalfFloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,format:THREE.RGBAFormat}),this.fbo2=this.fbo1.clone(),this.simCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1),this.simScene=new THREE.Scene,this.simMesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.simMaterial),this.simScene.add(this.simMesh),this.fillTextures()},fillTextures:function(){const t=this.el.sceneEl.renderer;this.simMaterial.uniforms.positions.value=this.posTexture1,this.simMaterial.uniforms.delta.value=0,this.simMaterial.uniforms.time.value=0;const s=t.getRenderTarget(),n=t.xr.enabled;t.xr.enabled=!1,t.setRenderTarget(this.fbo1),t.render(this.simScene,this.simCamera),t.setRenderTarget(this.fbo2),t.render(this.simScene,this.simCamera),t.xr.enabled=n,t.setRenderTarget(s)},initParticles:function(){const t=new THREE.BufferGeometry,s=new Float32Array(this.particleCount*3);for(let n=0;n<this.particleCount;n++){const r=n%this.size+.5,e=Math.floor(n/this.size)+.5;s[n*3]=r/this.size,s[n*3+1]=e/this.size,s[n*3+2]=0}t.setAttribute("position",new THREE.BufferAttribute(s,3)),this.renderMaterial=new THREE.ShaderMaterial({uniforms:{positionTexture:{value:this.posTexture1},audioBass:{value:0},audioMid:{value:0},audioHigh:{value:0}},vertexShader:I,fragmentShader:F,transparent:!0,depthWrite:!1,blending:THREE.AdditiveBlending}),this.points=new THREE.Points(t,this.renderMaterial),this.points.frustumCulled=!1,this.el.setObject3D("mesh",this.points)},reset:function(){console.log("[GPU Particles] Smooth Reset Triggered"),this.isResetting=!0,this.resetTime=0},tick:function(t,s){const n=s/1e3,r=this.el.sceneEl.renderer,e=this.el.sceneEl.systems["hand-distance"],o=this.el.sceneEl.systems["audio-analyzer"],i=this.simMaterial.uniforms;if(e){i.leftHandPos.value.copy(e.leftPos),i.rightHandPos.value.copy(e.rightPos),i.leftIndexPos.value.copy(e.leftIndexTip),i.rightIndexPos.value.copy(e.rightIndexTip),e.rightIndexDir&&i.rightIndexDir.value.copy(e.rightIndexDir),e.leftFist?i.leftHandState.value=3:e.isLeftPointing?i.leftHandState.value=2:e.leftPinching?i.leftHandState.value=4:e.leftPalmUp?i.leftHandState.value=1:i.leftHandState.value=0,e.rightFist?(i.rightHandState.value=3,i.orbSize.value*=.85):e.rightPinching?(i.rightHandState.value=2,i.orbSize.value=Math.min(i.orbSize.value+n*1.5,1)):e.isRightPointing?(i.rightHandState.value=1,i.orbSize.value*=.85):(i.rightHandState.value=0,i.orbSize.value*=.85);const a=t,m=500;e.leftPinching&&!this.wasLeftPinching&&(this.leftPinchStartTime=a),e.rightPinching&&!this.wasRightPinching&&(this.rightPinchStartTime=a),this.wasLeftPinching=e.leftPinching,this.wasRightPinching=e.rightPinching;const v=Math.abs(this.leftPinchStartTime-this.rightPinchStartTime)<m;e.leftPinching&&e.rightPinching&&v?(i.dualPinch.value=1,i.leftHandState.value=0,i.rightHandState.value=0,i.orbSize.value=Math.min(i.orbSize.value+n*1,.8),i.leftOrbSize.value=Math.min(i.leftOrbSize.value+n*1,.8)):(i.dualPinch.value=0,i.leftOrbSize.value*=.9)}if(this.isResetting?(this.resetTime+=n,i.resetFactor.value=Math.min(this.resetTime*2,1),this.resetTime>2&&(this.isResetting=!1)):i.resetFactor.value*=.95,o){const a=o.getBands();if(a&&typeof a.bass=="number"){const m=(a.bass+a.mid+a.high)/3;i.audioLevel.value=Math.min(Math.max(m,0),1)*.5,this.renderMaterial.uniforms.audioBass.value=a.bass,this.renderMaterial.uniforms.audioMid.value=a.mid,this.renderMaterial.uniforms.audioHigh.value=a.high}else i.audioLevel.value=0}else i.audioLevel.value=0;if(o&&o.isBeat&&(i.resetFactor.value=.1),Math.random()<.01){const a=o?o.getBands():null;console.log("[GPU Debug] Audio:","Bass:",a?a.bass.toFixed(2):"N/A","Mid:",a?a.mid.toFixed(2):"N/A","High:",a?a.high.toFixed(2):"N/A","Vol:",o?o.volume.toFixed(2):"N/A","Beat:",o?o.isBeat:!1)}const h=this.fbo1,c=this.fbo2;i.positions.value=h.texture,i.time.value=t/1e3,i.delta.value=n;const d=r.getRenderTarget(),l=r.xr.enabled;r.xr.enabled=!1,r.setRenderTarget(c),r.render(this.simScene,this.simCamera),r.setRenderTarget(d),r.xr.enabled=l,this.renderMaterial.uniforms.positionTexture.value=c.texture,this.fbo1=c,this.fbo2=h}});
