import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://KUMA-Ani.github.io',
  base: '/2026-KUMA-Ani',
  trailingSlash: 'always',
  build: {
    format: 'directory'
  }
});