export { default } from "next-auth/middleware";

// حماية كل المسارات ما عدا الدخول والـ API العامة (Webhook/Cron محميّة بآليتها الخاصة)
export const config = {
  matcher: [
    "/((?!login|api/auth|api/whatsapp/webhook|api/cron|_next/static|_next/image|favicon.ico).*)",
  ],
};
