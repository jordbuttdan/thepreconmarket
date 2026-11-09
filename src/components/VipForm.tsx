import { useEffect, useRef, useState } from 'react';

/**
 * VIP registration form.
 *
 * Posts straight to a GoHighLevel inbound webhook from the browser. That
 * keeps the build fully static with no server function and no API key
 * anywhere, at the cost of the webhook URL being visible in page source —
 * which is acceptable because an inbound webhook only accepts data.
 *
 * Spam defences, since there is no server to validate:
 *   1. A honeypot field hidden from humans but filled by naive bots.
 *   2. A submit-time trap — anything submitted under MIN_FILL_MS is a bot.
 * Both fail silently and report success, so a bot learns nothing.
 */

const MIN_FILL_MS = 2500;

export interface VipFormProps {
  webhookUrl: string;
  /** Project slug, when the form sits on a project page. */
  project?: string;
  /** City slug, when the form sits on a city page. */
  city?: string;
  /** Compact variant for sidebars. */
  compact?: boolean;
}

type Status = 'idle' | 'sending' | 'done' | 'error';

export default function VipForm({ webhookUrl, project, city, compact }: VipFormProps) {
  const [status, setStatus] = useState<Status>('idle');
  const mountedAt = useRef<number>(Date.now());
  const [sourcePage, setSourcePage] = useState('');

  useEffect(() => {
    mountedAt.current = Date.now();
    setSourcePage(window.location.pathname + window.location.search);
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending') return;

    const form = event.currentTarget;
    const data = new FormData(form);

    // Honeypot + time trap. Report success so a bot gets no signal.
    const trapped =
      String(data.get('company') ?? '').length > 0 ||
      Date.now() - mountedAt.current < MIN_FILL_MS;
    if (trapped) {
      setStatus('done');
      return;
    }

    setStatus('sending');

    const tags = ['vip-register'];
    if (project) tags.push(`project:${project}`);
    if (city) tags.push(`city:${city}`);

    const payload = {
      firstName: String(data.get('firstName') ?? '').trim(),
      lastName: String(data.get('lastName') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      phone: String(data.get('phone') ?? '').trim(),
      homeType: String(data.get('homeType') ?? ''),
      budget: String(data.get('budget') ?? ''),
      timeline: String(data.get('timeline') ?? ''),
      notes: String(data.get('notes') ?? '').trim(),
      project: project ?? '',
      city: city ?? '',
      sourcePage,
      source: 'thepreconmarket.ca',
      tags,
      submittedAt: new Date().toISOString(),
    };

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        // GHL inbound webhooks do not return CORS headers, so the response is
        // opaque. Fire-and-forget: a delivered POST is what matters.
        mode: 'no-cors',
        keepalive: true,
      });
      setStatus('done');
      form.reset();
    } catch {
      setStatus('error');
    }
  }

  if (!webhookUrl) {
    return (
      <div className="border border-dashed border-caution/60 bg-accent-tint/40 p-5">
        <p className="section-label">— Placeholder</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink/75">
          <strong className="font-semibold">GHL webhook not configured.</strong> Set{' '}
          <code className="font-mono text-[12px]">PUBLIC_GHL_VIP_WEBHOOK_URL</code> in your
          environment to activate this form. Layout and styling can be verified without it.
        </p>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="tick-corners border border-rule bg-accent-tint/60 p-5 sm:p-6">
        <p className="section-label">— Registered</p>
        <h3 className="mt-2 text-lg font-semibold">You're on the list.</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-ink/75">
          You'll hear from Jordan directly — usually the same day — with what's releasing, what the
          deposit structure looks like, and whether it's worth your time.
        </p>
        <a href="/book" className="btn mt-4 text-sm">
          Book a call now instead
        </a>
      </div>
    );
  }

  const field =
    'mt-1.5 block w-full min-h-12 border border-rule bg-paper-pure px-3 text-[15px] text-ink placeholder:text-ink/35 focus:border-honey focus:outline-none';
  const label = 'block text-[13px] font-medium text-ink/80';

  return (
    <form onSubmit={onSubmit} noValidate={false} className="space-y-4">
      <div className={compact ? 'space-y-4' : 'grid gap-4 sm:grid-cols-2'}>
        <div>
          <label className={label} htmlFor="vip-first">
            First name
          </label>
          <input
            className={field}
            id="vip-first"
            name="firstName"
            type="text"
            autoComplete="given-name"
            required
          />
        </div>
        <div>
          <label className={label} htmlFor="vip-last">
            Last name
          </label>
          <input
            className={field}
            id="vip-last"
            name="lastName"
            type="text"
            autoComplete="family-name"
            required
          />
        </div>
      </div>

      <div className={compact ? 'space-y-4' : 'grid gap-4 sm:grid-cols-2'}>
        <div>
          <label className={label} htmlFor="vip-email">
            Email
          </label>
          <input
            className={field}
            id="vip-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label className={label} htmlFor="vip-phone">
            Phone
          </label>
          <input
            className={field}
            id="vip-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
          />
        </div>
      </div>

      <div className={compact ? 'space-y-4' : 'grid gap-4 sm:grid-cols-3'}>
        <div>
          <label className={label} htmlFor="vip-type">
            Home type
          </label>
          <select className={field} id="vip-type" name="homeType" defaultValue="">
            <option value="">No preference</option>
            <option value="detached">Detached</option>
            <option value="semi">Semi-detached</option>
            <option value="townhome">Townhome</option>
            <option value="any-lowrise">Any low-rise</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="vip-budget">
            Budget
          </label>
          <select className={field} id="vip-budget" name="budget" defaultValue="">
            <option value="">Not sure yet</option>
            <option value="under-800k">Under $800k</option>
            <option value="800k-1m">$800k – $1M</option>
            <option value="1m-1.3m">$1M – $1.3M</option>
            <option value="1.3m-1.6m">$1.3M – $1.6M</option>
            <option value="over-1.6m">Over $1.6M</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="vip-timeline">
            Timeline
          </label>
          <select className={field} id="vip-timeline" name="timeline" defaultValue="">
            <option value="">Not sure yet</option>
            <option value="asap">Ready now</option>
            <option value="3-6-months">3–6 months</option>
            <option value="6-12-months">6–12 months</option>
            <option value="researching">Just researching</option>
          </select>
        </div>
      </div>

      {!compact && (
        <div>
          <label className={label} htmlFor="vip-notes">
            Anything specific? <span className="font-normal text-ink/50">(optional)</span>
          </label>
          <textarea
            className={`${field} min-h-[88px] py-2`}
            id="vip-notes"
            name="notes"
            rows={3}
            placeholder="Areas you're considering, lot preferences, questions about the HST rebate…"
          />
        </div>
      )}

      {/* Honeypot. Hidden from humans, not from naive bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="vip-company">Company</label>
        <input id="vip-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <button type="submit" className="btn w-full text-sm" disabled={status === 'sending'}>
        {status === 'sending' ? 'Registering…' : 'Register for VIP access'}
      </button>

      {status === 'error' && (
        <p role="alert" className="text-[13px] text-caution">
          Something went wrong sending that. Please{' '}
          <a href="/book" className="underline underline-offset-2">
            book a call
          </a>{' '}
          or phone (647) 371-1367 instead.
        </p>
      )}

      <p className="text-[12px] leading-relaxed text-ink/55">
        No spam and no listing blasts. You'll hear from Jordan directly about low-rise releases that
        match what you asked for. Read the{' '}
        <a href="/privacy" className="text-accent underline underline-offset-2">
          privacy policy
        </a>
        .
      </p>
    </form>
  );
}
