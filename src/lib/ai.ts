/**
 * محرّك تحليل الردود بالذكاء الاصطناعي.
 * يدعم: OpenAI و Claude (Anthropic) و Gemini (Google - مجاني).
 * نسخة محسّنة: تسجّل الرد الخام من Gemini وتحلّل JSON بمرونة أكبر.
 * مفتاح Gemini يُرسَل عبر ترويسة x-goog-api-key (يدعم صيغة المفاتيح الجديدة .AQ).
 */
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export type LeadClassification =
  | "Property Owner"
  | "Broker"
  | "Not Interested"
  | "Contact Later"
  | "Property Rented"
  | "Property Not Available"
  | "Wrong Number"
  | "Interested Buyer or Tenant"
  | "Unknown";

export interface AiResult {
  leadClassification: LeadClassification;
  confidence: number;
  property: {
    city?: string | null;
    area?: string | null;
    sizeSqm?: number | null;
    propertyType?: string | null;
    unitType?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    floor?: string | null;
    furnishedStatus?: string | null;
    price?: number | null;
    paymentType?: string | null;
    availability?: string | null;
    ownerPhone?: string | null;
    notes?: string | null;
  } | null;
  recommendedAction: string;
  suggestedReply: string;
}

export const DEFAULT_SYSTEM_PROMPT = `أنت مساعد متخصص في تحليل ردود العملاء لشركة تسويق عقاري في مصر.
ستصلك رسالة من عميل ردًّا على رسالة تسويقية. مهمتك:
1) تصنيف العميل إلى واحدة من القيم التالية فقط (بالإنجليزية كما هي):
   Property Owner, Broker, Not Interested, Contact Later, Property Rented,
   Property Not Available, Wrong Number, Interested Buyer or Tenant, Unknown
2) استخراج بيانات العقار من الرسالة إن وُجدت.
3) اقتراح رد مهذّب مناسب باللهجة المصرية.

مهم جدًا: قيمة leadClassification يجب أن تبقى بالإنجليزية تمامًا كما في القائمة أعلاه (لا تترجمها).
أمّا باقي حقول property (city, area, propertyType, unitType, furnishedStatus, paymentType, availability, notes)
وكذلك recommendedAction، فاكتبها كلها بالعربية. أمثلة: شقة، فيلا، مفروش، غير مفروش، نص فرش، إيجار، بيع، متاح، تم التأجير، القاهرة، مدينة نصر، متابعة يدوية.

تمييز إلزامي بين حقلين قد يختلطان:
- area = «المنطقة / المكان / الكمبوند» (مثل: مدينة العبور، التجمع الخامس، مدينة نصر). نص فقط، وليست رقمًا.
- sizeSqm = «المساحة بالمتر المربع» رقم فقط (مثل: 200 متر => 200). ضع الرقم فقط بدون كلمة «متر».
ممنوع وضع المساحة (الأرقام) في حقل area، وممنوع وضع اسم المنطقة في حقل sizeSqm.

افهم العامية المصرية جيدًا. أمثلة:
- "العقار اتأجر" => Property Rented
- "مش مهتم" => Not Interested
- "اتصل بيا بعدين" => Contact Later
- "انا صاحب الشقة" / "عندي شقة" => Property Owner
- "انا سمسار" => Broker
- "غلط" => Wrong Number

أرجع JSON فقط بدون أي نص إضافي وبدون علامات Markdown، بهذا الشكل تمامًا:
{
  "leadClassification": "Property Owner",
  "confidence": 0.0,
  "property": {
    "city": null, "area": null, "sizeSqm": null, "propertyType": null, "unitType": null,
    "bedrooms": null, "bathrooms": null, "floor": null, "furnishedStatus": null,
    "price": null, "paymentType": null, "availability": null,
    "ownerPhone": null, "notes": null
  },
  "recommendedAction": "Manual follow-up",
  "suggestedReply": "..."
}
إن لم تتوفر بيانات عقار اجعل property = null. confidence بين 0 و 1.

تحذير صارم: استخدم أسماء الحقول الإنجليزية بالضبط كما هي أعلاه
(leadClassification, confidence, property, propertyType, bedrooms, price, area, city, recommendedAction, suggestedReply).
ممنوع منعًا باتًا اختراع أسماء حقول أخرى مثل property_type أو number_of_rooms أو budget أو location.
الحقل leadClassification إجباري دائمًا ويجب أن يكون من القائمة المذكورة.`;

/** تطبيع الناتج: ينقذ البيانات حتى لو استخدم النموذج أسماء حقول مختلفة. */
function normalize(obj: any): AiResult | null {
  if (!obj || typeof obj !== "object") return null;

  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
      if (obj.property && obj.property[k] !== undefined && obj.property[k] !== null && obj.property[k] !== "")
        return obj.property[k];
    }
    return undefined;
  };

  const cls = obj.leadClassification || obj.classification || "Unknown";

  // اجمع بيانات العقار من الأسماء القياسية أو البدائل الشائعة (إنجليزية وعربية)
  const property = {
    city: pick("city", "governorate", "المحافظة"),
    area: pick("area", "location", "district", "neighborhood", "المنطقة", "العنوان", "الموقع", "نوع_المنطقة"),
    sizeSqm: pick("sizeSqm", "size", "areaSize", "spaceSqm", "squareMeters", "sqm", "المساحة", "مساحة", "المساحه"),
    propertyType: pick("propertyType", "property_type", "type", "نوع_العقار", "النوع", "نوع العقار"),
    unitType: pick("unitType", "unit_type", "نوع_الوحدة"),
    bedrooms: pick("bedrooms", "number_of_rooms", "rooms", "roomsCount", "عدد_الغرف", "الغرف", "عدد الغرف"),
    bathrooms: pick("bathrooms", "number_of_bathrooms", "الحمامات", "عدد_الحمامات"),
    floor: pick("floor", "الدور", "الطابق"),
    furnishedStatus: pick("furnishedStatus", "furnished", "furnishing", "الفرش", "حالة_الفرش", "التشطيب"),
    price: pick("price", "budget", "amount", "السعر", "الميزانية", "المبلغ"),
    paymentType: pick("paymentType", "payment_type", "dealType", "deal_type", "نوع_التعامل", "نوع_الدفع", "طريقة_الدفع"),
    availability: pick("availability", "status", "التوفر", "الحالة", "متاح"),
    ownerPhone: pick("ownerPhone", "owner_phone", "phone", "الهاتف", "رقم_الهاتف"),
    notes: pick("notes", "note", "ملاحظات", "تفاصيل"),
  };

  const hasProperty = Object.values(property).some((v) => v !== undefined);

  return {
    leadClassification: cls,
    confidence: typeof obj.confidence === "number" ? obj.confidence : 0,
    property: hasProperty ? (property as AiResult["property"]) : null,
    recommendedAction: obj.recommendedAction || "متابعة يدوية",
    suggestedReply: obj.suggestedReply || "",
  };
}

/** تحليل JSON بمرونة: يزيل أسوار Markdown ويستخرج أول كائن JSON من النص. */
function safeParse(raw: string): AiResult | null {
  if (!raw) return null;
  let cleaned = raw.trim();
  // إزالة أسوار ```json ... ```
  cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  // محاولة أولى: تحليل مباشر
  try {
    const obj = JSON.parse(cleaned);
    const norm = normalize(obj);
    if (norm) return norm;
  } catch {}
  // محاولة ثانية: استخراج أول { ... } من النص
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]);
      const norm = normalize(obj);
      if (norm) return norm;
    } catch {}
  }
  return null;
}

/** رسالة واحدة في سجل المحادثة تُرسَل للنموذج */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function analyzeWithOpenAI(
  message: string,
  systemPrompt: string,
  history: ChatMessage[] = []
): Promise<AiResult | null> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const resp = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: `رسالة العميل:\n"""${message}"""` },
    ],
  });
  return safeParse(resp.choices[0]?.message?.content || "");
}

async function analyzeWithClaude(
  message: string,
  systemPrompt: string,
  history: ChatMessage[] = []
): Promise<AiResult | null> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const resp = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: `رسالة العميل:\n"""${message}"""\n\nأرجع JSON فقط.` },
    ],
  });
  const block = resp.content.find((b) => b.type === "text") as { type: "text"; text: string } | undefined;
  return safeParse(block?.text || "");
}

async function analyzeWithGemini(
  message: string,
  systemPrompt: string,
  history: ChatMessage[] = []
): Promise<AiResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  if (!apiKey) throw new Error("GEMINI_API_KEY غير موجود");

  // ندمج التعليمات مع الرسالة (أكثر توافقًا عبر إصدارات Gemini)
  // بناء سجل المحادثة كـ contents متعددة (صيغة Gemini multi-turn)
  const historyContents = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [
          ...historyContents,
          { role: "user", parts: [{ text: message }] },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          // فرض البنية الدقيقة للحقول (يمنع النموذج من اختراع أسماء عربية/مختلفة)
          responseSchema: {
            type: "object",
            properties: {
              leadClassification: {
                type: "string",
                enum: [
                  "Property Owner",
                  "Broker",
                  "Not Interested",
                  "Contact Later",
                  "Property Rented",
                  "Property Not Available",
                  "Wrong Number",
                  "Interested Buyer or Tenant",
                  "Unknown",
                ],
              },
              confidence: { type: "number" },
              property: {
                type: "object",
                nullable: true,
                properties: {
                  city: { type: "string", nullable: true },
                  area: { type: "string", nullable: true },
                  sizeSqm: { type: "number", nullable: true },
                  propertyType: { type: "string", nullable: true },
                  unitType: { type: "string", nullable: true },
                  bedrooms: { type: "integer", nullable: true },
                  bathrooms: { type: "integer", nullable: true },
                  floor: { type: "string", nullable: true },
                  furnishedStatus: { type: "string", nullable: true },
                  price: { type: "number", nullable: true },
                  paymentType: { type: "string", nullable: true },
                  availability: { type: "string", nullable: true },
                  ownerPhone: { type: "string", nullable: true },
                  notes: { type: "string", nullable: true },
                },
              },
              recommendedAction: { type: "string" },
              suggestedReply: { type: "string" },
            },
            required: ["leadClassification", "suggestedReply"],
          },
        },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    console.error("Gemini HTTP error:", JSON.stringify(data));
    throw new Error(data?.error?.message || `Gemini HTTP ${res.status}`);
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  // طباعة الرد الخام للتشخيص
  console.log("=== Gemini raw response ===");
  console.log(text);
  console.log("===========================");
  return safeParse(text);
}

export async function analyzeReply(
  message: string,
  opts?: {
    provider?: "openai" | "claude" | "gemini";
    systemPrompt?: string;
    history?: ChatMessage[];
  }
): Promise<{ result: AiResult | null; provider: string }> {
  const provider =
    opts?.provider || (process.env.AI_PROVIDER as "openai" | "claude" | "gemini") || "gemini";
  const systemPrompt = opts?.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  const history = opts?.history || [];

  try {
    let result: AiResult | null = null;
    if (provider === "claude") result = await analyzeWithClaude(message, systemPrompt, history);
    else if (provider === "gemini") result = await analyzeWithGemini(message, systemPrompt, history);
    else result = await analyzeWithOpenAI(message, systemPrompt, history);
    if (!result) console.error("AI parse failed: could not extract JSON from model response");
    return { result, provider };
  } catch (e) {
    console.error("AI analysis error:", (e as Error).message);
    return { result: null, provider };
  }
}
