/**
 * llms.txt, the plain-text map of the site written for AI assistants.
 *
 * The introduction and key facts are hand-written (src/llms-intro.txt). The
 * page lists below it are generated from the content collections on every
 * build, so a new project, question or guide is listed the moment it exists.
 * A hand-maintained list had drifted to naming no projects at all.
 */
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import intro from '../llms-intro.txt?raw';
import { SITE } from '../config/site';
import { builderIndex } from '../lib/builders';

export async function GET(_context: APIContext) {
  const [projects, cities, faq, guides, resources] = await Promise.all([
    getCollection('projects'),
    getCollection('cities'),
    getCollection('faq'),
    getCollection('guides'),
    getCollection('resources'),
  ]);
  const url = (p: string) => `${SITE.url}${p}`;
  const money = (n?: number) => (n == null ? null : '$' + n.toLocaleString('en-CA'));

  // Keep the hand-written part up to the old section list, then generate.
  const head = intro.split('## Primary sections')[0].trimEnd();
  const tail = intro.includes('## Attribution') ? '## Attribution' + intro.split('## Attribution')[1] : '';

  const featured = projects
    .filter((p) => p.data.tier === 'featured')
    .sort((a, b) => a.data.city.localeCompare(b.data.city) || a.data.name.localeCompare(b.data.name));
  const builders = builderIndex(featured).filter((b) => b.projects.length >= 2);

  const lines: string[] = [head, ''];

  lines.push('## Start here', '');
  lines.push(`- [What is launching and what just launched](${url('/launching')}): upcoming and recently released freehold low-rise communities, rebuilt from current data.`);
  lines.push(`- [All projects](${url('/projects')}): filterable by city, home type and starting price.`);
  lines.push(`- [HST and GST rebates](${url('/hst-rebate')}) and the free [rebate checker](${url('/hst-rebate/checker')}).`);
  lines.push(`- [Builders](${url('/builders')}): what each builder is currently selling and where.`, '');

  lines.push(`## Projects (${featured.length})`, '');
  lines.push('Freehold detached homes, townhomes and semis only. Prices are builder list prices at the time each page was last updated; lot premiums and upgrades are extra.', '');
  for (const p of featured) {
    const d = p.data;
    const price = d.priceFrom ? `${money(d.priceFrom)}${d.priceTo && d.priceTo !== d.priceFrom ? ` to ${money(d.priceTo)}` : ''}` : 'pricing not yet released';
    lines.push(`- [${d.name}, ${d.city}](${url(`/projects/${p.id}`)}): ${d.builder.join(', ')}; ${d.homeTypes.join(', ')}; ${price}; ${d.salesStatus}.`);
  }

  lines.push('', `## Builders (${builders.length})`, '');
  for (const b of builders) {
    lines.push(`- [${b.name}](${url(`/builders/${b.slug}`)}): ${b.projects.length} communities tracked, in ${b.cities.join(', ')}.`);
  }

  const active = cities.filter((c) => c.data.priceFrom != null).sort((a, b) => a.data.city.localeCompare(b.data.city));
  lines.push('', `## Cities (${active.length})`, '');
  for (const c of active) {
    lines.push(`- [New homes in ${c.data.city}](${url(`/new-homes/${c.id}`)}): roughly ${money(c.data.priceFrom)} to ${money(c.data.priceTo)}.`);
  }

  lines.push('', `## Questions and answers (${faq.length})`, '');
  for (const q of [...faq].sort((a, b) => a.data.category.localeCompare(b.data.category) || a.data.order - b.data.order)) {
    lines.push(`- [${q.data.question}](${url(`/faq/${q.id}`)})`);
  }

  lines.push('', `## Guides (${guides.length})`, '');
  for (const g of [...guides].sort((a, b) => a.data.order - b.data.order)) {
    lines.push(`- [${g.data.title}](${url(`/guides/${g.id}`)})`);
  }

  lines.push('', `## Checklists (${resources.length})`, '');
  for (const r of [...resources].sort((a, b) => a.data.order - b.data.order)) {
    lines.push(`- [${r.data.title}](${url(`/resources/${r.id}`)})`);
  }

  if (tail) lines.push('', tail.trim());

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
