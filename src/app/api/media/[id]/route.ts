export const dynamic = "force-dynamic";
/**
 * يعرض ملف وسائط محفوظ (صورة/فيديو/مستند) من قاعدة البيانات.
 * محمي بتسجيل الدخول (عبر middleware) — تُرسَل كوكي الجلسة تلقائيًا مع وسم <img>.
 * الاستخدام: <img src="/api/media/{id}" />
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: params.id } });
  if (!asset) return new NextResponse("Not found", { status: 404 });

  const bytes = Buffer.from(asset.data as unknown as Buffer);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType || "application/octet-stream",
      "Cache-Control": "private, max-age=86400",
      "Content-Length": String(bytes.length),
    },
  });
}
