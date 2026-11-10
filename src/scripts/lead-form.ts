/**
 * Behaviour for every <div data-lead-form> on the page. Loaded once however
 * many forms a page has.
 */
const MIN_FILL_MS = 2500;

function post(url: string, payload: Record<string, unknown>) {
  // GHL inbound webhooks return no CORS headers, so the response is opaque.
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    mode: 'no-cors',
    keepalive: true,
  });
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
      track('generate_lead', { intent: cfg.tags[0], project: cfg.project, city: cfg.city, topic: cfg.topic });
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
    try {
      await post(cfg.webhookUrl, {
        email,
        homeType: String(data.get('homeType') ?? ''),
        budget: String(data.get('budget') ?? ''),
        timeline: String(data.get('timeline') ?? ''),
        ...base(),
        tags: ['lead-details', ...cfg.tags.slice(1)],
      });
    } catch {
      /* the lead itself is already in; nothing to surface */
    }
    btn.hidden = true;
    details.querySelector<HTMLElement>('[data-details-done]')!.hidden = false;
  });
}
