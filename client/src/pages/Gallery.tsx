import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw, Camera, ChefHat } from 'lucide-react';
import api from '../api';
import { PageMeta } from '../hooks/usePageMeta';
import Breadcrumbs from '../components/Breadcrumbs';
import PageSkeleton from '../components/PageSkeleton';
import GalleryLightbox from '../components/GalleryLightbox';

interface GalleryImage {
  id: string;
  url: string;
  alt: string;
  productName: string;
  productSlug: string;
}

interface GalleryResponse {
  images: GalleryImage[];
}

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const fetchImages = () => {
    setLoading(true);
    setError(false);
    api
      .get<GalleryResponse>('/products/gallery')
      .then((r) => {
        setImages(r.data.images ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <div className="min-h-dvh bg-coffee-50 dark:bg-coffee-950">
      <PageMeta
        title="Galería"
        description="Imágenes de nuestros cafés de especialidad, fincas y procesos."
      />

      <div className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs crumbs={[{ label: 'Inicio', to: '/' }, { label: 'Galería' }]} />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="gold-line mb-4" />
            <h1 className="mb-2 font-serif text-4xl text-coffee-900 dark:text-cream sm:text-5xl md:text-6xl">
              Galería
            </h1>
            <p className="text-coffee-600 dark:text-coffee-400 text-sm tracking-wide">
              Imágenes de nuestros cafés de especialidad, fincas y procesos.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {loading && <PageSkeleton variant="gallery-grid" />}

        {error && (
          <div className="text-center py-24">
            <p className="font-serif text-2xl text-coffee-400 mb-3">Error al cargar la galería</p>
            <button
              onClick={fetchImages}
              className="inline-flex min-h-12 items-center gap-2 px-4 text-sm text-gold-500 transition-colors hover:text-gold-400"
            >
              <RefreshCw className="w-4 h-4" />
              Intentar de nuevo
            </button>
          </div>
        )}

        {!loading && !error && images.length === 0 && (
          <div className="text-center py-24">
            <div className="w-20 h-20 mx-auto mb-6 border-2 border-gold-500 flex items-center justify-center">
              <Camera className="w-10 h-10 text-gold-500" />
            </div>
            <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-2">
              La galería está vacía
            </h2>
            <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-8 max-w-sm mx-auto">
              Aún no se han compartido fotos
            </p>
            <Link to="/recetas" className="btn-primary inline-flex items-center gap-2">
              <ChefHat className="w-4 h-4" />
              Explorar recetas
            </Link>
          </div>
        )}

        {!loading && !error && images.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {images.map((img, i) => (
              <div
                key={img.id}
                className="group overflow-hidden border border-coffee-200 bg-coffee-100 dark:border-coffee-800 dark:bg-coffee-800"
              >
                <button
                  onClick={() => setLightboxIndex(i)}
                  className="relative block aspect-[4/3] min-h-11 w-full cursor-pointer overflow-hidden"
                  aria-label={`Ver imagen: ${img.alt || img.productName}`}
                >
                  <img
                    src={img.url}
                    alt={img.alt || img.productName}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 opacity-60 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100">
                    <span className="text-white text-sm font-medium">{img.productName}</span>
                  </div>
                </button>
                <div className="p-3">
                  <Link
                    to={`/tienda/${img.productSlug}`}
                    className="inline-flex min-h-11 items-center text-sm text-coffee-900 transition-colors hover:text-gold-500 dark:text-cream dark:hover:text-gold-400"
                  >
                    {img.productName}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <GalleryLightbox
          images={images.map((img) => ({
            url: img.url,
            alt: img.alt || img.productName,
            productName: img.productName,
          }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
