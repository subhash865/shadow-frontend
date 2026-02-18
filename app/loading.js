export default function Loading() {
    return (
        <div className="max-w-5xl mx-auto px-4 py-12">
            {/* Hero skeleton */}
            <div className="text-center mb-12">
                <div className="skeleton h-12 w-3/4 max-w-md mx-auto mb-4"></div>
                <div className="skeleton h-5 w-2/3 max-w-sm mx-auto mb-8"></div>
                <div className="flex justify-center gap-6 mb-8">
                    <div className="skeleton h-16 w-36 rounded-full"></div>
                    <div className="skeleton h-16 w-36 rounded-full"></div>
                </div>
            </div>
            {/* Form skeleton */}
            <div className="max-w-md mx-auto">
                <div className="card">
                    <div className="skeleton h-4 w-24 mx-auto mb-6"></div>
                    <div className="skeleton h-12 w-full rounded-full mb-4"></div>
                    <div className="skeleton h-12 w-full rounded-full mb-4"></div>
                    <div className="skeleton h-12 w-full rounded-full"></div>
                </div>
            </div>
        </div>
    );
}
