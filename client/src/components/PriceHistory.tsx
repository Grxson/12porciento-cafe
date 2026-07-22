import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface PricePoint {
  id: string;
  price: number;
  createdAt: string;
}

interface Props {
  records: PricePoint[];
  currentPrice: number;
}

export default function PriceHistory({ records, currentPrice }: Props) {
  const [open, setOpen] = useState(false);

  if (records.length === 0) return null;

  const allPrices = [...records.map((r) => r.price), currentPrice];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const range = maxPrice - minPrice || 1;

  const chartW = 280;
  const chartH = 80;
  const padding = { top: 4, bottom: 16, left: 0, right: 0 };
  const innerH = chartH - padding.top - padding.bottom;

  const points = allPrices.map((p, i) => {
    const x = allPrices.length > 1 ? (i / (allPrices.length - 1)) * chartW : chartW / 2;
    const y = padding.top + innerH - ((p - minPrice) / range) * innerH;
    return `${x},${y}`;
  });

  const trend =
    currentPrice > records[records.length - 1].price
      ? 'up'
      : currentPrice < records[records.length - 1].price
        ? 'down'
        : 'flat';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-coffee-400';

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  const formatCurrency = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="border-t border-coffee-200 dark:border-coffee-800 mt-6 pt-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left group"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-coffee-700 dark:text-coffee-300 group-hover:text-coffee-900 dark:group-hover:text-cream transition-colors">
            Historial de precios
          </span>
          <TrendIcon className={`w-4 h-4 ${trendColor}`} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-coffee-500 dark:text-coffee-400">
            {records.length} cambios
          </span>
          {open ? (
            <ChevronUp className="w-4 h-4 text-coffee-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-coffee-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="mt-4">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="w-full max-w-xs h-auto overflow-visible"
          >
            {/* Grid lines */}
            <line
              x1="0"
              y1={padding.top}
              x2={chartW}
              y2={padding.top}
              stroke="currentColor"
              strokeOpacity="0.1"
            />
            <line
              x1="0"
              y1={padding.top + innerH / 2}
              x2={chartW}
              y2={padding.top + innerH / 2}
              stroke="currentColor"
              strokeOpacity="0.08"
            />
            <line
              x1="0"
              y1={chartH - padding.bottom}
              x2={chartW}
              y2={chartH - padding.bottom}
              stroke="currentColor"
              strokeOpacity="0.1"
            />

            {/* Area fill */}
            <polyline
              points={points.join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gold-500"
              vectorEffect="non-scaling-stroke"
            />

            {/* Dots */}
            {allPrices.map((p, i) => {
              const x = allPrices.length > 1 ? (i / (allPrices.length - 1)) * chartW : chartW / 2;
              const y = padding.top + innerH - ((p - minPrice) / range) * innerH;
              const isLast = i === allPrices.length - 1;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={isLast ? 3 : 2}
                  className={isLast ? 'fill-gold-500' : 'fill-coffee-400 dark:fill-coffee-500'}
                />
              );
            })}

            {/* Min label */}
            <text x="0" y={chartH - 2} className="fill-coffee-400 text-[8px]">
              {formatCurrency(minPrice)}
            </text>
            {/* Max label */}
            <text x="0" y={padding.top - 2} className="fill-coffee-400 text-[8px]">
              {formatCurrency(maxPrice)}
            </text>
            {/* First date */}
            {records.length > 1 && (
              <text x="0" y={chartH - 2} className="fill-coffee-500 text-[7px]" textAnchor="start">
                {formatDate(records[0].createdAt)}
              </text>
            )}
            {/* Last date */}
            {records.length > 1 && (
              <text
                x={chartW}
                y={chartH - 2}
                className="fill-coffee-500 text-[7px]"
                textAnchor="end"
              >
                {formatDate(records[records.length - 1].createdAt)}
              </text>
            )}
          </svg>

          {/* Compact list */}
          <div className="mt-3 space-y-1">
            {records
              .slice(-5)
              .reverse()
              .map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-xs text-coffee-600 dark:text-coffee-400"
                >
                  <span>{formatDate(r.createdAt)}</span>
                  <span className="font-medium text-coffee-800 dark:text-coffee-300">
                    ${r.price.toFixed(2)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
