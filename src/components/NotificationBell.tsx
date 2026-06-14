"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell } from "lucide-react";

/**
 * أيقونة جرس ظاهرة في أعلى كل صفحة:
 *  - تعرض عدّاد أحمر بعدد المتابعات المعلّقة.
 *  - عند وصول متابعة جديدة: صوت جرس + إشعار المتصفح.
 *  - الضغط عليها يفتح صفحة المتابعات.
 */
export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [pulse, setPulse] = useState(false);
  const lastCount = useRef<number | null>(null);

  const beep = () => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      if (ctx.state === "suspended") ctx.resume();
      const play = (freq: number, start: number) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
        g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + 0.45);
        o.start(ctx.currentTime + start);
        o.stop(ctx.currentTime + start + 0.45);
      };
      play(880, 0);
      play(1175, 0.18);
    } catch {}
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const check = async () => {
      try {
        const r = await fetch("/api/follow-ups");
        if (!r.ok) return;
        const d = await r.json();
        const pending = (d.followUps || []).filter((f: any) => f.status === "PENDING").length;
        setCount(pending);
        if (lastCount.current !== null && pending > lastCount.current) {
          beep();
          setPulse(true);
          setTimeout(() => setPulse(false), 3000);
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("عقار واتساب 🔔", { body: "عميل جديد يحتاج متابعة" });
          }
        }
        lastCount.current = pending;
      } catch {}
    };

    check();
    const t = setInterval(check, 25000);
    return () => clearInterval(t);
  }, []);

  // لا تظهر في صفحة الدخول
  if (pathname?.includes("/login")) return null;

  return (
    <button
      onClick={() => router.push("/follow-ups")}
      title="المتابعات المطلوبة"
      className={`fixed top-4 left-4 z-40 w-11 h-11 rounded-full bg-white shadow-md border border-black/5 grid place-items-center hover:bg-sand transition-colors ${
        pulse ? "animate-bounce" : ""
      }`}
    >
      <Bell className={`w-5 h-5 ${count > 0 ? "text-brand-600" : "text-ink-800/50"}`} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold grid place-items-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
