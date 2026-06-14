/**
 * مُرسِل الحملات (Render-friendly) — يدعم أرقام إرسال متعددة.
 * يستدعيه Render Cron كل دقيقة، أو يدويًا عبر curl.
 *
 * اختيار الرقم لكل حملة:
 *  - إذا كان للحملة رقم محدد (whatsappId) → تُرسل منه دائمًا.
 *  - إذا لم يُحدَّد رقم وكانت هناك أرقام مفعّلة → توزيع تلقائي (round-robin) عليها.
 *  - إذا لم تُضف أي أرقام في قاعدة البيانات → يُستخدم الرقم الافتراضي من متغيرات البيئة.
 *
 * الحماية: رأس Authorization يجب أن يطابق CRON_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTemplate, configForAccount, WaConfig } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_SIZE = 20;

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  const now = new Date();

  await prisma.campaign.updateMany({
    where: { status: "DRAFT", scheduledAt: { lte: now } },
    data: { status: "RUNNING" },
  });

  // الأرقام المفعّلة المتاحة للتوزيع التلقائي
  const activeAccounts = await prisma.whatsappAccount.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const due = await prisma.campaignMessage.findMany({
    where: {
      status: "PENDING",
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
      campaign: { status: "RUNNING" },
    },
    include: {
      contact: true,
      campaign: { include: { template: true, whatsapp: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: BATCH_SIZE,
  });

  let sent = 0;
  let failed = 0;
  let rotationIndex = 0; // عدّاد التوزيع التلقائي داخل هذه الدفعة

  for (const m of due) {
    const tmpl = m.campaign.template;
    if (!tmpl || !m.contact.optIn) {
      await prisma.campaignMessage.update({
        where: { id: m.id },
        data: {
          status: "FAILED",
          errorMessage: !m.contact.optIn ? "لا توجد موافقة (opt-in)" : "لا يوجد قالب",
        },
      });
      failed++;
      continue;
    }

    // ----- اختيار رقم الإرسال -----
    let config: WaConfig | undefined; // undefined => سيستخدم sendTemplate الرقم الافتراضي من البيئة
    let usedAccountId: string | null = null;
    try {
      if (m.campaign.whatsapp) {
        // رقم محدد للحملة
        config = configForAccount(m.campaign.whatsapp);
        usedAccountId = m.campaign.whatsapp.id;
      } else if (activeAccounts.length > 0) {
        // توزيع تلقائي
        const acc = activeAccounts[rotationIndex % activeAccounts.length];
        rotationIndex++;
        config = configForAccount(acc);
        usedAccountId = acc.id;
      }
      // وإلا: config = undefined => الرقم الافتراضي من البيئة
    } catch (e) {
      await prisma.campaignMessage.update({
        where: { id: m.id },
        data: { status: "FAILED", errorMessage: (e as Error).message },
      });
      failed++;
      continue;
    }

    // القوالب بدون متغيرات (مثل hello_world) تُرسَل بدون parameters
    let vars: string[] = [];
    if (tmpl.variableCount > 0) {
      vars = (m.campaign.templateVars as string[] | null) || [m.contact.name || "عميلنا العزيز"];
    }

    const res = await sendTemplate(m.contact.phone, tmpl.name, vars, tmpl.language, config);

    if (res.ok) {
      await prisma.campaignMessage.update({
        where: { id: m.id },
        data: { status: "SENT", waMessageId: res.waMessageId, sentAt: new Date() },
      });
      const conv = await prisma.conversation.upsert({
        where: { contactId: m.contactId },
        create: { contactId: m.contactId, status: "NEW", lastMessageAt: new Date() },
        update: { lastMessageAt: new Date() },
      });
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          direction: "OUTBOUND",
          body: `[قالب] ${tmpl.name}`,
          waMessageId: res.waMessageId,
          whatsappId: usedAccountId,
        },
      });
      sent++;
    } else {
      await prisma.campaignMessage.update({
        where: { id: m.id },
        data: { status: "FAILED", errorMessage: res.error },
      });
      failed++;
    }
  }

  const running = await prisma.campaign.findMany({ where: { status: "RUNNING" } });
  for (const c of running) {
    const pending = await prisma.campaignMessage.count({
      where: { campaignId: c.id, status: "PENDING" },
    });
    if (pending === 0) {
      await prisma.campaign.update({ where: { id: c.id }, data: { status: "COMPLETED" } });
    }
  }

  return NextResponse.json({ processed: due.length, sent, failed });
}
