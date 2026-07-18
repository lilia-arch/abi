import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 4200,
    allowedHosts: [
      '.ngrok-free.dev' // El punto al inicio actúa como comodín para cualquier subdominio
    ]
  }
});