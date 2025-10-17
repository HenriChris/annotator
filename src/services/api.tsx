import { AppState, Box } from "@/types/types";

export async function getState(): Promise<AppState | null> {
  try {
    const res = await fetch('/api/state');
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function postState(state: AppState): Promise<void> {
  try {
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
  } catch (err) {
    console.error('Error saving state:', err);
  }
}

export async function getImages(): Promise<string[]> {
  const res = await fetch('/api/images');
  return await res.json();
}

export async function getAnnotations(imageName: string): Promise<{ boxes: Box[] } | null> {
  try {
    const res = await fetch(`/api/annotations/${imageName}`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function postAnnotations(imageName: string, boxes: Box[], width: number, height: number): Promise<boolean> {
  try {
    const res = await fetch(`/api/annotations/${imageName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boxes, width, height })
    });
    return res.ok;
  } catch {
    return false;
  }
}