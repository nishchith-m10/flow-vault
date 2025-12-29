// Trash storage utilities using localStorage

export interface TrashedWorkflow {
  id: string;
  name: string;
  workflow: Record<string, unknown>;
  deletedAt: string;
}

const TRASH_KEY = 'n8n_dashboard_trash';

export function getTrash(): TrashedWorkflow[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(TRASH_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addToTrash(workflow: { id: string; name: string; [key: string]: unknown }): void {
  const trash = getTrash();
  const item: TrashedWorkflow = {
    id: workflow.id,
    name: workflow.name,
    workflow: workflow as Record<string, unknown>,
    deletedAt: new Date().toISOString(),
  };
  trash.unshift(item); // Add to beginning
  localStorage.setItem(TRASH_KEY, JSON.stringify(trash));
}

export function removeFromTrash(id: string): void {
  const trash = getTrash();
  const filtered = trash.filter((t) => t.id !== id);
  localStorage.setItem(TRASH_KEY, JSON.stringify(filtered));
}

export function clearTrash(): void {
  localStorage.removeItem(TRASH_KEY);
}

export function getTrashCount(): number {
  return getTrash().length;
}
