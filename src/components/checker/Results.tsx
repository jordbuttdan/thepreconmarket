import { longDate } from '../../lib/dates';
import { useEffect, useMemo, useState } from 'react';
import {
  assessRebates,
  formatCAD,
  LAST_UPDATED,
  type RebateResult,
  type RiskFlag,
} from '../../lib/rebateRules';
import { decodeAnswers, type EncodedState } from '../../lib/encodeAnswers';
import { GHL } from '../../config/ghl';

/* ---------------------------------------------------------------------------
   /results, free verdict immediately, full breakdown behind the GHL gate.
--------------------------------------------------------------------------- */

const FLAG_COPY: Record<RiskFlag, string> = {
  'spousal-trap':
    "Your spouse or partner owned a home you lived in within the last five years. Even though only one spouse needs to be a first-time buyer, living in a spouse-owned home disqualifies you from first-time-buyer status. This is the single most common surprise, worth confirming with your lawyer.",
  'ftb-status-unknown':
    "Your first-time-buyer status isn't clear from your answers. The test looks at homes you or your spouse owned and lived in over the current and four preceding calendar years, anywhere in the world. The estimate shown uses the standard (lower) rebates to be safe.",
  'occupancy-unsure':
    "You haven't decided whether you'll live in the home. Owner-occupied and rental purchases follow completely different rebate paths with different cash-to-close consequences, this decision changes your closing costs.",
  'assignment-to-builder':
    'Your agreement assigns the rebate to the builder, which is typical: the advertised price already nets out the rebate. CRA is explicit that the buyer is responsible for confirming their own eligibility, if the builder credits you a rebate you were not entitled to, you are liable to repay that amount to CRA (and the builder can be on the hook alongside you). A credited rebate is not a settled rebate.',
  'assignment-unknown':
    "You're not sure whether your agreement assigns the rebate to the builder. Most do. This clause determines who receives the money and what happens if eligibility fails, have it read before closing.",
  'outside-fthb-window':
    "Your signing date falls outside the federal first-time-buyer rebate window (agreements signed on or after March 20, 2025 and before January 1, 2031).",
  'outside-on-enhanced-window':
    'Your signing date falls outside the Ontario ENHR window (April 1, 2026 – March 31, 2027), so the standard Ontario rebate (max $24,000) applies instead of the enhanced one (max $80,000). Note that for assignment purchases, CRA requires BOTH the original agreement and the assignment agreement to fall inside that window, and an older agreement amended or re-signed to land inside it is deemed to have been signed before it.',
  'enhr-phase-out':
    'Your price sits in the ENHR partial band between $1,500,000 and $1,850,000, where the provincial rebate tapers from $80,000 down toward $24,000. The exact figure in this band comes from the regulations rather than a published table, treat the number above as an approximation and have it confirmed.',
  'enhr-price-cap':
    'At $1,850,000 or above, the Ontario enhanced rebate no longer applies and only the standard Ontario rebate (up to $24,000) is available.',
  'onhap-not-modelled':
    "Above $1,500,000 the Ontario new home affordability payment (the 5% provincial top-up worth up to $50,000) may still be available to you, but the published guidance doesn't state the amount at your price point, so it isn't included in the figure above. This is worth asking about directly.",
  'ontario-fthb-not-modelled':
    'You may qualify as a first-time buyer under the Ontario first-time home buyers’ rebate for the 8% provincial portion, which is separate from the ENHR. Only the standard Ontario rebate is shown above, so your provincial relief could be higher than the figure quoted.',
  'price-phase-out':
    'Your price sits in the federal phase-out band between $1,000,000 and $1,500,000, every dollar of price above $1,000,000 reduces the federal rebate by ten cents. Small price changes move real money here.',
  'price-over-fthb-limit':
    'At $1,500,000 or above, the federal first-time-buyer rebate is eliminated entirely.',
  'non-ontario':
    'The home is outside Ontario, so only the federal rebate is modelled. Provincial programs differ by province.',
  'net-of-hst-pricing':
    "If your builder's price is advertised 'net of HST rebate', the sticker price already assumes the rebate goes to the builder.",
};

function BookCTA({ tag, children }: { tag: string; children: React.ReactNode }) {
  return (
    <a
      href={`/book?tag=${tag}&source=checker-results`}
      className="inline-flex min-h-12 items-center border border-accent bg-accent px-6 font-medium text-white hover:bg-accent/90"
    >
      {children}
    </a>
  );
}

function Disclaimer() {
  return (
    <div className="mt-8 border-t border-rule pt-4 text-xs leading-relaxed text-ink/60">
      <p>
        This tool provides a general estimate only and is not tax, legal, or accounting advice. Rebate eligibility is
        determined by the Canada Revenue Agency and depends on your specific circumstances, the wording of your
        agreement of purchase and sale, and program deadlines that may change. Amounts shown are maximums for
        illustration. Confirm your eligibility with your own lawyer and accountant before relying on any figure. Not
        intended to solicit buyers or sellers currently under contract with another brokerage.
      </p>
      <p className="mt-2 font-mono">
        Rebate rules current as of {longDate(LAST_UPDATED)}. Programs are time-limited and subject to change.
      </p>
    </div>
  );
}

/** Fire-and-forget webhook post. Never blocks or breaks the UI. */
function postToWebhook(state: EncodedState, result: RebateResult) {
  if (!GHL.checkerWebhookUrl) return;
  try {
    const a = state.answers;
    void fetch(GHL.checkerWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signedStatus: a.stage,
        signingDate: a.signingDate ?? null,
        propertyType: a.propertyType,
        price: a.price,
        occupancyIntent: a.occupancy,
        firstTimeBuyerStatus: a.ownedBefore,
        spousalOwnershipStatus: a.spouseOwned ?? null,
        province: state.provinceCode,
        rebateAssignmentStatus: a.rebateAssignment,
        federalEstimate: result.federalEstimate,
        provincialEstimate: result.provincialEstimate,
        onhapEstimate: result.onhapEstimate,
        combinedEstimate: result.combinedEstimate,
        riskFlags: result.flags,
        leadQuality: result.leadTag,
        submittedAt: new Date().toISOString(),
      }),
    }).catch(() => {});
  } catch {
    // Never let analytics/webhook failures affect the buyer.
  }
}

function Gate({ state, result, onUnlocked }: { state: EncodedState; result: RebateResult; onUnlocked: () => void }) {
  useEffect(() => {
    // GHL form embeds postMessage on submission. The exact event payload
    // varies by form builder version, after pasting the real embed, verify
    // the event in DevTools and adjust the match below if needed.
    function onMessage(e: MessageEvent) {
      const data = typeof e.data === 'string' ? e.data : JSON.stringify(e.data ?? '');
      if (/form.{0,40}submit/i.test(data)) {
        postToWebhook(state, result);
        onUnlocked();
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [state, result, onUnlocked]);

  return (
    <section aria-label="Get the full breakdown" className="card tick-corners mt-8 p-5 sm:p-8">
      <p className="section-label">02 / Full breakdown</p>
      <h2 className="mt-3 text-xl font-semibold">Want the line-by-line version?</h2>
      <p className="mt-2 text-[15px] text-ink/80">
        You already have your answer above, that part's free. Leave your details and you'll get the full breakdown:
        the arithmetic behind each program, your specific eligibility risks in plain English, what to bring to your
        lawyer, and a next-steps checklist, plus a PDF summary by email.
      </p>

      {GHL.leadFormEmbedUrl ? (
        <iframe
          src={GHL.leadFormEmbedUrl}
          title="Get your full rebate breakdown"
          className="mt-5 h-[420px] w-full border-0"
        />
      ) : (
        /* Placeholder so layout can be verified before GHL codes exist. */
        <div className="mt-5 flex h-[420px] w-full flex-col items-center justify-center gap-3 border border-dashed border-rule-dark bg-paper p-6 text-center">
          <p className="font-mono text-sm text-label">GHL form embed goes here</p>
          <p className="max-w-sm text-xs text-ink/50">
            Set PUBLIC_GHL_LEAD_FORM_URL in .env / Netlify. Fields: first name, last name, email, phone (optional).
          </p>
          <button
            type="button"
            onClick={() => {
              postToWebhook(state, result);
              onUnlocked();
            }}
            className="mt-2 border border-rule-dark px-4 py-2 font-mono text-xs text-ink/60 hover:border-accent hover:text-accent"
          >
            [dev] simulate submission
          </button>
        </div>
      )}
    </section>
  );
}

function Breakdown({ result }: { result: RebateResult }) {
  return (
    <section aria-label="Your full breakdown" className="card tick-corners mt-8 p-5 sm:p-8">
      <p className="section-label">02 / Full breakdown</p>

      <h2 className="mt-3 text-xl font-semibold">By program</h2>
      <table className="mt-4 w-full border-collapse text-[15px]">
        <thead>
          <tr className="border-b border-rule-dark text-left">
            <th scope="col" className="py-2 pr-4 font-medium">
              Program
            </th>
            <th scope="col" className="figure py-2 text-right font-medium">
              Up to
            </th>
          </tr>
        </thead>
        <tbody>
          {result.programs.map((p) => (
            <tr key={p.program} className="border-b border-rule align-top">
              <td className="py-3 pr-4">
                <span className="font-medium">{p.program}</span>
                <span className="mt-1 block text-sm text-ink/60">{p.note}</span>
              </td>
              <td className="figure py-3 text-right">{p.amount === null ? '—' : formatCAD(p.amount)}</td>
            </tr>
          ))}
          {result.kind === 'estimate' && (
            <tr>
              <td className="py-3 pr-4 font-semibold">Combined</td>
              <td className="figure py-3 text-right font-semibold">{formatCAD(result.combinedEstimate)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {result.flags.length > 0 && (
        <>
          <h2 className="mt-8 text-xl font-semibold">Your eligibility risks</h2>
          <ul className="mt-3 space-y-3">
            {result.flags.map((f) => (
              <li key={f} className="border-l-2 border-caution pl-4 text-[15px] text-ink/80">
                {FLAG_COPY[f]}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mt-8 text-xl font-semibold">What to bring to your lawyer</h2>
      <ul className="mt-3 list-inside space-y-2 text-[15px] text-ink/80">
        <li className="border-l-2 border-rule pl-4">Your full agreement of purchase and sale, every schedule included</li>
        <li className="border-l-2 border-rule pl-4">The builder's HST/rebate worksheet or statement of adjustments, if you have one</li>
        <li className="border-l-2 border-rule pl-4">Any clause referencing "inclusive of HST" or assignment of rebates</li>
        <li className="border-l-2 border-rule pl-4">Your (and your spouse's) home-ownership history for the last five calendar years</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">Next steps</h2>
      <ol className="mt-3 space-y-2 text-[15px] text-ink/80">
        <li className="border-l-2 border-rule pl-4">1. Confirm your first-time-buyer status against the five-year test, including your spouse's history.</li>
        <li className="border-l-2 border-rule pl-4">2. Have the rebate-assignment clause in your agreement identified and explained.</li>
        <li className="border-l-2 border-rule pl-4">3. Ask the builder for the rebate worksheet showing how HST was netted into your price.</li>
        <li className="border-l-2 border-rule pl-4">4. Confirm deadlines: rebate applications generally must be filed within two years of closing.</li>
        <li className="border-l-2 border-rule pl-4">5. Review the numbers with your accountant before relying on them.</li>
      </ol>

      <p className="mt-6 border-t border-rule pt-4 text-sm text-ink/60">
        A PDF copy of this breakdown is on its way to your email.
      </p>
    </section>
  );
}

export default function Results() {
  const [state, setState] = useState<EncodedState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('d');
    setState(param ? decodeAnswers(param) : null);
    setLoaded(true);
  }, []);

  const result = useMemo(() => (state ? assessRebates(state.answers) : null), [state]);

  if (!loaded) return <div className="min-h-[400px]" />;

  if (!state || !result) {
    return (
      <div className="card tick-corners p-8 text-center">
        <p className="text-lg font-semibold">No results to show yet.</p>
        <p className="mt-2 text-[15px] text-ink/70">Run the two-minute eligibility check first.</p>
        <a
          href="/"
          className="mt-5 inline-flex min-h-12 items-center border border-accent bg-accent px-6 font-medium text-white hover:bg-accent/90"
        >
          Start the checker
        </a>
      </div>
    );
  }

  const { answers } = state;
  const cooling = result.coolingOff;

  // Urgency line for the free result.
  let urgency: { text: string; tone: 'caution' | 'ink' } | null = null;
  if (answers.stage === 'signed' && cooling) {
    if (cooling.applies && cooling.withinWindow) {
      urgency = {
        text: `You signed ${cooling.daysElapsed} day${cooling.daysElapsed === 1 ? '' : 's'} ago, your 10-day rescission window closes on ${cooling.windowEndsOn}. (The clock officially starts when you've received the agreement, disclosure statement, and CAO Condo Buyers' Guide, it may end later than this, but treat this date as the deadline.)`,
        tone: 'caution',
      };
    } else if (!cooling.applies) {
      urgency = {
        text: 'Freehold agreements have no cooling-off period in Ontario. Your agreement is already binding.',
        tone: 'caution',
      };
    }
  }

  return (
    <div>
      {/* ------------------------- FREE RESULT ------------------------- */}
      <section aria-label="Your result" className="card tick-corners p-5 sm:p-8">
        <p className="section-label">01 / Your result</p>

        {result.kind === 'investor-nrrp' ? (
          <>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
              Rental purchase: the owner-occupied rebates won't apply to you.
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/80">
              As an investor you pay the full HST amount at closing, often tens of thousands more cash-to-close than
              the advertised price suggests, and then claim the New Residential Rental Property Rebate from CRA
              yourself afterward. Builders will not assign it. Getting the cash-to-close number right before closing
              is the whole game.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
              You may qualify for up to <span className="figure text-accent">{formatCAD(result.combinedEstimate)}</span>
            </h1>
            <p className="mt-3 text-[15px] text-ink/80">
              {result.programs
                .filter((p) => (p.amount ?? 0) > 0)
                .map((p) => p.program)
                .join(' + ') || 'Based on the standard federal and provincial programs'}
              {', estimate only, based on your answers.'}
            </p>
          </>
        )}

        {urgency && (
          <p
            className={`mt-4 border-l-2 pl-4 text-[15px] font-medium ${
              urgency.tone === 'caution' ? 'border-caution text-caution' : 'border-rule-dark text-ink'
            }`}
          >
            {urgency.text}
          </p>
        )}

        <Disclaimer />
      </section>

      {/* --------------------------- THE GATE -------------------------- */}
      {unlocked ? (
        <Breakdown result={result} />
      ) : (
        <Gate state={state} result={result} onUnlocked={() => setUnlocked(true)} />
      )}

      {/* ---------------------- ALWAYS: BOOKING CTA --------------------- */}
      <section className="mt-8 border-t border-rule pt-6">
        <p className="text-[15px] text-ink/80">
          {result.leadTag === 'hot-cooling-off'
            ? 'A tool can estimate. It cannot read your agreement before your window closes.'
            : result.leadTag === 'investor'
              ? 'Your cash-to-close number depends on your specific agreement. Get it reviewed before closing.'
              : 'A tool can estimate. Your agreement decides. Have it reviewed by someone who reads them daily.'}
        </p>
        <div className="mt-4">
          <BookCTA tag={result.leadTag}>Book a call with Jordan</BookCTA>
        </div>
      </section>
    </div>
  );
}
