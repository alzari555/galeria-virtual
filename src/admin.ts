import type { Artwork, SaleStatus } from './types.js';
import { loadArtworks, saveArtworks, exportJSON, generateId } from './storage.js';

let artworks: Artwork[] = [];
let editingId: string | null = null;

// ===== DOM Elements =====
const listEl = document.getElementById('artwork-list') as HTMLUListElement;
const formEl = document.getElementById('artwork-form') as HTMLFormElement;
const btnNew = document.getElementById('btn-new-artwork') as HTMLButtonElement;
const btnDelete = document.getElementById('btn-delete') as HTMLButtonElement;
const btnExport = document.getElementById('btn-export') as HTMLButtonElement;
const btnImport = document.getElementById('btn-import') as HTMLButtonElement;
const importFile = document.getElementById('import-file') as HTMLInputElement;
const previewEl = document.getElementById('preview-canvas') as HTMLDivElement;

const fieldId = document.getElementById('field-id') as HTMLInputElement;
const fieldTitle = document.getElementById('field-title') as HTMLInputElement;
const fieldArtist = document.getElementById('field-artist') as HTMLInputElement;
const fieldYear = document.getElementById('field-year') as HTMLInputElement;
const fieldStatus = document.getElementById('field-status') as HTMLSelectElement;
const fieldWidth = document.getElementById('field-width') as HTMLInputElement;
const fieldHeight = document.getElementById('field-height') as HTMLInputElement;
const fieldMaterial = document.getElementById('field-material') as HTMLInputElement;
const fieldTechnique = document.getElementById('field-technique') as HTMLInputElement;
const fieldImage = document.getElementById('field-image') as HTMLInputElement;

// ===== Init =====
function init() {
  artworks = loadArtworks();
  renderList();
  clearForm(false);

  formEl.addEventListener('submit', handleSubmit);
  btnNew.addEventListener('click', () => clearForm(true));
  btnDelete.addEventListener('click', handleDelete);
  btnExport.addEventListener('click', () => exportArtworks());
  btnImport.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', handleImport);
  fieldImage.addEventListener('change', handleImagePreview);
}

// ===== List =====
function renderList() {
  listEl.innerHTML = artworks
    .map(
      (a) => `
      <li class="${editingId === a.id ? 'active' : ''}" data-id="${a.id}">
        <img
          src="${a.image || ''}"
          alt=""
          class="artwork-list-item-thumb"
          onerror="this.style.display='none'"
          loading="lazy"
        />
        <div class="artwork-list-item-info">
          <span class="artwork-list-item-title">${escapeHtml(a.title)}</span>
          <span class="artwork-list-item-artist">${escapeHtml(a.artist)}</span>
        </div>
        ${a.status ? `<span class="status-mini status-mini--${a.status}"></span>` : ''}
      </li>
    `
    )
    .join('');

  listEl.querySelectorAll('li').forEach((li) => {
    li.addEventListener('click', () => {
      const id = li.dataset.id;
      if (id) selectArtwork(id);
    });
  });

  btnDelete.hidden = !editingId;
}

// ===== Selection =====
function selectArtwork(id: string) {
  const artwork = artworks.find((a) => a.id === id);
  if (!artwork) return;

  editingId = id;
  populateForm(artwork);
  renderList();
  updatePreview(artwork);
}

// ===== Form =====
function populateForm(a: Artwork) {
  fieldId.value = a.id;
  fieldTitle.value = a.title;
  fieldArtist.value = a.artist;
  fieldYear.value = a.year ? String(a.year) : '';
  fieldStatus.value = a.status || '';
  fieldWidth.value = a.dimensions.width ? String(a.dimensions.width) : '';
  fieldHeight.value = a.dimensions.height ? String(a.dimensions.height) : '';
  fieldMaterial.value = a.material || '';
  fieldTechnique.value = a.technique || '';
  fieldImage.value = '';
}

function clearForm(clearId: boolean) {
  if (clearId) {
    editingId = null;
    fieldId.value = '';
  }
  fieldTitle.value = '';
  fieldArtist.value = '';
  fieldYear.value = '';
  fieldStatus.value = '';
  fieldWidth.value = '';
  fieldHeight.value = '';
  fieldMaterial.value = '';
  fieldTechnique.value = '';
  fieldImage.value = '';

  previewEl.innerHTML = '';
  btnDelete.hidden = true;
  renderList();
}

function readForm(): Omit<Artwork, 'id'> {
  return {
    title: fieldTitle.value.trim(),
    artist: fieldArtist.value.trim(),
    year: fieldYear.value ? Number(fieldYear.value) : 0,
    status: (fieldStatus.value || '') as SaleStatus,
    dimensions: {
      width: fieldWidth.value ? Number(fieldWidth.value) : 0,
      height: fieldHeight.value ? Number(fieldHeight.value) : 0,
    },
    material: fieldMaterial.value.trim(),
    technique: fieldTechnique.value.trim(),
    image: resolveImagePath(),
  };
}

function resolveImagePath(): string {
  const file = fieldImage.files?.[0];
  if (file) {
    // Store a reference path. In a real CMS backed by Git, the user would
    // place the image in public/images/ and enter the relative path.
    // For uploaded files, the user should place them in public/images/ and commit.
    // We store the relative path the user would use: /images/<filename>
    return `/images/${file.name}`;
  }

  // If editing and no new file selected, keep existing image
  if (editingId) {
    const existing = artworks.find((a) => a.id === editingId);
    if (existing) return existing.image;
  }

  return '';
}

// ===== Submit =====
function handleSubmit(e: Event) {
  e.preventDefault();

  const data = readForm();
  if (!data.title || !data.artist) {
    alert('Título y artista son obligatorios.');
    return;
  }

  if (editingId) {
    const idx = artworks.findIndex((a) => a.id === editingId);
    if (idx !== -1) {
      artworks[idx] = { ...data, id: editingId };
    }
  } else {
    const newArtwork: Artwork = { ...data, id: generateId() };
    artworks.push(newArtwork);
    editingId = newArtwork.id;
  }

  saveArtworks(artworks);
  renderList();

  // Keep editing the same item
  const artwork = artworks.find((a) => a.id === editingId);
  if (artwork) {
    populateForm(artwork);
    updatePreview(artwork);
  }
}

// ===== Delete =====
function handleDelete() {
  if (!editingId) return;
  if (!confirm('¿Eliminar esta obra?')) return;

  artworks = artworks.filter((a) => a.id !== editingId);
  saveArtworks(artworks);
  clearForm(true);
}

// ===== Export =====
function exportArtworks() {
  exportJSON(artworks);
}

// ===== Import =====
function handleImport() {
  const file = importFile.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string);
      if (data.artworks && Array.isArray(data.artworks)) {
        if (confirm(`¿Importar ${data.artworks.length} obras? Esto reemplazará los datos actuales.`)) {
          artworks = data.artworks;
          saveArtworks(artworks);
          clearForm(true);
        }
      } else {
        alert('El archivo JSON no tiene el formato esperado. Debe tener una propiedad "artworks" con un array.');
      }
    } catch {
      alert('Error al leer el archivo JSON.');
    }
  };
  reader.readAsText(file);
  importFile.value = '';
}

// ===== Image preview =====
function handleImagePreview() {
  const file = fieldImage.files?.[0];
  if (!file) return;

  // Copy the file to a temp location for preview in admin
  // In production, the user would commit the image to public/images/
  const artwork = artworks.find((a) => a.id === editingId);
  if (artwork) {
    const tempArtwork = { ...artwork, image: URL.createObjectURL(file) };
    updatePreview(tempArtwork);
  } else {
    const tempArtwork: Artwork = {
      id: 'preview',
      title: fieldTitle.value || 'Nueva obra',
      artist: fieldArtist.value || 'Artista',
      year: fieldYear.value ? Number(fieldYear.value) : 0,
      status: fieldStatus.value as SaleStatus || '',
      dimensions: {
        width: fieldWidth.value ? Number(fieldWidth.value) : 50,
        height: fieldHeight.value ? Number(fieldHeight.value) : 50,
      },
      material: fieldMaterial.value || '',
      technique: fieldTechnique.value || '',
      image: URL.createObjectURL(file),
    };
    updatePreview(tempArtwork);
  }
}

// ===== Preview =====
function updatePreview(artwork: Artwork) {
  const maxDim = Math.max(artwork.dimensions.width, artwork.dimensions.height);
  const scale = 200 / maxDim;
  const w = artwork.dimensions.width * scale;
  const h = artwork.dimensions.height * scale;

  const { rotation, shadowX, shadowY, shadowBlur } = getDeterministicStyle(artwork.id || 'preview');

  const statusHTML = artwork.status
    ? `<div style="position:absolute;top:12px;right:12px;width:10px;height:10px;border-radius:50%;z-index:10;">
         <span style="display:block;width:100%;height:100%;border-radius:50%;
           border:1px solid rgba(0,0,0,0.12);
           background:${
             artwork.status === 'available' ? '#2e7d32' :
             artwork.status === 'reserved' ? '#f9a825' :
             '#c62828'
           };"></span>
       </div>`
    : '';

  previewEl.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:flex-end;padding:28px;">
      <div style="position:relative;width:${w}px;height:${h}px;">
        <div style="width:100%;height:100%;background:#f9f5ed;overflow:hidden;">
          <img src="${artwork.image}" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'" />
        </div>
        <div style="
          position:absolute;
          top:0;
          left:0;
          right:-10px;
          bottom:-10px;
          z-index:-2;
          pointer-events:none;
          filter:blur(4px);
          clip-path:inset(0px -30px -30px 0px);
        ">
          <div style="
            position:absolute;
            inset:0;
            background:rgba(0, 0, 0, 0.55);
            clip-path:polygon(calc(100% - 10px) 0%, 100% 10px, 100% 100%, 10px 100%, 0% calc(100% - 10px));
            transform:scale(0.95);
            transform-origin:center;
          "></div>
        </div>
      </div>
      <div style="
        position:relative;
        margin-top:20px;
        background:#fefcf7;
        border:1px solid #ded4bb;
        padding:12px 14px 10px;
        font-family:'EB Garamond',Georgia,serif;
        font-size:0.75rem;
        width:${Math.min(Math.max(140, w * 0.75), 180)}px;
        transform: rotate(${rotation}deg);
        box-shadow: ${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.8) inset;
      ">
        ${statusHTML}
        <p style="font-weight:600;text-transform:uppercase;font-size:0.7rem;">${escapeHtml(artwork.artist)}</p>
        <p style="font-style:italic;color:#6b6052;">${escapeHtml(artwork.title)}</p>
        ${artwork.year ? `<p style="color:#9b8e7a;font-size:0.65rem;margin-bottom:6px;">${artwork.year}</p>` : ''}
        <div style="padding-top:6px;border-top:1px solid #ded4bb;font-size:0.58rem;color:#6b6052;display:grid;grid-template-columns:auto 1fr;gap:1px 6px;">
          ${artwork.dimensions.width ? `<span style="font-weight:500;color:#3a3226;">Dimensiones</span><span>${artwork.dimensions.width} × ${artwork.dimensions.height} cm</span>` : ''}
          ${artwork.material ? `<span style="font-weight:500;color:#3a3226;">Material</span><span>${escapeHtml(artwork.material)}</span>` : ''}
          ${artwork.technique ? `<span style="font-weight:500;color:#3a3226;">Técnica</span><span>${escapeHtml(artwork.technique)}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getDeterministicStyle(id: string): { rotation: number; shadowX: number; shadowY: number; shadowBlur: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const rotation = ((hash % 10) / 10) * 1.6 - 0.8; // range [-0.8, 0.8] deg
  const shadowX = 2 + (Math.abs(hash % 3)); // range [2px, 4px]
  const shadowY = 2 + (Math.abs((hash >> 2) % 3)); // range [2px, 4px]
  const shadowBlur = 3 + (Math.abs((hash >> 4) % 3)); // range [3px, 5px]
  return { rotation, shadowX, shadowY, shadowBlur };
}

// ===== Boot =====
init();
