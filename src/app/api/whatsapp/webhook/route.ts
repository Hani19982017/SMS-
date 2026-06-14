/**
 * نقطة استقبال Webhook من WhatsApp Cloud API.
 * GET  -> التحقق من الـ webhook عند الربط (verify token).
 * POST -> استقبال الرسائل الواردة وتحديثات الحالة (delivered/read/failed).
 *
 * عند وصول رسالة واردة:
 *   1) حفظها وربطها بجهة الاتصال + المحادثة.
 *   2) حفظ الصور/الوسائط المرفقة (تنزيلها من Meta وتخزينها في قاعدة البيانات).
 *   3) تحليلها بالذكاء الاصطناعي (تصنيف + استخراج عقار) — للنص أو التعليق.
 *   4) إنشاء سجل العقار إن وُجد.
 *   5) إرسال رد تلقائي حسب التصنيف (داخل نافذة 24 ساعة فقط).
 *   6) تحويل الحالات المهمة لمتابعة يدوية.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeReply, DEFAULT_SYSTEM_PROMPT, type ChatMessage } from "@/lib/ai";
import { sendText, isWithin24hWindow } from "@/lib/whatsapp";
import { sendUnknownLeadEmail } from "@/lib/mail";

const GRAPH_VERSION = "v21.0";
const MEDIA_TYPES = ["image", "video", "document", "audio", "sticker"];

// ----- التحقق من الـ Webhook (يستدعيه Meta مرة واحدة عند الربط) -----
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// التصنيفات التي تتطلب متابعة يدوية فورية
const HIGH_PRIORITY = new Set(["Property Owner", "Broker", "Interested Buyer or Tenant"]);

async function getSetting(key: string, fallback: string): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

/**
 * يبني ملاحظة حالة تُلحق بالـ system prompt: ماذا نعرف بالفعل عن العقار،
 * وماذا ينقص، مع قواعد إلزامية تمنع النموذج من تكرار سؤال تمت الإجابة عليه.
 * هذا هو ما يوقف تكرار نفس السؤال (مثل «كام حمام؟») مرة بعد مرة.
 */
function buildStateNote(p: any): string {
  // الحقول التي نجمعها بالترتيب، مع تسميتها العربية
  const fields: [string, string][] = [
    ["paymentType", "نوع التعامل (بيع/إيجار)"],
    ["propertyType", "نوع العقار"],
    ["city", "المدينة"],
    ["area", "المنطقة / الكمبوند (المكان)"],
    ["sizeSqm", "المساحة بالمتر"],
    ["bedrooms", "عدد غرف النوم"],
    ["bathrooms", "عدد الحمامات"],
    ["furnishedStatus", "حالة الفرش"],
    ["price", "السعر"],
  ];

  const has = (k: string) =>
    p && p[k] !== null && p[k] !== undefined && String(p[k]).trim() !== "";

  const known = fields.filter(([k]) => has(k)).map(([k, lbl]) => `- ${lbl}: ${p[k]}`);
  const missing = fields.filter(([k]) => !has(k)).map(([, lbl]) => lbl);

  const knownBlock = known.length ? known.join("\n") : "لا يوجد بعد";
  const missingBlock = missing.length ? missing.join("، ") : "لا شيء — اكتملت البيانات الأساسية";

  return `

=== حالة جمع بيانات العقار (مهم جدًا لحقل suggestedReply) ===
البيانات المعروفة بالفعل عن عقار هذا العميل:
${knownBlock}

البيانات الناقصة: ${missingBlock}

قواعد إلزامية عند صياغة suggestedReply:
1) ممنوع منعًا باتًا تكرار سؤال عن بيانات معروفة بالفعل (المذكورة أعلاه) أو أجاب عنها العميل في رسالته الأخيرة.
2) اسأل عن بند واحد فقط من «البيانات الناقصة» في كل رد، بالترتيب من الأعلى للأسفل.
3) إذا كانت رسالة العميل الأخيرة إجابة على سؤالك السابق، اعتبرها مُسجَّلة، اشكره بإيجاز، ثم انتقل للبند الناقص التالي.
4) إذا لم يتبقَّ أي بند ناقص، لا تسأل أكثر — اشكر العميل وأخبره أنه سيتم التواصل معه قريبًا لعرض الوحدة.
5) لا تطرح أكثر من سؤال واحد في الرسالة الواحدة.`;
}

/**
 * تنزيل وسائط واردة من Meta:
 * 1) جلب رابط الوسائط المؤقّت عبر معرّف الوسائط.
 * 2) تنزيل البايتات (الرابط محمي بالتوكن وصالح ~5 دقائق فقط).
 */
async function downloadMedia(
  mediaId: string,
  accessToken: string
): Promise<{ data: Buffer; mimeType: string } | null> {
  try {
    const metaRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) {
      console.error("Media meta error:", await metaRes.text());
      return null;
    }
    const meta = await metaRes.json();
    const url: string | undefined = meta?.url;
    const mimeType: string = meta?.mime_type || "application/octet-stream";
    if (!url) return null;

    const binRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!binRes.ok) {
      console.error("Media download error:", binRes.status);
      return null;
    }
    const buf = Buffer.from(await binRes.arrayBuffer());
    return { data: buf, mimeType };
  } catch (e) {
    console.error("Media fetch exception:", (e as Error).message);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry = body?.entry?.[0]?.changes?.[0]?.value;
    if (!entry) return NextResponse.json({ ok: true });

    // ---------- تحديثات الحالة (تم التسليم/القراءة/الفشل) ----------
    if (entry.statuses) {
      for (const st of entry.statuses) {
        const map: Record<string, any> = {
          sent: "SENT",
          delivered: "DELIVERED",
          read: "READ",
          failed: "FAILED",
        };
        const status = map[st.status];
        if (status && st.id) {
          await prisma.campaignMessage.updateMany({
            where: { waMessageId: st.id },
            data: { status },
          });
        }
      }
      return NextResponse.json({ ok: true });
    }

    // ---------- رسائل واردة ----------
    const messages = entry.messages;
    if (!messages) return NextResponse.json({ ok: true });

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";

    for (const msg of messages) {
      const isText = msg.type === "text";
      const isMedia = MEDIA_TYPES.includes(msg.type);
      if (!isText && !isMedia) continue; // أنواع غير مدعومة (موقع/جهة اتصال…) نتجاهلها

      const fromPhone = "+" + msg.from; // واتساب يرسل الرقم بدون +
      const waMessageId: string = msg.id;

      // نص الرسالة أو تعليق الصورة (إن وُجد)
      const mediaObj = isMedia ? msg[msg.type] : null;
      const caption: string = isText ? msg.text?.body || "" : mediaObj?.caption || "";
      // النص الذي سيُعرض في المحادثة
      const displayBody = isText
        ? caption
        : caption || (msg.type === "image" ? "📷 صورة" : `📎 ${msg.type}`);

      // إيجاد أو إنشاء جهة الاتصال
      let contact = await prisma.contact.findUnique({ where: { phone: fromPhone } });
      if (!contact) {
        contact = await prisma.contact.create({
          data: { phone: fromPhone, source: "incoming", optIn: true, optInDate: new Date() },
        });
      }

      // إيجاد أو إنشاء المحادثة
      let conversation = await prisma.conversation.findUnique({
        where: { contactId: contact.id },
      });
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { contactId: contact.id, status: "NEW" },
        });
      }

      // تجنّب التكرار عبر waMessageId الفريد
      const exists = await prisma.message.findUnique({ where: { waMessageId } });
      if (exists) continue;

      // حفظ الرسالة الواردة
      const savedMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: "INBOUND",
          body: displayBody,
          waMessageId,
        },
      });

      // ---------- حفظ الوسائط (الصور…) ----------
      if (isMedia && mediaObj?.id && accessToken) {
        const media = await downloadMedia(mediaObj.id, accessToken);
        if (media) {
          await prisma.mediaAsset.create({
            data: {
              conversationId: conversation.id,
              messageId: savedMessage.id,
              waMediaId: mediaObj.id,
              mimeType: media.mimeType,
              caption: caption || null,
              data: media.data,
            },
          });
        }
      }

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date(), lastInboundAt: new Date() },
      });

      // تحديث حالة رسالة الحملة المرتبطة إلى "تم الرد"
      await prisma.campaignMessage.updateMany({
        where: { contactId: contact.id, status: { in: ["SENT", "DELIVERED", "READ"] } },
        data: { status: "REPLIED" },
      });

      // ---------- التحليل بالذكاء الاصطناعي ----------
      // نحلّل فقط إن كان هناك نص أو تعليق على الصورة
      const analyzable = (caption || "").trim();
      if (!analyzable) continue; // صورة بدون تعليق: نحفظها فقط دون تحليل

      const provider = (await getSetting("ai_provider", process.env.AI_PROVIDER || "gemini")) as
        | "openai"
        | "claude"
        | "gemini";
      const basePrompt = await getSetting("ai_prompt", DEFAULT_SYSTEM_PROMPT);

      // جلب آخر 15 رسالة من المحادثة كذاكرة للنموذج (الأحدث، بترتيب زمني صحيح)
      const recentMessages = (
        await prisma.message.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: "desc" }, // الأحدث أولًا…
          take: 15,
        })
      ).reverse(); // …ثم نعكسها لتصبح قديم → جديد
      const history: ChatMessage[] = recentMessages
        .filter((m) => m.id !== savedMessage.id) // استبعاد الرسالة الحالية (ستُضاف كـ user)
        .map((m) => ({
          role: m.direction === "INBOUND" ? "user" : "assistant",
          content: m.body || "",
        }));

      // ما هو معروف بالفعل عن عقار هذه المحادثة — لمنع تكرار الأسئلة
      const knownProp = await prisma.property.findFirst({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "asc" },
      });
      const systemPrompt = basePrompt + buildStateNote(knownProp);

      const { result, provider: usedProvider } = await analyzeReply(analyzable, {
        provider,
        systemPrompt,
        history,
      });

      // إخطار بالإيميل عندما لا يستطيع الذكاء الاصطناعي الرد (فشل التحليل أو تصنيف غير محدد)
      if (!result || result.leadClassification === "Unknown") {
        try {
          await sendUnknownLeadEmail({
            phone: fromPhone,
            message: analyzable,
            name: contact.name,
          });
        } catch (e) {
          console.error("notify email error:", (e as Error).message);
        }
      }

      if (result) {
        await prisma.aiAnalysis.create({
          data: {
            conversationId: conversation.id,
            sourceMessage: analyzable,
            classification: result.leadClassification,
            confidence: result.confidence ?? 0,
            recommendedAction: result.recommendedAction,
            suggestedReply: result.suggestedReply,
            rawJson: result as any,
            provider: usedProvider,
          },
        });

        const needsFollowUp = HIGH_PRIORITY.has(result.leadClassification);
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            classification: result.leadClassification,
            aiSummary: result.recommendedAction,
            status: needsFollowUp ? "NEEDS_FOLLOWUP" : "IN_PROGRESS",
          },
        });

        // ---------- سجل العقار: أنشئ أو كمّل بأي بيانات جديدة من كلام الزبون ----------
        const hasAnyPropertyField =
          result.property && Object.values(result.property).some((v) => v !== null && v !== undefined && v !== "");
        if (hasAnyPropertyField) {
          const p = result.property!;
          // الذكاء الاصطناعي قد يُرجع رقمًا مكان نص أو العكس — لذلك نحوّل كل حقل لنوعه الصحيح
          const toStr = (v: unknown) =>
            v === null || v === undefined || v === "" ? undefined : String(v);
          const toInt = (v: unknown) => {
            if (v === null || v === undefined || v === "") return undefined;
            const n = parseInt(String(v).replace(/[^\d-]/g, ""), 10);
            return Number.isNaN(n) ? undefined : n;
          };
          const toFloat = (v: unknown) => {
            if (v === null || v === undefined || v === "") return undefined;
            const n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
            return Number.isNaN(n) ? undefined : n;
          };

          // الحقول المستخرجة (غير الفارغة فقط) — لدمجها مع السجل الحالي
          const incoming: Record<string, any> = {
            city: toStr(p.city),
            area: toStr(p.area),
            sizeSqm: toFloat(p.sizeSqm),
            propertyType: toStr(p.propertyType),
            unitType: toStr(p.unitType),
            bedrooms: toInt(p.bedrooms),
            bathrooms: toInt(p.bathrooms),
            floor: toStr(p.floor),
            furnishedStatus: toStr(p.furnishedStatus),
            price: toFloat(p.price),
            paymentType: toStr(p.paymentType),
            availability: toStr(p.availability),
            ownerPhone: toStr(p.ownerPhone) ?? fromPhone,
            notes: toStr(p.notes),
          };
          // أزل المفاتيح الفارغة حتى لا نمسح بيانات سابقة بقيم ناقصة
          Object.keys(incoming).forEach((k) => incoming[k] === undefined && delete incoming[k]);

          // عقار واحد لكل محادثة: حدّث الموجود (وكمّل الناقص) ولا تُنشئ نسخة جديدة
          const existingProp = await prisma.property.findFirst({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: "asc" },
          });

          if (existingProp) {
            // قاعدة الدمج:
            //  - القيمة الفارغة الواردة لا تمسح بيانات موجودة (نتجاهلها).
            //  - إن كان الحقل فارغًا في السجل → نملؤه.
            //  - إن وصلت قيمة جديدة غير فارغة ومختلفة عن المخزّنة → نُحدّثها،
            //    لأن آخر كلام صريح من العميل هو المصدر الأصح (يسمح بالتصحيح:
            //    تغيير المنطقة، أو بيع↔إيجار، أو السعر… إلخ).
            const merged: Record<string, any> = {};
            for (const [key, val] of Object.entries(incoming)) {
              if (val === undefined || val === null || val === "") continue; // لا نمسح بقيمة فارغة
              const current = (existingProp as any)[key];
              const isEmpty = current === null || current === undefined || current === "";
              if (isEmpty) {
                merged[key] = val; // إكمال الناقص
              } else if (String(current) !== String(val)) {
                merged[key] = val; // تصحيح: العميل أعطى قيمة جديدة مختلفة
              }
            }
            // ملاحظات: ادمج بدل الاستبدال
            if (incoming.notes && existingProp.notes && incoming.notes !== existingProp.notes) {
              merged.notes = `${existingProp.notes}\n${incoming.notes}`;
            }
            if (Object.keys(merged).length > 0) {
              await prisma.property.update({ where: { id: existingProp.id }, data: merged });
            }
          } else {
            await prisma.property.create({
              data: {
                ownerContactId: contact.id,
                conversationId: conversation.id,
                ...incoming,
              },
            });
          }
        }

        // ---------- إنشاء مهمة متابعة للحالات المهمة ----------
        if (needsFollowUp) {
          await prisma.followUp.create({
            data: {
              contactId: contact.id,
              dueDate: new Date(Date.now() + 24 * 36e5),
              priority: "HIGH",
              notes: `تصنيف تلقائي: ${result.leadClassification}`,
            },
          });
        }

        // ---------- الرد التلقائي (داخل نافذة 24 ساعة فقط) ----------
        const updatedConv = await prisma.conversation.findUnique({
          where: { id: conversation.id },
        });
        if (isWithin24hWindow(updatedConv?.lastInboundAt) && result.suggestedReply) {
          const autoReplyEnabled =
            (await getSetting(`autoreply_${result.leadClassification}`, "on")) === "on";
          if (autoReplyEnabled) {
            const sent = await sendText(fromPhone, result.suggestedReply);
            if (sent.ok) {
              await prisma.message.create({
                data: {
                  conversationId: conversation.id,
                  direction: "OUTBOUND",
                  body: result.suggestedReply,
                  waMessageId: sent.waMessageId,
                  isAutoReply: true,
                },
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Webhook error:", (e as Error).message);
    // نُرجع 200 دائمًا حتى لا يعيد Meta الإرسال بلا توقف
    return NextResponse.json({ ok: true });
  }
}
