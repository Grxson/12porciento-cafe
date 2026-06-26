import React from 'react';

interface StreakWidgetProps {
  currentStreak: number;
  isActive?: boolean;
}

export default function StreakWidget({ currentStreak, isActive = true }: StreakWidgetProps) {
  if (currentStreak === 0) {
    return (
      <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-4 text-center">
        <p className="text-coffee-500 dark:text-coffee-400 text-sm">
          ¡Comienza tu racha registrando un brew hoy!
        </p>
      </div>
    );
  }

  return (
    <div className={`p-4 text-center rounded-lg border-2 ${
      isActive
        ? 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600'
        : 'bg-gray-50 dark:bg-gray-900/20 border-gray-400 dark:border-gray-600'
    }`}>
      <p className={`text-2xl font-bold mb-1 ${
        isActive ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
      }`}>
        🔥 {currentStreak} {currentStreak === 1 ? 'día' : 'días'} seguidos
      </p>
      <p className={`text-xs ${
        isActive ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
      }`}>
        {isActive ? '¡Sigue así!' : 'La racha se rompió'}
      </p>
    </div>
  );
}
