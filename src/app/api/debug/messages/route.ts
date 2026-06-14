/**
 * نقطة تشخيص للقراءة فقط — تكشف حالة كل رسالة حملة وسبب الفشل الحقيقي.
 * محمية بـ CRON_SECRET. احذفها بعد انتهاء التشخيص إن أردت.
 * الاستخدام:  GET /api/debug/messages?secret=YOUR_CRON_SECRET
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const messages = await prisma.campaignMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      contact: { select: { phone: true, name: true, optIn: true } },
      campaign: {
        select: { name: true, status: true, template: { select: { name: true, status: true, language: true } } },
      },
    },
  });

  const summary = messages.reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    env: {
      hasWhatsappToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
      hasPhoneNumberId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? null,
    },
    summary,
    messages: messages.map((m) => ({
      campaign: m.campaign.name,
      campaignStatus: m.campaign.status,
      template: m.campaign.template?.name ?? null,
      templateStatus: m.campaign.template?.status ?? null,
      templateLang: m.campaign.template?.language ?? null,
      phone: m.contact.phone,
      optIn: m.contact.optIn,
      status: m.status,
      error: m.errorMessage,
      waMessageId: m.waMessageId,
      sentAt: m.sentAt,
    })),
  });
}
