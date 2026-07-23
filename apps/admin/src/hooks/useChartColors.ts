import { useEffect, useState } from 'react';

export interface ChartColors {
  grid: string;
  text: string;
  gold: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

export function useChartColors(): ChartColors {
  const isDarkInit =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const [colors, setColors] = useState<ChartColors>({
    grid: isDarkInit ? '#2c1810' : '#e8d5c4',
    text: isDarkInit ? '#a05a2c' : '#8b5a2b',
    gold: '#c9a96e',
    tooltipBg: isDarkInit ? '#1a0f0a' : '#ffffff',
    tooltipBorder: isDarkInit ? '#2c1810' : '#e8d5c4',
    tooltipText: isDarkInit ? '#e8d5b7' : '#4a3728',
  });
  useEffect(() => {
    const root = document.documentElement;
    const computed = getComputedStyle(root);
    const update = () => {
      const isDark = root.classList.contains('dark');
      setColors({
        grid: isDark ? '#2c1810' : computed.getPropertyValue('--chart-grid').trim() || '#e8d5c4',
        text: isDark ? '#a05a2c' : computed.getPropertyValue('--chart-text').trim() || '#8b5a2b',
        gold: '#c9a96e',
        tooltipBg: isDark
          ? '#1a0f0a'
          : computed.getPropertyValue('--chart-tooltip-bg').trim() || '#ffffff',
        tooltipBorder: isDark
          ? '#2c1810'
          : computed.getPropertyValue('--chart-tooltip-border').trim() || '#ddd5c8',
        tooltipText: isDark
          ? '#e8d5b7'
          : computed.getPropertyValue('--chart-tooltip-text').trim() || '#4a3728',
      });
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return colors;
}
