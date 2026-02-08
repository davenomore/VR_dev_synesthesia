import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [basicSsl(), react()],
    base: '/VR_dev_synesthesia/',
    server: {
        host: true, // Listen on all local IPs
        port: 3000, // Fixed port
        https: true, // Enable HTTPS
        open: false // Don't open browser automatically on server start
    },
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                sphere: 'react-sphere.html',
                particles: 'synesthetic-particles.html',
                warp: 'dimension-warp.html'
            }
        }
    }
});
