import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';
import tailwindcss from 'tailwindcss';
import suidPlugin from "@suid/vite-plugin";
import path from 'path';

export default defineConfig({
  plugins: [
    solidPlugin(),
    suidPlugin(),
    monacoEditorPlugin({})
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@context': path.resolve(__dirname, 'src/context'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    },
  },
  optimizeDeps: {
    include: [
      'monaco-editor/esm/vs/editor/editor.api',
    ]
  },
  css: {
    postcss:{
      plugins:[tailwindcss]
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
  },
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'https://malamute-noble-miserably.ngrok-free.app',
        ws: true,
        changeOrigin: true,
      }
    }
  }
});
