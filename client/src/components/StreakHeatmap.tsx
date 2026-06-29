import { useState } from 'react';

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function getColor(count: number, isDark: boolean): string {
  if (count === 0) return isDark ? 'bg-coffee-800' : 'bg-coffee-100';
  if (count <= 2) return isDark ? 'bg-coffee-600' : 'bg-coffee-300';
  if (count <= 5) return isDark ? 'bg-gold-700/60' : 'bg-gold-500/40';
  if (count <= 9) return isDark ? 'bg-gold-600/70' : 'bg-gold-500/70';
  return 'bg-gold-500';
}

function getMonthLabels(dates: { date: string; count: number }[]): { label: string; index: number }[] {
  const labels: { label: string; index: number }[] = [];
  let lastMonth = -1;
  dates.forEach((d, i) => {
    const month = new Date(d.date).getMonth();
    if (month !== lastMonth) {
      labels.push({ label: MONTH_LABELS[month], index: i });
      lastMonth = month;
    }
  });
  return labels;
}

interface StreakHeatmapProps {
  data: { date: string; count: number }[];
}

export default function StreakHeatmap({ data }: StreakHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null);
  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
  const monthLabels = getMonthLabels(data);

  if (!data.length) return null;

  const cellSize = 14;
  const gap = 3;

  return (
    <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-4 mb-8">
      <h3 className="text-sm font-semibold text-coffee-900 dark:text-cream mb-3">Actividad (90 días)</h3>

      {/* Month labels */}
      <div className="ml-7 mb-1 flex text-xs text-coffee-500">
        {monthLabels.map((m) => (
          <div key={m.label} style={{ marginLeft: m.index * (cellSize + gap) }}>{m.label}</div>
        ))}
      </div>

      <div className="flex">
        {/* Day labels */}
        <div className="flex flex-col mr-1 text-xs text-coffee-500 leading-none">
          {DAY_LABELS.map((d) => (
            <div key={d} style={{ height: cellSize, marginBottom: gap, lineHeight: `${cellSize}px` }}>{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="relative overflow-x-auto">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${Math.ceil(data.length / 7)}, ${cellSize}px)`,
              gridTemplateRows: `repeat(7, ${cellSize}px)`,
              gap,
            }}
          >
            {data.map((d) => {
              return (
                <div
                  key={d.date}
                  className={`rounded-sm cursor-pointer transition-colors ${getColor(d.count, isDark)}`}
                  style={{ width: cellSize, height: cellSize }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({ date: d.date, count: d.count, x: rect.left, y: rect.top - 40 });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-xs text-coffee-500">
        <span>Menos</span>
        <div className={`w-3 h-3 rounded-sm ${isDark ? 'bg-coffee-800' : 'bg-coffee-100'}`} />
        <div className={`w-3 h-3 rounded-sm ${isDark ? 'bg-coffee-600' : 'bg-coffee-300'}`} />
        <div className={`w-3 h-3 rounded-sm ${isDark ? 'bg-gold-700/60' : 'bg-gold-500/40'}`} />
        <div className={`w-3 h-3 rounded-sm ${isDark ? 'bg-gold-600/70' : 'bg-gold-500/70'}`} />
        <div className="w-3 h-3 rounded-sm bg-gold-500" />
        <span>Más</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-[100] px-2 py-1 text-xs rounded shadow-lg bg-coffee-900 text-cream dark:bg-cream dark:text-coffee-900 pointer-events-none whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {new Date(tooltip.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' — '}{tooltip.count} brew{tooltip.count !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
