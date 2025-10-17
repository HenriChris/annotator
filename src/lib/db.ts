// lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';

// const dbPath = path.join(process.cwd(), 'annotations.db');
const dbPath = path.join(process.cwd(), 'data', 'annotations.db');
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS app_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_image_index INTEGER NOT NULL DEFAULT 0,
    annotated_images TEXT NOT NULL DEFAULT '[]',
    current_color TEXT NOT NULL DEFAULT '#00ffff',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_name TEXT NOT NULL UNIQUE,
    boxes TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_image_name ON annotations(image_name);

  -- Insert default state if not exists
  INSERT OR IGNORE INTO app_state (id, last_image_index, annotated_images, current_color)
  VALUES (1, 0, '[]', '#00ffff');
`);

export interface AppState {
  lastImageIndex: number;
  annotatedImages: string[];
  currentColor: string;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  occluded?: boolean;
  color?: string;
}

export interface AnnotationData {
  boxes: Box[];
  width?: number;
  height?: number;
}

// App State operations
export function getAppState(): AppState {
  const row = db.prepare('SELECT last_image_index, annotated_images, current_color FROM app_state WHERE id = 1').get() as {
    last_image_index: number;
    annotated_images: string;
    current_color: string;
  };

  return {
    lastImageIndex: row.last_image_index,
    annotatedImages: JSON.parse(row.annotated_images),
    currentColor: row.current_color
  };
}

export function saveAppState(state: AppState): void {
  db.prepare(`
    UPDATE app_state 
    SET last_image_index = ?, annotated_images = ?, current_color = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(state.lastImageIndex, JSON.stringify(state.annotatedImages), state.currentColor);
}

// Annotations operations
export function getAnnotations(imageName: string): AnnotationData | null {
  const row = db.prepare('SELECT boxes, width, height FROM annotations WHERE image_name = ?').get(imageName) as {
    boxes: string;
    width: number | null;
    height: number | null;
  } | undefined;

  if (!row) {
    return null;
  }

  return {
    boxes: JSON.parse(row.boxes),
    width: row.width ?? undefined,
    height: row.height ?? undefined,
  };
}

export function saveAnnotations(imageName: string, data: AnnotationData): void {
  db.prepare(`
    INSERT INTO annotations (image_name, boxes, width, height)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(image_name) DO UPDATE SET
      boxes = excluded.boxes,
      width = excluded.width,
      height = excluded.height,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    imageName,
    JSON.stringify(data.boxes),
    data.width ?? null,
    data.height ?? null
  );
}

export default db;