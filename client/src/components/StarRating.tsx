import { useState } from 'react';
import { Star } from 'lucide-react';

interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readonly?: boolean;
}

export default function StarRating({ value, onChange, size = 20, readonly = false }: Props) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            className={readonly ? 'cursor-default' : 'cursor-pointer'}
            aria-label={`${star} stars`}
          >
            <Star
              size={size}
              className={filled ? 'text-gold-500 fill-gold-500' : 'text-coffee-300'}
            />
          </button>
        );
      })}
    </div>
  );
}
