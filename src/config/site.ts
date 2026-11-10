/**
 * Site-wide brand, compliance and contact constants.
 *
 * RECO advertising rules require the brokerage name to appear on all
 * advertising, at least as prominent as the individual registrant's name.
 * Everything that appears in a footer, schema block or disclaimer comes from
 * here so the two can never drift apart.
 */

export const SITE = {
  name: 'The Precon Market',
  domain: 'thepreconmarket.ca',
  url: 'https://thepreconmarket.ca',
  tagline: 'Ontario pre-construction, low-rise only',
  description:
    'Independent buyer representation and project search for Ontario pre-construction detached homes, townhomes and semis. Plain-English answers on HST rebates, deposits, cooling-off periods and closing costs.',
} as const;

export const BROKER = {
  name: 'Jordan Buttarazzi',
  title: 'Broker',
  brokerage: 'Valery Real Estate Inc., Brokerage',
  reco: '5009855',
  phone: '(647) 371-1367',
  phoneHref: 'tel:+16473711367',
  email: 'jordan@razzrealestate.ca',
  areaServed: 'Greater Toronto Area, Ontario',
} as const;

/** The single compliance line. Brokerage is never less prominent than the name. */
export const FOOTER_LINE = `${BROKER.name}, ${BROKER.title} | ${BROKER.brokerage} | RECO #${BROKER.reco}`;

/**
 * Standing disclaimer. Appears beneath every rebate figure, every FAQ answer
 * that touches tax or contract law, and on /disclaimer in full.
 *
 * This matters: the site owner is a licensed broker, not a lawyer or an
 * accountant. The content explains published rules; it does not advise.
 */
export const DISCLAIMER_SHORT =
  'This is general information about published program rules, not tax, legal or accounting advice. Confirm your own situation with your lawyer and accountant before relying on any figure.';

export const DISCLAIMER_LONG = `The information on this site is general information about publicly published program rules and common pre-construction practice in Ontario. It is not tax, legal or accounting advice, and it is not a substitute for advice from your own professionals.

Rebate eligibility is determined by the Canada Revenue Agency and depends on your specific circumstances, the wording of your agreement of purchase and sale, and program deadlines that may change. Dollar amounts shown anywhere on this site are maximums for illustration only. Confirm your eligibility with your own lawyer and accountant before relying on any figure.

Jordan Buttarazzi is a licensed real estate Broker registered with the Real Estate Council of Ontario. He is not a lawyer, accountant or mortgage agent, and nothing on this site should be read as advice in those fields. Where a question turns on the law or on your tax position, you will be told to take it to the appropriate professional.

Not intended to solicit buyers or sellers currently under contract with another brokerage.`;

/** Primary nav. Order reflects the funnel, not the sitemap. */
export const NAV = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/new-homes', label: 'New homes' },
  { href: '/hst-rebate', label: 'HST rebate' },
  { href: '/guides', label: 'Guides' },
  { href: '/resources', label: 'Resources' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
] as const;
