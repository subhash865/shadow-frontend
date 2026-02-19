export default function Loading() {
    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <div className="skeleton h-8 w-40 mb-2"></div>
                    <div className="skeleton h-4 w-24"></div>
                </div>
                <div className="skeleton h-10 w-10 rounded-full"></div>
            </div>
            {/* Summary card */}
            <div className="card mb-6">
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="text-center">
                            <div className="skeleton h-10 w-16 mx-auto mb-2"></div>
                            <div className="skeleton h-3 w-12 mx-auto"></div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Subject cards */}
            <div className="skeleton h-3 w-40 mb-4"></div>
            {[1, 2, 3].map(i => (
                <div key={i} className="card mb-4">
                    <div className="flex justify-between mb-3">
                        <div className="skeleton h-6 w-32"></div>
                        <div className="skeleton h-8 w-16 rounded-md"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="skeleton h-12 w-full"></div>
                        <div className="skeleton h-12 w-full"></div>
                    </div>
                    <div className="skeleton h-1.5 w-full rounded-full mb-3"></div>
                    <div className="skeleton h-10 w-full rounded-md"></div>
                </div>
            ))}
        </div>
    );
}
