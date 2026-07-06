import { observeLayout } from './layout.js';
import { loadArtworks } from './storage.js';
import { renderArtworkCard } from './components/ArtworkCard.js';

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible para la venta',
  reserved: 'Reservado',
  sold: 'Vendido',
};

function init() {
  const wall = document.getElementById('gallery-wall');
  if (!wall) return;

  observeLayout(wall, loadArtworks(), (placed, totalHeight) => {
    if (placed.length === 0) {
      wall.style.height = '100vh';
      wall.innerHTML = `
        <div class="gallery-empty">
          <p>No hay obras en la galería.</p>
          <a href="./admin/" class="btn btn-primary">Agregar obras desde el CMS</a>
        </div>
      `;
      return;
    }

    wall.style.height = `${totalHeight}px`;
    wall.innerHTML = placed
      .map((p) => renderArtworkCard(p, STATUS_LABELS))
      .join('');
  });
}

init();
