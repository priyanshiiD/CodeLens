import './skeleton.css';

function SkeletonBlock({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

export default function RepoSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[#161b22] border border-[#21262d] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <SkeletonBlock className="w-4 h-4 mt-0.5 flex-shrink-0 rounded-sm" />
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center gap-2">
                <SkeletonBlock className="h-4 w-32 rounded-md" />
                <SkeletonBlock className="h-4 w-14 rounded-full" />
              </div>
              <SkeletonBlock className="h-3 w-64 rounded-md" />
              <div className="flex gap-4">
                <SkeletonBlock className="h-3 w-28 rounded-md" />
                <SkeletonBlock className="h-3 w-24 rounded-md" />
              </div>
            </div>
            <SkeletonBlock className="h-7 w-16 rounded-md flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
