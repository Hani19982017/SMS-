/**
 * ترجمة القيم الإنجليزية القادمة من الذكاء الاصطناعي إلى العربية عند العرض.
 * يغطّي: أنواع العقارات، حالة الفرش، التوفر، نوع الدفع، الإجراء المقترح، وأشهر المناطق.
 * إن لم تُعرف القيمة، تُعرض كما هي (الأرقام والنصوص العربية تمرّ دون تغيير).
 */
const DICT: Record<string, string> = {
  // أنواع العقار
  apartment: "شقة",
  flat: "شقة",
  villa: "فيلا",
  duplex: "دوبلكس",
  studio: "استوديو",
  penthouse: "بنتهاوس",
  chalet: "شاليه",
  office: "مكتب",
  shop: "محل",
  store: "محل",
  land: "أرض",
  building: "عمارة",
  townhouse: "تاون هاوس",
  "twin house": "توين هاوس",
  room: "غرفة",
  house: "منزل",
  warehouse: "مخزن",
  clinic: "عيادة",

  // حالة الفرش
  furnished: "مفروش",
  unfurnished: "غير مفروش",
  "not furnished": "غير مفروش",
  "semi-furnished": "نص فرش",
  "semi furnished": "نص فرش",

  // التوفر
  available: "متاح",
  "not available": "غير متاح",
  unavailable: "غير متاح",
  rented: "تم التأجير",
  sold: "تم البيع",
  reserved: "محجوز",

  // نوع الدفع
  rent: "إيجار",
  "for rent": "للإيجار",
  sale: "بيع",
  "for sale": "للبيع",
  cash: "كاش",
  installment: "تقسيط",
  installments: "تقسيط",

  // الإجراء المقترح / الملخص
  "manual follow-up": "متابعة يدوية",
  "manual followup": "متابعة يدوية",
  "auto-replied": "تم الرد تلقائيًا",
  "auto replied": "تم الرد تلقائيًا",
  "no action": "لا إجراء",
  "follow up": "متابعة",
  "follow-up": "متابعة",

  // أشهر المناطق في مصر
  cairo: "القاهرة",
  "nasr city": "مدينة نصر",
  "new cairo": "القاهرة الجديدة",
  giza: "الجيزة",
  maadi: "المعادي",
  heliopolis: "مصر الجديدة",
  "6th of october": "السادس من أكتوبر",
  "sixth of october": "السادس من أكتوبر",
  "sheikh zayed": "الشيخ زايد",
  alexandria: "الإسكندرية",
  mansoura: "المنصورة",
  zamalek: "الزمالك",
  dokki: "الدقي",
  mohandessin: "المهندسين",
  shubra: "شبرا",
  helwan: "حلوان",
  obour: "العبور",
  rehab: "الرحاب",
  tagamoa: "التجمع",
  "downtown": "وسط البلد",
};

/** يحوّل قيمة واحدة إلى العربية إن عُرفت، وإلا يعيدها كما هي. الفارغ يصبح «—». */
export function toAr(v?: string | number | null): string {
  if (v === null || v === undefined || v === "") return "—";
  const key = String(v).trim().toLowerCase();
  return DICT[key] || String(v);
}
