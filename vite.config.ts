import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react()],
    server: {
      proxy: {
        // 把 /api 代理到本地 server.js,便于 dev 时同时启用图标代理与登录接口
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
          // 后端不可用时不要把 vite 整个挂掉
          configure: (proxy) => {
            proxy.on('error', () => { /* swallow */ });
          }
        }
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
              return 'react-vendor';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'icon-vendor';
            }
            return undefined;
          }
        }
      }
    }
  };
});
