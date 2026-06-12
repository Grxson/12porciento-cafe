export default function GestureHints() {
  return (
    <div className="flex justify-center gap-6 py-2 border-t border-coffee-800/50">
      <div className="text-center">
        <p className="text-base">👉</p>
        <p className="text-[9px] text-coffee-600 uppercase tracking-wider">Swipe</p>
      </div>
      <div className="text-center">
        <p className="text-base">☝️</p>
        <p className="text-[9px] text-coffee-600 uppercase tracking-wider">Long-press</p>
      </div>
    </div>
  );
}
