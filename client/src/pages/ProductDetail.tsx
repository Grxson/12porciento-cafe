import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Mountain, Leaf, Star, ShoppingBag, ArrowLeft, Package, Coffee, BookOpen, MessageSquare, Thermometer, Award, FlaskConical, Globe } from 'lucide-react';
import { productsApi, reviewsApi } from '../api';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import StarRating from '../components/StarRating';
import CoffeeTimeline from '../components/CoffeeTimeline';
import type { Product, Review } from '../types';

type Tab = 'info' | 'ficha' | 'recipes' | 'reviews';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [tab, setTab] = useState<Tab>('info');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewForm, setReviewForm] = useState({ name: '', email: '', rating: 0, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const addItem = useCart((s) => s.addItem);
  const token = useUser((s) => s.token);

  useEffect(() => {
    if (!slug) return;
    productsApi.getBySlug(slug).then((r) => {
      setProduct(r.data);
      setLoading(false);
      reviewsApi.listByProduct(r.data.id).then((rr) => setReviews(rr.data.data || []));
    });
  }, [slug]);

  const handleAdd = () => {
    if (!product) return;
    addItem(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || reviewForm.rating === 0) {
      setReviewError('Por favor selecciona una calificación con estrellas.');
      return;
    }
    setReviewSubmitting(true);
    setReviewError('');
    try {
      await reviewsApi.create(product.id, reviewForm);
      setReviewSuccess(true);
      setReviewForm({ name: '', email: '', rating: 0, comment: '' });
    } catch (err: any) {
      setReviewError(err.response?.data?.error || 'Error al enviar reseña.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 gap-4">
        <p className="text-coffee-600 text-lg">Producto no encontrado.</p>
        <Link to="/tienda" className="btn-outline">Volver a la tienda</Link>
      </div>
    );
  }

  const isCafe = product.category === 'CAFÉ';
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'info', label: 'Descripción', icon: Coffee },
    ...(isCafe ? [{ id: 'ficha' as Tab, label: 'Ficha Técnica', icon: FlaskConical }] : []),
    ...(isCafe && product.recipes.length > 0 ? [{ id: 'recipes' as Tab, label: 'Recetas', icon: BookOpen, count: product.recipes.length }] : []),
    { id: 'reviews', label: 'Reseñas', icon: MessageSquare, count: reviews.length },
  ];

  return (
    <div className="pt-20 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/tienda" className="inline-flex items-center gap-2 text-coffee-500 hover:text-coffee-900 transition-colors text-sm mb-10">
          <ArrowLeft className="w-4 h-4" /> Volver a la tienda
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Image */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="relative">
            <div className="aspect-[3/4] overflow-hidden">
              <motion.img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.04 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <div className="absolute top-4 left-4 flex gap-2">
              {product.isLimited && <span className="limited-badge uppercase tracking-wider">Edición Limitada</span>}
            </div>
            {reviews.length > 0 && (
              <div className="absolute bottom-4 left-4 bg-coffee-950/85 px-3 py-2 flex items-center gap-2">
                <StarRating value={Math.round(avgRating)} size={14} readonly />
                <span className="text-cream text-xs font-medium">{avgRating.toFixed(1)} ({reviews.length})</span>
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
            <div className="gold-line mb-4" />
            {product.origin && <p className="text-gold-600 text-xs tracking-widest uppercase mb-2">{product.origin}</p>}
            <h1 className="font-serif text-4xl md:text-5xl text-coffee-900 mb-2">{product.name}</h1>

            {isCafe && (
              <div className="flex items-center gap-3 mt-3 mb-6">
                {product.scaScore && (
                  <span className="sca-badge text-sm px-3 py-1.5">
                    <Star className="w-3.5 h-3.5 fill-gold-500 text-gold-500" />
                    SCA {product.scaScore}
                  </span>
                )}
                {product.roastLevel && (
                  <span className="text-xs text-coffee-600 border border-coffee-300 px-3 py-1.5 uppercase tracking-wider">
                    {product.roastLevel}
                  </span>
                )}
              </div>
            )}

            <p className="text-coffee-700 leading-relaxed mb-8">{product.description}</p>

            {isCafe && product.flavors.length > 0 && (
              <div className="mb-8">
                <p className="text-xs text-gold-600 uppercase tracking-widest mb-3">Notas de cata</p>
                <div className="flex flex-wrap gap-2">
                  {product.flavors.map((f) => (
                    <span key={f} className="bg-coffee-100 border border-coffee-200 text-coffee-700 text-sm px-3 py-1.5">{f}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick traceability row for café */}
            {isCafe && (
              <div className="flex flex-wrap gap-4 mb-8 text-sm">
                {product.region && (
                  <div className="flex items-center gap-1.5 text-coffee-600">
                    <MapPin className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                    {product.region}
                  </div>
                )}
                {product.altitude && (
                  <div className="flex items-center gap-1.5 text-coffee-600">
                    <Mountain className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                    {product.altitude} msnm
                  </div>
                )}
                {product.process && (
                  <div className="flex items-center gap-1.5 text-coffee-600">
                    <Leaf className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                    {product.process}
                  </div>
                )}
              </div>
            )}

            {/* Price + Add */}
            <div className="border-t border-coffee-200 pt-6">
              <div className="flex items-baseline gap-2 mb-6">
                <span className="font-serif text-4xl text-coffee-900 font-semibold">${product.price}</span>
                <span className="text-coffee-500 text-sm">MXN{product.weight ? ` / ${product.weight}g` : ''}</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center border border-coffee-300">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 flex items-center justify-center text-coffee-500 hover:text-coffee-900 transition-colors">−</button>
                  <span className="w-10 text-center text-coffee-900">{qty}</span>
                  <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="w-10 h-10 flex items-center justify-center text-coffee-500 hover:text-coffee-900 transition-colors">+</button>
                </div>

                <button
                  onClick={handleAdd}
                  disabled={product.stock === 0}
                  className={`flex-1 flex items-center justify-center gap-2 h-10 font-medium text-sm uppercase tracking-wide transition-all ${
                    added ? 'bg-green-600 text-white' : 'bg-gold-500 text-coffee-950 hover:bg-gold-400'
                  } disabled:bg-coffee-200 disabled:text-coffee-400`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  {product.stock === 0 ? 'Agotado' : added ? '¡Agregado!' : 'Agregar al carrito'}
                </button>
              </div>

              <p className="text-coffee-500 text-xs mt-3">
                {product.stock} unidades disponibles{isCafe ? ' · Tostado a pedido' : ''}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="mt-16 border-t border-coffee-200">
          <div className="flex gap-0 border-b border-coffee-200">
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all ${
                  tab === id
                    ? 'border-gold-500 text-gold-600'
                    : 'border-transparent text-coffee-500 hover:text-coffee-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {count !== undefined && count > 0 && (
                  <span className="bg-coffee-100 text-coffee-600 text-xs px-1.5 py-0.5 rounded-full">{count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="py-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
              >
            {/* Description tab */}
            {tab === 'info' && (
              <div className="max-w-2xl">
                <p className="text-coffee-700 leading-relaxed text-lg">{product.description}</p>
              </div>
            )}

            {/* Ficha Técnica tab — specialty coffee data sheet */}
            {tab === 'ficha' && isCafe && (
              <div className="max-w-3xl">
                <div className="mb-6">
                  <div className="gold-line mb-4" />
                  <h2 className="font-serif text-2xl text-coffee-900 mb-1">Ficha Técnica</h2>
                  <p className="text-coffee-500 text-sm">Información técnica completa del lote seleccionado</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-coffee-200">
                  {/* Origin block */}
                  <div className="bg-white p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="w-4 h-4 text-gold-500" />
                      <span className="text-xs text-coffee-500 uppercase tracking-widest">Origen</span>
                    </div>
                    <p className="font-serif text-lg text-coffee-900">{product.origin || '—'}</p>
                    {product.region && <p className="text-coffee-600 text-sm mt-1">{product.region}</p>}
                  </div>

                  {/* Altitude block */}
                  <div className="bg-white p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Mountain className="w-4 h-4 text-gold-500" />
                      <span className="text-xs text-coffee-500 uppercase tracking-widest">Altitud</span>
                    </div>
                    <p className="font-serif text-lg text-coffee-900">{product.altitude ? `${product.altitude} msnm` : '—'}</p>
                    {product.altitude && (
                      <p className="text-coffee-500 text-xs mt-1">
                        {product.altitude >= 1600 ? 'Alta montaña — complejidad aromática superior' :
                         product.altitude >= 1200 ? 'Altitud media-alta — buen balance acidez/cuerpo' :
                         'Altitud media — perfil dulce y corpulento'}
                      </p>
                    )}
                  </div>

                  {/* Variety block */}
                  <div className="bg-white p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Leaf className="w-4 h-4 text-gold-500" />
                      <span className="text-xs text-coffee-500 uppercase tracking-widest">Variedad</span>
                    </div>
                    <p className="font-serif text-lg text-coffee-900">{product.variety || '—'}</p>
                    <p className="text-coffee-500 text-xs mt-1">Varietal del café</p>
                  </div>

                  {/* Process block */}
                  <div className="bg-white p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <FlaskConical className="w-4 h-4 text-gold-500" />
                      <span className="text-xs text-coffee-500 uppercase tracking-widest">Proceso</span>
                    </div>
                    <p className="font-serif text-lg text-coffee-900">{product.process || '—'}</p>
                    <p className="text-coffee-500 text-xs mt-1">
                      {product.process === 'Lavado' ? 'Fermentación húmeda — limpieza y acidez brillante' :
                       product.process === 'Natural' ? 'Secado con fruto — dulzura frutal intensa' :
                       product.process === 'Honey' ? 'Mucílago parcial — balance dulzura / acidez' :
                       product.process === 'Anaeróbico Natural' ? 'Fermentación sellada — complejidad experimental' :
                       'Método de procesado del café'}
                    </p>
                  </div>

                  {/* Roast block */}
                  <div className="bg-white p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Thermometer className="w-4 h-4 text-gold-500" />
                      <span className="text-xs text-coffee-500 uppercase tracking-widest">Perfil de Tueste</span>
                    </div>
                    <p className="font-serif text-lg text-coffee-900">{product.roastLevel || '—'}</p>
                    <p className="text-coffee-500 text-xs mt-1">
                      {product.roastLevel === 'Ligero' ? 'Preserva acidez y florales del terroir' :
                       product.roastLevel === 'Medio-Ligero' ? 'Balance entre dulzura y complejidad aromática' :
                       product.roastLevel === 'Medio' ? 'Cuerpo redondo, acidez integrada, dulzura notable' :
                       product.roastLevel === 'Oscuro' ? 'Cuerpo potente, notas amargas, baja acidez' :
                       'Nivel de tueste aplicado'}
                    </p>
                  </div>

                  {/* SCA Score block */}
                  <div className="bg-white p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="w-4 h-4 text-gold-500" />
                      <span className="text-xs text-coffee-500 uppercase tracking-widest">Puntaje SCA</span>
                    </div>
                    {product.scaScore ? (
                      <>
                        <p className="font-serif text-3xl text-coffee-900 font-bold">{product.scaScore}</p>
                        <div className="mt-2">
                          <div className="w-full bg-coffee-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-gold-500 to-gold-400 rounded-full"
                              style={{ width: `${Math.min(100, ((product.scaScore - 80) / 20) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-coffee-400 mt-1">
                            <span>80 · Specialty</span>
                            <span>90 · Outstanding</span>
                            <span>100</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="font-serif text-lg text-coffee-900">—</p>
                    )}
                  </div>
                </div>

                {/* Tasting notes */}
                {product.flavors.length > 0 && (
                  <div className="mt-6 bg-coffee-900 p-6">
                    <p className="text-xs text-gold-500 uppercase tracking-widest mb-4">Notas de Catación</p>
                    <div className="flex flex-wrap gap-2">
                      {product.flavors.map((f) => (
                        <span key={f} className="bg-coffee-800 border border-coffee-700 text-coffee-200 px-3 py-1.5 text-sm">{f}</span>
                      ))}
                    </div>
                    <p className="text-coffee-400 text-xs mt-4">
                      Notas detectadas bajo protocolo de cata SCA. Las notas pueden variar según método de preparación.
                    </p>
                  </div>
                )}

                {/* Gramaje */}
                {product.weight && (
                  <div className="mt-4 border border-coffee-200 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gold-500" />
                      <span className="text-coffee-700 text-sm">Presentación</span>
                    </div>
                    <span className="font-medium text-coffee-900">{product.weight}g · Grano entero o molido</span>
                  </div>
                )}

                <p className="text-coffee-400 text-xs mt-6 italic">
                  * Tostado a pedido en lotes pequeños para garantizar frescura. Envío dentro de los 7 días posteriores al tueste.
                </p>
                <CoffeeTimeline product={product} />
              </div>
            )}

            {/* Recipes tab */}
            {tab === 'recipes' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {product.recipes.map((recipe, i) => (
                  <div key={i} className="bg-white border border-coffee-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-serif text-xl text-coffee-900">{recipe.title}</h3>
                      <span className="text-xs text-gold-600 border border-gold-500/40 px-2 py-1 uppercase tracking-widest">{recipe.method}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-5 pb-5 border-b border-coffee-200">
                      <div>
                        <p className="text-coffee-400 text-[10px] uppercase tracking-widest mb-1">Temperatura</p>
                        <p className="text-coffee-800 text-sm font-medium">{recipe.temp}</p>
                      </div>
                      <div>
                        <p className="text-coffee-400 text-[10px] uppercase tracking-widest mb-1">Molido</p>
                        <p className="text-coffee-800 text-sm font-medium">{recipe.grind}</p>
                      </div>
                      <div>
                        <p className="text-coffee-400 text-[10px] uppercase tracking-widest mb-1">Ratio</p>
                        <p className="text-coffee-800 text-sm font-medium">{recipe.ratio}</p>
                      </div>
                    </div>

                    <ol className="space-y-3">
                      {recipe.steps.map((step, si) => (
                        <li key={si} className="flex gap-3 text-sm text-coffee-700">
                          <span className="text-gold-600 font-bold w-5 shrink-0">{si + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>

                    {recipe.videoUrl && token && (
                      <div className="mt-5 pt-5 border-t border-coffee-200">
                        <p className="text-[10px] text-coffee-400 uppercase tracking-widest mb-3">Video guía</p>
                        <div className="aspect-video">
                          <iframe
                            src={recipe.videoUrl}
                            title={recipe.title}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Reviews tab */}
            {tab === 'reviews' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-6">
                  {reviews.length === 0 ? (
                    <p className="text-coffee-500">Sin reseñas aún. ¡Sé el primero!</p>
                  ) : (
                    reviews.map((review) => (
                      <div key={review.id} className="border-b border-coffee-200 pb-6">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-coffee-900 font-medium">{review.name}</p>
                            <p className="text-coffee-400 text-xs">{new Date(review.createdAt).toLocaleDateString('es-MX')}</p>
                          </div>
                          <StarRating value={review.rating} size={16} readonly />
                        </div>
                        <p className="text-coffee-700 text-sm leading-relaxed">{review.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <div className="bg-white border border-coffee-200 p-6">
                    <h3 className="font-serif text-xl text-coffee-900 mb-5">Escribe tu reseña</h3>

                    {reviewSuccess ? (
                      <div className="text-center py-4">
                        <div className="text-green-600 text-2xl mb-2">✓</div>
                        <p className="text-coffee-700 text-sm">Reseña enviada. Será publicada tras revisión.</p>
                        <button onClick={() => setReviewSuccess(false)} className="text-gold-600 text-xs mt-3 underline">Escribir otra</button>
                      </div>
                    ) : (
                      <form onSubmit={handleReviewSubmit} className="space-y-4">
                        <div>
                          <p className="text-xs text-coffee-600 uppercase tracking-widest mb-2">Calificación *</p>
                          <StarRating
                            value={reviewForm.rating}
                            onChange={(v) => setReviewForm((f) => ({ ...f, rating: v }))}
                            size={28}
                          />
                        </div>

                        {[
                          { key: 'name', label: 'Nombre *', required: true, type: 'text' },
                          { key: 'email', label: 'Email *', required: true, type: 'email' },
                        ].map(({ key, label, required, type }) => (
                          <div key={key}>
                            <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-1">{label}</label>
                            <input
                              required={required}
                              type={type}
                              value={(reviewForm as any)[key]}
                              onChange={(e) => setReviewForm((f) => ({ ...f, [key]: e.target.value }))}
                              className="w-full bg-white border border-coffee-300 text-coffee-900 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
                            />
                          </div>
                        ))}

                        <div>
                          <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-1">Comentario *</label>
                          <textarea
                            required
                            rows={4}
                            value={reviewForm.comment}
                            onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                            className="w-full bg-white border border-coffee-300 text-coffee-900 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none resize-none"
                          />
                        </div>

                        {reviewError && <p className="text-red-500 text-xs">{reviewError}</p>}

                        <button type="submit" disabled={reviewSubmitting} className="w-full btn-primary disabled:opacity-50">
                          {reviewSubmitting ? 'Enviando…' : 'Enviar reseña'}
                        </button>
                        <p className="text-coffee-400 text-[10px]">Tu reseña aparecerá tras aprobación del equipo.</p>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
