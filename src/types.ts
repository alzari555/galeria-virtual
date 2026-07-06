export type SaleStatus = 'available' | 'reserved' | 'sold' | '';

export interface Dimensions {
  width: number;
  height: number;
}

export interface Artwork {
  id: string;
  title: string;
  artist: string;
  image: string;
  dimensions: Dimensions;
  material: string;
  technique: string;
  year: number;
  status: SaleStatus;
}

export interface ArtworkData {
  artworks: Artwork[];
}

export interface PlacedArtwork {
  artwork: Artwork;
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
}

export type GalleryWall = PlacedArtwork[];
