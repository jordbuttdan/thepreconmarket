import type { CheckerAnswers } from './rebateRules';

/**
 * Checker answers travel to /results in an opaque base64url query param so
 * results are linkable and shareable. No name, email, or phone is ever
 * included — only the checker answers themselves.
 */

export interface EncodedState {
  v: 1;
  answers: CheckerAnswers;
  /** Two-letter province code as selected (engine only cares ON vs other). */
  provinceCode: string;
}

export function encodeAnswers(state: EncodedState): string {
  const json = JSON.stringify(state);
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodeAnswers(param: string): EncodedState | null {
  try {
    const b64 = param.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    const parsed = JSON.parse(json);
    if (parsed?.v !== 1 || !parsed.answers) return null;
    return parsed as EncodedState;
  } catch {
    return null;
  }
}
