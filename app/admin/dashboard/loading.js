export default function Loading() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-6">
            {/* Header skeleton */}
            <div className="mb-6">
                <div className="skeleton h-8 w-48 mb-2"></div>
                <div className="skeleton h-4 w-32"></div>
            </div>
            {/* Date selector skeleton */}
            <div className="skeleton h-12 w-full rounded-full mb-6"></div>
            {/* Period cards skeleton */}
            {[1, 2, 3].map(i => (
                <div key={i} className="card mb-4">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-[var(--border)]">
                        <div className="flex items-center gap-3">
                            <div className="skeleton h-6 w-8"></div>
                            <div className="skeleton h-10 w-40 rounded-full"></div>
                        </div>
                        <div className="skeleton h-8 w-20 rounded-md"></div>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {[...Array(21)].map((_, j) => (
                            <div key={j} className="skeleton h-11 rounded-md"></div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
