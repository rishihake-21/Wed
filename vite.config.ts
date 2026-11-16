import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Chunk splitting, compression and cache headers arrive in Phase 10.
export default defineConfig({
  plugins: [react()],
});
