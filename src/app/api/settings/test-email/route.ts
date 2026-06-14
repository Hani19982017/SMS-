export const dynamic = "force-dynamic";
/**
 * إرسال إيميل تجريبي للتأكد من صحة إعدادات Gmail.
 * يُستدعى من زر «إرسال إيميل تجريبي» في صفحة الإعدادات (للمدير فقط).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendMail } from "@/lib/mail";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  }
  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; line-height:1.9">
      <h2>✅ إعدادات الإيميل تعمل بنجاح</h2>
      <p>هذه رسالة تجريبية من نظام عقار واتساب. إذا وصلتك، فالإخطارات ستصل بشكل صحيح.</p>
    </div>`;
  const res = await sendMail("✅ اختبار إيميل — عقار واتساب", html);
  if (res.ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ error: res.error || "فشل الإرسال" }, { status: 400 });
}
