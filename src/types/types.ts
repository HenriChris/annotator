export interface Point {
  x: number;
  y: number;
}

export interface Mask {
  points: Point[];
  color: string;
  occluded: boolean;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  occluded: boolean;
}

export interface AppState {
  lastImageIndex: number;
  annotatedImages: string[];
  currentColor: string;
}

export interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export type Mode = 'draw' | 'mask' | 'delete' | 'pan';
export type ResizeSide = 'top' | 'bottom' | 'left' | 'right' | null;

export interface Color {
  name: string;
  value: string;
}