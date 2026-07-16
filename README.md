# Needle

Interface inicial do gestor pessoal de demandas da Pine Collective.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. O protótipo persiste as demandas no `localStorage` do navegador (chave `needle:tasks`), então elas sobrevivem a recarregamentos — mas ainda são locais ao dispositivo. O schema inicial para Supabase está em `supabase/schema.sql` e **ainda não está conectado ao app** (próximo passo: trocar o estado local por uma camada de dados via Supabase).
