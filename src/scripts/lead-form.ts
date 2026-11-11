/**
 * Behaviour for every <div data-lead-form> on the page. Loaded once however
 * many forms a page has.
 */
const MIN_FILL_MS = 2500;

async function post(url: string, payload: Record<string, unknown>) {
  // A normal cross-origin request, NOT mode: 'no-cors'. In no-cors mode the
  // browser silently downgrades Content-Type to text/plain, and GHL rejects a
  // text/plain body ("invalid data: Body payload") while still answering 200,
  // so every lead was dropped without any visible error. GHL's webhook does
  // send CORS headers, so the JSON request is allowed and the reply readable.
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  });
  const text = await res.text().catch(() => '');
  // GHL answers 200 even when it rejects the body, so read what it said.
  if (!res.ok || /"status"\s*:\s*"Error/i.test(text)) throw new Error('lead not accepted');
}

function track(event: string, params: Record<string, unknown>) {
  // No-op until analytics is installed; then every lead is a conversion event.
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  w.gtag?.('event', event, params);
}

for (const root of document.querySelectorAll<HTMLElement>('[data-lead-form]')) {
  const cfg = JSON.parse(root.dataset.config ?? '{}');
  const form = root.querySelector<HTMLFormElement>('form[data-step="contact"]');
  const done = root.querySelector<HTMLElement>('[data-step="done"]');
  const details = root.querySelector<HTMLFormElement>('form[data-step="details"]');
  if (!form || !done) continue;

  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const error = form.querySelector<HTMLElement>('[data-error]')!;
  const mountedAt = Date.now();
  let email = '';
  button.disabled = false;

  const base = () => ({
    project: cfg.project,
    projectName: cfg.projectName,
    city: cfg.city,
    resource: cfg.resource,
    topic: cfg.topic,
    sourcePage: location.pathname,
    source: 'thepreconmarket.ca',
    submittedAt: new Date().toISOString(),
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const show = () => {
      form.hidden = true;
      done.hidden = false;
    };
    // Honeypot and time trap. Report success so a bot gets no signal.
    if (String(data.get('company') ?? '') || Date.now() - mountedAt < MIN_FILL_MS) return show();

    const name = String(data.get('name') ?? '').trim();
    const [firstName, ...rest] = name.split(/\s+/);
    email = String(data.get('email') ?? '').trim();
    button.disabled = true;
    button.textContent = 'Sending…';
    try {
      await post(cfg.webhookUrl, {
        firstName: firstName ?? '',
        lastName: rest.join(' '),
        name,
        email,
        phone: String(data.get('phone') ?? '').trim(),
        ...base(),
        tags: cfg.tags,
      });
      track('generate_lead', { intent: cfg.tags[1], project: cfg.project, city: cfg.city, topic: cfg.topic });
      show();
    } catch {
      error.hidden = false;
      button.disabled = false;
      button.textContent = 'Try again';
    }
  });

  details?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(details);
    const btn = details.querySelector<HTMLButtonElement>('button')!;
    btn.disabled = true;
    const area = String(data.get('area') ?? '').trim();
    const homeType = String(data.get('homeType') ?? '');
    const budget = String(data.get('budget') ?? '');
    const timeline = String(data.get('timeline') ?? '');
    // The answers also travel as tags, so they land on the contact without
    // any custom fields having to exist in the CRM.
    const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '');
    const answerTags = [
      area && `area:${slug(area)}`,
      homeType && `type:${homeType}`,
      budget && `budget:${budget}`,
      timeline && `timeline:${timeline}`,
    ].filter(Boolean);
    try {
      await post(cfg.webhookUrl, {
        email,
        area,
        homeType,
        budget,
        timeline,
        ...base(),
        tags: ['site:thepreconmarket', 'lead-details', ...answerTags],
      });
    } catch {
      /* the lead itself is already in; nothing to surface */
    }
    btn.hidden = true;
    details.querySelector<HTMLElement>('[data-details-done]')!.hidden = false;
  });
}
