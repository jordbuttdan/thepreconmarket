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
      // /results is rendered client-side from checker state — a crawler sees
      // an empty shell, so it must not be advertised in the sitemap.
      // The last seven are city pages with no projects yet; they are noindex
      // until they have one, so they stay out of the sitemap too.
      filter: (page) =>
        ![
          '/privacy', '/results', '/thank-you', '/404',
          '/new-homes/dundas', '/new-homes/elora', '/new-homes/essa', '/new-homes/fergus',
          '/new-homes/mono', '/new-homes/shelburne', '/new-homes/welland',
        ].some((p) => page.includes(p)),
      changefreq: 'weekly',
      lastmod: new Date(),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
