// Content for the "Bean Catcher" landing page (/juego).
// Replace TODO-marked values once final assets are ready — every
// field here is referenced from client/src/pages/Game.tsx.

export const GAME_NAME = 'Bean Catcher';

export const GAME_DESCRIPTION =
  'Bean Catcher es un videojuego de habilidad desarrollado en Unity: controla una taza de café ' +
  'cuyo objetivo es alcanzar una extracción perfecta del 12% recolectando granos de café. ' +
  'Evita moscas que reducen tus vidas y domina las corrientes de viento que suben la dificultad ' +
  'en el segundo nivel.';

export const GAME_DOWNLOAD_URL = '/juego/BeanCatcherInstaller.exe';

export const GAME_PLATFORM = 'Windows 10 / 11 · 64 bits';

export const GAME_META = {
  genero: 'Habilidad / Arcade',
  duracion: 'Partidas rápidas (~5 min)',
  modo: 'Un jugador',
  plataforma: 'Windows (PC)',
};

export const GAME_IMAGES = {
  heroArt: '/juego/juego-1.jpeg',
  presentation: '/juego/juego-1.jpeg',
  features: {
    recolecta: '/juego/recolecta.jpeg',
    esquiva: '/juego/esquiva.jpeg',
    viento: '/juego/juego-1.jpeg',
    extraccion: '/juego/alcanza12.jpeg',
  },
  screenshots: [
    '/juego/juego-1.jpeg',
    '/juego/recolecta.jpeg',
    '/juego/esquiva.jpeg',
    '/juego/alcanza12.jpeg',
  ],
};

export const GAME_SYSTEM_REQUIREMENTS = {
  minimos: {
    so: 'Windows 7 64-bit o superior',
    procesador: 'Procesador dual-core 2 GHz',
    memoria: '2 GB RAM',
    grafico: 'Integrado (soporta OpenGL 2.0)',
    almacenamiento: '500 MB de espacio disponible',
  },
  recomendados: {
    so: 'Windows 10 64-bit o superior',
    procesador: 'Procesador quad-core 2.5 GHz',
    memoria: '4 GB RAM',
    grafico: 'Dedicada (cualquier tarjeta moderna)',
    almacenamiento: '500 MB en SSD',
  },
};
