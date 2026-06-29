import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import api from '../api';
import { PageMeta } from '../hooks/usePageMeta';
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
    api.get<GalleryResponse>('/products/gallery')
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
    <div className="min-h-screen pt-24 pb-24 bg-coffee-50 dark:bg-coffee-950">
      <PageMeta
        title="Galería"
        description="Imágenes de nuestros cafés de especialidad, fincas y procesos."
      />

      <div className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="gold-line mb-4" />
            <h1 className="font-serif text-5xl md:text-6xl text-coffee-900 dark:text-cream mb-2">
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
            <p className="font-serif text-2xl text-coffee-400 mb-3">
              Error al cargar la galería
            </p>
            <button
              onClick={fetchImages}
              className="inline-flex items-center gap-2 text-sm text-gold-500 hover:text-gold-400 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Intentar de nuevo
            </button>
          </div>
        )}

        {!loading && !error && images.length === 0 && (
          <div className="text-center py-24">
            <p className="font-serif text-2xl text-coffee-400">
              No hay imágenes disponibles
            </p>
          </div>
        )}

        {!loading && !error && images.length > 0 && (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
            {images.map((img, i) => (
              <div
                key={img.id}
                className="break-inside-avoid mb-4 bg-coffee-100 dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-800 overflow-hidden group min-h-[180px]"
              >
                <button
                  onClick={() => setLightboxIndex(i)}
                  className="relative w-full block overflow-hidden cursor-pointer"
                  aria-label={`Ver imagen: ${img.alt || img.productName}`}
                >
                  <img
                    src={img.url}
                    alt={img.alt || img.productName}
                    className="w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <span className="text-white text-sm font-medium">
                      {img.productName}
                    </span>
                  </div>
                </button>
                <div className="p-3">
                  <Link
                    to={`/tienda/${img.productSlug}`}
                    className="text-sm text-coffee-900 dark:text-cream hover:text-gold-500 dark:hover:text-gold-400 transition-colors"
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
