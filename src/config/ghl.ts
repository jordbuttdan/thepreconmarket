/**
 * GoHighLevel integration config.
 *
 * All values come from environment variables so no real IDs are ever
 * committed. Set them in `.env` locally (see `.env.example`) and in the
 * Netlify dashboard for production. When a value is empty the UI renders a
 * clearly-labelled placeholder so layout can be verified before the embed
 * codes exist.
 */
export const GHL = {
  // Inline form embed used behind the results gate
  leadFormEmbedUrl: import.meta.env.PUBLIC_GHL_LEAD_FORM_URL ?? '',
  // Calendar embed for the Book a Call page
  calendarEmbedUrl: import.meta.env.PUBLIC_GHL_CALENDAR_URL ?? '',
  // Optional: webhook endpoint for posting checker answers alongside the lead
  webhookUrl: import.meta.env.PUBLIC_GHL_WEBHOOK_URL ?? '',
};
