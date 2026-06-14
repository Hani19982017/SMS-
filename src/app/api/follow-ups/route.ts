export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const followUps = await prisma.followUp.findMany({
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    take: 500,
    include: {
      contact: { include: { conversation: { select: { id: true } } } },
      assignedAgent: true,
    },
  });
  // متابعة واحدة فقط لكل عميل (نحتفظ بالأولى حسب الترتيب: المعلّقة ثم الأقرب موعدًا)
  const seen = new Set<string>();
  const unique = followUps.filter((f) => {
    if (seen.has(f.contactId)) return false;
    seen.add(f.contactId);
    return true;
  });
  return NextResponse.json({
    followUps: unique.map((f) => ({
      id: f.id,
      name: f.contact.name,
      phone: f.contact.phone,
      conversationId: f.contact.conversation?.id || null,
      dueDate: f.dueDate,
      priority: f.priority,
      status: f.status,
      notes: f.notes,
      agent: f.assignedAgent?.name || null,
    })),
  });
}

// تحديث حالة المتابعة (تم/ملغاة) — عند الإغلاق تنخفض الأولوية تلقائيًا
export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  await prisma.followUp.update({
    where: { id },
    data: {
      status,
      // لما المتابعة تتقفل (تمت/ملغاة) تنزل الأولوية لمنخفضة
      ...(status === "DONE" || status === "CANCELLED" ? { priority: "LOW" } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}
