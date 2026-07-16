# Needle

Gestor pessoal de demandas da Pine Collective.

## Rodar localmente

```bash
npm install
cp .env.local.example .env.local   # preencha com URL + publishable key do Supabase
npm run dev
```

Abra `http://localhost:3000`.

## Supabase

O app usa Supabase para **login** (email/senha) e **persistência** das demandas, com Row Level Security por usuário. Os espaços e etapas são constantes no app; só as tarefas ficam no banco.

Configuração inicial (uma vez):

1. **Schema:** rode `supabase/schema.sql` no SQL Editor do Supabase.
2. **Usuário:** Authentication → Users → *Add user* → seu email + senha, marque *Auto Confirm User*.
3. **Sem cadastro público:** Authentication → *Sign In / Providers* → Email → desligue *Allow new users to sign up* (app de usuário único).
4. **Variáveis de ambiente** (local em `.env.local`, e nas *Environment Variables* da Vercel):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a *publishable key* — segura no navegador; a proteção real é a RLS)

> `.env.local` está no `.gitignore` e nunca deve ser commitado.
