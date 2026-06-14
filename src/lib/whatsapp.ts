/**
 * خدمة التكامل مع WhatsApp Business Cloud API الرسمي من Meta.
 * - إرسال رسائل القوالب (للرسالة الأولى - إلزامي بسياسة واتساب).
 * - إرسال رسائل نصية حرة (مسموح فقط داخل نافذة 24 ساعة).
 * - التحقق من نافذة 24 ساعة قبل أي رسالة حرة.
 * - دعم أرقام إرسال متعددة (configForAccount).
 */

const GRAPH_VERSION = "v21.0";

type SendResult =
  | { ok: true; waMessageId: string }
  | { ok: false; error: string };

export interface WaConfig {
  phoneNumberId: string;
  accessToken: string;
}

/** إعداد الرقم الافتراضي من متغيرات البيئة (يُستخدم كاحتياطي إن لم تُضف أرقام في قاعدة البيانات). */
export function getDefaultConfig(): WaConfig {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    throw new Error("إعدادات واتساب غير مكتملة (PHONE_NUMBER_ID / ACCESS_TOKEN)");
  }
  return { phoneNumberId, accessToken };
}

/**
 * بناء إعداد الإرسال من سجل رقم مخزّن في قاعدة البيانات.
 * إن لم يكن للرقم توكن خاص، يُستخدم التوكن الافتراضي من البيئة
 * (مفيد عندما تكون كل الأرقام تحت نفس الحساب/التوكن).
 */
export function configForAccount(acc: {
  phoneNumberId: string;
  accessToken?: string | null;
}): WaConfig {
  const token = acc.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || "";
  if (!acc.phoneNumberId || !token) {
    throw new Error("إعداد الرقم غير مكتمل (phoneNumberId / accessToken)");
  }
  return { phoneNumberId: acc.phoneNumberId, accessToken: token };
}

async function callGraph(
  config: WaConfig,
  payload: Record<string, unknown>
): Promise<SendResult> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || `خطأ HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    const waMessageId = data?.messages?.[0]?.id;
    if (!waMessageId) return { ok: false, error: "لم يُرجع واتساب معرّف رسالة" };
    return { ok: true, waMessageId };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * إرسال رسالة قالب معتمدة (للتواصل الأول مع العميل).
 * @param to رقم بصيغة E.164 (بدون علامة +) أو معها — واتساب يقبل الصيغتين.
 * @param templateName اسم القالب المعتمد في Meta.
 * @param variables متغيرات نص القالب بالترتيب.
 */
export async function sendTemplate(
  to: string,
  templateName: string,
  variables: string[] = [],
  language = "ar",
  config: WaConfig = getDefaultConfig()
): Promise<SendResult> {
  const components =
    variables.length > 0
      ? [
          {
            type: "body",
            parameters: variables.map((v) => ({ type: "text", text: v })),
          },
        ]
      : [];

  return callGraph(config, {
    messaging_product: "whatsapp",
    to: to.replace(/^\+/, ""),
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      ...(components.length ? { components } : {}),
    },
  });
}

/**
 * إرسال رسالة نصية حرة. يُسمح بها فقط داخل نافذة 24 ساعة من آخر رسالة واردة.
 */
export async function sendText(
  to: string,
  text: string,
  config: WaConfig = getDefaultConfig()
): Promise<SendResult> {
  return callGraph(config, {
    messaging_product: "whatsapp",
    to: to.replace(/^\+/, ""),
    type: "text",
    text: { body: text, preview_url: false },
  });
}

/**
 * التحقق من أن نافذة 24 ساعة ما زالت مفتوحة.
 * @param lastInboundAt تاريخ آخر رسالة واردة من العميل.
 */
export function isWithin24hWindow(lastInboundAt: Date | null | undefined): boolean {
  if (!lastInboundAt) return false;
  const hours = (Date.now() - new Date(lastInboundAt).getTime()) / 36e5;
  return hours < 24;
}
