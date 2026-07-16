"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { Loader2, LogIn } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) setError("E-mail ou senha inválidos.");
    // Em caso de sucesso, o onAuthStateChange do app assume e troca a tela.
  };

  return (
    <main className="grid min-h-screen place-items-center bg-ink px-5 text-zinc-200">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex items-center justify-center gap-3.5" aria-label="Needle by Pine Collective">
          <Image src="/brand/fav-icon.png" alt="" width={30} height={46} priority className="h-[46px] w-[30px] object-contain" />
          <div>
            <p className="text-[26px] font-medium leading-none tracking-[-0.04em] text-[#dbe4df]">needle</p>
            <p className="mt-1.5 text-[8px] font-medium uppercase tracking-[0.23em] text-[#789181]">by Pine Collective</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-line bg-panel/60 p-7 shadow-soft">
          <h1 className="text-[19px] font-medium text-white">Entrar</h1>
          <p className="mt-1.5 text-[13px] text-zinc-500">Acesse suas demandas.</p>

          <label className="mt-6 block">
            <span className="mb-2 block text-[12px] font-medium text-zinc-400">E-mail</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
              className="h-12 w-full rounded-lg border border-line bg-[#111613] px-3.5 text-[15px] text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-pine focus:ring-2 focus:ring-pine/20"
              placeholder="voce@exemplo.com"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-[12px] font-medium text-zinc-400">Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
              className="h-12 w-full rounded-lg border border-line bg-[#111613] px-3.5 text-[15px] text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-pine focus:ring-2 focus:ring-pine/20"
              placeholder="••••••••"
            />
          </label>

          {error && <p role="alert" className="mt-4 text-[13px] text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#315c49] text-[14px] font-medium text-white transition hover:bg-[#3a6b56] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
