import { useMemo, useState } from 'react';
import type {
  CheckerAnswers,
  OccupancyIntent,
  OwnedBefore,
  PropertyType,
  PurchaseStage,
  RebateAssignment,
  SpouseOwned,
} from '../../lib/rebateRules';
import { encodeAnswers } from '../../lib/encodeAnswers';

/* ---------------------------------------------------------------------------
   The checker: one question per screen, progressive disclosure, mobile-first.
   Terminal states: resale exit (soft CTA, no email) or /results?d=…
--------------------------------------------------------------------------- */

type StepId =
  | 'stage'
  | 'signingDate'
  | 'propertyType'
  | 'resaleExit'
  | 'price'
  | 'occupancy'
  | 'ownedBefore'
  | 'spouseOwned'
  | 'assignment'
  | 'province';

interface Draft {
  stage?: PurchaseStage;
  signingDate?: string;
  propertyType?: PropertyType;
  price?: number;
  occupancy?: OccupancyIntent;
  ownedBefore?: OwnedBefore;
  spouseOwned?: SpouseOwned;
  rebateAssignment?: RebateAssignment;
  provinceCode: string;
}

const PROVINCES: [string, string][] = [
  ['ON', 'Ontario'],
  ['AB', 'Alberta'],
  ['BC', 'British Columbia'],
  ['MB', 'Manitoba'],
  ['NB', 'New Brunswick'],
  ['NL', 'Newfoundland and Labrador'],
  ['NS', 'Nova Scotia'],
  ['NT', 'Northwest Territories'],
  ['NU', 'Nunavut'],
  ['PE', 'Prince Edward Island'],
  ['QC', 'Quebec'],
  ['SK', 'Saskatchewan'],
  ['YT', 'Yukon'],
];

function nextStep(step: StepId, draft: Draft): StepId | 'done' {
  switch (step) {
    case 'stage':
      return draft.stage === 'signed' ? 'signingDate' : 'propertyType';
    case 'signingDate':
      return 'propertyType';
    case 'propertyType':
      return draft.propertyType === 'resale' ? 'resaleExit' : 'price';
    case 'price':
      return 'occupancy';
    case 'occupancy':
      return 'ownedBefore';
    case 'ownedBefore':
      return draft.ownedBefore === 'no' ? 'spouseOwned' : 'assignment';
    case 'spouseOwned':
      return 'assignment';
    case 'assignment':
      return 'province';
    case 'province':
      return 'done';
    default:
      return 'done';
  }
}

/** Total screens on the longest path, for the progress bar. */
const MAX_STEPS = 9;

function stepNumber(history: StepId[]): number {
  return history.length;
}

interface OptionProps {
  label: string;
  sublabel?: string;
  onSelect: () => void;
}

function Option({ label, sublabel, onSelect }: OptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full min-h-12 items-center gap-3 border border-rule bg-paper-pure px-4 py-3 text-left text-[15px] leading-snug text-ink transition-colors hover:border-accent hover:bg-accent-tint focus-visible:border-accent"
    >
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {sublabel && <span className="mt-0.5 block text-sm text-ink/60">{sublabel}</span>}
      </span>
      <span
        aria-hidden="true"
        className="figure shrink-0 text-rule-dark opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        →
      </span>
    </button>
  );
}

function Progress({ current }: { current: number }) {
  return (
    <div aria-hidden="true" className="mb-6 flex items-center gap-3">
      <span className="figure text-xs text-rule-dark">
        {String(Math.min(current, MAX_STEPS)).padStart(2, '0')} / {String(MAX_STEPS).padStart(2, '0')}
      </span>
      <div className="flex flex-1 gap-1">
        {Array.from({ length: MAX_STEPS }, (_, i) => (
          <span
            key={i}
            className={`h-px flex-1 ${i < current ? 'bg-accent' : 'bg-rule'}`}
            style={{ height: i < current ? 2 : 1 }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Checker() {
  const [draft, setDraft] = useState<Draft>({ provinceCode: 'ON' });
  const [history, setHistory] = useState<StepId[]>(['stage']);
  const [priceText, setPriceText] = useState('');
  const [dateText, setDateText] = useState('');

  const step = history[history.length - 1];

  const todayISO = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  function advance(patch: Partial<Draft>) {
    const merged = { ...draft, ...patch };
    setDraft(merged);
    const next = nextStep(step, merged);
    if (next === 'done') {
      finish(merged);
    } else {
      setHistory((h) => [...h, next]);
    }
  }

  function back() {
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  }

  function finish(merged: Draft) {
    const answers: CheckerAnswers = {
      stage: merged.stage!,
      signingDate: merged.signingDate,
      propertyType: merged.propertyType!,
      price: merged.price ?? 0,
      occupancy: merged.occupancy!,
      ownedBefore: merged.ownedBefore!,
      spouseOwned: merged.spouseOwned,
      rebateAssignment: merged.rebateAssignment!,
      province: merged.provinceCode === 'ON' ? 'ON' : 'other',
    };
    const d = encodeAnswers({ v: 1, answers, provinceCode: merged.provinceCode });
    window.location.href = `/results?d=${d}`;
  }

  function handlePriceInput(raw: string) {
    // Format with thousands separators as they type.
    const digits = raw.replace(/[^\d]/g, '').slice(0, 8);
    setPriceText(digits ? Number(digits).toLocaleString('en-CA') : '');
  }

  const priceValue = Number(priceText.replace(/[^\d]/g, ''));

  return (
    <div className="card tick-corners p-5 sm:p-8">
      <Progress current={stepNumber(history)} />

      {/* Fixed min-height prevents layout shift between questions. */}
      <div className="min-h-[340px]">
        {step === 'stage' && (
          <fieldset>
            <legend className="text-lg font-semibold">Where are you in the process?</legend>
            <div className="mt-4 space-y-2">
              <Option label="I've already signed an agreement" onSelect={() => advance({ stage: 'signed' })} />
              <Option label="I'm about to sign / actively shopping" onSelect={() => advance({ stage: 'shopping' })} />
              <Option label="Just researching" onSelect={() => advance({ stage: 'researching' })} />
            </div>
          </fieldset>
        )}

        {step === 'signingDate' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (dateText) advance({ signingDate: dateText });
            }}
          >
            <label htmlFor="signing-date" className="text-lg font-semibold">
              When did you sign?
            </label>
            <p className="mt-1 text-sm text-ink/60">
              The signing date determines which rebate windows apply — and whether a rescission period is still open.
            </p>
            <input
              id="signing-date"
              type="date"
              required
              max={todayISO}
              value={dateText}
              onChange={(e) => setDateText(e.target.value)}
              className="figure mt-4 block w-full min-h-12 border border-rule bg-paper-pure px-4 text-base"
            />
            <button
              type="submit"
              disabled={!dateText}
              className="mt-4 inline-flex min-h-12 items-center border border-accent bg-accent px-6 font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
          </form>
        )}

        {step === 'propertyType' && (
          <fieldset>
            <legend className="text-lg font-semibold">What are you buying?</legend>
            <div className="mt-4 space-y-2">
              <Option label="Newly built condo (pre-construction)" onSelect={() => advance({ propertyType: 'condo' })} />
              <Option
                label="Newly built freehold house or townhome"
                onSelect={() => advance({ propertyType: 'freehold' })}
              />
              <Option
                label="Newly built freehold with a POTL / common elements condo interest"
                onSelect={() => advance({ propertyType: 'freehold-potl' })}
              />
              <Option label="Resale home" onSelect={() => advance({ propertyType: 'resale' })} />
            </div>
          </fieldset>
        )}

        {step === 'resaleExit' && (
          <div>
            <p className="section-label">— Result</p>
            <h2 className="mt-3 text-lg font-semibold">These rebates don't apply to resale homes.</h2>
            <p className="mt-3 text-[15px] text-ink/80">
              The GST/HST new housing rebates apply to newly built or substantially renovated homes only. A resale
              purchase doesn't qualify — no rebate paperwork, nothing to claim.
            </p>
            <p className="mt-3 text-[15px] text-ink/80">
              If you're weighing resale against pre-construction, that trade-off is worth a conversation.
            </p>
            <a
              href="/book?source=checker-resale"
              className="mt-5 inline-flex min-h-12 items-center border border-accent px-6 font-medium text-accent hover:bg-accent-tint"
            >
              Book a call
            </a>
          </div>
        )}

        {step === 'price' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (priceValue > 0) advance({ price: priceValue });
            }}
          >
            <label htmlFor="price" className="text-lg font-semibold">
              What's the purchase price?
            </label>
            <div className="relative mt-4">
              <span aria-hidden="true" className="figure absolute left-4 top-1/2 -translate-y-1/2 text-ink/50">
                $
              </span>
              <input
                id="price"
                inputMode="numeric"
                autoComplete="off"
                placeholder="850,000"
                value={priceText}
                onChange={(e) => handlePriceInput(e.target.value)}
                className="figure block w-full min-h-12 border border-rule bg-paper-pure pl-8 pr-4 text-base"
              />
            </div>
            <p className="mt-2 text-sm text-ink/60">
              Enter the price before tax if you know it. If your builder advertises a price "net of HST rebate", enter
              that number and we'll flag the difference.
            </p>
            <button
              type="submit"
              disabled={priceValue <= 0}
              className="mt-4 inline-flex min-h-12 items-center border border-accent bg-accent px-6 font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
          </form>
        )}

        {step === 'occupancy' && (
          <fieldset>
            <legend className="text-lg font-semibold">Will you live in the home?</legend>
            <div className="mt-4 space-y-2">
              <Option
                label="Yes — it'll be my primary residence"
                sublabel="Or an immediate family member's"
                onSelect={() => advance({ occupancy: 'primary' })}
              />
              <Option label="No — I plan to rent it out" onSelect={() => advance({ occupancy: 'rental' })} />
              <Option label="Not sure yet" onSelect={() => advance({ occupancy: 'not-sure' })} />
            </div>
          </fieldset>
        )}

        {step === 'ownedBefore' && (
          <fieldset>
            <legend className="text-lg font-semibold">Have you owned a home before?</legend>
            <div className="mt-4 space-y-2">
              <Option label="No, this is my first home purchase" onSelect={() => advance({ ownedBefore: 'no' })} />
              <Option label="Yes, I currently own or have owned" onSelect={() => advance({ ownedBefore: 'yes' })} />
              <Option
                label="Not sure how this applies to me"
                onSelect={() => advance({ ownedBefore: 'not-sure' })}
              />
            </div>
          </fieldset>
        )}

        {step === 'spouseOwned' && (
          <fieldset>
            <legend className="text-lg font-semibold">
              Has your spouse or common-law partner owned a home in the last five years?
            </legend>
            <div className="mt-4 space-y-2">
              <Option label="No" onSelect={() => advance({ spouseOwned: 'no' })} />
              <Option label="Yes — and I lived in it" onSelect={() => advance({ spouseOwned: 'yes-lived-in' })} />
              <Option label="Yes — but I never lived in it" onSelect={() => advance({ spouseOwned: 'yes-not-lived-in' })} />
              <Option label="I don't have a spouse or partner" onSelect={() => advance({ spouseOwned: 'no-partner' })} />
            </div>
          </fieldset>
        )}

        {step === 'assignment' && (
          <fieldset>
            <legend className="text-lg font-semibold">Does your agreement assign the rebate to the builder?</legend>
            <p className="mt-2 text-sm text-ink/60">
              Most builder agreements state the price is "inclusive of HST" and require you to assign the rebate to the
              builder at closing. If you're not sure, that's the most common answer — and worth checking before you
              close.
            </p>
            <div className="mt-4 space-y-2">
              <Option label="Yes" onSelect={() => advance({ rebateAssignment: 'yes' })} />
              <Option label="No" onSelect={() => advance({ rebateAssignment: 'no' })} />
              <Option label="Not sure" onSelect={() => advance({ rebateAssignment: 'not-sure' })} />
            </div>
          </fieldset>
        )}

        {step === 'province' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              advance({});
            }}
          >
            <label htmlFor="province" className="text-lg font-semibold">
              Which province is the home in?
            </label>
            <select
              id="province"
              value={draft.provinceCode}
              onChange={(e) => setDraft({ ...draft, provinceCode: e.target.value })}
              className="mt-4 block w-full min-h-12 border border-rule bg-paper-pure px-4 text-base"
            >
              {PROVINCES.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            {draft.provinceCode !== 'ON' && (
              <p className="mt-2 border-l-2 border-caution pl-3 text-sm text-caution">
                Outside Ontario, the provincial portion differs — only the federal rebate is modelled here.
              </p>
            )}
            <button
              type="submit"
              className="mt-4 inline-flex min-h-12 items-center border border-accent bg-accent px-6 font-medium text-white hover:bg-accent/90"
            >
              See my estimate
            </button>
          </form>
        )}
      </div>

      {/* Control bar: keeps the card's base line steady whatever the step. */}
      <div className="mt-6 flex items-center justify-between gap-4 border-t border-rule pt-3">
        {history.length > 1 && step !== 'resaleExit' ? (
          <button
            type="button"
            onClick={back}
            className="inline-flex min-h-12 items-center text-sm text-ink/60 hover:text-accent"
          >
            ← Back
          </button>
        ) : (
          <span className="font-mono text-[11px] tracking-[0.06em] text-rule-dark uppercase">
            Approx. 2 minutes
          </span>
        )}
        <span className="font-mono text-[11px] tracking-[0.06em] text-rule-dark uppercase">
          No email required
        </span>
      </div>
    </div>
  );
}
