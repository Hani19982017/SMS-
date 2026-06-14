"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) setError("بيانات الدخول غير صحيحة");
    else router.push("/");
  }

  return (
    <div className="min-h-screen grid place-items-center dotted-bg">
      <div className="card p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 grid place-items-center mb-3">
            <Home className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-display text-2xl font-extrabold">عقار واتساب</h1>
          <p className="text-sm text-ink-800/50">تسجيل الدخول للوحة التحكم</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input type="email" required placeholder="البريد الإلكتروني" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-500 outline-none" />
          <input type="password" required placeholder="كلمة المرور" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-500 outline-none" />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button className="w-full py-2.5 rounded-xl bg-brand-500 text-white font-semibold">دخول</button>
        </form>
      </div>
    </div>
  );
}
