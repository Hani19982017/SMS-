export const dynamic = "force-dynamic";
/** إحصائيات لوحة التحكم. */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [
    totalContacts,
    totalSent,
    delivered,
    read,
    replied,
    owners,
    brokers,
    notInterested,
    availableProps,
    followUps,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.campaignMessage.count({ where: { status: { in: ["SENT", "DELIVERED", "READ", "REPLIED"] } } }),
    prisma.campaignMessage.count({ where: { status: { in: ["DELIVERED", "READ", "REPLIED"] } } }),
    prisma.campaignMessage.count({ where: { status: { in: ["READ", "REPLIED"] } } }),
    prisma.campaignMessage.count({ where: { status: "REPLIED" } }),
    prisma.conversation.count({ where: { classification: "Property Owner" } }),
    prisma.conversation.count({ where: { classification: "Broker" } }),
    prisma.conversation.count({ where: { classification: "Not Interested" } }),
    prisma.property.count({ where: { availability: { contains: "متاح" } } }),
    prisma.followUp.count({ where: { status: "PENDING" } }),
  ]);

  const deliveryRate = totalSent ? Math.round((delivered / totalSent) * 100) : 0;
  const replyRate = totalSent ? Math.round((replied / totalSent) * 100) : 0;

  return NextResponse.json({
    totalContacts,
    totalSent,
    deliveryRate,
    replyRate,
    read,
    owners,
    brokers,
    notInterested,
    availableProps,
    followUps,
  });
}