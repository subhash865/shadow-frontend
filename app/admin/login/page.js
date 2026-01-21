"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';

export default function AdminLogin() {
    const router = useRouter();
    const notify = useNotification();
    const [className, setClassName] = useState('');
    const [adminPin, setAdminPin] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await api.post('/class/admin-login', { className, adminPin });

            // SAVE THE TOKEN AND CLASS ID
            localStorage.setItem('adminClassId', res.data.classId);
            localStorage.setItem('token', res.data.token); // <--- NEW LINE

            router.push('/admin/dashboard');
        } catch (err) {
            if (err.response?.status === 401) {
                notify({ message: 'Invalid PIN!', type: 'error' });
            } else if (err.response?.status === 404) {
                notify({ message: 'Class not found!', type: 'error' });
            } else {
                notify({ message: 'Login failed!', type: 'error' });
            }
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />

            <div className="max-w-md mx-auto px-4 py-12">

                <div className="mb-8">
                    <h1 className="text-2xl font-bold mb-2">Admin Login</h1>
                    <p>Enter your credentials to continue</p>
                </div>

                <div className="card">
                    <form onSubmit={handleLogin} className="space-y-4">

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Class Name</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g. CSE-3A"
                                value={className}
                                onChange={(e) => setClassName(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Admin PIN</label>
                            <input
                                type="password"
                                className="input"
                                placeholder="****"
                                value={adminPin}
                                onChange={(e) => setAdminPin(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                        >
                            {loading ? "Verifying..." : "Login"}
                        </button>
                    </form>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push('/')}
                        className="text-sm text-[var(--text-dim)] hover:text-white"
                    >
                        ← Back to Home
                    </button>
                </div>

            </div>
        </>
    );
}