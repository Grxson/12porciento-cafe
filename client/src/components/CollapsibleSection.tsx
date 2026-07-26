import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  sectionKey: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function CollapsibleSection({
  title,
  sectionKey,
  children,
  defaultOpen = false,
  badge,
  open: controlledOpen,
  onOpenChange,
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;

  const toggleOpen = () => {
    const nextOpen = !open;
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  return (
    <div
      id={`barista-section-${sectionKey}`}
      className="border border-coffee-200 dark:border-coffee-800 rounded-xl overflow-hidden mb-4 scroll-mt-24"
    >
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-coffee-900 hover:bg-coffee-50 dark:hover:bg-coffee-800 transition-colors min-h-[48px]"
        aria-expanded={open}
        aria-controls={`barista-section-content-${sectionKey}`}
      >
        <div className="flex items-center gap-2">
          <span className="font-serif text-lg text-coffee-900 dark:text-cream">{title}</span>
          {badge !== undefined && (
            <span className="text-xs bg-gold-500/20 text-gold-600 dark:text-gold-400 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-coffee-400 dark:text-coffee-500 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        id={`barista-section-content-${sectionKey}`}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 py-4 bg-white dark:bg-coffee-900">{children}</div>
      </div>
    </div>
  );
}
