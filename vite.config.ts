import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      proxy: {
        '/api/gistda-flood-tile': {
          target: 'https://api-gateway.gistda.or.th',
          changeOrigin: true,
          rewrite: (path: string) => {
            const query = new URL(path, 'http://localhost').searchParams;
            const z = query.get('z') || '0';
            const x = query.get('x') || '0';
            const y = query.get('y') || '0';
            const apiKey = encodeURIComponent(env.GISTDA_API_KEY || '');
            return `/api/2.0/resources/maps/flood/1day/tms/${z}/${x}/${y}?api_key=${apiKey}`;
          },
        },
      },
    },
  };
});
