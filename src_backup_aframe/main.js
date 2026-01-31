// Custom Logic Entry Point

import './components/force-grab.js';
import './components/invito-summon.js';
import './components/spell-caster.js';
import './components/scene-restarter.js';
import './components/palm-locomotion.js';
import './components/scene-navigator.js';
import './components/wrist-menu.js';
import './components/magic-wand.js';
import './components/hand-physics.js';
import './components/audio-analyzer.js';
import './components/dimension-warp.js';
import './components/hand-attractor.js';

console.log("VR Environment Loaded - Hybrid Mode with Grabbable Wand & Invito");

AFRAME.registerComponent('hello-world', {
    init: function () {
        console.log('Hello, World!');
    }
});
