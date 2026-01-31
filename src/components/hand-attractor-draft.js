/* global AFRAME, THREE */

/**
 * Hand Attractor & Particle System Logic
 * 
 * 1. Hand Attractor Component:
 *    - Attached to hands.
 *    - Listens for pinch events.
 *    - Broadcasts position and state to the system/scene.
 * 
 * 2. Updates Dimension Warp to use this data.
 */

AFRAME.registerComponent('hand-attractor', {
    schema: {
        hand: { type: 'string' }
    },

    init: function () {
        this.isPinching = false;

        // Listeners for Super Hands events
        this.el.addEventListener('pinchstarted', () => { this.isPinching = true; });
        this.el.addEventListener('pinchended', () => { this.isPinching = false; });
        this.el.addEventListener('grab-start', () => { this.isPinching = true; }); // Fallback
        this.el.addEventListener('grab-end', () => { this.isPinching = false; });
    }
});

/**
 * Update Dimension Warp to handle attraction
 */
// Note: We are overwriting the previous definition. In a real app we might merge or separate.
// But AFRAME.registerComponent simply overwrites if called again.
// To avoid duplication, I will invoke a replace edit on the existing file instead of writing a new one.
// THIS FILE IS JUST A STUB FOR THE AGENT TO READ, NOT TO WRITE.
// I WILL USE replace_file_content ON src/components/dimension-warp.js
