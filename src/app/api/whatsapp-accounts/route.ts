export const dynamic = "force-dynamic";
/**
 * إدارة أرقام واتساب المتعددة.
 * GET  : قائمة الأرقام (التوكن مخفي لأسباب أمنية).
 * POST : إضافة رقم جديد (للمدير فقط).
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  label: z.string().min(1, "الاسم مطلوب"),
  phoneNumberId: z.string().min(1, "Phone Number ID مطلوب"),
  displayNumber: z.string().optional(),
  businessAccountId: z.string().optional(),
  accessToken: z.string().optional(), // اتركه فارغًا لاستخدام التوكن الافتراضي من البيئة
});

export async function GET() {
  const accounts = await prisma.whatsappAccount.findMany({
    orderBy: { createdAt: "asc" },
  });
  // لا نُرجع التوكن للمتصفح؛ فقط نشير إن كان للرقم توكن خاص
  return NextResponse.json({
    accounts: accounts.map((a) => ({
      id: a.id,
      label: a.label,
      phoneNumberId: a.phoneNumberId,
      displayNumber: a.displayNumber,
      businessAccountId: a.businessAccountId,
      isActive: a.isActive,
      hasOwnToken: !!a.accessToken,
      qualityRating: a.qualityRating,
      createdAt: a.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "بيانات غير صحيحة" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const exists = await prisma.whatsappAccount.findUnique({
    where: { phoneNumberId: d.phoneNumberId },
  });
  if (exists) {
    return NextResponse.json({ error: "هذا الرقم (Phone Number ID) مُضاف بالفعل" }, { status: 400 });
  }

  const account = await prisma.whatsappAccount.create({
    data: {
      label: d.label,
      phoneNumberId: d.phoneNumberId,
      displayNumber: d.displayNumber || null,
      businessAccountId: d.businessAccountId || null,
      accessToken: d.accessToken || null,
      isActive: true,
    },
  });

  return NextResponse.json({ id: account.id });
}
