"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';

export default function TeacherLogin() {
    const router = useRouter();
    const notify = useNotification();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await api.post('/teacher/login', { email, password });

            // SAVE THE TOKEN AND TEACHER DETAILS
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('teacherId', res.data.teacherId);
            localStorage.setItem('role', 'teacher');

            // Debug: Verify token was saved
            console.log('✅ Login successful');
            console.log('🔑 Token saved:', res.data.token ? 'Yes' : 'No');

            router.push('/teacher/dashboard');
        } catch (err) {
            console.error(err);
            notify({ message: err.response?.data?.error || 'Login failed!', type: 'error' });
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />

            <div className="max-w-md mx-auto px-4 py-12">

                <div className="mb-8">
                    <h1 className="text-2xl font-bold mb-2">Teacher Login</h1>
                    <p>Enter your credentials to manage your classes</p>
                </div>

                <div className="card">
                    <form onSubmit={handleLogin} className="space-y-4">

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Email</label>
                            <input
                                type="email"
                                className="input"
                                placeholder="teacher@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Password</label>
                            <input
                                type="password"
                                className="input"
                                placeholder="Your Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
