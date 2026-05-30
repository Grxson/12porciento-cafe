import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Thermometer, Coffee, ArrowRight, BookOpen } from 'lucide-react';
import jsPDF from 'jspdf';
import { productsApi } from '../api';
import type { Product, Recipe } from '../types';

interface RecipeEntry {
  recipe: Recipe;
  product: Product;
}

const methodOrder = ['Espresso', 'V60', 'Pour Over V60', 'Chemex', 'Kalita Wave', 'Prensa Francesa', 'Cold Brew', 'Moka', 'Americano'];

function methodIcon(method: string) {
  if (method.toLowerCase().includes('espresso') || method.toLowerCase().includes('americano')) return '☕';
  if (method.toLowerCase().includes('cold') || method.toLowerCase().includes('frío')) return '🧊';
  if (method.toLowerCase().includes('moka') || method.toLowerCase().includes('presión')) return '🔩';
  return '🫗';
}

export default function Recipes() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productsApi.list({ category: 'CAFÉ' }).then((r) => {
      setProducts(r.data);
      setLoading(false);
    });
  }, []);

  const grouped: Record<string, RecipeEntry[]> = {};
  for (const product of products) {
    for (const recipe of product.recipes) {
      const key = recipe.title;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ recipe, product });
    }
  }

  const sortedMethods = Object.keys(grouped).sort((a, b) => {
    const ia = methodOrder.indexOf(a);
    const ib = methodOrder.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const downloadRecipePDF = (method: string, recipe: Recipe) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a5' });
    const W = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Header bar
    doc.setFillColor(13, 8, 6);
    doc.rect(0, 0, W, 28, 'F');
    doc.setTextColor(201, 169, 110);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('12%', 10, 17);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('CAFÉ DE ESPECIALIDAD', 10, 24);

    // Title
    doc.setTextColor(13, 8, 6);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(method, 10, 42);

    // Gold divider
    doc.setDrawColor(201, 169, 110);
    doc.setLineWidth(0.5);
    doc.line(10, 47, W - 10, 47);

    // Parameters row
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 46, 26);
    const paramW = (W - 20) / 3;
    [`Temp: ${recipe.temp}`, `Molido: ${recipe.grind}`, `Ratio: ${recipe.ratio}`]
      .forEach((p, i) => doc.text(p, 10 + i * paramW, 54, { maxWidth: paramW - 2 }));

    doc.line(10, 59, W - 10, 59);

    // Steps
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 8, 6);
    doc.text('Pasos', 10, 67);

    doc.setFont('helvetica', 'normal');
    let y = 75;
    for (let i = 0; i < recipe.steps.length; i++) {
      const lines = doc.splitTextToSize(`${i + 1}. ${recipe.steps[i]}`, W - 20);
      if (y + lines.length * 5 > pageH - 18) break;
      doc.text(lines, 10, y);
      y += lines.length * 5 + 3;
    }

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('12% Café de Especialidad — 12porciento.com', 10, pageH - 8);

    doc.save(`receta-${method.toLowerCase().replace(/[\s/]+/g, '-')}.pdf`);
  };

  return (
    <div className="pt-20 min-h-screen">
      {/* Header */}
      <div className="bg-coffee-900 border-b border-coffee-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="w-12 h-[2px] bg-gold-500 mb-4" />
            <h1 className="font-serif text-5xl md:text-6xl text-cream mb-3">Recetas</h1>
            <p className="text-coffee-300 text-lg max-w-xl">
              Guías de preparación para extraer lo mejor de nuestros cafés de especialidad.
              Cada receta está calibrada para el origen y proceso de cada lote.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
          </div>
        ) : sortedMethods.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-coffee-300 mx-auto mb-4" />
            <p className="text-coffee-500">No hay recetas disponibles aún.</p>
          </div>
        ) : (
          <div className="space-y-16">
            {sortedMethods.map((method, mi) => {
              const entries = grouped[method];
              const firstRecipe = entries[0].recipe;
              return (
                <motion.section
                  key={method}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.5, delay: mi * 0.05 }}
                >
                  {/* Method header */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-coffee-900 border border-coffee-700 flex items-center justify-center text-xl">
                      {methodIcon(method)}
                    </div>
                    <div>
                      <h2 className="font-serif text-3xl text-coffee-900">{method}</h2>
                      <p className="text-coffee-500 text-sm">{firstRecipe.method}</p>
                    </div>
                    <div className="ml-auto hidden sm:flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1.5 text-coffee-600">
                        <Thermometer className="w-4 h-4 text-gold-500" />
                        {firstRecipe.temp}
                      </div>
                      <div className="flex items-center gap-1.5 text-coffee-600">
                        <Coffee className="w-4 h-4 text-gold-500" />
                        Ratio {firstRecipe.ratio}
                      </div>
                    </div>
                    <button
                      onClick={() => downloadRecipePDF(method, firstRecipe)}
                      className="hidden sm:flex items-center gap-1.5 text-xs text-coffee-400 hover:text-gold-500 border border-coffee-700 hover:border-gold-500/40 px-3 py-1.5 transition-colors ml-auto"
                      title="Descargar receta en PDF"
                    >
                      ↓ PDF
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Steps card — use the first recipe's steps */}
                    <div className="lg:col-span-1 bg-coffee-900 p-6">
                      <p className="text-xs text-gold-500 uppercase tracking-widest mb-4">Parámetros</p>
                      <div className="grid grid-cols-3 gap-3 mb-5 pb-5 border-b border-coffee-800">
                        <div>
                          <p className="text-coffee-500 text-[10px] uppercase tracking-widest mb-1">Temp.</p>
                          <p className="text-cream text-sm">{firstRecipe.temp}</p>
                        </div>
                        <div>
                          <p className="text-coffee-500 text-[10px] uppercase tracking-widest mb-1">Molido</p>
                          <p className="text-cream text-sm">{firstRecipe.grind}</p>
                        </div>
                        <div>
                          <p className="text-coffee-500 text-[10px] uppercase tracking-widest mb-1">Ratio</p>
                          <p className="text-cream text-sm">{firstRecipe.ratio}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gold-500 uppercase tracking-widest mb-3">Pasos</p>
                      <ol className="space-y-3">
                        {firstRecipe.steps.map((step, si) => (
                          <li key={si} className="flex gap-3 text-sm text-coffee-300">
                            <span className="text-gold-500 font-bold w-4 shrink-0">{si + 1}.</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Recommended coffees */}
                    <div className="lg:col-span-2">
                      <p className="text-xs text-coffee-500 uppercase tracking-widest mb-4">Cafés recomendados para este método</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {entries.map(({ product }) => (
                          <Link
                            key={product.id}
                            to={`/tienda/${product.slug}`}
                            className="group flex gap-4 bg-white border border-coffee-200 hover:border-gold-500/50 p-4 transition-all"
                          >
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-16 h-16 object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-serif text-coffee-900 group-hover:text-gold-600 transition-colors leading-tight">{product.name}</p>
                              {product.region && <p className="text-coffee-500 text-xs mt-0.5">{product.region}</p>}
                              {product.flavors.length > 0 && (
                                <p className="text-coffee-400 text-xs mt-1 truncate">{product.flavors.slice(0, 2).join(' · ')}</p>
                              )}
                              <div className="flex items-center gap-1 mt-2 text-gold-600 text-xs font-medium">
                                Ver producto <ArrowRight className="w-3 h-3" />
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
