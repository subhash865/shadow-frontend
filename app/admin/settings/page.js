"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Loader2, ArrowLeft, Users, Percent, Save } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';

export default function AdminSettings() {
    const router = useRouter();
    const notify = useNotification();
    const [loading, setLoading] = useState(true);
    const [classId, setClassId] = useState(null);
    const [className, setClassName] = useState('');
    const [minPercentage, setMinPercentage] = useState(75);
    const [classStrength, setClassStrength] = useState(70);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const storedClassId = localStorage.getItem('adminClassId');
        if (!storedClassId) {
            router.push('/admin/login');
            return;
        }
        setClassId(storedClassId);

        api.get(`/class/${storedClassId}`)
            .then(res => {
                setClassName(res.data.className);
                setClassStrength(res.data.totalStudents || 70);
                if (res.data.settings) {
                    setMinPercentage(res.data.settings.minAttendancePercentage || 75);
                }
                setLoading(false);
            })
            .catch(() => {
                notify({ message: 'Failed to load settings', type: 'error' });
                setLoading(false);
            });
    }, [router, notify]);

    const handleLogout = () => {
        localStorage.removeItem('adminClassId');
        localStorage.removeItem('token');
        router.push('/');
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/class/update-settings', {
                classId,
                settings: { minAttendancePercentage: minPercentage },
                totalStudents: classStrength
            });
            notify({ message: 'Settings saved!', type: 'success' });
        } catch (err) {
            notify({ message: 'Failed to save settings', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Color for percentage display
    const getPercentColor = () => {
        if (minPercentage >= 80) return 'text-red-400';
        if (minPercentage >= 65) return 'text-amber-400';
        return 'text-emerald-400';
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading...</div>;

    return (
        <>
            <Navbar isAdmin={true} onLogout={handleLogout} classId={classId} />

            <div className="max-w-2xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="mb-8 animate-fade-up">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Settings className="w-5 h-5 text-[var(--text-dim)]" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold" style={{ letterSpacing: '-0.03em' }}>Settings</h1>
                            <p className="text-[var(--text-dim)] text-sm">{className}</p>
                        </div>
                    </div>
                </div>

                {/* Minimum Attendance Percentage */}
                <div className="glass-card mb-4 animate-fade-up delay-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <Percent className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold">Minimum Attendance</h2>
                            <p className="text-xs text-[var(--text-dim)]">Students below this will be flagged as &quot;at risk&quot;</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <input
                            id="min-percentage-slider"
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={minPercentage}
                            onChange={(e) => setMinPercentage(parseInt(e.target.value))}
                            className="flex-1 accent-white"
                            style={{
                                background: `linear-gradient(to right, rgba(255,255,255,0.3) ${minPercentage}%, rgba(255,255,255,0.06) ${minPercentage}%)`
                            }}
                        />
                        <span className={`text-3xl font-bold min-w-[65px] text-right tabular-nums ${getPercentColor()}`}>{minPercentage}%</span>
                    </div>

                    {/* Quick presets */}
                    <div className="flex gap-2 mt-4">
                        {[50, 65, 75, 80, 85].map(val => (
                            <button
                                key={val}
                                onClick={() => setMinPercentage(val)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${minPercentage === val
                                    ? 'bg-white text-black'
                                    : 'bg-white/5 text-[var(--text-dim)] hover:bg-white/10 border border-white/8'
                                    }`}
                            >
                                {val}%
                            </button>
                        ))}
                    </div>
                </div>

                {/* Class Strength */}
                <div className="glass-card mb-6 animate-fade-up delay-200">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold">Class Strength</h2>
                            <p className="text-xs text-[var(--text-dim)]">Total students (controls attendance grid size)</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            id="class-strength-input"
                            type="number"
                            min="1"
                            max="200"
                            value={classStrength}
                            onChange={(e) => setClassStrength(parseInt(e.target.value) || 1)}
                            className="input w-32 text-center text-lg font-bold"
                        />
                        <span className="text-sm text-[var(--text-dim)]">students</span>
                    </div>
                </div>

                {/* Save Button */}
                <button
                    id="save-settings-btn"
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary mb-6 animate-fade-up delay-300"
                >
                    {saving ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            Save Settings
                        </span>
                    )}
                </button>

                {/* Back */}
                <div className="text-center animate-fade-up delay-400">
                    <button
                        onClick={() => router.push('/admin/dashboard')}
                        className="inline-flex items-center gap-2 text-sm text-[var(--text-dim)] hover:text-white transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </button>
                </div>

            </div>
        </>
    );
}
