import { describe, it, expect } from 'vitest';
import {
  assessRebates,
  fthbFederalAmount,
  federalRegularAmount,
  ontarioEnhancedAmount,
  ontarioStandardAmount,
  inOntarioEnhancedWindow,
  inFthbWindow,
  type CheckerAnswers,
} from './rebateRules';

const TODAY = new Date(2026, 7, 5); // Aug 5 2026

function answers(overrides: Partial<CheckerAnswers> = {}): CheckerAnswers {
  return {
    stage: 'shopping',
    propertyType: 'condo',
    price: 800_000,
    occupancy: 'primary',
    ownedBefore: 'no',
    spouseOwned: 'no-partner',
    rebateAssignment: 'yes',
    province: 'ON',
    ...overrides,
  };
}

describe('federal FTHB price boundaries', () => {
  it('gives the full $50,000 at exactly $1,000,000', () => {
    expect(fthbFederalAmount(1_000_000)).toBe(50_000);
  });

  it('is nearly zero at $1,499,999 (linear phase-out)', () => {
    // 50000 * (1500000 - 1499999) / 500000 = 0.1 → floored to 0
    expect(fthbFederalAmount(1_499_999)).toBe(0);
  });

  it('is a proportional amount mid-band', () => {
    // $1,250,000 → 50000 * 250000/500000 = 25000
    expect(fthbFederalAmount(1_250_000)).toBe(25_000);
  });

  it('is zero at exactly $1,500,000', () => {
    expect(fthbFederalAmount(1_500_000)).toBe(0);
  });

  it('is 5% of price below $1,000,000', () => {
    expect(fthbFederalAmount(600_000)).toBe(30_000);
  });
});

describe('regular federal rebate', () => {
  it('is zero at exactly $450,000', () => {
    expect(federalRegularAmount(450_000)).toBe(0);
  });

  it('is capped at $6,300 at $350,000', () => {
    expect(federalRegularAmount(350_000)).toBe(6_300);
  });

  it('phases out between $350k and $450k', () => {
    expect(federalRegularAmount(400_000)).toBe(3_150);
  });
});

describe('Ontario amounts', () => {
  it('enhanced caps at $80,000 (reached at $1,000,000)', () => {
    expect(ontarioEnhancedAmount(1_000_000)).toBe(80_000);
    expect(ontarioEnhancedAmount(2_000_000)).toBe(80_000);
    expect(ontarioEnhancedAmount(500_000)).toBe(40_000);
  });

  it('standard caps at $24,000 (reached at $400,000)', () => {
    expect(ontarioStandardAmount(400_000)).toBe(24_000);
    expect(ontarioStandardAmount(900_000)).toBe(24_000);
    expect(ontarioStandardAmount(300_000)).toBe(18_000);
  });
});

describe('Ontario enhanced signing-date window', () => {
  it('excludes March 31 2026 and includes April 1 2026', () => {
    expect(inOntarioEnhancedWindow('2026-03-31')).toBe(false);
    expect(inOntarioEnhancedWindow('2026-04-01')).toBe(true);
  });

  it('includes March 31 2027 and excludes April 1 2027', () => {
    expect(inOntarioEnhancedWindow('2027-03-31')).toBe(true);
    expect(inOntarioEnhancedWindow('2027-04-01')).toBe(false);
  });

  it('falls back to the Ontario standard rebate for FTB signed before the window', () => {
    const result = assessRebates(
      answers({ stage: 'signed', signingDate: '2026-03-31', price: 800_000 }),
      TODAY
    );
    // Federal FTHB window opened 2025-03-20, so federal still applies…
    expect(result.federalEstimate).toBe(40_000);
    // …but provincial drops to the standard $24,000 cap instead of $64,000.
    expect(result.provincialEstimate).toBe(24_000);
    expect(result.flags).toContain('outside-on-enhanced-window');
  });

  it('grants both enhanced programs inside the window (~$130k ceiling)', () => {
    const result = assessRebates(
      answers({ stage: 'signed', signingDate: '2026-04-01', price: 1_000_000 }),
      TODAY
    );
    expect(result.federalEstimate).toBe(50_000);
    expect(result.provincialEstimate).toBe(80_000);
    expect(result.combinedEstimate).toBe(130_000);
  });
});

describe('federal FTHB signing-date window', () => {
  it('excludes agreements signed before March 20 2025', () => {
    expect(inFthbWindow('2025-03-19')).toBe(false);
    expect(inFthbWindow('2025-03-20')).toBe(true);
  });

  it('excludes agreements signed on or after January 1 2031', () => {
    expect(inFthbWindow('2030-12-31')).toBe(true);
    expect(inFthbWindow('2031-01-01')).toBe(false);
  });
});

describe('the spousal trap', () => {
  it('disqualifies a never-owner whose spouse owned a home they lived in', () => {
    const result = assessRebates(
      answers({ ownedBefore: 'no', spouseOwned: 'yes-lived-in', price: 800_000 }),
      TODAY
    );
    expect(result.firstTimeBuyer).toBe('no');
    expect(result.flags).toContain('spousal-trap');
    // Falls back to standard programs: federal regular is $0 at this price.
    expect(result.federalEstimate).toBe(0);
    expect(result.provincialEstimate).toBe(24_000);
  });

  it('keeps FTB status when the buyer never lived in the spouse-owned home', () => {
    const result = assessRebates(
      answers({ ownedBefore: 'no', spouseOwned: 'yes-not-lived-in', price: 800_000 }),
      TODAY
    );
    expect(result.firstTimeBuyer).toBe('yes');
    expect(result.federalEstimate).toBe(40_000);
    expect(result.provincialEstimate).toBe(64_000);
  });
});

describe('investor path (NRRP)', () => {
  it('returns a warning with no dollar estimate', () => {
    const result = assessRebates(answers({ occupancy: 'rental' }), TODAY);
    expect(result.kind).toBe('investor-nrrp');
    expect(result.combinedEstimate).toBe(0);
    expect(result.programs[0].amount).toBeNull();
    expect(result.leadTag).toBe('investor');
  });
});

describe('resale exit', () => {
  it('terminates with no programs and no estimate', () => {
    const result = assessRebates(answers({ propertyType: 'resale' }), TODAY);
    expect(result.kind).toBe('resale-exit');
    expect(result.programs).toHaveLength(0);
    expect(result.combinedEstimate).toBe(0);
  });
});

describe('lead quality tags', () => {
  it('tags hot-cooling-off for a condo signed 3 days ago', () => {
    const result = assessRebates(
      answers({ stage: 'signed', signingDate: '2026-08-02', propertyType: 'condo' }),
      TODAY
    );
    expect(result.leadTag).toBe('hot-cooling-off');
    expect(result.coolingOff?.daysElapsed).toBe(3);
    expect(result.coolingOff?.windowEndsOn).toBe('2026-08-12');
    expect(result.coolingOff?.withinWindow).toBe(true);
  });

  it('does not tag hot-cooling-off once the 10-day window has passed', () => {
    const result = assessRebates(
      answers({ stage: 'signed', signingDate: '2026-07-01', propertyType: 'condo' }),
      TODAY
    );
    expect(result.leadTag).not.toBe('hot-cooling-off');
    expect(result.coolingOff?.withinWindow).toBe(false);
  });

  it('tags hot-freehold-signed for signed freeholds (no cooling-off)', () => {
    const result = assessRebates(
      answers({ stage: 'signed', signingDate: '2026-07-01', propertyType: 'freehold' }),
      TODAY
    );
    expect(result.leadTag).toBe('hot-freehold-signed');
    expect(result.coolingOff?.applies).toBe(false);
  });

  it('tags warm-shopping before signing', () => {
    const result = assessRebates(answers({ stage: 'shopping', rebateAssignment: 'no' }), TODAY);
    expect(result.leadTag).toBe('warm-shopping');
  });

  it('tags needs-review when rebate assignment is unknown', () => {
    const result = assessRebates(answers({ stage: 'shopping', rebateAssignment: 'not-sure' }), TODAY);
    expect(result.leadTag).toBe('needs-review');
  });

  it('tags likely-ineligible for signed prior owners past all urgency windows', () => {
    const result = assessRebates(
      answers({
        stage: 'signed',
        signingDate: '2026-06-01',
        propertyType: 'condo',
        ownedBefore: 'yes',
        spouseOwned: undefined,
      }),
      TODAY
    );
    expect(result.leadTag).toBe('likely-ineligible');
    expect(result.firstTimeBuyer).toBe('no');
  });
});
