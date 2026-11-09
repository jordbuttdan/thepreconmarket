/**
 * GoHighLevel integration config.
 *
 * All values come from environment variables so no real IDs are ever
 * committed. Set them in `.env` locally (see `.env.example`) and in the
 * Netlify dashboard for production. When a value is empty the UI renders a
 * clearly-labelled placeholder so layout can be verified before the embed
 * codes exist.
 *
 * NOTE on the webhook: this is an inbound GHL webhook URL posted to from the
 * browser. It is therefore visible in the page source — that is inherent to
 * the approach and is why the form carries a honeypot and a submit-time trap.
 * An inbound webhook only accepts data; it exposes nothing and grants no
 * access to the account. Never put a GHL API key in a PUBLIC_ variable.
 */
export const GHL = {
  /** Inbound webhook that receives VIP registrations as JSON. */
  vipWebhookUrl: import.meta.env.PUBLIC_GHL_VIP_WEBHOOK_URL ?? '',
  /** Calendar embed for the /book page. */
  calendarEmbedUrl: import.meta.env.PUBLIC_GHL_CALENDAR_URL ?? '',
  /** Optional webhook for the rebate checker's answers + estimate. */
  checkerWebhookUrl: import.meta.env.PUBLIC_GHL_WEBHOOK_URL ?? '',
  /** Legacy: inline form embed, kept as a fallback option. */
  leadFormEmbedUrl: import.meta.env.PUBLIC_GHL_LEAD_FORM_URL ?? '',
};
