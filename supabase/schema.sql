-- Needle — schema (single-user, RLS por usuário).
-- Os espaços ("workspaces") e etapas ("columns") são constantes no app, com IDs
-- em texto ('brasil', 'brasil-todo'...). Aqui persistimos apenas as tarefas,
-- isoladas por usuário via Row Level Security.
--
-- Rode este arquivo no SQL Editor do Supabase. É seguro reexecutar: ele recria
-- a tabela `tasks` do zero (o protótipo não tinha dados reais).

create extension if not exists pgcrypto;

-- Remove o modelo antigo do protótipo (tabelas vazias).
drop table if exists tasks cascade;
drop table if exists columns cascade;
drop table if exists workspaces cascade;
drop function if exists sync_task_completion_from_column();

create table tasks (
  id           text primary key,                        -- código exibido, ex: 'NDL-104'
  user_id      uuid not null default auth.uid()
                 references auth.users(id) on delete cascade,
  workspace_id text not null,                            -- slug do espaço ('brasil', 'pine'...)
  column_id    text not null,                            -- slug da etapa ('brasil-todo'...)
  title        text not null check (length(trim(title)) > 0),
  description  text,
  priority     text not null default 'Média' check (priority in ('Alta', 'Média', 'Baixa')),
  due          date,
  completed    boolean not null default false,
  created_at   timestamptz not null default now()
);

create index tasks_user_created_idx on tasks(user_id, created_at desc);

alter table tasks enable row level security;

-- Cada usuário só enxerga/edita as próprias tarefas.
drop policy if exists "users manage their own tasks" on tasks;
create policy "users manage their own tasks"
  on tasks for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on tasks to authenticated;
