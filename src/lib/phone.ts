import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * تطبيع رقم الهاتف إلى الصيغة الدولية E.164 (مثال: +201001234567).
 * يتعامل بذكاء مع الصيغ المصرية الشائعة:
 *   01001234567  -> +201001234567
 *   201001234567 -> +201001234567
 *   00201001234567 -> +201001234567
 *   +20 100 123 4567 -> +201001234567
 * @param raw الرقم كما أدخله المستخدم
 * @param defaultCountry رمز الدولة الافتراضي (مصر = EG)
 */
export function normalizePhone(
  raw: string,
  defaultCountry: "EG" | string = "EG"
): { ok: true; e164: string } | { ok: false; reason: string } {
  if (!raw) return { ok: false, reason: "رقم فارغ" };

  // تنظيف المسافات والرموز والأرقام العربية
  let cleaned = String(raw)
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))) // أرقام عربية -> إنجليزية
    .replace(/[\s\-().]/g, "")
    .trim();

  // معالجة بادئة 00 الدولية
  if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);

  // أرقام تبدأ بـ 01 (محلية مصرية) -> نضيف كود الدولة
  if (defaultCountry === "EG" && /^01\d{9}$/.test(cleaned)) {
    cleaned = "+2" + cleaned;
  }
  // أرقام تبدأ بـ 20 بدون +
  if (/^20\d{10}$/.test(cleaned)) cleaned = "+" + cleaned;

  const parsed = parsePhoneNumberFromString(
    cleaned,
    defaultCountry as any
  );

  if (!parsed || !parsed.isValid()) {
    return { ok: false, reason: "رقم غير صالح" };
  }
  return { ok: true, e164: parsed.number };
}
