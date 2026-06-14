import "./globals.css";
import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";
import { Providers } from "@/components/Providers";
import { NotificationBell } from "@/components/NotificationBell";

export const metadata: Metadata = {
  title: "عقار واتساب — نظام التسويق العقاري",
  description: "نظام متكامل للتسويق العقاري عبر واتساب بتحليل ذكاء اصطناعي",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen">
        <Providers>
          <NotificationBell />
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 dotted-bg overflow-x-hidden">
              <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
