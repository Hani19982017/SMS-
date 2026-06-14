"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Send, MessageSquare, Target,
  Building2, CalendarClock, Settings, Home, FileText, Phone,
} from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/contacts", label: "جهات الاتصال", icon: Users },
  { href: "/campaigns", label: "الحملات", icon: Send },
  { href: "/templates", label: "القوالب", icon: FileText },
  { href: "/numbers", label: "أرقام واتساب", icon: Phone },
  { href: "/conversations", label: "المحادثات", icon: MessageSquare },
  { href: "/leads", label: "العملاء المحتملون", icon: Target },
  { href: "/properties", label: "العقارات", icon: Building2 },
  { href: "/follow-ups", label: "المتابعات", icon: CalendarClock },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

export function Sidebar() {
  const path = usePathname();
  if (path === "/login") return null;

  return (
    <aside className="w-64 shrink-0 bg-ink-900 text-white/90 flex flex-col">
      <div className="px-6 py-6 flex items-center gap-3 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-brand-500 grid place-items-center">
          <Home className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-display font-extrabold text-lg leading-tight">عقار واتساب</div>
          <div className="text-xs text-white/50">إدارة العملاء والعقارات</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                active ? "bg-brand-500 text-white font-semibold" : "hover:bg-white/5 text-white/70"
              )}
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-4 text-xs text-white/40 border-t border-white/10">
        WhatsApp Business API الرسمي
      </div>
    </aside>
  );
}
