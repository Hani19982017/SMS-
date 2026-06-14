export const dynamic = "force-dynamic";
/**
 * إنشاء حملة وإدراج رسائلها في الطابور.
 * يجدول كل رسالة بفاصل زمني (sendDelaySec) لتطبيق التحكم في السرعة.
 * يُدرج فقط جهات الاتصال التي وافقت (optIn) — التزامًا بسياسة واتساب.
 *
 * اختيار رقم الإرسال:
 *  - whatsappId = "<id>"  => الإرسال من رقم محدد.
 *  - whatsappId فارغ/غير موجود => توزيع تلقائي على كل الأرقام المفعّلة.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  templateId: z.string().min(1),
  sendDelaySec: z.number().int().min(5).max(3600).default(20),
  scheduledAt: z.string().datetime().optional(),
  templateVars: z.array(z.string()).optional(),
  whatsappId: z.string().optional(), // فارغ => توزيع تلقائي
  // فلترة جهات الاتصال
  filter: z
    .object({ city: z.string().optional(), area: z.string().optional() })
    .optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صحيحة", details: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;
  const startAt = d.scheduledAt ? new Date(d.scheduledAt) : new Date();

  // التحقق من الرقم المحدد (إن وُجد)
  let whatsappId: string | null = null;
  if (d.whatsappId) {
    const acc = await prisma.whatsappAccount.findUnique({ where: { id: d.whatsappId } });
    if (!acc) {
      return NextResponse.json({ error: "الرقم المحدد غير موجود" }, { status: 400 });
    }
    whatsappId = acc.id;
  }

  // جهات الاتصال المؤهلة: موافقة + صالحة + حسب الفلتر
  const contacts = await prisma.contact.findMany({
    where: {
      optIn: true,
      isValid: true,
      city: d.filter?.city || undefined,
      area: d.filter?.area || undefined,
    },
    select: { id: true },
  });

  if (contacts.length === 0) {
    return NextResponse.json({ error: "لا توجد جهات اتصال مؤهلة (تحقق من الموافقة opt-in)" }, { status: 400 });
  }

  // إنشاء الحملة
  const campaign = await prisma.campaign.create({
    data: {
      name: d.name,
      templateId: d.templateId,
      sendDelaySec: d.sendDelaySec,
      scheduledAt: startAt,
      templateVars: d.templateVars ?? undefined,
      whatsappId, // null => توزيع تلقائي وقت الإرسال
      status: "RUNNING",
      createdById: (session.user as any).id,
    },
  });

  // إدراج الرسائل بجدولة متدرجة (التحكم في السرعة)
  const data = contacts.map((c, i) => ({
    campaignId: campaign.id,
    contactId: c.id,
    status: "PENDING" as const,
    scheduledAt: new Date(startAt.getTime() + i * d.sendDelaySec * 1000),
  }));

  // إدراج على دفعات لتفادي حدود الحجم
  for (let i = 0; i < data.length; i += 1000) {
    await prisma.campaignMessage.createMany({ data: data.slice(i, i + 1000) });
  }

  return NextResponse.json({ campaignId: campaign.id, queued: data.length });
}

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { messages: true } },
      template: true,
      whatsapp: { select: { label: true, displayNumber: true } },
    },
  });
  return NextResponse.json(campaigns);
}
