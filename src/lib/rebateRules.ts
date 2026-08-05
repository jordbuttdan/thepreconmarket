/**
 * ============================================================================
 * REBATE RULES ENGINE — thepreconmarket.ca
 * ============================================================================
 *
 * All rebate logic lives here, isolated from the UI. Every threshold is a
 * named constant in the "EDITABLE CONSTANTS" section below so a non-developer
 * can update the rules by following the README ("Updating the rebate rules").
 *
 * PRINCIPLE: always underclaim. This engine outputs "up to $X" maximums for
 * illustration; eligibility is determined by CRA. Ambiguity routes to a call.
 */

// ============================================================================
// EDITABLE CONSTANTS — update these when program rules change, then update
// LAST_UPDATED. Dates are ISO format: 'YYYY-MM-DD'. Dollar amounts are plain
// numbers (underscores are just digit separators).
// ============================================================================

/** Shown next to the tool: "Rebate rules current as of ..." */
export const LAST_UPDATED = '2026-08-05';

/**
 * 1. Federal First-Time Home Buyers' GST Rebate (Bill C-4, law March 12 2026).
 *    Full 5% GST back on qualifying new homes, first-time buyers only.
 */
export const FTHB_GST = {
  /** Agreements signed on or after this date qualify (retroactive). */
  WINDOW_OPENS: '2025-03-20',
  /** Agreements must be signed BEFORE this date. */
  WINDOW_CLOSES_BEFORE: '2031-01-01',
  /** Maximum rebate: full 5% GST on a $1,000,000 home. */
  MAX_REBATE: 50_000,
  /** Full rebate up to this price. */
  FULL_REBATE_PRICE_LIMIT: 1_000_000,
  /** Linear phase-out between FULL_REBATE_PRICE_LIMIT and this price; zero at or above it. */
  PHASE_OUT_END: 1_500_000,
} as const;

/**
 * 2. Ontario Enhanced New Housing Rebate (ENHR).
 *    Source: CRA Notice 346 (June 2026) and canada.ca ENHR pages.
 *    NOT first-time-buyer restricted — it follows the eligibility conditions
 *    of the existing Ontario new housing rebate (individual buyer, primary
 *    place of residence for the buyer or a relation, first occupant).
 *    Tiers: full 8% up to $1M; flat $80,000 from $1M to $1.5M; partial rebate
 *    from $1.5M to $1.85M; at $1.85M+ only the standard rebate ($24,000).
 *    Anti-avoidance: assignment purchases need BOTH the original and the
 *    assignment agreement inside the window, and agreements re-dated into the
 *    window are deemed signed before it.
 */
export const ON_ENHR = {
  /** Agreements signed on or after this date qualify. */
  WINDOW_OPENS: '2026-04-01',
  /** Agreements signed on or before this date qualify. */
  WINDOW_CLOSES: '2027-03-31',
  /** Provincial portion of HST rebated. */
  RATE: 0.08,
  /** Maximum rebate. */
  MAX_REBATE: 80_000,
  /** Full 8% rebate up to this price. */
  FULL_REBATE_PRICE_LIMIT: 1_000_000,
  /** Flat $80,000 between FULL_REBATE_PRICE_LIMIT and this price. */
  FLAT_BAND_END: 1_500_000,
  /** Partial rebate between FLAT_BAND_END and this price; at or above it,
   *  only the standard Ontario rebate applies. */
  PHASE_OUT_END: 1_850_000,
} as const;

/**
 * 2b. Ontario new home affordability payment (ONHAP) — the "5% Ontario
 *     top-up". Province-administered payment of up to $50,000, equivalent to
 *     the 5% federal part of the HST, for buyers who receive the ENHR.
 *     Reduced by any federal GST rebate (FTHB or regular) the buyer claims.
 *     CONSERVATIVE MODEL: not modelled above MODELLED_PRICE_LIMIT, where the
 *     published guidance doesn't state the amount — those buyers see a flag
 *     instead of a number.
 */
export const ONHAP = {
  RATE: 0.05,
  MAX_PAYMENT: 50_000,
  MODELLED_PRICE_LIMIT: 1_500_000,
} as const;

/**
 * 3. Ontario Standard New Housing Rebate (long-standing).
 *    75% of the 8% provincial portion. NOT first-time-buyer restricted.
 */
export const ON_STANDARD = {
  RATE: 0.08,
  SHARE: 0.75,
  MAX_REBATE: 24_000,
} as const;

/**
 * 4. Regular Federal GST/HST New Housing Rebate.
 *    36% of the 5% federal portion; phases out from PHASE_OUT_START and is
 *    eliminated once the price reaches PHASE_OUT_END.
 */
export const FED_REGULAR = {
  GST_RATE: 0.05,
  SHARE: 0.36,
  MAX_REBATE: 6_300,
  PHASE_OUT_START: 350_000,
  PHASE_OUT_END: 450_000,
} as const;

/** Ontario condo statutory rescission ("cooling-off") period, in days. */
export const CONDO_COOLING_OFF_DAYS = 10;

/** FTHB application deadline, for copy: within this many years of closing. */
export const FTHB_APPLICATION_DEADLINE_YEARS = 2;

// ============================================================================
// TYPES
// ============================================================================

export type PurchaseStage = 'signed' | 'shopping' | 'researching';
export type PropertyType = 'condo' | 'freehold' | 'freehold-potl' | 'resale';
export type OccupancyIntent = 'primary' | 'rental' | 'not-sure';
export type OwnedBefore = 'no' | 'yes' | 'not-sure';
export type SpouseOwned = 'no' | 'yes-lived-in' | 'yes-not-lived-in' | 'no-partner';
export type RebateAssignment = 'yes' | 'no' | 'not-sure';
export type Province = 'ON' | 'other';

export interface CheckerAnswers {
  stage: PurchaseStage;
  /** ISO date, required when stage === 'signed'. */
  signingDate?: string;
  propertyType: PropertyType;
  /** Purchase price before tax, in dollars. */
  price: number;
  occupancy: OccupancyIntent;
  ownedBefore: OwnedBefore;
  /** Only asked when ownedBefore === 'no'. */
  spouseOwned?: SpouseOwned;
  rebateAssignment: RebateAssignment;
  province: Province;
}

export type LeadTag =
  | 'hot-cooling-off'
  | 'hot-freehold-signed'
  | 'warm-shopping'
  | 'needs-review'
  | 'investor'
  | 'likely-ineligible';

export type FirstTimeBuyerStatus = 'yes' | 'no' | 'unknown';

/** Machine-readable risk flags surfaced in the gated breakdown. */
export type RiskFlag =
  | 'spousal-trap' // spouse owned a home the buyer lived in — FTB status lost
  | 'ftb-status-unknown'
  | 'occupancy-unsure'
  | 'assignment-to-builder'
  | 'assignment-unknown'
  | 'outside-fthb-window'
  | 'outside-on-enhanced-window'
  | 'price-phase-out' // inside the federal FTHB $1M–$1.5M phase-out band
  | 'price-over-fthb-limit' // at or above $1.5M — federal FTHB is zero
  | 'enhr-phase-out' // inside the ENHR $1.5M–$1.85M partial band
  | 'enhr-price-cap' // at or above $1.85M — only the standard $24k applies
  | 'onhap-not-modelled' // ENHR-eligible above $1.5M — top-up rules unpublished
  | 'ontario-fthb-not-modelled' // FTB outside ENHR window may have more provincial relief
  | 'non-ontario'
  | 'net-of-hst-pricing';

export interface ProgramLine {
  program: string;
  /** "up to" amount in dollars; null when no estimate is offered (NRRP). */
  amount: number | null;
  note: string;
}

export interface CoolingOffInfo {
  /** True for condo / common-elements-condo (POTL) purchases. */
  applies: boolean;
  daysElapsed: number;
  /** ISO date the 10-day window closes, counted from signing. */
  windowEndsOn: string;
  withinWindow: boolean;
}

export interface RebateResult {
  kind: 'estimate' | 'investor-nrrp' | 'resale-exit';
  firstTimeBuyer: FirstTimeBuyerStatus;
  /** "Up to" figures, dollars, floored. Zero when not applicable. */
  federalEstimate: number;
  provincialEstimate: number;
  /** ONHAP / 5% Ontario top-up — separate from the provincial HST rebate. */
  onhapEstimate: number;
  combinedEstimate: number;
  programs: ProgramLine[];
  flags: RiskFlag[];
  leadTag: LeadTag;
  /** Present when stage === 'signed' with a valid date. */
  coolingOff?: CoolingOffInfo;
}

// ============================================================================
// DATE HELPERS (local-time safe — never parse ISO dates with `new Date(str)`)
// ============================================================================

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetween(fromISO: string, to: Date): number {
  const from = parseISODate(fromISO);
  const midnightTo = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((midnightTo.getTime() - from.getTime()) / 86_400_000);
}

function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function onOrAfter(iso: string, boundary: string): boolean {
  return parseISODate(iso).getTime() >= parseISODate(boundary).getTime();
}

function before(iso: string, boundary: string): boolean {
  return parseISODate(iso).getTime() < parseISODate(boundary).getTime();
}

// ============================================================================
// PROGRAM CALCULATIONS (pure, exported for tests)
// ============================================================================

/** Federal FTHB GST rebate for a given price. Assumes buyer + window qualify. */
export function fthbFederalAmount(price: number): number {
  if (price >= FTHB_GST.PHASE_OUT_END) return 0;
  if (price <= FTHB_GST.FULL_REBATE_PRICE_LIMIT) {
    return Math.floor(Math.min(price * 0.05, FTHB_GST.MAX_REBATE));
  }
  const band = FTHB_GST.PHASE_OUT_END - FTHB_GST.FULL_REBATE_PRICE_LIMIT;
  return Math.floor((FTHB_GST.MAX_REBATE * (FTHB_GST.PHASE_OUT_END - price)) / band);
}

/**
 * Ontario ENHR for a given price. Assumes window + occupancy qualify.
 * Returns 0 at PHASE_OUT_END and above — callers fall back to the standard
 * rebate there. The $1.5M–$1.85M partial band is interpolated linearly from
 * $80,000 down to the standard $24,000 (CRA publishes the tiers, not the
 * formula — the statutory version lives in the June 2026 amendments to the
 * New Harmonized Value-Added Tax System Regulations, No. 2).
 */
export function ontarioEnhancedAmount(price: number): number {
  if (price >= ON_ENHR.PHASE_OUT_END) return 0;
  if (price <= ON_ENHR.FULL_REBATE_PRICE_LIMIT) {
    return Math.floor(Math.min(price * ON_ENHR.RATE, ON_ENHR.MAX_REBATE));
  }
  if (price <= ON_ENHR.FLAT_BAND_END) return ON_ENHR.MAX_REBATE;
  const band = ON_ENHR.PHASE_OUT_END - ON_ENHR.FLAT_BAND_END;
  const drop = ON_ENHR.MAX_REBATE - ON_STANDARD.MAX_REBATE;
  return Math.floor(ON_ENHR.MAX_REBATE - (drop * (price - ON_ENHR.FLAT_BAND_END)) / band);
}

/**
 * ONHAP (5% Ontario top-up) for a buyer who receives the ENHR. Reduced by
 * whatever federal rebate is being claimed. Conservatively $0 above
 * MODELLED_PRICE_LIMIT — flagged instead of guessed.
 */
export function onhapAmount(price: number, federalRebate: number): number {
  if (price > ONHAP.MODELLED_PRICE_LIMIT) return 0;
  return Math.max(0, Math.floor(Math.min(price * ONHAP.RATE, ONHAP.MAX_PAYMENT) - federalRebate));
}

/** Ontario Standard New Housing Rebate — any owner-occupier. */
export function ontarioStandardAmount(price: number): number {
  return Math.floor(Math.min(price * ON_STANDARD.RATE * ON_STANDARD.SHARE, ON_STANDARD.MAX_REBATE));
}

/** Regular federal GST/HST new housing rebate, with the $350k–$450k phase-out. */
export function federalRegularAmount(price: number): number {
  if (price >= FED_REGULAR.PHASE_OUT_END) return 0;
  const base = Math.min(price * FED_REGULAR.GST_RATE * FED_REGULAR.SHARE, FED_REGULAR.MAX_REBATE);
  if (price <= FED_REGULAR.PHASE_OUT_START) return Math.floor(base);
  const band = FED_REGULAR.PHASE_OUT_END - FED_REGULAR.PHASE_OUT_START;
  return Math.floor((base * (FED_REGULAR.PHASE_OUT_END - price)) / band);
}

/** Whether a signing date falls in the federal FTHB window. */
export function inFthbWindow(signingISO: string): boolean {
  return onOrAfter(signingISO, FTHB_GST.WINDOW_OPENS) && before(signingISO, FTHB_GST.WINDOW_CLOSES_BEFORE);
}

/** Whether a signing date falls in the Ontario ENHR window (inclusive). */
export function inOntarioEnhancedWindow(signingISO: string): boolean {
  return (
    onOrAfter(signingISO, ON_ENHR.WINDOW_OPENS) &&
    !onOrAfter(signingISO, addDays(ON_ENHR.WINDOW_CLOSES, 1))
  );
}

// ============================================================================
// FIRST-TIME-BUYER TEST (including the spousal trap)
// ============================================================================

export function firstTimeBuyerStatus(answers: CheckerAnswers): {
  status: FirstTimeBuyerStatus;
  flags: RiskFlag[];
} {
  const flags: RiskFlag[] = [];
  if (answers.ownedBefore === 'yes') return { status: 'no', flags };
  if (answers.ownedBefore === 'not-sure') {
    flags.push('ftb-status-unknown');
    return { status: 'unknown', flags };
  }
  // Buyer has never owned. Only one spouse needs to be a first-time buyer —
  // BUT if the spouse owned a home the buyer lived in during the window, the
  // buyer is disqualified. That is the trap.
  switch (answers.spouseOwned) {
    case 'yes-lived-in':
      flags.push('spousal-trap');
      return { status: 'no', flags };
    case 'yes-not-lived-in':
    case 'no':
    case 'no-partner':
      return { status: 'yes', flags };
    default:
      flags.push('ftb-status-unknown');
      return { status: 'unknown', flags };
  }
}

// ============================================================================
// COOLING-OFF
// ============================================================================

export function coolingOffInfo(answers: CheckerAnswers, today: Date): CoolingOffInfo | undefined {
  if (answers.stage !== 'signed' || !answers.signingDate) return undefined;
  const applies = answers.propertyType === 'condo' || answers.propertyType === 'freehold-potl';
  const daysElapsed = daysBetween(answers.signingDate, today);
  const windowEndsOn = addDays(answers.signingDate, CONDO_COOLING_OFF_DAYS);
  return {
    applies,
    daysElapsed,
    windowEndsOn,
    withinWindow: applies && daysElapsed >= 0 && daysElapsed < CONDO_COOLING_OFF_DAYS,
  };
}

// ============================================================================
// LEAD QUALITY TAG — urgency outranks segment
// ============================================================================

export function computeLeadTag(answers: CheckerAnswers, ftb: FirstTimeBuyerStatus, cooling?: CoolingOffInfo): LeadTag {
  if (cooling?.withinWindow) return 'hot-cooling-off';
  if (
    answers.stage === 'signed' &&
    (answers.propertyType === 'freehold' || answers.propertyType === 'freehold-potl')
  ) {
    return 'hot-freehold-signed';
  }
  if (answers.occupancy === 'rental') return 'investor';
  if (answers.rebateAssignment === 'not-sure') return 'needs-review';
  if (answers.stage !== 'signed') return 'warm-shopping';
  if (ftb === 'no') return 'likely-ineligible';
  return 'needs-review';
}

// ============================================================================
// MAIN ASSESSMENT
// ============================================================================

export function assessRebates(answers: CheckerAnswers, today: Date = new Date()): RebateResult {
  const flags: RiskFlag[] = [];
  const programs: ProgramLine[] = [];
  const cooling = coolingOffInfo(answers, today);
  const { status: ftb, flags: ftbFlags } = firstTimeBuyerStatus(answers);
  flags.push(...ftbFlags);

  // --- Terminal path: resale. These rebates are for new builds only. -------
  if (answers.propertyType === 'resale') {
    return {
      kind: 'resale-exit',
      firstTimeBuyer: ftb,
      federalEstimate: 0,
      provincialEstimate: 0,
      onhapEstimate: 0,
      combinedEstimate: 0,
      programs: [],
      flags,
      leadTag: computeLeadTag(answers, ftb, cooling),
    };
  }

  if (answers.rebateAssignment === 'yes') flags.push('assignment-to-builder');
  if (answers.rebateAssignment === 'not-sure') flags.push('assignment-unknown');
  if (answers.occupancy === 'not-sure') flags.push('occupancy-unsure');
  if (answers.province !== 'ON') flags.push('non-ontario');

  // --- Terminal path: investor / rental → NRRP. No dollar estimate. --------
  if (answers.occupancy === 'rental') {
    programs.push({
      program: 'New Residential Rental Property Rebate (NRRP)',
      amount: null,
      note: 'Owner-occupied rebates do not apply to rental purchases. You pay the full HST amount at closing and claim the NRRP from CRA yourself afterward — builders will not assign it. Ontario has also introduced enhanced relief for new residential rental units; whether it applies to your purchase depends on your agreement and timing, and is worth confirming before closing.',
    });
    return {
      kind: 'investor-nrrp',
      firstTimeBuyer: ftb,
      federalEstimate: 0,
      provincialEstimate: 0,
      onhapEstimate: 0,
      combinedEstimate: 0,
      programs,
      flags,
      leadTag: computeLeadTag(answers, ftb, cooling),
      coolingOff: cooling,
    };
  }

  // --- Estimate path. Effective signing date: actual, or today if unsigned.
  const effectiveSigning = answers.stage === 'signed' && answers.signingDate ? answers.signingDate : toISODate(today);
  const price = answers.price;

  const fthbWindowOk = inFthbWindow(effectiveSigning);
  const enhancedWindowOk = inOntarioEnhancedWindow(effectiveSigning);
  if (!fthbWindowOk && ftb !== 'no') flags.push('outside-fthb-window');
  if (!enhancedWindowOk && answers.province === 'ON') flags.push('outside-on-enhanced-window');

  // Federal. Unknown FTB status underclaims: show the regular-rebate figure.
  let federal = 0;
  if (ftb === 'yes' && fthbWindowOk) {
    federal = fthbFederalAmount(price);
    if (price >= FTHB_GST.PHASE_OUT_END) {
      flags.push('price-over-fthb-limit');
      programs.push({
        program: "Federal First-Time Home Buyers' GST Rebate",
        amount: 0,
        note: `At or above $${FTHB_GST.PHASE_OUT_END.toLocaleString('en-CA')} the federal first-time buyer rebate is eliminated.`,
      });
    } else {
      if (price > FTHB_GST.FULL_REBATE_PRICE_LIMIT) flags.push('price-phase-out');
      programs.push({
        program: "Federal First-Time Home Buyers' GST Rebate",
        amount: federal,
        note:
          price > FTHB_GST.FULL_REBATE_PRICE_LIMIT
            ? `Phases out between $${FTHB_GST.FULL_REBATE_PRICE_LIMIT.toLocaleString('en-CA')} and $${FTHB_GST.PHASE_OUT_END.toLocaleString('en-CA')}.`
            : 'Full 5% federal GST on qualifying new homes.',
      });
    }
  } else {
    federal = federalRegularAmount(price);
    const note =
      federal === 0
        ? `The regular federal rebate is eliminated at $${FED_REGULAR.PHASE_OUT_END.toLocaleString('en-CA')}+ — at this price it is $0. That is normal at GTA price points.`
        : '36% of the federal GST portion, phasing out above $' + FED_REGULAR.PHASE_OUT_START.toLocaleString('en-CA') + '.';
    programs.push({ program: 'Regular Federal GST/HST New Housing Rebate', amount: federal, note });
  }

  // Provincial (Ontario only — other provinces differ; we model federal only).
  // The ENHR is NOT first-time-buyer restricted: any eligible owner-occupier
  // with an in-window agreement qualifies (CRA Notice 346).
  let provincial = 0;
  let onhap = 0;
  if (answers.province === 'ON') {
    const enhr = enhancedWindowOk ? ontarioEnhancedAmount(price) : 0;
    if (enhr > 0) {
      provincial = enhr;
      if (price > ON_ENHR.FLAT_BAND_END) flags.push('enhr-phase-out');
      programs.push({
        program: 'Ontario Enhanced New Housing Rebate (ENHR)',
        amount: provincial,
        note: `Up to $${ON_ENHR.MAX_REBATE.toLocaleString('en-CA')} of the 8% provincial HST on agreements signed ${ON_ENHR.WINDOW_OPENS} to ${ON_ENHR.WINDOW_CLOSES}. Not restricted to first-time buyers.`,
      });
      // The 5% Ontario top-up rides along with the ENHR.
      onhap = onhapAmount(price, federal);
      if (price > ONHAP.MODELLED_PRICE_LIMIT) {
        flags.push('onhap-not-modelled');
      } else if (onhap > 0) {
        programs.push({
          program: 'Ontario New Home Affordability Payment (5% top-up)',
          amount: onhap,
          note: 'Province-paid top-up equivalent to the 5% federal part of the HST for buyers who receive the ENHR, reduced by any federal rebate claimed. No separate application — claimed via consent on the rebate form.',
        });
      }
    } else {
      if (enhancedWindowOk) flags.push('enhr-price-cap');
      if (ftb === 'yes' && fthbWindowOk && !enhancedWindowOk) flags.push('ontario-fthb-not-modelled');
      provincial = ontarioStandardAmount(price);
      programs.push({
        program: 'Ontario Standard New Housing Rebate',
        amount: provincial,
        note: `75% of the 8% provincial portion, capped at $${ON_STANDARD.MAX_REBATE.toLocaleString('en-CA')}. Not restricted to first-time buyers.`,
      });
    }
  }

  return {
    kind: 'estimate',
    firstTimeBuyer: ftb,
    federalEstimate: federal,
    provincialEstimate: provincial,
    onhapEstimate: onhap,
    combinedEstimate: federal + provincial + onhap,
    programs,
    flags,
    leadTag: computeLeadTag(answers, ftb, cooling),
    coolingOff: cooling,
  };
}

// ============================================================================
// FORMATTING
// ============================================================================

export function formatCAD(amount: number): string {
  return '$' + Math.floor(amount).toLocaleString('en-CA');
}
