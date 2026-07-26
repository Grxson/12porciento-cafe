export const CURRENT_VERSION = '1.1.0';

export const CHANGELOG = [
  {
    version: CURRENT_VERSION,
    date: 'Julio 2026',
    changes: [
      'Perfil barista optimizado para escritorio con navegación contextual.',
      'Suscripciones reorganizadas para aprovechar pantallas grandes.',
      'Carrito, tienda y pie de página refinados para una mejor experiencia PWA.',
    ],
  },
  {
    version: '1.0.0',
    date: 'Lanzamiento',
    changes: [
      'Gamificación barista con niveles, XP y logros.',
      'Paquetes, suscripciones mensuales y modo receta en vivo.',
      'PWA instalable con acceso rápido y soporte offline.',
    ],
  },
] as const;

export const LATEST_CHANGES = CHANGELOG[0].changes;
