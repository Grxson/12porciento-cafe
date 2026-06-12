interface RatingSliderProps {
  value: number | undefined;
  onChange: (rating: number) => void;
}

const EMOJI_SCALE: [number, string][] = [
  [1, '😐'],
  [3, '🙂'],
  [5, '😊'],
  [7, '😄'],
  [9, '😍'],
  [10, '🔥'],
];

function getEmoji(val: number): string {
  for (let i = EMOJI_SCALE.length - 1; i >= 0; i--) {
    if (val >= EMOJI_SCALE[i][0]) return EMOJI_SCALE[i][1];
  }
  return '😐';
}

export default function RatingSlider({ value, onChange }: RatingSliderProps) {
  return (
    <div className="mb-4 px-1">
      <p className="text-[10px] text-coffee-500 uppercase tracking-widest mb-2">
        Calificar este paso
      </p>
      <div className="flex items-center gap-3">
        <span className="text-lg w-6 text-center">{value ? getEmoji(value) : '😐'}</span>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={value ?? 5}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-gold-500 cursor-pointer"
          aria-label="Calificación del paso"
        />
        <span className="text-gold-400 font-bold text-sm w-10 text-right">
          {value !== undefined ? `${value}/10` : '—/10'}
        </span>
      </div>
    </div>
  );
}
