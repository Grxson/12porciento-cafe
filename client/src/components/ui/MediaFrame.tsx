import { useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { ImageOff } from 'lucide-react';

type MediaRatio = 'product' | 'recipe' | 'banner' | 'avatar';

interface MediaFrameProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  src?: string | null;
  alt: string;
  ratio?: MediaRatio;
  fallback?: ReactNode;
}

const ratioClasses: Record<MediaRatio, string> = {
  product: 'aspect-[4/5]',
  recipe: 'aspect-[4/3]',
  banner: 'aspect-[3/1]',
  avatar: 'aspect-square',
};

export default function MediaFrame({
  src,
  alt,
  ratio = 'product',
  fallback,
  className = '',
  onError,
  ...imageProps
}: MediaFrameProps) {
  const [failed, setFailed] = useState(!src);
  const showFallback = failed || !src;

  return (
    <div
      className={`relative w-full overflow-hidden bg-coffee-100 dark:bg-coffee-800 ${ratioClasses[ratio]} ${className}`}
    >
      <img
        {...imageProps}
        src={src || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}
        alt={alt}
        onError={(event) => {
          setFailed(true);
          onError?.(event);
        }}
        className={`h-full w-full object-cover transition-opacity duration-300 ${showFallback ? 'opacity-0' : 'opacity-100'}`}
      />
      {showFallback && (
        <div className="absolute inset-0 flex items-center justify-center text-coffee-400 dark:text-coffee-500">
          {fallback ?? <ImageOff aria-hidden="true" className="h-8 w-8" />}
        </div>
      )}
    </div>
  );
}
