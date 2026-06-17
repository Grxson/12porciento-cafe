export default function AdminSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 bg-coffee-100 dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 rounded"
        />
      ))}
    </div>
  );
}