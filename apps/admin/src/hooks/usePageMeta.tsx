import { Helmet } from 'react-helmet-async';

interface PageMetaProps {
  title: string;
  description?: string;
  image?: string;
  noSuffix?: boolean;
}

const BASE = '12% — Café de Especialidad';

export function PageMeta({ title, description, image, noSuffix }: PageMetaProps) {
  const fullTitle = noSuffix ? title : `${title} | ${BASE}`;
  const desc = description ?? 'Café de especialidad mexicano. Solo el 12% del café producido en el mundo es de especialidad.';
  const img = image ?? 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=80';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={img} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
    </Helmet>
  );
}
