import { useState, useEffect } from 'react';

export default function GestureHints() {
  // R15: Hide after first swipe success
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('cafe12_gesture_hints_seen');
    if (seen) setHidden(true);
  }, []);

  if (hidden) return null;

  return (
    <div
      className="flex justify-center gap-6 py-2 border-t border-coffee-800/50"
      onClick={() => {
        localStorage.setItem('cafe12_gesture_hints_seen', 'true');
        setHidden(true);
      }}
    >
      <div className="text-center cursor-pointer">
        <p className="text-base">👉</p>
        <p className="text-xs text-coffee-600 uppercase tracking-wider">Swipe</p>
      </div>
      <div className="text-center cursor-pointer">
        <p className="text-base">☝️</p>
        <p className="text-xs text-coffee-600 uppercase tracking-wider">Long-press</p>
      </div>
    </div>
  );
}
