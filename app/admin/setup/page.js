"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';

export default function CreateClass() {
    const router = useRouter();
    const notify = useNotification();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        className: '',
        adminPin: '',
        confirmPin: '',
        totalStudents: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (formData.adminPin !== formData.confirmPin) {
            notify({ message: 'PINs do not match!', type: 'error' });
            return;
        }

        if (formData.adminPin.length < 4) {
            notify({ message: 'PIN must be at least 4 characters long', type: 'error' });
            return;
        }

        setLoading(true);

        try {
            const res = await api.post('/class/create', {
                className: formData.className.trim(),
                adminPin: formData.adminPin,
                totalStudents: parseInt(formData.totalStudents)
            });

            // Save credentials and redirect
            localStorage.setItem('adminClassId', res.data.classId);
            localStorage.setItem('token', res.data.token);

            notify({ message: `Class "${formData.className}" created successfully! Setting up timetable...`, type: 'success' });
            setTimeout(() => router.push('/admin/create'), 1500);
        } catch (err) {
            if (err.response?.data?.error) {
                notify({ message: err.response.data.error, type: 'error' });
            } else {
                notify({ message: 'Failed to create class. Please try again.', type: 'error' });
            }
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />

            <div className="max-w-md mx-auto px-4 py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Create New Class</h1>
                    <p className="text-[var(--text-dim)]">Set up your class in just a few steps</p>
                </div>

                <form onSubmit={handleSubmit} className="card">
                    <div className="space-y-5">

                        {/* Class Name */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">
                                Class Name *
                            </label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g. CSE-B S6"
                                value={formData.className}
                                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                                required
                            />
                            <p className="text-xs text-[var(--text-dim)] mt-1">
                                This will be used by students to find your class
                            </p>
                        </div>

                        {/* Total Students */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">
                                Total Students *
                            </label>
                            <input
                                type="number"
                                className="input"
                                placeholder="e.g. 60"
                                min="1"
                                max="200"
                                value={formData.totalStudents}
                                onChange={(e) => setFormData({ ...formData, totalStudents: e.target.value })}
                                required
                            />
                        </div>

                        {/* Admin PIN */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">
                                Admin PIN *
                            </label>
                            <input
                                type="password"
                                className="input"
                                placeholder="Enter a secure PIN"
                                minLength="4"
                                value={formData.adminPin}
                                onChange={(e) => setFormData({ ...formData, adminPin: e.target.value })}
                                required
                            />
                            <p className="text-xs text-[var(--text-dim)] mt-1">
                                Minimum 4 characters. Keep this safe!
                            </p>
                        </div>

                        {/* Confirm PIN */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">
                                Confirm PIN *
                            </label>
                            <input
                                type="password"
                                className="input"
                                placeholder="Re-enter your PIN"
                                value={formData.confirmPin}
                                onChange={(e) => setFormData({ ...formData, confirmPin: e.target.value })}
                                required
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={loading}
                        >
                            {loading ? 'Creating Class...' : 'Create Class & Set Up Timetable'}
                        </button>
                    </div>
                </form>

                {/* Back to Home */}
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
