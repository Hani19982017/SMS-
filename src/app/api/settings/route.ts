import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// مفاتيح الإعدادات المعروفة
const KEYS = [
  "ai_provider",
  "ai_prompt",
  "default_delay_sec",
  "autoreply_Property Owner",
  "autoreply_Not Interested",
  "autoreply_Contact Later",
  // إعدادات الإيميل (Gmail)
  "notify_email",
  "smtp_user",
  "smtp_pass",
];

// مفاتيح حسّاسة لا تُرجَع قيمتها للمتصفح
const SECRET_KEYS = ["smtp_pass"];

export async function GET() {
  const rows = await prisma.setting.findMany({ where: { key: { in: KEYS } } });
  const map: Record<string, string> = {};
  for (const r of rows) {
    if (SECRET_KEYS.includes(r.key)) {
      // لا نُرجع كلمة المرور؛ فقط نشير إلى أنها محفوظة
      map[`${r.key}_set`] = r.value ? "1" : "";
    } else {
      map[r.key] = r.value;
    }
  }
  return NextResponse.json({ settings: map });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  }
  const body = (await req.json()) as Record<string, string>;
  for (const [key, value] of Object.entries(body)) {
    if (!KEYS.includes(key)) continue;
    // لا تُفرّغ كلمة المرور إذا أُرسلت فارغة (يعني المستخدم لم يغيّرها)
    if (SECRET_KEYS.includes(key) && (value === "" || value == null)) continue;
    await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }
  return NextResponse.json({ ok: true });
}
