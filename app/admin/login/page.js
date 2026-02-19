"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';

export default function AdminLogin() {
    const router = useRouter();
    const notify = useNotification();
    const [className, setClassName] = useState('');
    const [adminPin, setAdminPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [showPin, setShowPin] = useState(false);

    useEffect(() => {
        const storedClassId = localStorage.getItem('adminClassId');
        const storedToken = localStorage.getItem('token');
        if (storedClassId && storedToken) {
            // Verify token is still valid and renew it
            api.post('/class/verify-token')
                .then(res => {
                    // Token is valid — renew it silently and redirect
                    localStorage.setItem('token', res.data.token);
                    localStorage.setItem('adminClassId', res.data.classId);
                    router.push('/admin/dashboard');
                })
                .catch(() => {
                    // Token expired or invalid — clear and show login
                    localStorage.removeItem('adminClassId');
                    localStorage.removeItem('token');
                    setCheckingSession(false);
                });
        } else {
            setCheckingSession(false);
        }
    }, [router]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await api.post('/class/admin-login', { className, adminPin });
            localStorage.setItem('adminClassId', res.data.classId);
            localStorage.setItem('token', res.data.token);
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

    if (checkingSession) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading...</div>;

    return (
        <>
            <Navbar />

            <div className="max-w-md mx-auto px-4 py-16">

                {/* Header */}
                <div className="text-center mb-8 animate-fade-up">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-6 h-6 text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2" style={{ letterSpacing: '-0.03em' }}>Admin Login</h1>
                    <p className="text-[var(--text-dim)]">Enter your class credentials to continue</p>
                </div>

                {/* Form */}
                <div className="glass-card animate-fade-up delay-100">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-dim)] mb-2 uppercase tracking-wider">Class Name</label>
                            <input
                                id="admin-class-name"
                                type="text"
                                className="input"
                                placeholder="e.g. S6 CSE-B"
                                value={className}
                                onChange={(e) => setClassName(e.target.value)}
                                autoComplete="off"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[var(--text-dim)] mb-2 uppercase tracking-wider">Admin PIN</label>
                            <div className="relative">
                                <input
                                    id="admin-pin"
                                    type={showPin ? 'text' : 'password'}
                                    className="input pr-12"
                                    placeholder="••••"
                                    value={adminPin}
                                    onChange={(e) => setAdminPin(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPin(!showPin)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-white transition"
                                >
                                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            id="admin-login-submit"
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Verifying...
                                </span>
                            ) : 'Login'}
                        </button>
                    </form>
                </div>

                {/* Back link */}
                <div className="mt-6 text-center animate-fade-up delay-200">
                    <button
                        onClick={() => router.push('/')}
                        className="inline-flex items-center gap-2 text-sm text-[var(--text-dim)] hover:text-white transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </button>
                </div>

            </div>
        </>
    );
}