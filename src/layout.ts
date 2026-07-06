import type { Artwork, PlacedArtwork } from './types.js';

interface SizedArtwork {
  artwork: Artwork;
  pxWidth: number;
  pxHeight: number;
}

interface Shelf {
  y: number;
  height: number;
  items: PlacedArtwork[];
  usedWidth: number;
}

function getGapParams(viewportWidth: number) {
  if (viewportWidth < 600) {
    return { gapX: 16, gapY: 16, labelReserve: 130, maxWidth: viewportWidth - 32 };
  }
  if (viewportWidth < 900) {
    const gx = Math.min(32, Math.max(20, viewportWidth * 0.03));
    return { gapX: gx, gapY: gx, labelReserve: 140, maxWidth: viewportWidth - gx * 2 };
  }
  const gx = Math.min(48, Math.max(32, viewportWidth * 0.025));
  return { gapX: gx, gapY: gx, labelReserve: 150, maxWidth: viewportWidth - gx * 2 };
}

function computeScale(artworks: Artwork[], viewportHeight: number, viewportWidth: number): number {
  if (artworks.length === 0) return 0;
  const heights = artworks.map((a) => a.dimensions.height).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)];

  // Base scale calculation on viewport height
  let baseScale = 0;
  if (viewportWidth < 600) {
    baseScale = (viewportHeight * 0.26) / medianHeight;
  } else if (viewportWidth < 900) {
    baseScale = (viewportHeight * 0.30) / medianHeight;
  } else {
    baseScale = (viewportHeight * 0.34) / medianHeight;
  }

  // Cap the scale to avoid exceeding the max height of the viewport
  const maxHeight = heights[heights.length - 1];
  const maxScaleHeight = (viewportHeight * 0.70) / maxHeight;
  let scale = Math.min(baseScale, maxScaleHeight);

  // Cap the scale to ensure the widest artwork fits within the available width (maxWidth)
  const { maxWidth } = getGapParams(viewportWidth);
  const widths = artworks.map((a) => a.dimensions.width);
  const maxPhysicalWidth = Math.max(...widths);
  
  // We want the widest artwork to occupy at most 85% of maxWidth in portrait/narrow viewports,
  // or at most 65% in landscape, so it looks like a painting on a wall.
  const widthRatioCap = viewportWidth < 600 ? 0.85 : 0.65;
  const maxScaleWidth = (maxWidth * widthRatioCap) / maxPhysicalWidth;

  return Math.min(scale, maxScaleWidth);
}

function sizeArtworks(
  artworks: Artwork[],
  scale: number,
  viewportWidth: number,
  viewportHeight: number,
  maxWidth: number
): SizedArtwork[] {
  const isMobile = viewportWidth < 600;
  return artworks.map((artwork) => {
    if (isMobile) {
      // Calculate individual scale for mobile to maximize screen real estate
      // Target: occupy 85% of maxWidth
      let indScale = (maxWidth * 0.85) / artwork.dimensions.width;
      
      // Cap height to at most 55% of viewportHeight so it doesn't extend off the screen
      const maxH = viewportHeight * 0.55;
      if (artwork.dimensions.height * indScale > maxH) {
        indScale = maxH / artwork.dimensions.height;
      }
      
      return {
        artwork,
        pxWidth: artwork.dimensions.width * indScale,
        pxHeight: artwork.dimensions.height * indScale,
      };
    } else {
      // Use the global scale on desktop/tablet to maintain physical relative proportions
      return {
        artwork,
        pxWidth: artwork.dimensions.width * scale,
        pxHeight: artwork.dimensions.height * scale,
      };
    }
  });
}

function packShelves(
  sized: SizedArtwork[],
  maxWidth: number,
  gapX: number,
  gapY: number,
  labelReserve: number,
  isMobile: boolean
): PlacedArtwork[] {
  const shelves: Shelf[] = [];

  for (const item of sized) {
    const itemW = item.pxWidth;
    const itemH = item.pxHeight;

    let placed = false;

    if (!isMobile) {
      for (const shelf of shelves) {
        if (shelf.usedWidth + gapX + itemW <= maxWidth) {
          const heightRatio = Math.max(itemH, shelf.height) / Math.min(itemH, shelf.height);
          if (heightRatio > 2.5) continue;

          const newX = shelf.usedWidth === 0 ? 0 : shelf.usedWidth + gapX;
          const newHeight = Math.max(shelf.height, itemH);

          shelf.items.push({
            artwork: item.artwork,
            x: newX,
            y: shelf.y + (newHeight - itemH),
            displayWidth: itemW,
            displayHeight: itemH,
          });

          if (newHeight > shelf.height) {
            const delta = newHeight - shelf.height;
            for (const p of shelf.items) {
              p.y += delta;
            }
            shelf.height = newHeight;
          }

          shelf.usedWidth = newX + itemW;
          placed = true;
          break;
        }
      }
    }

    if (!placed) {
      const prevBottom = shelves.length > 0
        ? shelves[shelves.length - 1].y + shelves[shelves.length - 1].height + labelReserve + gapY
        : 0;

      const xCoord = isMobile ? (maxWidth - itemW) / 2 : 0;

      const newShelf: Shelf = {
        y: prevBottom,
        height: itemH,
        items: [
          {
            artwork: item.artwork,
            x: xCoord,
            y: prevBottom,
            displayWidth: itemW,
            displayHeight: itemH,
          },
        ],
        usedWidth: itemW,
      };

      shelves.push(newShelf);
    }
  }

  const placed: PlacedArtwork[] = [];
  for (const shelf of shelves) {
    placed.push(...shelf.items);
  }

  return placed;
}

export function computeGalleryLayout(
  artworks: Artwork[],
  viewportWidth: number,
  viewportHeight: number,
): { placed: PlacedArtwork[]; totalHeight: number } {
  if (artworks.length === 0) return { placed: [], totalHeight: 0 };

  const { gapX, gapY, labelReserve, maxWidth } = getGapParams(viewportWidth);
  const scale = computeScale(artworks, viewportHeight, viewportWidth);
  const sized = sizeArtworks(artworks, scale, viewportWidth, viewportHeight, maxWidth);

  sized.sort((a, b) => b.pxHeight - a.pxHeight);

  const isMobile = viewportWidth < 600;
  const placed = packShelves(sized, maxWidth, gapX, gapY, labelReserve, isMobile);

  for (const p of placed) {
    p.x += gapX;
    p.y += gapY;
  }

  const totalHeight = placed.length > 0
    ? Math.max(...placed.map((p) => p.y + p.displayHeight)) + gapY + labelReserve
    : 0;

  return { placed, totalHeight };
}

export function observeLayout(
  wallEl: HTMLElement,
  artworks: Artwork[],
  callback: (placed: PlacedArtwork[], totalHeight: number) => void,
): () => void {
  const handler = () => {
    const { placed, totalHeight } = computeGalleryLayout(
      artworks,
      window.innerWidth,
      window.innerHeight,
    );
    callback(placed, totalHeight);
  };

  handler();

  let scheduled = false;
  const schedule = () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        handler();
      });
    }
  };

  const observer = new ResizeObserver(() => schedule());
  observer.observe(wallEl);
  observer.observe(document.body);
  window.addEventListener('resize', schedule);

  return () => {
    observer.disconnect();
    window.removeEventListener('resize', schedule);
  };
}
