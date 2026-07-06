/* ==========================================================================
 CONFIGURACIÓN DE LA BASE DE DATOS LOCAL (INDEXEDDB COMPARTIDA)
 ========================================================================== */
const DB_NAME = 'VirtualGalleryDB';
const DB_VERSION = 1;
const STORE_NAME = 'artworks';

let db;

// Inicializa IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Error al abrir IndexedDB:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// Obtener todas las obras expuestas
function getAllArtworksFromDB() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// Guardar obra (para cargar por defecto)
function saveArtworkToDB(artwork) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(artwork);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

/* ==========================================================================
   DATOS POR DEFECTO (MUSEUM MASTERPIECES)
   ========================================================================== */
const DEFAULT_ARTWORKS = [
  {
    id: 'default-1',
    title: 'La Noche Estrellada',
    artist: 'Vincent van Gogh',
    year: '1889',
    width: 92,
    height: 73,
    material: 'Óleo sobre lienzo',
    technique: 'Empaste cargado (Impasto)',
    status: 'red', // Vendido
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'default-2',
    title: 'El Estanque de los Lirios',
    artist: 'Claude Monet',
    year: '1899',
    width: 100,
    height: 90,
    material: 'Óleo sobre lienzo',
    technique: 'Pincelada impresionista',
    status: 'green', // Reservado
    imageUrl: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'default-3',
    title: 'El Beso (Estudio)',
    artist: 'Gustav Klimt',
    year: '1908',
    width: 120,
    height: 120,
    material: 'Óleo y laminas doradas',
    technique: 'Simbolismo / Mosaico decorativo',
    status: 'none', // Disponible
    imageUrl: 'https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'default-4',
    title: 'Retrato de Joven Dama',
    artist: 'Johannes Vermeer',
    year: '1665',
    width: 44,
    height: 39,
    material: 'Óleo sobre lienzo',
    technique: 'Claroscuro / Veladuras',
    status: 'yellow', // Bloqueado
    imageUrl: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=800&q=80'
  }
];

// Carga las obras por defecto en la base de datos si está vacía
async function checkAndLoadDefaults() {
  const artworks = await getAllArtworksFromDB();
  if (artworks.length === 0) {
    console.log("Galería vacía. Precargando obras maestras de dominio público...");
    for (const art of DEFAULT_ARTWORKS) {
      try {
        const base64Img = await fetchImageAsBase64(art.imageUrl);
        art.imageData = base64Img;
      } catch (err) {
        console.warn(`No se pudo cargar la imagen en local para ${art.title}. Usando URL remota.`, err);
        art.imageData = art.imageUrl;
      }
      delete art.imageUrl;
      await saveArtworkToDB(art);
    }
  }
}

// Convertir URL remota a base64
function fetchImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      })
      .catch(reject);
  });
}

/* ==========================================================================
   RENDERIZADO DE LA EXPOSICIÓN
   ========================================================================== */
const STATUS_EXPLANATIONS = {
  'none': 'Disponible para compra',
  'green': 'Reservada (Comprometida temporalmente)',
  'yellow': 'Bloqueada (Exhibición / Fuera de catálogo)',
  'red': 'Vendida (Colección privada)'
};

// Renderiza las obras en la pared
async function renderGallery() {
  const wall = document.getElementById('gallery-wall');
  const noArtMsg = document.getElementById('no-art-message');

  // Limpiar pinturas anteriores
  const oldPieces = wall.querySelectorAll('.art-piece');
  oldPieces.forEach(p => p.remove());

  const artworks = await getAllArtworksFromDB();

  if (artworks.length === 0) {
    noArtMsg.style.display = 'block';
    return;
  }

  noArtMsg.style.display = 'none';

  artworks.forEach(art => {
    // 1. Cálculos de proporciones del lienzo tridimensional en base a cm reales
    const ratio = art.width / art.height;

    // Escala del renderizado: 1cm real = 3.2px de pantalla. Clamps para el layout.
    const cmScale = 3.2;
    let widthPx = Math.round(art.width * cmScale);
    let heightPx = Math.round(art.height * cmScale);

    const maxWidth = 350;
    const maxHeight = 340;
    const minWidth = 160;

    if (widthPx > maxWidth) {
      widthPx = maxWidth;
      heightPx = Math.round(widthPx / ratio);
    }
    if (heightPx > maxHeight) {
      heightPx = maxHeight;
      widthPx = Math.round(heightPx * ratio);
    }
    if (widthPx < minWidth) {
      widthPx = minWidth;
      heightPx = Math.round(widthPx / ratio);
    }

    const framePadding = 24;
    const frameBorder = 14;
    const frameTotalExtra = (framePadding + frameBorder) * 2;
    const frameOuterWidth = widthPx + frameTotalExtra;
    const frameOuterHeight = heightPx + frameTotalExtra;

    // 2. Altura del cable de colgado (Skeuomorphic hang wire)
    // El centro horizontal de todos los cuadros se sitúa a la misma altura de ojos (320px desde el riel)
    const eyeLevelCenterY = 320;
    const wireHeight = Math.max(40, eyeLevelCenterY - (frameOuterHeight / 2));

    // Elemento contenedor
    const artPieceEl = document.createElement('div');
    artPieceEl.className = 'art-piece';
    artPieceEl.style.width = `${frameOuterWidth + 195}px`; // Ancho del marco + cédula de 170px + 25px gap
    artPieceEl.setAttribute('data-id', art.id);

    // Sistema de cables SVG
    const hangSystemHTML = `
      <div class="art-hang-system" style="height: ${wireHeight}px; width: ${frameOuterWidth}px;">
        <svg class="art-wire-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M50,0 L12,100 M50,0 L88,100" stroke="var(--wire-color)" stroke-width="1.5" fill="none" />
        </svg>
      </div>
    `;

    // Cédula de Papel (Placard)
    const explanation = STATUS_EXPLANATIONS[art.status] || STATUS_EXPLANATIONS['none'];
    const placardHTML = `
      <div class="art-placard" id="placard-${art.id}">
        <div class="placard-header">
          <div class="status-dot-container">
            <span class="status-dot dot-${art.status}"></span>
            <span class="tooltip">${explanation}</span>
          </div>
        </div>
        <h3 class="placard-title">${escapeHTML(art.title)}</h3>
        <p class="placard-artist">${escapeHTML(art.artist)}${art.year ? ', ' + escapeHTML(art.year) : ''}</p>
        
        <div class="placard-reveal-hint">
          <span>Detalles</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>

        <div class="placard-details">
          <p><strong>Dimensiones:</strong> ${art.width} x ${art.height} cm</p>
          <p><strong>Material:</strong> ${escapeHTML(art.material)}</p>
          <p><strong>Técnica:</strong> ${escapeHTML(art.technique)}</p>
        </div>
      </div>
    `;

    // Armar elemento completo
    artPieceEl.innerHTML = `
      ${hangSystemHTML}
      <div class="art-frame-container" style="margin-top: ${wireHeight}px;">
        <div class="art-frame">
          <img src="${art.imageData}" alt="${escapeHTML(art.title)}" class="art-image" style="width: ${widthPx}px; height: ${heightPx}px;">
          <div class="canvas-texture-overlay"></div>
        </div>
      </div>
      ${placardHTML}
    `;

    // Evento de clic en placard para móviles (toggle descriptivo)
    const placard = artPieceEl.querySelector('.art-placard');
    placard.addEventListener('click', (e) => {
      if (!e.target.closest('.status-dot-container')) {
        placard.classList.toggle('active');

        // Cerrar otros placards abiertos para mayor limpieza visual
        document.querySelectorAll('.art-placard').forEach(other => {
          if (other !== placard) other.classList.remove('active');
        });
      }
    });

    wall.appendChild(artPieceEl);
  });
}

// Sanitizar entradas
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g,
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

/* ==========================================================================
   INICIALIZACIÓN DEL VISOR
   ========================================================================== */
window.addEventListener('DOMContentLoaded', async () => {
  try {
    await initDB();
    await checkAndLoadDefaults();
    await renderGallery();
  } catch (err) {
    console.error("Error al iniciar el visor de galería:", err);
    alert("No se pudo iniciar el almacenamiento local IndexedDB.");
  }
});

// Botón de emergencia si se vacía la base de datos
document.getElementById('load-defaults-empty-btn').addEventListener('click', async () => {
  await checkAndLoadDefaults();
  await renderGallery();
});
