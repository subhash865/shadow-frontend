"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Loader2, BookOpen, Shield, Eye, EyeOff, ArrowRight,
    Hash, ListChecks
} from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';

const sanitizeCustomRollNumbers = (input) => {
    const parts = String(input || '')
        .split(/[,\n]/)
        .map((value) => value.trim())
        .filter(Boolean);

    const seen = new Set();
    const cleaned = [];
    parts.forEach((roll) => {
        if (!seen.has(roll)) {
            seen.add(roll);
            cleaned.push(roll);
        }
    });
    return cleaned;
};

const buildRollNumbersFromRange = (start, end) => {
    const startValue = Number(start);
    const endValue = Number(end);

    if (!Number.isInteger(startValue) || !Number.isInteger(endValue)) return null;
    if (startValue < 1 || endValue < 1 || startValue > endValue) return null;
    if (endValue - startValue > 9999) return null;

    const generated = [];
    for (let roll = startValue; roll <= endValue; roll += 1) {
        generated.push(String(roll));
    }
    return generated;
};

export default function CreateClass() {
    const router = useRouter();
    const notify = useNotification();
    const [loading, setLoading] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [rollMethod, setRollMethod] = useState('range');
    const [formData, setFormData] = useState({
        className: '',
        adminPin: '',
        confirmPin: '',
        rangeStart: '1',
        rangeEnd: '60',
        customRollNumbers: ''
    });

    const resolveRollNumbers = (showValidationErrors = true) => {
        if (rollMethod === 'range') {
            const generated = buildRollNumbersFromRange(formData.rangeStart, formData.rangeEnd);
            if (!generated) {
                if (showValidationErrors) {
                    notify({ message: 'Enter a valid range. Example: start 101, end 160.', type: 'error' });
                }
                return null;
            }
            return generated;
        }

        const customRollNumbers = sanitizeCustomRollNumbers(formData.customRollNumbers);
        if (customRollNumbers.length === 0) {
            if (showValidationErrors) {
                notify({ message: 'Provide at least one roll number in the custom list.', type: 'error' });
            }
            return null;
        }
        return customRollNumbers;
    };

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

        const rollNumbers = resolveRollNumbers(true);
        if (!rollNumbers) return;

        setLoading(true);

        try {
            const res = await api.post('/class/create', {
                className: formData.className.trim(),
                adminPin: formData.adminPin,
                rollNumbers
            });

            localStorage.setItem('adminClassId', res.data.classId);
            localStorage.setItem('token', res.data.token);

            notify({
                message: `Class "${formData.className}" created with ${rollNumbers.length} students!`,
                type: 'success'
            });
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

    const previewRollNumbers = resolveRollNumbers(false) || [];

    return (
        <>
            <Navbar />

            <div className="max-w-md mx-auto px-4 py-12">
                <div className="text-center mb-8 animate-fade-up">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2" style={{ letterSpacing: '-0.03em' }}>Create New Class</h1>
                    <p className="text-[var(--text-dim)]">Set up your class and roll numbers</p>
                </div>

                <form onSubmit={handleSubmit} className="glass-card animate-fade-up delay-100">
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-dim)] mb-2 uppercase tracking-wider">
                                Class Name
                            </label>
                            <input
                                id="create-class-name"
                                type="text"
                                className="input"
                                placeholder="e.g. S6 CSE-B"
                                value={formData.className}
                                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[var(--text-dim)] mb-2 uppercase tracking-wider">
                                Roll Number Method
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setRollMethod('range')}
                                    className={`px-3 py-2 rounded-xl border text-sm transition flex items-center justify-center gap-2 ${rollMethod === 'range'
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                        : 'bg-white/3 border-white/10 text-[var(--text-dim)] hover:text-white'
                                        }`}
                                >
                                    <Hash className="w-4 h-4" />
                                    Range
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRollMethod('custom')}
                                    className={`px-3 py-2 rounded-xl border text-sm transition flex items-center justify-center gap-2 ${rollMethod === 'custom'
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                        : 'bg-white/3 border-white/10 text-[var(--text-dim)] hover:text-white'
                                        }`}
                                >
                                    <ListChecks className="w-4 h-4" />
                                    Custom List
                                </button>
                            </div>
                        </div>

                        {rollMethod === 'range' ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-dim)] mb-2 uppercase tracking-wider">
                                        Start
                                    </label>
                                    <input
                                        type="number"
                                        className="input text-center"
                                        min="1"
                                        value={formData.rangeStart}
                                        onChange={(e) => setFormData({ ...formData, rangeStart: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-dim)] mb-2 uppercase tracking-wider">
                                        End
                                    </label>
                                    <input
                                        type="number"
                                        className="input text-center"
                                        min="1"
                                        value={formData.rangeEnd}
                                        onChange={(e) => setFormData({ ...formData, rangeEnd: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-dim)] mb-2 uppercase tracking-wider">
                                    Roll Numbers
                                </label>
                                <textarea
                                    className="input min-h-[120px] resize-y"
                                    placeholder="101, 102, 105, 201"
                                    value={formData.customRollNumbers}
                                    onChange={(e) => setFormData({ ...formData, customRollNumbers: e.target.value })}
                                    required
                                />
                                <p className="text-xs text-[var(--text-dim)] mt-1.5">
                                    Comma or new-line separated values. Duplicates are removed automatically.
                                </p>
                            </div>
                        )}

                        <div className="rounded-xl border border-white/10 bg-white/3 px-3 py-2">
                            <p className="text-xs text-[var(--text-dim)]">
                                Preview size: <span className="text-white font-semibold">{previewRollNumbers.length}</span> roll numbers
                            </p>
                        </div>

                        <div className="border-t border-white/6 pt-2">
                            <div className="flex items-center gap-2 mb-4">
                                <Shield className="w-4 h-4 text-amber-400" />
                                <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">Security</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[var(--text-dim)] mb-2 uppercase tracking-wider">
                                Admin PIN
                            </label>
                            <div className="relative">
                                <input
                                    id="create-admin-pin"
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
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[var(--text-dim)] mb-2 uppercase tracking-wider">
                                Confirm PIN
                            </label>
                            <div className="relative">
                                <input
                                    id="create-confirm-pin"
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

                        <button
                            id="create-submit-btn"
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
