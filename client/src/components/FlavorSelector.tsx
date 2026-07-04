import { motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';

interface FlavorGroup {
  category: string;
  flavors: string[];
}

const FLAVOR_GROUPS: FlavorGroup[] = [
  { category: 'Dulce', flavors: ['Chocolate', 'Caramelo', 'Miel', 'Vainilla', 'Frutos secos'] },
  {
    category: 'Frutal',
    flavors: ['Cítrico', 'Frutos rojos', 'Fruta tropical', 'Manzana', 'Durazno'],
  },
  { category: 'Floral', flavors: ['Jazmín', 'Lavanda', 'Rosa', 'Hibisco'] },
  { category: 'Especiado', flavors: ['Canela', 'Clavo', 'Pimienta', 'Nuez moscada'] },
  { category: 'Terroso', flavors: ['Tabaco', 'Cuero', 'Madera', 'Cacao'] },
  { category: 'Otros', flavors: ['Nueces', 'Mantequilla', 'Crema', 'Vino tinto'] },
];

interface FlavorSelectorProps {
  selected: string[];
  onChange: (flavors: string[]) => void;
  max?: number;
}

export default function FlavorSelector({ selected, onChange, max = 5 }: FlavorSelectorProps) {
  const { add } = useToast();

  const toggle = (flavor: string) => {
    if (selected.includes(flavor)) {
      onChange(selected.filter((f) => f !== flavor));
    } else if (selected.length >= max) {
      add(`Máximo ${max} sabores`, 'warning');
    } else {
      onChange([...selected, flavor]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest">
          Sabores preferidos
        </p>
        <span className="text-xs text-coffee-500">
          {selected.length}/{max} seleccionados
        </span>
      </div>
      {FLAVOR_GROUPS.map((group) => (
        <div key={group.category}>
          <p className="text-xs text-coffee-500 dark:text-coffee-500 mb-2 font-medium">
            {group.category}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.flavors.map((flavor) => {
              const isSelected = selected.includes(flavor);
              return (
                <motion.button
                  key={flavor}
                  type="button"
                  onClick={() => toggle(flavor)}
                  whileTap={{ scale: 0.95 }}
                  className={`px-3 py-1.5 text-sm border transition-colors ${
                    isSelected
                      ? 'bg-gold-500/20 border-gold-500 text-gold-400 font-medium'
                      : 'bg-coffee-100 dark:bg-coffee-800 border-coffee-200 dark:border-coffee-700 text-coffee-700 dark:text-coffee-300 hover:border-coffee-400 dark:hover:border-coffee-600'
                  }`}
                >
                  {flavor}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
