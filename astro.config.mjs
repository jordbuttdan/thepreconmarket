// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://thepreconmarket.ca',
  output: 'static',
  trailingSlash: 'never',
  integrations: [
    react(),
    sitemap({
      // Content pages are the point of the site; keep utility pages out of
      // the sitemap so crawl budget goes to the indexable answers.
      filter: (page) => !['/privacy', '/thank-you'].some((p) => page.includes(p)),
      changefreq: 'weekly',
      lastmod: new Date(),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
