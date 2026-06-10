type EventName =
  | "resume_created"
  | "ats_scan_completed"
  | "ats_match_score_computed"
  | "ai_improvement_used"
  | "ai_copilot_used"
  | "payment_page_reached"
  | "download_attempted"
  | "pdf_imported"
  | "json_exported"
  | "json_imported"
  | "pdf_exported"
  | "cv_emailed"
  | "language_selected"
  | "template_viewed";

interface EventProps {
  [key: string]: string | number | boolean | undefined;
}

export function track(event: EventName, props?: EventProps) {
  try {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", event, props);
    }
    if (typeof window !== "undefined" && (window as any).analytics) {
      (window as any).analytics.track(event, props);
    }
    if (import.meta.env.DEV) {
      console.log("[analytics]", event, props);
    }
  } catch {}
}
