import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Content collections for thepreconmarket.ca.
 *
 * The schemas are deliberately strict about two fields:
 *
 *  - `shortAnswer` is REQUIRED on every FAQ and guide. It is the 40–60 word,
 *    self-contained, directly quotable answer rendered as the first prose on
 *    the page. This is the single biggest lever for being cited by AI search,
 *    so the schema enforces it rather than trusting the author to remember.
 *
 *  - `sources` is REQUIRED wherever content touches tax or contract rules.
 *    Every claim traces back to a CRA notice, a statute, or the Condominium
 *    Authority of Ontario. This is both an accuracy discipline and the thing
 *    that makes the page trustworthy enough to quote.
 */

const sourceSchema = z.object({
  label: z.string(),
  url: z.string().url(),
});

const FAQ_CATEGORIES = [
  'hst-rebates',
  'contracts-and-cooling-off',
  'deposits-and-financing',
  'closing-and-occupancy',
  'buying-process',
  'low-rise-specifics',
] as const;

const faq = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/faq' }),
  schema: z.object({
    /** The question, phrased exactly as a buyer would search it. */
    question: z.string(),
    /** Short page title for nav, breadcrumbs and cards. */
    title: z.string().optional(),
    /** 40–60 words. Self-contained. Rendered first. Quotable. */
    shortAnswer: z.string(),
    category: z.enum(FAQ_CATEGORIES),
    /** Meta description. Falls back to shortAnswer when absent. */
    description: z.string().optional(),
    sources: z.array(sourceSchema).default([]),
    /** Slugs of sibling FAQs — powers the hub-and-spoke internal linking. */
    related: z.array(z.string()).default([]),
    updated: z.coerce.date(),
    /** Sort weight within a category. Lower appears first. */
    order: z.number().default(100),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    /** The question or job the guide answers. Used as the H1 when present. */
    question: z.string().optional(),
    shortAnswer: z.string(),
    description: z.string().optional(),
    sources: z.array(sourceSchema).default([]),
    related: z.array(z.string()).default([]),
    relatedFaq: z.array(z.string()).default([]),
    updated: z.coerce.date(),
    order: z.number().default(100),
    /** Rough read time in minutes, shown in the title block. */
    readMinutes: z.number().optional(),
  }),
});

const cities = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/cities' }),
  schema: z.object({
    city: z.string(),
    region: z.string(),
    title: z.string().optional(),
    shortAnswer: z.string(),
    description: z.string().optional(),
    /** Neighbourhoods / communities to name for long-tail search. */
    communities: z.array(z.string()).default([]),
    /** Typical low-rise price band, for copy and schema. */
    priceFrom: z.number().optional(),
    priceTo: z.number().optional(),
    /** Project slugs located in this city. */
    projects: z.array(z.string()).default([]),
    relatedFaq: z.array(z.string()).default([]),
    updated: z.coerce.date(),
    order: z.number().default(100),
  }),
});

/**
 * Projects are snapshotted from Red Bricks at author time, never fetched at
 * runtime — the site is static and must not depend on an MCP server to build.
 *
 * Deliberately absent from this schema: Red Bricks "Pro" documents and Drive
 * folder links. Those are not cleared for public publication. Floor plans sit
 * behind the VIP form instead.
 */
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  // `image()` gives Astro the local asset so it can emit optimised, responsive
  // derivatives. Source images are self-hosted under src/assets/projects/ —
  // never hotlinked from a third-party CDN.
  schema: ({ image }) => z.object({
    name: z.string(),
    /** Red Bricks id, for traceability when refreshing the snapshot. */
    redBricksId: z.string().optional(),
    builder: z.array(z.string()).default([]),
    city: z.string(),
    /** Neighbourhood or community, when Red Bricks has one. */
    neighbourhood: z.string().optional(),
    intersection: z.string().optional(),
    /** Freehold low-rise: detached, semis and townhomes. */
    homeTypes: z.array(z.enum(['detached', 'semi', 'townhome', 'bungalow'])).min(1),
    ownership: z.string().default('Freehold'),
    salesStatus: z.string(),
    shortAnswer: z.string(),
    description: z.string().optional(),
    priceFrom: z.number().optional(),
    priceTo: z.number().optional(),
    sizeFrom: z.number().optional(),
    sizeTo: z.number().optional(),
    occupancy: z.string().optional(),
    launchDate: z.string().optional(),
    depositStructure: z.array(z.string()).default([]),
    incentives: z.array(z.string()).default([]),
    highlights: z.array(z.string()).default([]),
    /**
     * Two-tier coverage. `featured` gets a full page with original copy and
     * imagery — reserved for 2026 and upcoming launches we can actually
     * service. `catalogue` gets a compact listing for long-tail search.
     */
    tier: z.enum(['featured', 'catalogue']).default('catalogue'),
    /** Self-hosted only. Never hotlinked from a third-party CDN. */
    heroImage: image().optional(),
    heroAlt: z.string().optional(),
    gallery: z
      .array(z.object({ src: image(), alt: z.string() }))
      .default([]),
    /** Lot widths offered, in feet. Low-rise buyers shop on this. */
    lotWidths: z.array(z.number()).default([]),
    floorPlanCount: z.number().optional(),
    bedBreakdown: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    relatedFaq: z.array(z.string()).default([]),
    /**
     * Per-project Q&A, rendered on the page AND emitted as FAQPage schema.
     *
     * This is the highest-leverage field on a project page for AI search: when
     * someone asks an assistant "tell me about <project>", this is the block
     * that gets quoted. Answers must be self-contained and factual — a model
     * lifting one sentence should still be correct without the surrounding
     * page. Aim for six, covering ownership, deposit, occupancy, rebate
     * eligibility, builder and home types.
     */
    projectFaq: z
      .array(z.object({ q: z.string(), a: z.string() }))
      .default([]),
    updated: z.coerce.date(),
    order: z.number().default(100),
  }),
});

/**
 * Downloadable buyer tools — checklists and worksheets.
 *
 * Deliberately NOT gated. The content is public and indexable; the lead
 * capture offers a PDF copy by email instead. Hiding the content behind a
 * form would also hide it from search crawlers and AI assistants, which is
 * the opposite of what these pages are for.
 */
const resources = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/resources' }),
  schema: z.object({
    title: z.string(),
    question: z.string().optional(),
    shortAnswer: z.string(),
    description: z.string().optional(),
    /** What the emailed PDF is called, for the capture form. */
    downloadName: z.string(),
    /** Grouped checklist content. */
    sections: z
      .array(z.object({ heading: z.string(), items: z.array(z.string()) }))
      .default([]),
    sources: z.array(sourceSchema).default([]),
    relatedFaq: z.array(z.string()).default([]),
    updated: z.coerce.date(),
    order: z.number().default(100),
  }),
});

export const collections = { faq, guides, cities, projects, resources };

export { FAQ_CATEGORIES };

/** Display metadata for each FAQ category. Drives the hub page and nav. */
export const CATEGORY_META: Record<
  (typeof FAQ_CATEGORIES)[number],
  { label: string; blurb: string; order: number }
> = {
  'hst-rebates': {
    label: 'HST & GST rebates',
    blurb:
      'Who qualifies, how much, which programs stack, and the traps that cost buyers the whole rebate.',
    order: 1,
  },
  'contracts-and-cooling-off': {
    label: 'Contracts & cooling-off',
    blurb:
      'What you can still change after signing, what binds immediately, and why freehold is different from condo.',
    order: 2,
  },
  'deposits-and-financing': {
    label: 'Deposits & financing',
    blurb: 'Deposit schedules, what protects your money, and why pre-approval today proves little.',
    order: 3,
  },
  'closing-and-occupancy': {
    label: 'Closing & occupancy',
    blurb: 'Closing costs, adjustments, delays, and the bills that surprise low-rise buyers.',
    order: 4,
  },
  'buying-process': {
    label: 'Buying process',
    blurb: 'How pre-construction is actually sold, who pays whom, and where representation matters.',
    order: 5,
  },
  'low-rise-specifics': {
    label: 'Low-rise specifics',
    blurb: 'Lot premiums, upgrades, grading, Tarion coverage and the things only freehold buyers hit.',
    order: 6,
  },
};
