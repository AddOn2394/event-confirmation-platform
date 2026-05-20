import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  outDir: 'dist',
  // Bundlea todo excepto dependencias nativas de Node y paquetes pesados del runtime
  noExternal: ['@ecp/shared'],
  external: ['pg', 'express', 'jsonwebtoken', 'zod', 'resend'],
  splitting: false,
  clean: true,
  sourcemap: false,
});
