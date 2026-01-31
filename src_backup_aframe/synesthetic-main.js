// Synesthetic Pulse - Main Entry Point
// Audio-reactive particle experience for Quest 3

// Systems (must load before components)
import './systems/audio-analyzer.js';
import './systems/post-processing.js';
import './systems/hand-distance.js';
import './systems/gesture-detector.js';

// Components
import './components/synesthetic-particles.js';
import './components/hand-attractor.js';
import './components/audio-ui.js';
// VR menu temporarily disabled

console.log('%c🎵 The Synesthetic Pulse', 'font-size: 20px; color: #667eea; font-weight: bold;');
console.log('%cAudio-Reactive Particle Experience', 'font-size: 12px; color: #00ff88;');
console.log('');
console.log('Controls:');
console.log('  • Upload an MP3/WAV file to start');
console.log('  • Move your hands to attract particles');
console.log('  • Pinch to activate "Tidal Force" (suck & explode)');
console.log('');
