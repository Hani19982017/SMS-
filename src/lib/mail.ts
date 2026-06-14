/**
 * إرسال إيميلات الإخطار عبر Gmail SMTP.
 * يقرأ الإعدادات من جدول Setting (من صفحة الإعدادات)، ويرجع لمتغيرات البيئة كاحتياطي:
 *   smtp_user / SMTP_USER   = إيميل Gmail المُرسِل
 *   smtp_pass / SMTP_PASS   = App Password من إعدادات Google (وليس كلمة مرور الحساب)
 *   notify_email / NOTIFY_EMAIL = الإيميل الذي تصله الإخطارات (الافتراضي = smtp_user)
 */
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

function escapeHtml(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function getMailConfig() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["smtp_user", "smtp_pass", "notify_email"] } },
  });
  const m: Record<string, string> = {};
  for (const r of rows) m[r.key] = r.value;

  const user = m.smtp_user || process.env.SMTP_USER || "";
  const pass = m.smtp_pass || process.env.SMTP_PASS || "";
  const to = m.notify_email || process.env.NOTIFY_EMAIL || user;
  return { user, pass, to };
}

/** إرسال إيميل عام (يُستخدم للاختبار وللإخطارات). */
export async function sendMail(subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const { user, pass, to } = await getMailConfig();
  if (!user || !pass || !to) {
    return { ok: false, error: "إعدادات الإيميل غير مكتملة (smtp_user / smtp_pass / notify_email)" };
  }
  try {
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
    await transporter.sendMail({ from: `"عقار واتساب" <${user}>`, to, subject, html });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** إخطار بأن عميلًا أرسل رسالة ولم يستطع الذكاء الاصطناعي الرد عليها. */
export async function sendUnknownLeadEmail(opts: {
  phone: string;
  message: string;
  name?: string | null;
}): Promise<void> {
  const waLink = `https://wa.me/${opts.phone.replace(/[^\d]/g, "")}`;
  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; line-height:1.9; color:#1f2a24">
      <h2 style="color:#0f1f17">عميل أرسل رسالة ولم يتمكّن الذكاء الاصطناعي من الرد</h2>
      <p><b>الاسم:</b> ${escapeHtml(opts.name || "غير معروف")}</p>
      <p><b>الهاتف:</b> ${escapeHtml(opts.phone)}</p>
      <p><b>الرسالة:</b><br>${escapeHtml(opts.message)}</p>
      <p style="margin-top:18px">
        <a href="${waLink}" style="background:#1f9d57;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">
          الرد عبر واتساب
        </a>
      </p>
      <p style="color:#8a968f;font-size:12px">رسالة تلقائية من نظام عقار واتساب</p>
    </div>`;
  const res = await sendMail(`🔔 عميل يحتاج ردًا منك — ${opts.name || opts.phone}`, html);
  if (!res.ok) console.error("notify email failed:", res.error);
}
