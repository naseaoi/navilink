import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the webdavService
      'process.env.WEBDAV_URL': JSON.stringify(env.WEBDAV_URL),
      'process.env.WEBDAV_USERNAME': JSON.stringify(env.WEBDAV_USERNAME),
      'process.env.WEBDAV_PASSWORD': JSON.stringify(env.WEBDAV_PASSWORD),
      'process.env.WEBDAV_PATH': JSON.stringify(env.WEBDAV_PATH),
    }
  };
});