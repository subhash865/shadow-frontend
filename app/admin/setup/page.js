"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Users, BookOpen, Shield, Eye, EyeOff, ArrowRight } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';

export default function CreateClass() {
    const router = useRouter();
    const notify = useNotification();
    const [loading, setLoading] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [formData, setFormData] = useState({
        className: '',
        adminPin: '',
        confirmPin: '',
        totalStudents: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.adminPin !== formData.confirmPin) {
            notify({ message: 'PINs do not match!', type: 'error' });
            return;
        }

        if (formData.adminPin.length < 4) {
            notify({ message: 'PIN must be at least 4 characters', type: 'error' });
            return;
        }

        setLoading(true);

        try {
            const res = await api.post('/class/create', {
                className: formData.className.trim(),
                adminPin: formData.adminPin,
                totalStudents: parseInt(formData.totalStudents)
            });

            localStorage.setItem('adminClassId', res.data.classId);
            localStorage.setItem('token', res.data.token);

            notify({ message: `Class "${formData.className}" created! Add your subjects...`, type: 'success' });
            setTimeout(() => router.push('/admin/subjects'), 1500);
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

                {/* Header */}
                <div className="text-center mb-8 animate-fade-up">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2" style={{ letterSpacing: '-0.03em' }}>Create New Class</h1>
                    <p className="text-[var(--text-dim)]">Set up your class in a few steps</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="glass-card animate-fade-up delay-100">
                    <div className="space-y-5">

                        {/* Class Name */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-dim)] mb-2 uppercase tracking-wider">
                                Class Name
                            </label>
                            <input
                                id="setup-class-name"
                                type="text"
                                className="input"
                                placeholder="e.g. S6 CSE-B"
                                value={formData.className}
                                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                                required
                            />
                            <p className="text-xs text-[var(--text-dim)] mt-1.5">
                                Students will use this exact name to find your class
                            </p>
                        </div>

                        {/* Total Students */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-dim)] mb-2 uppercase tracking-wider">
                                Class Strength
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    id="setup-total-students"
                                    type="number"
                                    className="input w-32 text-center"
                                    placeholder="60"
                                    min="1"
                                    max="200"
                                    value={formData.totalStudents}
                                    onChange={(e) => setFormData({ ...formData, totalStudents: e.target.value })}
                                    required
                                />
                                <span className="text-sm text-[var(--text-dim)]">students</span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-white/6 pt-2">
                            <div className="flex items-center gap-2 mb-4">
                                <Shield className="w-4 h-4 text-amber-400" />
                                <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">Security</span>
                            </div>
                        </div>

                        {/* Admin PIN */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-dim)] mb-2 uppercase tracking-wider">
                                Admin PIN
                            </label>
                            <div className="relative">
                                <input
                                    id="setup-admin-pin"
                                    type={showPin ? 'text' : 'password'}
                                    className="input pr-12"
                                    placeholder="Create a secure PIN"
                                    minLength="4"
                                    value={formData.adminPin}
                                    onChange={(e) => setFormData({ ...formData, adminPin: e.target.value })}
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
                            <p className="text-xs text-[var(--text-dim)] mt-1.5">Min 4 characters. Keep this safe!</p>
                        </div>

                        {/* Confirm PIN */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-dim)] mb-2 uppercase tracking-wider">
                                Confirm PIN
                            </label>
                            <div className="relative">
                                <input
                                    id="setup-confirm-pin"
                                    type={showConfirm ? 'text' : 'password'}
                                    className="input pr-12"
                                    placeholder="Re-enter your PIN"
                                    value={formData.confirmPin}
                                    onChange={(e) => setFormData({ ...formData, confirmPin: e.target.value })}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-white transition"
                                >
                                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {formData.confirmPin && formData.adminPin !== formData.confirmPin && (
                                <p className="text-xs text-red-400 mt-1.5">PINs do not match</p>
                            )}
                            {formData.confirmPin && formData.adminPin === formData.confirmPin && (
                                <p className="text-xs text-emerald-400 mt-1.5">PINs match ✓</p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            id="setup-submit-btn"
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Create Class
                                    <ArrowRight className="w-4 h-4" />
                                </span>
                            )}
                        </button>
                    </div>
                </form>

                {/* Back */}
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
