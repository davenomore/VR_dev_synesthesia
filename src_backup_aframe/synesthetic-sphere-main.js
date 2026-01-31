// Synesthetic Pulse - Fluid Sphere Mode
// Audio-reactive fluid sphere experience for Quest 3

// Systems
import './systems/audio-analyzer.js';
import './systems/hand-distance.js';
import './systems/gesture-detector.js';

// Components
import './components/synesthetic-particles.js';
import './components/instanced-sphere.js';
import './components/challenge-background.js';
import './components/sphere-attractor.js';
import './components/audio-ui.js';

console.log('%c🔮 Instanced Sphere Mode (Strict Port)', 'font-size: 20px; color: #00ff88; font-weight: bold;');
console.log('%cAudio-Reactive Instanced Experience', 'font-size: 12px; color: #00d4ff;');
console.log('');
console.log('Controls:');
console.log('  • Upload an MP3/WAV file to start');
console.log('  • Touch the sphere to deform it');
console.log('  • Pinch to push/pull the fluid');
console.log('');
