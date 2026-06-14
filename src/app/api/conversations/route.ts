export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: 200,
    include: {
      contact: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { mediaAssets: true } },
    },
  });
  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      name: c.contact.name,
      phone: c.contact.phone,
      classification: c.classification,
      status: c.status,
      aiSummary: c.aiSummary,
      lastMessage: c.messages[0]?.body || "",
      lastMessageAt: c.lastMessageAt,
      mediaCount: c._count.mediaAssets,
    })),
  });
}
