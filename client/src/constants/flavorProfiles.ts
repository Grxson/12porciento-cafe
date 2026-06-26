export const FLAVOR_PROFILES: Record<string, { label: string }> = {
  chocolate: { label: 'Chocolate' },
  frutal: { label: 'Frutal' },
  dulce: { label: 'Caramelo & Dulce' },
  nueces: { label: 'Nueces & Especias' },
  floral: { label: 'Floral & Té' },
  vino: { label: 'Vino & Fermentado' },
  tostado: { label: 'Tostado & Cuerpo' },
  otros: { label: 'Otros' },
};

export const PROFILE_ORDER = [
  'chocolate', 'frutal', 'dulce', 'nueces', 'floral', 'vino', 'tostado', 'otros',
];

const FLAVOR_MAP: Record<string, string> = {
  'Chocolate amargo': 'chocolate',
  'Chocolate': 'chocolate',
  'Cacao': 'chocolate',
  'Cacao nibs': 'chocolate',
  'Chocolate oscuro': 'chocolate',
  'Chocolate con leche': 'chocolate',
  'Chocolate blanco': 'chocolate',
  'Chocolate negro': 'chocolate',

  'Durazno': 'frutal',
  'Frambuesa': 'frutal',
  'Frutos rojos': 'frutal',
  'Mango': 'frutal',
  'Maracuyá': 'frutal',
  'Cereza': 'frutal',
  'Cereza fermentada': 'frutal',
  'Blueberry': 'frutal',
  'Blackberry': 'frutal',
  'Fresa': 'frutal',
  'Piña': 'frutal',
  'Pera': 'frutal',
  'Melocotón blanco': 'frutal',
  'Melocotón': 'frutal',
  'Ciruela': 'frutal',
  'Papaya': 'frutal',
  'Mora azul': 'frutal',
  'Guayaba': 'frutal',
  'Naranja': 'frutal',
  'Cítrico': 'frutal',
  'Frutales': 'frutal',

  'Miel': 'dulce',
  'Miel de caña': 'dulce',
  'Miel de abeja': 'dulce',
  'Miel de flores': 'dulce',
  'Miel negra': 'dulce',
  'Panela': 'dulce',
  'Caramelo': 'dulce',
  'Caramelo quemado': 'dulce',
  'Vainilla': 'dulce',
  'Ron': 'dulce',
  'Ron oscuro': 'dulce',
  'Ron dulce': 'dulce',

  'Almendra': 'nueces',
  'Almendra tostada': 'nueces',
  'Avellana': 'nueces',
  'Nuez': 'nueces',
  'Nueces': 'nueces',
  'Canela': 'nueces',
  'Pimienta': 'nueces',
  'Especias': 'nueces',

  'Flor de azahar': 'floral',
  'Jazmín': 'floral',
  'Jazmín intenso': 'floral',
  'Pétalo de rosa': 'floral',
  'Floral': 'floral',
  'Flores': 'floral',
  'Flores silvestres': 'floral',
  'Té blanco': 'floral',
  'Té negro': 'floral',
  'Té oolong': 'floral',
  'Bergamota': 'floral',

  'Vino tinto': 'vino',
  'Vino': 'vino',
  'Tabaco': 'vino',
  'Tabaco dulce': 'vino',
  'Hibisco': 'vino',
  'Dátil': 'vino',

  'Humo': 'tostado',
  'Suave': 'tostado',
  'Cuerpo': 'tostado',
  'Tradicional': 'tostado',
  'Rápido': 'tostado',

  'Degustación': 'otros',
  'Exploración': 'otros',
  'Variedad': 'otros',
  'Degustación premium': 'otros',
  'Viaje sensorial': 'otros',
};

export function groupFlavorsByProfile(flavors: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const flavor of flavors) {
    const profile = FLAVOR_MAP[flavor] || 'otros';
    if (!groups[profile]) groups[profile] = [];
    groups[profile].push(flavor);
  }
  for (const profile of Object.keys(groups)) {
    groups[profile].sort((a, b) => a.localeCompare(b));
  }
  return groups;
}
