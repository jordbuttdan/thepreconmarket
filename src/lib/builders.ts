/**
 * Builders, derived from the project collection.
 *
 * There is no separate builder data: a builder is whatever name appears on a
 * project. Everything on a builder page is therefore a statement of fact
 * about what that builder is currently selling, and nothing about reputation
 * or delivery record, which this site has no data for and no business
 * asserting.
 */
import type { CollectionEntry } from 'astro:content';
import { slugify } from './leadTags';

type Project = CollectionEntry<'projects'>;

export interface Builder {
  name: string;
  slug: string;
  projects: Project[];
  cities: string[];
  homeTypes: string[];
  priceFrom?: number;
  priceTo?: number;
}

export function builderSlug(name: string): string {
  return slugify(name);
}

export function builderIndex(projects: Project[]): Builder[] {
  const map = new Map<string, Builder>();
  for (const p of projects) {
    for (const name of p.data.builder) {
      const slug = builderSlug(name);
      const b = map.get(slug) ?? { name, slug, projects: [], cities: [], homeTypes: [] };
      b.projects.push(p);
      map.set(slug, b);
    }
  }
  for (const b of map.values()) {
    b.projects.sort((x, y) => x.data.city.localeCompare(y.data.city) || x.data.name.localeCompare(y.data.name));
    b.cities = [...new Set(b.projects.map((p) => p.data.city))].sort();
    b.homeTypes = [...new Set(b.projects.flatMap((p) => p.data.homeTypes))].sort();
    const lows = b.projects.map((p) => p.data.priceFrom).filter((n): n is number => n != null);
    const highs = b.projects.map((p) => p.data.priceTo ?? p.data.priceFrom).filter((n): n is number => n != null);
    if (lows.length) b.priceFrom = Math.min(...lows);
    if (highs.length) b.priceTo = Math.max(...highs);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Builders with their own page: two or more tracked communities. */
export const hasBuilderPage = (b: Builder) => b.projects.length >= 2;
