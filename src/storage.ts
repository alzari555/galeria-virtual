import type { Artwork, ArtworkData } from './types.js';
import defaultData from './data/artworks.json' assert { type: 'json' };

const STORAGE_KEY = 'galeria-virtual-artworks';

function loadFromJSON(): Artwork[] {
  const data = defaultData as unknown as ArtworkData;
  return data.artworks;
}

function loadFromStorage(): Artwork[] | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Artwork[];
  } catch {
    return null;
  }
}

export function loadArtworks(): Artwork[] {
  return loadFromStorage() ?? loadFromJSON();
}

export function saveArtworks(artworks: Artwork[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(artworks, null, 2));
}

export function exportJSON(artworks: Artwork[]): void {
  const data: ArtworkData = { artworks };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'artworks.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
