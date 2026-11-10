/**
 * Slugs for the tags that travel with a lead into GoHighLevel.
 *
 * These exist so a registration can be routed and segmented without anyone
 * reading the source page by hand: which project, which builder, and what
 * stage that project is at when the lead came in. Stage matters most, a
 * "launching soon" registration needs a call before the release date, while
 * a "developer selling" registration needs current availability today.
 */

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type LeadStatus =
  | 'launching-soon'
  | 'platinum-access'
  | 'under-construction'
  | 'final-release'
  | 'selling';

/**
 * Collapses Red Bricks' free-text sales status into a small controlled
 * vocabulary. Order is deliberate: a status often carries two phrases
 * ("Under Construction / Developer Selling") and the earlier checks win,
 * because the more specific phrase is the one worth acting on.
 */
export function statusTag(salesStatus: string): LeadStatus {
  const s = salesStatus.toLowerCase();
  if (s.includes('launching soon') || s.includes('coming soon') || s.includes('registration')) {
    return 'launching-soon';
  }
  if (s.includes('final release') || s.includes('complete')) return 'final-release';
  if (s.includes('platinum')) return 'platinum-access';
  if (s.includes('under construction')) return 'under-construction';
  return 'selling';
}
