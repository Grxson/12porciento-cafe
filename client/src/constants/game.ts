// Placeholder content for the "El Videojuego" landing page (/juego).
// Replace each value below once real game assets/copy are ready — every
// field here is referenced from client/src/pages/Game.tsx.

export const GAME_NAME = '[NOMBRE DEL VIDEOJUEGO]';

// TODO: reemplazar con la URL real del instalador cuando esté disponible.
export const GAME_DOWNLOAD_URL = '/downloads/juego-12-cafe-windows.zip';

export const GAME_PLATFORM = 'Windows 10 / 11 · 64 bits';

export const GAME_META = {
  genero: 'Aventura y exploración',
  duracion: '6-8 horas',
  modo: 'Un jugador',
  plataforma: 'Windows (PC)',
};

// TODO: sustituir por capturas/arte final del juego.
export const GAME_IMAGES = {
  heroArt:
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1600&q=80',
  presentation:
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  features: {
    explora:
      'https://images.unsplash.com/photo-1520371350581-1b0ea41d3e2b?auto=format&fit=crop&w=800&q=80',
    descubre:
      'https://images.unsplash.com/photo-1523301343968-6a6ebf63c672?auto=format&fit=crop&w=800&q=80',
    prepara:
      'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=800&q=80',
    desafios:
      'https://images.unsplash.com/photo-1542332213-31f87348057f?auto=format&fit=crop&w=800&q=80',
  },
  screenshots: [
    'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1497515114629-f71d768fd07c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1610632380989-680fe40816c6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1442550528053-c431ecb55509?auto=format&fit=crop&w=1200&q=80',
  ],
};

// TODO: confirmar requisitos mínimos/recomendados reales antes de publicar.
export const GAME_SYSTEM_REQUIREMENTS = {
  minimos: {
    so: 'Windows 10 64-bit',
    procesador: 'Intel Core i3 / AMD Ryzen 3',
    memoria: '8 GB RAM',
    grafico: 'Integrado (Intel UHD 620 o equivalente)',
    almacenamiento: '4 GB de espacio disponible',
  },
  recomendados: {
    so: 'Windows 11 64-bit',
    procesador: 'Intel Core i5 / AMD Ryzen 5',
    memoria: '16 GB RAM',
    grafico: 'NVIDIA GTX 1050 / AMD RX 560 o superior',
    almacenamiento: '4 GB de espacio disponible (SSD recomendado)',
  },
};
