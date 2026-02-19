'use client';
import { useRouter } from 'next/navigation';

export default function AdminNavbar({ title = "Admin Panel" }) {
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem('adminClassId');
        router.push('/');
    };

    return (
        <nav className="bg-white border-b border-gray-200 p-4 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto flex justify-between items-center">

                <div>
                    <h1 className="text-lg font-bold text-gray-900">{title}</h1>
                    <p className="text-xs text-gray-500">Admin Access</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => router.push('/admin/dashboard')}
                        className="text-xs px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => router.push('/admin/subjects')}
                        className="text-xs px-3 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100"
                    >
                        Subjects
                    </button>
                    <button
                        onClick={handleLogout}
                        className="text-xs px-3 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}
