"use client";
import { useEffect, useState } from "react";
import {
  Users, Send, CheckCheck, MessageSquare, Building2,
  UserCheck, Briefcase, CalendarClock,
} from "lucide-react";

interface Stats {
  totalContacts: number; totalSent: number; deliveryRate: number; replyRate: number;
  owners: number; brokers: number; availableProps: number; followUps: number;
}

const CARDS = [
  { key: "totalContacts", label: "إجمالي جهات الاتصال", icon: Users, suffix: "" },
  { key: "totalSent", label: "الرسائل المرسلة", icon: Send, suffix: "" },
  { key: "deliveryRate", label: "نسبة التسليم", icon: CheckCheck, suffix: "%" },
  { key: "replyRate", label: "نسبة الرد", icon: MessageSquare, suffix: "%" },
  { key: "owners", label: "ملاك عقارات", icon: UserCheck, suffix: "" },
  { key: "brokers", label: "وسطاء", icon: Briefcase, suffix: "" },
  { key: "availableProps", label: "عقارات متاحة", icon: Building2, suffix: "" },
  { key: "followUps", label: "متابعات مطلوبة", icon: CalendarClock, suffix: "" },
] as const;

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-ink-900">لوحة التحكم</h1>
        <p className="text-ink-800/60 mt-1">نظرة عامة على أداء حملات واتساب والعملاء</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map(({ key, label, icon: Icon, suffix }) => (
          <div key={key} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-ink-800/60">{label}</span>
              <div className="w-9 h-9 rounded-lg bg-brand-50 grid place-items-center">
                <Icon className="w-[18px] h-[18px] text-brand-600" />
              </div>
            </div>
            <div className="font-display text-3xl font-extrabold text-ink-900">
              {stats ? stats[key as keyof Stats] : "—"}
              <span className="text-lg">{suffix}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6 mt-8">
        <h2 className="font-display text-xl font-bold mb-2">الخطوات التالية للتشغيل</h2>
        <ol className="list-decimal pr-5 space-y-2 text-sm text-ink-800/80 leading-relaxed">
          <li>أدخل بيانات WhatsApp Cloud API في صفحة الإعدادات (أو متغيرات البيئة).</li>
          <li>اربط الـ Webhook على Meta باستخدام رابط /api/whatsapp/webhook ورمز التحقق.</li>
          <li>ارفع جهات الاتصال من ملف Excel/CSV مع تفعيل حقل الموافقة (opt-in).</li>
          <li>أنشئ قالب رسالة معتمدًا من Meta، ثم أنشئ حملة وابدأ الإرسال.</li>
        </ol>
      </div>
    </div>
  );
}
