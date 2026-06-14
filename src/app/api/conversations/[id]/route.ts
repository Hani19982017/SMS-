export const dynamic = "force-dynamic";
/**
 * تفاصيل محادثة واحدة مع كل الرسائل والوسائط (الصور).
 * يُرجع لكل رسالة قائمة وسائطها (id + النوع) لعرضها/فتحها عبر /api/media/{id}.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const conv = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      contact: true,
      messages: {
        orderBy: { createdAt: "asc" },
        include: { media: { select: { id: true, mimeType: true, caption: true } } },
      },
    },
  });

  if (!conv) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  return NextResponse.json({
    id: conv.id,
    name: conv.contact.name,
    phone: conv.contact.phone,
    classification: conv.classification,
    aiSummary: conv.aiSummary,
    messages: conv.messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      body: m.body,
      isAutoReply: m.isAutoReply,
      createdAt: m.createdAt,
      media: m.media.map((md) => ({
        id: md.id,
        mimeType: md.mimeType,
        caption: md.caption,
        isImage: (md.mimeType || "").startsWith("image/"),
      })),
    })),
  });
}
