// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://debugsito.click',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});
