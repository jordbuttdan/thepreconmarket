import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE } from '../config/site';

/**
 * Site feed.
 *
 * Base.astro advertises `/rss.xml` on every page, so this has to exist or
 * every page carries a dead alternate link. Guides, FAQ answers and project
 * pages all go in, newest first, because the thing a reader or an aggregator
 * wants to follow here is "what changed", and on this site that is as often a
 * project release or a rebate answer as it is a new guide.
 */
export async function GET(context: APIContext) {
  const [guides, faq, projects] = await Promise.all([
    getCollection('guides'),
    getCollection('faq'),
    getCollection('projects'),
  ]);

  const items = [
    ...guides.map((e) => ({
      title: e.data.title,
      description: e.data.shortAnswer,
      link: `/guides/${e.id}`,
      pubDate: e.data.updated,
      categories: ['Guides'],
    })),
    ...faq.map((e) => ({
      title: e.data.question,
      description: e.data.shortAnswer,
      link: `/faq/${e.id}`,
      pubDate: e.data.updated,
      categories: ['FAQ'],
    })),
    ...projects
      .filter((e) => e.data.tier === 'featured')
      .map((e) => ({
        title: `${e.data.name}, ${e.data.city}`,
        description: e.data.shortAnswer,
        link: `/projects/${e.id}`,
        pubDate: e.data.updated,
        categories: ['Projects', e.data.city],
      })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: SITE.name,
    description:
      'New freehold low-rise in Ontario: detached homes, townhomes and semis, plus plain-English answers on the HST rebates, deposits and pre-construction agreements.',
    site: context.site ?? SITE.url,
    items,
    customData: '<language>en-ca</language>',
  });
}
