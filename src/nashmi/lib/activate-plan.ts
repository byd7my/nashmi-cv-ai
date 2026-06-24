import { getCvSessionId } from "@/nashmi/lib/session";
import { setPurchaseToken, setSessionPlanTier } from "@/nashmi/lib/plan-session";
import { migrateFreeDraftToPaidSession } from "@/nashmi/lib/client-data-wipe";

export type ActivatePlanResult =
  | { ok: true; plan: string; token: string }
  | { ok: false; messageAr: string; messageEn: string };

export async function activatePlanWithCode(
  code: string,
  plan: "premium" | "elite",
  email?: string | null,
): Promise<ActivatePlanResult> {
  const sessionId = getCvSessionId();
  const res = await fetch("/api/activate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-nashmi-session-id": sessionId,
    },
    body: JSON.stringify({
      code: code.trim(),
      plan,
      sessionId,
      email: email?.trim() || undefined,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    token?: string;
    plan?: string;
    error?: string;
    errorAr?: string;
    code?: string;
  };

  if (!res.ok || typeof data.token !== "string") {
    const fallbackAr = "الكود غير صحيح أو تم استخدامه مسبقاً";
    const fallbackEn = "Invalid code or already used";
    const serviceAr =
      data.code === "SUPABASE_NOT_CONFIGURED"
        ? "خدمة التفعيل غير متصلة بقاعدة البيانات. تواصل مع الدعم."
        : data.code === "LOOKUP_FAILED" || data.code === "REDEEM_FAILED"
          ? "خطأ في خدمة التفعيل. حاول مرة أخرى أو تواصل مع الدعم."
          : null;
    const serviceEn =
      data.code === "SUPABASE_NOT_CONFIGURED"
        ? "Activation service is not connected to the database. Contact support."
        : data.code === "LOOKUP_FAILED" || data.code === "REDEEM_FAILED"
          ? "Activation service error. Try again or contact support."
          : null;
    return {
      ok: false,
      messageAr: data.errorAr || serviceAr || data.error || fallbackAr,
      messageEn: data.error || serviceEn || fallbackEn,
    };
  }

  setPurchaseToken(data.token);
  setSessionPlanTier(data.plan || plan);
  migrateFreeDraftToPaidSession();

  return { ok: true, plan: data.plan || plan, token: data.token };
}
