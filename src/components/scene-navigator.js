/* global AFRAME */

/**
 * Scene Navigator Component
 * Navigates to a new URL when triggered.
 */
AFRAME.registerComponent('scene-navigator', {
    schema: {
        url: { type: 'string' }
    },

    init: function () {
        this.el.addEventListener('click', () => {
            if (this.data.url) {
                window.location.href = this.data.url;
            }
        });
    }
});
