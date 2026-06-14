export const dynamic = "force-dynamic";
/**
 * تعديل / حذف رقم واتساب محدد (للمدير فقط).
 * PATCH  : تحديث الحقول أو تفعيل/تعطيل الرقم.
 * DELETE : حذف الرقم.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  label: z.string().min(1).optional(),
  displayNumber: z.string().optional(),
  businessAccountId: z.string().optional(),
  accessToken: z.string().optional(), // أرسل قيمة جديدة لتغييره، أو اتركه دون إرسال للإبقاء عليه
  isActive: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") return false;
  return true;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  }
  const d = parsed.data;

  const data: Record<string, unknown> = {};
  if (d.label !== undefined) data.label = d.label;
  if (d.displayNumber !== undefined) data.displayNumber = d.displayNumber || null;
  if (d.businessAccountId !== undefined) data.businessAccountId = d.businessAccountId || null;
  if (d.isActive !== undefined) data.isActive = d.isActive;
  // نحدّث التوكن فقط إذا أُرسلت قيمة غير فارغة
  if (d.accessToken) data.accessToken = d.accessToken;

  await prisma.whatsappAccount.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  }
  await prisma.whatsappAccount.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
