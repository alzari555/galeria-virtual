import type { PlacedArtwork } from '../types.js';

export function renderArtworkCard(placed: PlacedArtwork, statusLabels: Record<string, string>): string {
  const { artwork, x, y, displayWidth, displayHeight } = placed;
  const image = artwork.image || '';

  const labelWidth = Math.min(Math.max(140, displayWidth * 0.75), 220);
  const wouldOverflowLeft = x + displayWidth - labelWidth < 12;
  const alignSelf = wouldOverflowLeft ? 'align-self: flex-start;' : 'align-self: flex-end;';

  const { rotation, shadowX, shadowY, shadowBlur } = getDeterministicStyle(artwork.id);
  const statusDotHtml = buildStatusDot(artwork.status, statusLabels);

  return `
    <div
      class="artwork-placement"
      style="position:absolute; left:${x}px; top:${y}px; width:${displayWidth}px;"
      data-id="${artwork.id}"
    >
      <div class="canvas-wrapper" style="height:${displayHeight}px;">
        <div class="canvas-surface">
          <img
            src="${image}"
            alt="${escapeHtml(artwork.title)}"
            class="canvas-image"
            loading="lazy"
            onerror="this.parentElement.classList.add('canvas-placeholder')"
          />
        </div>
        <div class="canvas-shadow"><div class="canvas-shadow-fill"></div></div>
      </div>

      <div
        class="artwork-label"
        style="width:${labelWidth}px; ${alignSelf}"
        data-id="${artwork.id}"
      >
        <div class="label-inner" style="transform: rotate(${rotation}deg); box-shadow: ${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.8) inset;">
          ${statusDotHtml}
          <p class="label-artist">${escapeHtml(artwork.artist)}</p>
          <p class="label-title">${escapeHtml(artwork.title)}</p>
          ${artwork.year ? `<p class="label-year">${artwork.year}</p>` : ''}
          <dl class="label-details">
            ${artwork.dimensions.width ? `
              <dt>Dimensiones</dt>
              <dd>${artwork.dimensions.width} × ${artwork.dimensions.height} cm</dd>
            ` : ''}
            ${artwork.material ? `
              <dt>Material</dt>
              <dd>${escapeHtml(artwork.material)}</dd>
            ` : ''}
            ${artwork.technique ? `
              <dt>Técnica</dt>
              <dd>${escapeHtml(artwork.technique)}</dd>
            ` : ''}
          </dl>
        </div>
      </div>
    </div>
  `;
}

function buildStatusDot(status: string, labels: Record<string, string>): string {
  if (!status || !labels[status]) return '';
  const label = labels[status];
  return `
    <div class="status-dot status-dot--${status}" title="${label}">
      <span class="status-dot-inner"></span>
      <span class="status-tooltip">${label}</span>
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
