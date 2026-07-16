-- Schema do Needle — idempotente: pode ser executado novamente sem erro.
-- (usa IF NOT EXISTS / DROP ... IF EXISTS para não abortar em objetos já criados)

-- Para recomeçar do zero (ATENÇÃO: APAGA TODOS OS DADOS), descomente a linha abaixo:
-- DROP TABLE IF EXISTS tasks, columns, workspaces CASCADE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL CHECK (position >= 0),
  is_completion BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, position)
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  column_id UUID REFERENCES columns(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'Média' CHECK (priority IN ('Alta', 'Média', 'Baixa')),
  due_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_workspace_id_idx ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS tasks_column_id_idx ON tasks(column_id);
CREATE INDEX IF NOT EXISTS tasks_open_created_idx ON tasks(is_completed, created_at DESC);
CREATE INDEX IF NOT EXISTS columns_workspace_position_idx ON columns(workspace_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS columns_one_completion_per_workspace_idx ON columns(workspace_id) WHERE is_completion;

-- Mantém a conclusão sincronizada com a etapa terminal do workspace.
CREATE OR REPLACE FUNCTION sync_task_completion_from_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.is_completed := COALESCE(
    (SELECT is_completion FROM columns WHERE id = NEW.column_id),
    false
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_sync_completion ON tasks;
CREATE TRIGGER tasks_sync_completion
BEFORE INSERT OR UPDATE OF column_id, is_completed ON tasks
FOR EACH ROW EXECUTE FUNCTION sync_task_completion_from_column();

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- MVP pessoal: substitua por políticas vinculadas a user_id quando ativar autenticação.
DROP POLICY IF EXISTS "authenticated users manage workspaces" ON workspaces;
CREATE POLICY "authenticated users manage workspaces" ON workspaces FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated users manage columns" ON columns;
CREATE POLICY "authenticated users manage columns" ON columns FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated users manage tasks" ON tasks;
CREATE POLICY "authenticated users manage tasks" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
