import { getSupabase } from "./supabase";

export type Priority = "Alta" | "Média" | "Baixa";

export type Task = {
  id: string;
  workspaceId: string;
  columnId: string;
  title: string;
  description?: string;
  priority: Priority;
  due?: string;
  completed?: boolean;
};

// Linha como armazenada no Postgres (snake_case; user_id é preenchido pelo default auth.uid()).
type TaskRow = {
  id: string;
  workspace_id: string;
  column_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  due: string | null;
  completed: boolean;
};

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    columnId: row.column_id,
    title: row.title,
    description: row.description ?? undefined,
    priority: row.priority,
    due: row.due ?? undefined,
    completed: row.completed,
  };
}

function toRow(task: Task) {
  return {
    workspace_id: task.workspaceId,
    column_id: task.columnId,
    title: task.title,
    description: task.description ?? null,
    priority: task.priority,
    due: task.due ?? null,
    completed: task.completed ?? false,
  };
}

/** Todas as tarefas do usuário logado (a RLS já filtra por auth.uid()). */
export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await getSupabase()
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as TaskRow[]).map(toTask);
}

export async function insertTask(task: Task): Promise<Task> {
  const { data, error } = await getSupabase()
    .from("tasks")
    .insert({ id: task.id, ...toRow(task) })
    .select("*")
    .single();
  if (error) throw error;
  return toTask(data as TaskRow);
}

export async function saveTask(task: Task): Promise<Task> {
  const { data, error } = await getSupabase()
    .from("tasks")
    .update(toRow(task))
    .eq("id", task.id)
    .select("*")
    .single();
  if (error) throw error;
  return toTask(data as TaskRow);
}

export async function removeTask(id: string): Promise<void> {
  const { error } = await getSupabase().from("tasks").delete().eq("id", id);
  if (error) throw error;
}
