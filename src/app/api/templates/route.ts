export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// قائمة القوالب
export async function GET() {
  const templates = await prisma.template.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ templates });
}

// إضافة قالب جديد (المدير فقط)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  }
  const body = await req.json();
  const { name, language, category, bodyText, variableCount, status } = body;

  if (!name || !language) {
    return NextResponse.json({ error: "الاسم واللغة مطلوبان" }, { status: 400 });
  }

  try {
    const template = await prisma.template.create({
      data: {
        name: String(name).trim(),
        language: String(language).trim(),
        category: category || "MARKETING",
        bodyText: bodyText || "",
        variableCount: Number(variableCount) || 0,
        status: status || "APPROVED",
      },
    });
    return NextResponse.json({ template });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "يوجد قالب بنفس الاسم بالفعل" }, { status: 400 });
    }
    return NextResponse.json({ error: "تعذّر حفظ القالب" }, { status: 500 });
  }
}

// حذف قالب (المدير فقط)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرّف ناقص" }, { status: 400 });
  await prisma.template.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
