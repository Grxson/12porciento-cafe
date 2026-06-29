interface PageSkeletonProps {
  variant?: 'product-detail' | 'gallery-grid' | 'profile' | 'profile-list';
}

function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen pt-20 bg-coffee-50 dark:bg-coffee-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-4">
            <div className="aspect-square shimmer dark:shimmer-dark rounded" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-20 h-20 shimmer dark:shimmer-dark rounded" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="shimmer dark:shimmer-dark h-4 w-24" />
            <div className="shimmer dark:shimmer-dark h-8 w-3/4" />
            <div className="shimmer dark:shimmer-dark h-6 w-20" />
            <div className="shimmer dark:shimmer-dark h-4 w-full" />
            <div className="shimmer dark:shimmer-dark h-4 w-5/6" />
            <div className="shimmer dark:shimmer-dark h-4 w-2/3" />
            <div className="flex gap-2 pt-4">
              <div className="shimmer dark:shimmer-dark h-12 w-32 rounded" />
              <div className="shimmer dark:shimmer-dark h-12 w-32 rounded" />
            </div>
            <hr className="border-coffee-200 dark:border-coffee-800 my-6" />
            <div className="shimmer dark:shimmer-dark h-4 w-32" />
            <div className="shimmer dark:shimmer-dark h-16 w-full rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

function GalleryGridSkeleton() {
  return (
    <div className="min-h-screen pt-24 pb-24 bg-coffee-50 dark:bg-coffee-950">
      <div className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="gold-line mb-4" />
          <div className="shimmer dark:shimmer-dark h-10 w-24" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square shimmer dark:shimmer-dark rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen pt-24 bg-coffee-50 dark:bg-coffee-950">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 shimmer dark:shimmer-dark rounded-full" />
          <div className="space-y-2">
            <div className="shimmer dark:shimmer-dark h-5 w-40" />
            <div className="shimmer dark:shimmer-dark h-4 w-24" />
          </div>
        </div>
        <div className="shimmer dark:shimmer-dark h-10 w-full rounded" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 shimmer dark:shimmer-dark rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileListSkeleton() {
  return (
    <div className="space-y-3 py-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-4 flex items-center gap-4">
          <div className="shimmer dark:shimmer-dark h-12 w-12 rounded" />
          <div className="flex-1 space-y-2">
            <div className="shimmer dark:shimmer-dark h-4 w-3/4" />
            <div className="shimmer dark:shimmer-dark h-3 w-1/2" />
          </div>
          <div className="shimmer dark:shimmer-dark h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export default function PageSkeleton({ variant = 'product-detail' }: PageSkeletonProps) {
  switch (variant) {
    case 'gallery-grid':
      return <GalleryGridSkeleton />;
    case 'profile':
      return <ProfileSkeleton />;
    case 'profile-list':
      return <ProfileListSkeleton />;
    default:
      return <ProductDetailSkeleton />;
  }
}
