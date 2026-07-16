"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  AlignLeft, CalendarDays, Check, ChevronDown, Circle, Columns3, Flag, Hash,
  Inbox, LayoutList, MoreHorizontal, Plus, RotateCcw, Save, Search, Trash2, X,
} from "lucide-react";

type Priority = "Alta" | "Média" | "Baixa";
type View = "list" | "board";
type TaskFilter = "open" | "completed";
type Workspace = { id: string; name: string; color: string };
type Column = { id: string; workspaceId: string; name: string };
type Task = {
  id: string; workspaceId: string; columnId: string; title: string;
  description?: string; priority: Priority; due?: string; completed?: boolean;
};

function localDate(offset = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDueDate(value?: string) {
  if (!value) return "Sem prazo";
  const due = new Date(`${value}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const difference = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (difference === 0) return "Hoje";
  if (difference === 1) return "Amanhã";
  if (difference === -1) return "Ontem";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(due).replace(".", "");
}

function isOverdue(value?: string, completed?: boolean) {
  if (!value || completed) return false;
  const due = new Date(`${value}T12:00:00`).getTime();
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return due < today.getTime();
}

const workspaces: Workspace[] = [
  { id: "brasil", name: "Brasil Forte", color: "#d5a95b" },
  { id: "binding", name: "Binding", color: "#7c9bf0" },
  { id: "pine", name: "Pine Collective", color: "#78a68e" },
  { id: "pessoal", name: "Pessoal", color: "#b88ae0" },
];

const initialColumns: Column[] = workspaces.flatMap((w) => [
  { id: `${w.id}-todo`, workspaceId: w.id, name: "A fazer" },
  { id: `${w.id}-progress`, workspaceId: w.id, name: "Em andamento" },
  { id: `${w.id}-done`, workspaceId: w.id, name: "Concluído" },
]);

const initialTasks: Task[] = [
  { id: "NDL-104", workspaceId: "brasil", columnId: "brasil-todo", title: "Revisar planejamento da campanha de julho", description: "Conferir metas, responsáveis e orçamento antes da aprovação.", priority: "Alta", due: localDate() },
  { id: "NDL-103", workspaceId: "binding", columnId: "binding-progress", title: "Validar nova estrutura do banco de dados", priority: "Alta", due: localDate() },
  { id: "NDL-102", workspaceId: "pine", columnId: "pine-todo", title: "Preparar pauta para reunião semanal", priority: "Média", due: localDate(1) },
  { id: "NDL-101", workspaceId: "brasil", columnId: "brasil-progress", title: "Finalizar apresentação para parceiros", priority: "Média", due: localDate(3) },
  { id: "NDL-100", workspaceId: "pessoal", columnId: "pessoal-todo", title: "Agendar consulta anual", priority: "Baixa", due: localDate(7) },
  { id: "NDL-099", workspaceId: "binding", columnId: "binding-todo", title: "Mapear referências para o novo produto", priority: "Baixa" },
];

const priorityStyle: Record<Priority, string> = {
  Alta: "bg-red-400", Média: "bg-amber-300", Baixa: "bg-zinc-500",
};

function IconButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick: () => void }) {
  return <button aria-label={label} title={label} onClick={onClick} className="grid h-10 w-10 place-items-center rounded-md text-zinc-400 transition hover:bg-white/[.07] hover:text-white">{children}</button>;
}

export function NeedleApp() {
  const [active, setActive] = useState("all");
  const [view, setView] = useState<View>("list");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("open");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [quickTask, setQuickTask] = useState("");
  const [quickWorkspace, setQuickWorkspace] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);
  const [workspacePickerOpen, setWorkspacePickerOpen] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const workspacePickerRef = useRef<HTMLDivElement>(null);

  const currentWorkspace = workspaces.find((w) => w.id === active);
  const selectedQuickWorkspace = workspaces.find((w) => w.id === quickWorkspace);
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);
  const columns = initialColumns.filter((c) => c.workspaceId === active);
  const scopedTasks = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return tasks.filter((task) => {
      if (active !== "all" && task.workspaceId !== active) return false;
      if (!term) return true;
      return (
        task.title.toLocaleLowerCase("pt-BR").includes(term) ||
        task.id.toLocaleLowerCase("pt-BR").includes(term) ||
        (task.description ?? "").toLocaleLowerCase("pt-BR").includes(term)
      );
    });
  }, [tasks, active, query]);
  const listTasks = useMemo(() => scopedTasks.filter((task) =>
    taskFilter === "completed" ? task.completed : !task.completed), [scopedTasks, taskFilter]);
  const openTaskCount = useMemo(() => tasks.filter((task) =>
    !task.completed && (active === "all" || task.workspaceId === active)).length, [tasks, active]);

  useEffect(() => {
    const remembered = window.localStorage.getItem("needle:last-workspace");
    if (remembered && workspaces.some((workspace) => workspace.id === remembered)) setQuickWorkspace(remembered);
    const stored = window.localStorage.getItem("needle:tasks");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Task[];
        if (Array.isArray(parsed)) setTasks(parsed);
      } catch {
        // ignora estado corrompido e mantém o seed inicial
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("needle:tasks", JSON.stringify(tasks));
  }, [tasks, hydrated]);

  useEffect(() => {
    const navigate = (event: globalThis.KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const index = Number(event.key) - 1;
      if (Number.isNaN(index)) return;
      if (index === -1) { setActive("all"); event.preventDefault(); }
      else if (workspaces[index]) { setActive(workspaces[index].id); event.preventDefault(); }
    };
    window.addEventListener("keydown", navigate);
    return () => window.removeEventListener("keydown", navigate);
  }, []);

  useEffect(() => {
    if (!workspacePickerOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!workspacePickerRef.current?.contains(event.target as Node)) setWorkspacePickerOpen(false);
    };
    const dismissWithKeyboard = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setWorkspacePickerOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismissWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismissWithKeyboard);
    };
  }, [workspacePickerOpen]);

  const createTask = (event: FormEvent) => {
    event.preventDefault();
    const raw = quickTask.trim();
    if (!raw) return;

    const priorityMatch = raw.match(/#(alta|média|media|baixa)\b/i);
    const normalized = priorityMatch?.[1].toLocaleLowerCase("pt-BR");
    const priority: Priority = normalized === "alta" ? "Alta" : normalized === "baixa" ? "Baixa" : "Média";

    const mention = raw.match(/@([^\s#]+)/);
    let workspaceCommand: Workspace | undefined;
    if (mention) {
      const handle = mention[1].toLocaleLowerCase("pt-BR");
      workspaceCommand = workspaces.find((workspace) => {
        const name = workspace.name.toLocaleLowerCase("pt-BR");
        return workspace.id === handle || name === handle || name.split(" ")[0] === handle || name.startsWith(handle);
      });
    }

    const workspaceId = active === "all" ? (workspaceCommand?.id ?? quickWorkspace) : active;
    if (!workspaceId) {
      setWorkspacePickerOpen(true);
      setQuickError("Escolha um espaço antes de criar a demanda.");
      return;
    }

    let title = raw.replace(/#(alta|média|media|baixa)\b/gi, "");
    if (workspaceCommand && mention) title = title.replace(mention[0], "");
    title = title.replace(/\s+/g, " ").trim();
    if (!title) {
      setQuickError("Descreva a demanda além dos comandos #prioridade e @espaço.");
      return;
    }

    setTasks((items) => {
      const highest = items.reduce((max, item) => {
        const value = Number.parseInt(item.id.replace(/\D/g, ""), 10);
        return Number.isFinite(value) ? Math.max(max, value) : max;
      }, 100);
      const newTask: Task = { id: `NDL-${highest + 1}`, workspaceId, columnId: `${workspaceId}-todo`, title, priority };
      return [newTask, ...items];
    });

    window.localStorage.setItem("needle:last-workspace", workspaceId);
    setQuickWorkspace(workspaceId);
    setQuickTask("");
    setQuickError(null);
  };

  const completeTask = (id: string) => setTasks((items) => items.map((task) =>
    task.id === id ? { ...task, completed: true, columnId: `${task.workspaceId}-done` } : task));
  const reopenTask = (id: string) => setTasks((items) => items.map((task) =>
    task.id === id ? { ...task, completed: false, columnId: `${task.workspaceId}-todo` } : task));
  const deleteTask = (id: string) => {
    setTasks((items) => items.filter((task) => task.id !== id));
    if (selectedTaskId === id) setSelectedTaskId(null);
  };
  const updateTask = (updatedTask: Task) => {
    setTasks((items) => items.map((task) => task.id === updatedTask.id ? updatedTask : task));
    setSelectedTaskId(null);
  };
  const dropInto = (columnId: string) => {
    if (!dragging) return;
    const destination = initialColumns.find((column) => column.id === columnId);
    setTasks((items) => items.map((task) => task.id === dragging ? {
      ...task,
      columnId,
      completed: destination?.name === "Concluído",
    } : task));
    setDragging(null);
  };

  return (
    <main className="min-h-screen bg-ink text-zinc-200">
      {mobileNav && <button aria-label="Fechar menu" className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setMobileNav(false)} />}
      <Sidebar active={active} setActive={(id) => { setActive(id); setMobileNav(false); }} open={mobileNav} />
      {selectedTask && <TaskDetails key={selectedTask.id} task={selectedTask} onClose={() => setSelectedTaskId(null)} onSave={updateTask} onDelete={deleteTask} />}

      <section className="min-h-screen md:ml-[264px]">
        <header className="sticky top-0 z-20 border-b border-line bg-ink/90 px-5 py-5 backdrop-blur-xl md:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center gap-3">
            <button className="grid h-10 w-10 place-items-center rounded-lg border border-line md:hidden" onClick={() => setMobileNav(true)}><MoreHorizontal size={18} /></button>
            <form onSubmit={createTask} className="group relative flex h-14 flex-1 items-center rounded-xl border border-line bg-[#0d110f] px-4 transition focus-within:border-pine focus-within:ring-2 focus-within:ring-pine/20">
              <Plus size={19} className="mr-3.5 text-moss" />
              <input value={quickTask} onChange={(e) => { setQuickTask(e.target.value); if (quickError) setQuickError(null); }} className="min-w-0 flex-1 bg-transparent text-[15px] text-zinc-100 outline-none placeholder:text-zinc-500" placeholder={active === "all" && !quickWorkspace ? "Escolha um espaço e descreva a demanda..." : "Criar nova demanda... use #Alta para definir prioridade"} />
              {active === "all" && <div ref={workspacePickerRef} className="relative mr-2 border-l border-line pl-2 sm:mr-3 sm:pl-3">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={workspacePickerOpen}
                  onClick={() => setWorkspacePickerOpen((open) => !open)}
                  className="flex h-9 w-[126px] items-center gap-2 rounded-md px-2.5 text-left text-[12px] text-zinc-300 transition hover:bg-white/[.05] sm:w-[164px] sm:px-3 sm:text-[13px]"
                >
                  {selectedQuickWorkspace ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: selectedQuickWorkspace.color }} /> : <Hash size={14} className="shrink-0 text-zinc-500" />}
                  <span className={`min-w-0 flex-1 truncate ${selectedQuickWorkspace ? "text-zinc-200" : "text-zinc-500"}`}>{selectedQuickWorkspace?.name ?? "Escolher espaço"}</span>
                  <ChevronDown size={14} className={`shrink-0 text-zinc-500 transition-transform ${workspacePickerOpen ? "rotate-180" : ""}`} />
                </button>
                {workspacePickerOpen && <div role="listbox" aria-label="Escolher workspace" className="absolute right-0 top-[46px] z-50 w-[210px] overflow-hidden rounded-lg border border-zinc-700 bg-[#121714] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,.55)]">
                  <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-medium uppercase tracking-[.14em] text-zinc-500">Criar em</p>
                  {workspaces.map((workspace) => <button
                    key={workspace.id}
                    type="button"
                    role="option"
                    aria-selected={quickWorkspace === workspace.id}
                    onClick={() => {
                      setQuickWorkspace(workspace.id);
                      window.localStorage.setItem("needle:last-workspace", workspace.id);
                      setWorkspacePickerOpen(false);
                      setQuickError(null);
                    }}
                    className={`flex h-10 w-full items-center gap-3 rounded-md px-2.5 text-left text-[13px] transition ${quickWorkspace === workspace.id ? "bg-white/[.07] text-white" : "text-zinc-300 hover:bg-white/[.045] hover:text-white"}`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: workspace.color }} />
                    <span className="flex-1">{workspace.name}</span>
                    {quickWorkspace === workspace.id && <Check size={14} className="text-moss" />}
                  </button>)}
                </div>}
              </div>}
              <kbd className="mono hidden rounded border border-zinc-700 bg-white/[.04] px-2.5 py-1.5 text-[11px] text-zinc-400 sm:block">ENTER</kbd>
              {quickError && <p role="alert" className="absolute left-1 top-[60px] text-[12px] text-red-400">{quickError}</p>}
            </form>
          </div>
        </header>

        <div className="mx-auto max-w-[1480px] px-5 py-9 md:px-10 md:py-12">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="mb-2.5 flex items-center gap-2 text-[13px] font-medium uppercase tracking-[.15em] text-zinc-400">
                {currentWorkspace ? <><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: currentWorkspace.color }} />Workspace</> : "Tudo em um só lugar"}
              </p>
              <h1 className="text-[30px] font-medium tracking-tight text-white md:text-[36px]">{currentWorkspace?.name ?? "Visão geral"}</h1>
              <p className="mt-2.5 text-[16px] text-zinc-400">{openTaskCount} {openTaskCount === 1 ? "demanda aberta" : "demandas abertas"}</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex h-12 items-center gap-2.5 rounded-lg border border-line px-3.5 text-zinc-400 focus-within:border-zinc-500">
                <Search size={17} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-28 bg-transparent text-[14px] text-zinc-200 outline-none placeholder:text-zinc-500 sm:w-40" placeholder="Filtrar..." />
                {query && <button onClick={() => setQuery("")}><X size={13} /></button>}
              </label>
              {(active === "all" || view === "list") && <div className="flex rounded-md border border-line bg-panel p-0.5">
                <FilterButton active={taskFilter === "open"} label="Abertas" count={scopedTasks.filter((task) => !task.completed).length} onClick={() => setTaskFilter("open")} />
                <FilterButton active={taskFilter === "completed"} label="Concluídas" count={scopedTasks.filter((task) => task.completed).length} onClick={() => setTaskFilter("completed")} />
              </div>}
              {active !== "all" && <div className="flex rounded-md border border-line bg-panel p-0.5">
                <ViewButton active={view === "list"} label="Lista" onClick={() => setView("list")}><LayoutList size={14} /></ViewButton>
                <ViewButton active={view === "board"} label="Kanban" onClick={() => setView("board")}><Columns3 size={14} /></ViewButton>
              </div>}
            </div>
          </div>

          {active === "all" || view === "list" ? (
            <>
              {active === "all" && <p className="mb-3 text-[12px] text-zinc-500">O Kanban fica disponível dentro de cada espaço, onde as etapas são configuradas.</p>}
              <TaskList tasks={listTasks} showWorkspace={active === "all"} taskFilter={taskFilter} completeTask={completeTask} reopenTask={reopenTask} deleteTask={deleteTask} openTask={setSelectedTaskId} />
            </>
          ) : (
            <div className="grid min-w-[760px] grid-cols-3 gap-4 overflow-x-auto pb-5">
              {columns.map((column) => <KanbanColumn key={column.id} column={column} tasks={scopedTasks.filter((task) => task.columnId === column.id)} setDragging={setDragging} dropInto={dropInto} openTask={setSelectedTaskId} />)}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Sidebar({ active, setActive, open }: { active: string; setActive: (id: string) => void; open: boolean }) {
  return <aside className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-line bg-[#0c100e] transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
    <div className="flex h-[89px] items-center border-b border-line px-6">
      <div className="flex items-center gap-3.5" aria-label="Needle by Pine Collective">
        <Image src="/brand/fav-icon.png" alt="" width={30} height={46} priority className="h-[46px] w-[30px] object-contain" />
        <div>
          <p className="text-[23px] font-medium leading-none tracking-[-0.04em] text-[#dbe4df]">needle</p>
          <p className="mt-1.5 text-[8px] font-medium uppercase tracking-[0.23em] text-[#789181]">by Pine Collective</p>
        </div>
      </div>
    </div>
    <nav className="flex-1 px-3.5 py-7">
      <p className="mb-3 px-3.5 text-[11px] font-medium uppercase tracking-[.18em] text-zinc-500">Planejamento</p>
      <NavItem active={active === "all"} onClick={() => setActive("all")} icon={<Inbox size={15} />} label="Visão geral" shortcut="Alt 0" />
      <div className="mb-3 mt-9 flex items-center justify-between px-3.5">
        <p className="text-[11px] font-medium uppercase tracking-[.18em] text-zinc-500">Espaços</p>
      </div>
      {workspaces.map((w, index) => <NavItem key={w.id} active={active === w.id} onClick={() => setActive(w.id)} icon={<span className="h-2 w-2 rounded-full" style={{ backgroundColor: w.color }} />} label={w.name} shortcut={`Alt ${index + 1}`} />)}
    </nav>
    <div className="border-t border-line p-5">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-pine text-xs font-semibold text-moss">RS</div>
        <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-medium text-zinc-200">Renan Silva</p><p className="mt-1 text-[12px] text-zinc-500">Pine Collective</p></div>
      </div>
    </div>
  </aside>;
}

function NavItem({ active, onClick, icon, label, shortcut }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; shortcut: string }) {
  return <button onClick={onClick} className={`group mb-1 flex h-11 w-full items-center gap-3.5 rounded-lg px-3.5 text-left text-[15px] transition ${active ? "bg-white/[.065] text-white" : "text-zinc-400 hover:bg-white/[.035] hover:text-zinc-200"}`}>
    <span className={`grid w-4 place-items-center ${active ? "text-moss" : "text-zinc-500"}`}>{icon}</span><span className="flex-1">{label}</span><span className="mono text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100">{shortcut}</span>
  </button>;
}

function ViewButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`flex h-10 items-center gap-2 rounded-md px-3.5 text-[13px] transition ${active ? "bg-white/[.09] text-white" : "text-zinc-500 hover:text-zinc-300"}`}>{children}<span className="hidden sm:inline">{label}</span></button>;
}

function FilterButton({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return <button onClick={onClick} className={`flex h-10 items-center gap-2 rounded-md px-3 text-[13px] transition ${active ? "bg-white/[.09] text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
    {label}<span className={`mono text-[10px] ${active ? "text-zinc-400" : "text-zinc-600"}`}>{count}</span>
  </button>;
}

function TaskList({ tasks, showWorkspace, taskFilter, completeTask, reopenTask, deleteTask, openTask }: {
  tasks: Task[];
  showWorkspace: boolean;
  taskFilter: TaskFilter;
  completeTask: (id: string) => void;
  reopenTask: (id: string) => void;
  deleteTask: (id: string) => void;
  openTask: (id: string) => void;
}) {
  if (!tasks.length) return <EmptyState filter={taskFilter} />;
  const desktopGrid = showWorkspace
    ? "md:grid-cols-[minmax(300px,1fr)_160px_150px_110px_132px]"
    : "md:grid-cols-[minmax(300px,1fr)_170px_120px_132px]";
  return <div className="overflow-hidden rounded-lg border border-line bg-panel/40">
    <div className={`grid grid-cols-[1fr_auto] border-b border-line px-5 py-3.5 text-[11px] font-medium uppercase tracking-[.14em] text-zinc-500 ${desktopGrid}`}>
      <span>Demanda</span>
      {showWorkspace && <span className="hidden md:block">Espaço</span>}
      <span className="hidden md:block">Etapa</span>
      <span className="hidden md:block">Prazo</span>
      <span className="text-right">Ações</span>
    </div>
    {tasks.map((task) => {
      const workspace = workspaces.find((w) => w.id === task.workspaceId)!;
      const column = initialColumns.find((item) => item.id === task.columnId);
      const overdue = isOverdue(task.due, task.completed);
      return <div key={task.id} className={`task-row grid min-h-[78px] grid-cols-[1fr_auto] items-center border-b border-line/70 px-5 last:border-0 hover:bg-white/[.025] ${desktopGrid}`}>
        <div className="flex min-w-0 items-center gap-3.5 pr-5">
          <button
            aria-label={task.completed ? "Reabrir demanda" : "Concluir demanda"}
            title={task.completed ? "Reabrir demanda" : "Concluir demanda"}
            onClick={() => task.completed ? reopenTask(task.id) : completeTask(task.id)}
            className={`group/check grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${task.completed ? "border-moss bg-pine text-white" : "border-zinc-600 hover:border-moss hover:bg-pine"}`}
          ><Check size={13} className={task.completed ? "opacity-100" : "opacity-0 group-hover/check:opacity-100"} /></button>
          <span className={`h-7 w-[3px] rounded-full ${priorityStyle[task.priority]}`} />
          <div className="min-w-0"><button onClick={() => openTask(task.id)} className={`block max-w-full truncate text-left text-[15px] leading-6 transition hover:text-moss ${task.completed ? "text-zinc-500 line-through decoration-zinc-700" : "text-zinc-100"}`}>{task.title}</button><p className="mono mt-1 text-[11px] tracking-wide text-zinc-500">{task.id} · {task.priority}</p></div>
        </div>
        {showWorkspace && <div className="hidden items-center gap-2.5 text-[13px] text-zinc-400 md:flex"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: workspace.color }} />{workspace.name}</div>}
        <div className="hidden md:flex"><span className={`rounded-md border px-2.5 py-1 text-[12px] ${task.completed ? "border-pine/70 bg-pine/20 text-moss" : "border-line bg-white/[.025] text-zinc-400"}`}>{column?.name ?? "Sem etapa"}</span></div>
        <div className={`hidden items-center gap-2 text-[13px] md:flex ${overdue ? "text-red-400" : task.due ? "text-zinc-400" : "text-zinc-600"}`}><CalendarDays size={14} />{formatDueDate(task.due)}{overdue && <span className="mono text-[10px] uppercase tracking-[.08em]">atrasado</span>}</div>
        <div className="row-actions flex items-center justify-end transition">
          <IconButton label="Abrir detalhes" onClick={() => openTask(task.id)}><AlignLeft size={14} /></IconButton>
          {task.completed
            ? <IconButton label="Reabrir demanda" onClick={() => reopenTask(task.id)}><RotateCcw size={14} /></IconButton>
            : <IconButton label="Concluir demanda" onClick={() => completeTask(task.id)}><Check size={14} /></IconButton>}
          <IconButton label="Excluir" onClick={() => deleteTask(task.id)}><Trash2 size={13} /></IconButton>
        </div>
      </div>;
    })}
  </div>;
}

function KanbanColumn({ column, tasks, setDragging, dropInto, openTask }: { column: Column; tasks: Task[]; setDragging: (id: string | null) => void; dropInto: (id: string) => void; openTask: (id: string) => void }) {
  return <section onDragOver={(e) => e.preventDefault()} onDrop={() => dropInto(column.id)} className="min-h-[560px] rounded-xl border border-line bg-panel/50 p-4">
    <div className="mb-4 flex items-center justify-between px-1 py-1.5"><div className="flex items-center gap-2.5"><Circle size={9} className="fill-zinc-500 text-zinc-500" /><h2 className="text-[14px] font-medium text-zinc-300">{column.name}</h2><span className="mono text-[11px] text-zinc-500">{tasks.length}</span></div></div>
    <div className="space-y-3">{tasks.map((task) => {
      const overdue = isOverdue(task.due, task.completed);
      return <article key={task.id} draggable onClick={() => openTask(task.id)} onDragStart={() => setDragging(task.id)} onDragEnd={() => setDragging(null)} className="cursor-pointer rounded-lg border border-line bg-[#111613] p-[18px] shadow-soft transition hover:-translate-y-0.5 hover:border-zinc-600 active:cursor-grabbing">
      <div className="mb-4 flex items-start gap-3"><span className={`mt-1 h-5 w-[3px] shrink-0 rounded-full ${priorityStyle[task.priority]}`} /><p className="text-[15px] leading-6 text-zinc-100">{task.title}</p></div>
      <div className="flex items-center justify-between"><span className="mono text-[11px] text-zinc-500">{task.id}</span><span className={`flex items-center gap-1.5 text-[12px] ${overdue ? "text-red-400" : task.due ? "text-zinc-400" : "text-zinc-600"}`}><CalendarDays size={13} />{formatDueDate(task.due)}</span></div>
    </article>;
    })}</div>
  </section>;
}

function TaskDetails({ task, onClose, onSave, onDelete }: { task: Task; onClose: () => void; onSave: (task: Task) => void; onDelete: (id: string) => void }) {
  const [draft, setDraft] = useState<Task>({ ...task });
  const availableColumns = initialColumns.filter((column) => column.workspaceId === draft.workspaceId);
  const canSave = draft.title.trim().length > 0;

  useEffect(() => {
    const closeWithKeyboard = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeWithKeyboard);
    return () => document.removeEventListener("keydown", closeWithKeyboard);
  }, [onClose]);

  return <div className="fixed inset-0 z-50">
    <button aria-label="Fechar detalhes" className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-[2px]" onClick={onClose} />
    <aside aria-label={`Detalhes de ${task.title}`} className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col border-l border-line bg-[#0d110f] shadow-[-24px_0_80px_rgba(0,0,0,.45)]">
      <div className="flex h-[78px] shrink-0 items-center justify-between border-b border-line px-6">
        <div><p className="text-[11px] font-medium uppercase tracking-[.15em] text-zinc-500">Detalhes da demanda</p><p className="mono mt-1 text-[11px] text-zinc-600">{task.id}</p></div>
        <button aria-label="Fechar" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/[.06] hover:text-white"><X size={18} /></button>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); if (canSave) onSave({ ...draft, title: draft.title.trim(), description: draft.description?.trim() || undefined }); }} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-7">
          <label className="block">
            <span className="mb-2.5 block text-[12px] font-medium text-zinc-400">Título</span>
            <input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="h-12 w-full rounded-lg border border-line bg-[#111613] px-3.5 text-[15px] text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-pine focus:ring-2 focus:ring-pine/20" />
          </label>

          <label className="block">
            <span className="mb-2.5 flex items-center gap-2 text-[12px] font-medium text-zinc-400"><AlignLeft size={14} />Descrição</span>
            <textarea value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={5} placeholder="Adicione contexto, links ou critérios para concluir..." className="w-full resize-none rounded-lg border border-line bg-[#111613] px-3.5 py-3 text-[14px] leading-6 text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-pine focus:ring-2 focus:ring-pine/20" />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2.5 block text-[12px] font-medium text-zinc-400">Workspace</span>
              <div className="relative">
                <select value={draft.workspaceId} onChange={(event) => setDraft({ ...draft, workspaceId: event.target.value, columnId: `${event.target.value}-todo`, completed: false })} className="h-12 w-full appearance-none rounded-lg border border-line bg-[#111613] px-3.5 pr-9 text-[14px] text-zinc-200 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20 [&>option]:bg-[#111613]">
                  {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              </div>
            </label>

            <label className="block">
              <span className="mb-2.5 block text-[12px] font-medium text-zinc-400">Etapa</span>
              <div className="relative">
                <select value={draft.columnId} onChange={(event) => { const column = initialColumns.find((item) => item.id === event.target.value); setDraft({ ...draft, columnId: event.target.value, completed: column?.name === "Concluído" }); }} className="h-12 w-full appearance-none rounded-lg border border-line bg-[#111613] px-3.5 pr-9 text-[14px] text-zinc-200 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20 [&>option]:bg-[#111613]">
                  {availableColumns.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              </div>
            </label>

            <label className="block">
              <span className="mb-2.5 flex items-center gap-2 text-[12px] font-medium text-zinc-400"><Flag size={14} />Prioridade</span>
              <div className="relative">
                <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })} className="h-12 w-full appearance-none rounded-lg border border-line bg-[#111613] px-3.5 pr-9 text-[14px] text-zinc-200 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20 [&>option]:bg-[#111613]">
                  <option value="Alta">Alta</option><option value="Média">Média</option><option value="Baixa">Baixa</option>
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              </div>
            </label>

            <label className="block">
              <span className="mb-2.5 flex items-center gap-2 text-[12px] font-medium text-zinc-400"><CalendarDays size={14} />Prazo</span>
              <input type="date" value={draft.due ?? ""} onChange={(event) => setDraft({ ...draft, due: event.target.value || undefined })} className="h-12 w-full rounded-lg border border-line bg-[#111613] px-3.5 text-[14px] text-zinc-200 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20" />
              {draft.due && <button type="button" onClick={() => setDraft({ ...draft, due: undefined })} className="mt-2 text-[12px] text-zinc-500 transition hover:text-zinc-300">Remover prazo</button>}
            </label>
          </div>

          <div className="border-t border-line pt-6">
            <button type="button" onClick={() => { if (window.confirm("Excluir esta demanda permanentemente?")) onDelete(task.id); }} className="flex items-center gap-2 text-[13px] text-red-400/80 transition hover:text-red-300"><Trash2 size={14} />Excluir demanda</button>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-[#0d110f] px-6 py-4">
          <p className="hidden text-[12px] text-zinc-600 sm:block">As alterações só são aplicadas ao salvar.</p>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="h-11 rounded-lg px-4 text-[13px] text-zinc-400 transition hover:bg-white/[.05] hover:text-white">Cancelar</button>
            <button type="submit" disabled={!canSave} className="flex h-11 items-center gap-2 rounded-lg bg-[#315c49] px-4 text-[13px] font-medium text-white transition hover:bg-[#3a6b56] disabled:cursor-not-allowed disabled:opacity-40"><Save size={15} />Salvar alterações</button>
          </div>
        </div>
      </form>
    </aside>
  </div>;
}

function EmptyState({ filter }: { filter: TaskFilter }) {
  const completed = filter === "completed";
  return <div className="grid min-h-[400px] place-items-center rounded-xl border border-dashed border-line"><div className="text-center"><div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-line bg-panel text-zinc-400">{completed ? <RotateCcw size={18} /> : <Check size={19} />}</div><p className="text-[16px] text-zinc-200">{completed ? "Nenhuma demanda concluída." : "Tudo limpo por aqui."}</p><p className="mt-1.5 text-[14px] text-zinc-500">{completed ? "As demandas finalizadas aparecerão aqui." : "Crie uma demanda no campo acima."}</p></div></div>;
}
