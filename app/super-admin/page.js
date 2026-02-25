"use client";
import { useState, useEffect, useCallback } from 'react';
import {
    Shield, Trash2, RefreshCw, LogOut, AlertTriangle,
    CheckCircle, X, Eye, EyeOff, Loader2, Database,
    Users, KeyRound, ChevronRight
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// ─── Toast notification ───────────────────────────────────────────────────────
function Toast({ toast, onDismiss }) {
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(onDismiss, 5000);
        return () => clearTimeout(t);
    }, [toast, onDismiss]);

    if (!toast) return null;

    const isSuccess = toast.type === 'success';
    return (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-start gap-3 max-w-sm w-full rounded-2xl border p-4 shadow-2xl animate-slide-up
            ${isSuccess
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100'
                : 'bg-red-950/90 border-red-500/40 text-red-100'
            } backdrop-blur-md`}>
            <div className={`mt-0.5 flex-shrink-0 rounded-full p-1 ${isSuccess ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                {isSuccess
                    ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                    : <AlertTriangle className="w-4 h-4 text-red-400" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{isSuccess ? 'Purge Complete' : 'Error'}</p>
                <p className="text-xs mt-0.5 opacity-80 leading-relaxed">{toast.message}</p>
            </div>
            <button onClick={onDismiss} className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition">
                <X className="w-4 h-4 opacity-60" />
            </button>
        </div>
    );
}

// ─── Confirm Purge Dialog ─────────────────────────────────────────────────────
function PurgeDialog({ target, onConfirm, onCancel, loading }) {
    const [input, setInput] = useState('');
    const matches = input.trim() === target?.className;

    if (!target) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#0f0f0f] shadow-2xl shadow-red-900/30">
                {/* Header */}
                <div className="flex items-center gap-3 p-5 border-b border-white/10">
                    <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white">Confirm Purge</h2>
                        <p className="text-xs text-gray-400">This action is permanent and cannot be undone.</p>
                    </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300 space-y-1">
                        <p className="font-semibold text-red-200">The following will be permanently deleted:</p>
                        <ul className="list-disc list-inside space-y-0.5 opacity-80 mt-1">
                            <li>The classroom: <span className="font-bold">{target.className}</span></li>
                            <li>All attendance records</li>
                            <li>All announcements</li>
                            <li>All reports</li>
                            <li>All push subscriptions</li>
                        </ul>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">
                            Type <span className="text-white font-mono font-bold">{target.className}</span> to confirm:
                        </label>
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Type class name exactly..."
                            autoFocus
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:bg-white/8 transition"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-5 pt-0">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-gray-300 hover:bg-white/10 transition disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!matches || loading}
                        className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {loading ? 'Purging...' : 'Purge Class'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SuperAdminPage() {
    const [masterKey, setMasterKey] = useState('');
    const [keyInput, setKeyInput] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [unlockError, setUnlockError] = useState('');
    const [unlocking, setUnlocking] = useState(false);

    const [classes, setClasses] = useState([]);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [fetchError, setFetchError] = useState('');

    const [purgeTarget, setPurgeTarget] = useState(null); // { classId, className }
    const [purging, setPurging] = useState(false);

    const [toast, setToast] = useState(null);

    // ── Fetch classes ──────────────────────────────────────────────────────────
    const fetchClasses = useCallback(async (key) => {
        setLoadingClasses(true);
        setFetchError('');
        try {
            const res = await fetch(`${API_BASE}/class/super-admin/classes`, {
                headers: { 'X-Super-Admin-Key': key },
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            const data = await res.json();
            setClasses(data.classes || []);
        } catch (err) {
            setFetchError(err.message || 'Failed to load classes.');
        } finally {
            setLoadingClasses(false);
        }
    }, []);

    // ── Unlock handler ─────────────────────────────────────────────────────────
    const handleUnlock = async () => {
        if (!keyInput.trim()) {
            setUnlockError('Please enter the master key.');
            return;
        }
        setUnlocking(true);
        setUnlockError('');
        try {
            const res = await fetch(`${API_BASE}/class/super-admin/classes`, {
                headers: { 'X-Super-Admin-Key': keyInput.trim() },
            });
            if (!res.ok) {
                setUnlockError('Invalid master key. Access denied.');
                return;
            }
            const data = await res.json();
            setMasterKey(keyInput.trim());
            setClasses(data.classes || []);
            setIsUnlocked(true);
        } catch {
            setUnlockError('Connection error. Is the backend running?');
        } finally {
            setUnlocking(false);
        }
    };

    // ── Purge handler ──────────────────────────────────────────────────────────
    const handlePurge = async () => {
        if (!purgeTarget) return;
        setPurging(true);
        try {
            const res = await fetch(`${API_BASE}/class/super-admin/purge/${purgeTarget.classId}`, {
                method: 'DELETE',
                headers: { 'X-Super-Admin-Key': masterKey },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

            const d = data.deleted;
            setToast({
                type: 'success',
                message: `"${data.className}" purged. Deleted: ${d.attendances} attendance(s), ${d.announcements} announcement(s), ${d.reports} report(s), ${d.pushSubscriptions} subscription(s).`,
            });
            setClasses(prev => prev.filter(c => c._id !== purgeTarget.classId));
            setPurgeTarget(null);
        } catch (err) {
            setToast({ type: 'error', message: err.message || 'Purge failed.' });
        } finally {
            setPurging(false);
        }
    };

    // ── Lock / sign out ────────────────────────────────────────────────────────
    const handleLock = () => {
        setMasterKey('');
        setKeyInput('');
        setIsUnlocked(false);
        setClasses([]);
        setFetchError('');
        setPurgeTarget(null);
    };

    // ───────────────────────────────────────────────────────────────────────────
    // LOCK SCREEN
    // ───────────────────────────────────────────────────────────────────────────
    if (!isUnlocked) {
        return (
            <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
                <div className="w-full max-w-sm">
                    {/* Icon badge */}
                    <div className="flex justify-center mb-8">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600/30 to-indigo-600/20 border border-violet-500/30 flex items-center justify-center shadow-xl shadow-violet-900/30">
                            <Shield className="w-10 h-10 text-violet-400" />
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white tracking-tight">Super Admin</h1>
                        <p className="text-sm text-gray-500 mt-1">Enter your master key to continue</p>
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-4 shadow-2xl backdrop-blur-sm">
                        <div className="relative">
                            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={keyInput}
                                onChange={e => { setKeyInput(e.target.value); setUnlockError(''); }}
                                onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                                placeholder="Master key..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/60 focus:bg-white/8 transition"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300 transition"
                            >
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {unlockError && (
                            <p className="text-xs text-red-400 flex items-center gap-1.5">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                {unlockError}
                            </p>
                        )}

                        <button
                            onClick={handleUnlock}
                            disabled={unlocking || !keyInput.trim()}
                            className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-900/40"
                        >
                            {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                            {unlocking ? 'Verifying...' : 'Unlock Dashboard'}
                        </button>
                    </div>

                    <p className="text-center text-xs text-gray-600 mt-6">
                        Key is stored in memory only · Never persisted to disk
                    </p>
                </div>
            </div>
        );
    }

    // ───────────────────────────────────────────────────────────────────────────
    // DASHBOARD
    // ───────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#080808] text-white">
            {/* ── Header ── */}
            <header className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md border-b border-white/8">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-violet-400" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white leading-none">Super Admin</h1>
                            <p className="text-[10px] text-gray-500 mt-0.5">Shadow Management Console</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchClasses(masterKey)}
                            disabled={loadingClasses}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-xs text-gray-300 transition disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loadingClasses ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={handleLock}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/8 hover:border-red-500/30 text-xs text-gray-300 hover:text-red-300 transition"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            Lock
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                {/* ── Stats bar ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <Database className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{classes.length}</p>
                            <p className="text-xs text-gray-500">Total Classes</p>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">
                                {classes.reduce((sum, c) => sum + (c.rollNumbers?.length || 0), 0)}
                            </p>
                            <p className="text-xs text-gray-500">Total Students</p>
                        </div>
                    </div>
                    <div className="hidden sm:flex rounded-2xl border border-red-500/15 bg-red-500/[0.04] p-4 items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                            <Trash2 className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-0.5">Purge resets</p>
                            <p className="text-xs text-red-400 font-medium">All 5 collections</p>
                        </div>
                    </div>
                </div>

                {/* ── Section header ── */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-300">Class Registry</h2>
                    <span className="text-xs text-gray-600 bg-white/5 border border-white/8 px-2.5 py-1 rounded-full">
                        {classes.length} class{classes.length !== 1 ? 'es' : ''}
                    </span>
                </div>

                {/* ── Error ── */}
                {fetchError && (
                    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-2 text-sm text-red-300">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        {fetchError}
                    </div>
                )}

                {/* ── Loading ── */}
                {loadingClasses && (
                    <div className="flex items-center justify-center py-16 text-gray-500 gap-2 text-sm">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading classes...
                    </div>
                )}

                {/* ── Empty ── */}
                {!loadingClasses && !fetchError && classes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-600 gap-2">
                        <Database className="w-8 h-8 opacity-40" />
                        <p className="text-sm">No classes found in the database.</p>
                    </div>
                )}

                {/* ── Class table ── */}
                {!loadingClasses && classes.length > 0 && (
                    <div className="rounded-2xl border border-white/8 overflow-hidden">
                        {/* Table header */}
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 bg-white/[0.02] border-b border-white/8 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <span>Class Name</span>
                            <span className="hidden sm:block text-right">Class ID</span>
                            <span className="hidden sm:block text-right">Students</span>
                            <span className="text-right">Action</span>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-white/5">
                            {classes.map((cls, i) => (
                                <div
                                    key={cls._id}
                                    className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-4 hover:bg-white/[0.02] transition group"
                                >
                                    {/* Name */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-violet-400">
                                            {i + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-white truncate">{cls.className}</p>
                                            <p className="text-xs text-gray-600 mt-0.5">
                                                {cls.createdAt
                                                    ? new Date(cls.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                                    : '—'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* ID */}
                                    <span className="hidden sm:block font-mono text-xs text-gray-500 text-right" title={cls._id}>
                                        {cls._id.slice(-8)}
                                    </span>

                                    {/* Students */}
                                    <span className="hidden sm:flex items-center justify-end gap-1 text-xs text-gray-400">
                                        <Users className="w-3 h-3 text-gray-600" />
                                        {cls.rollNumbers?.length ?? '—'}
                                    </span>

                                    {/* Purge button */}
                                    <button
                                        onClick={() => setPurgeTarget({ classId: cls._id, className: cls.className })}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 text-xs font-medium transition active:scale-95"
                                        title="Purge this class"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span className="hidden sm:block">Purge</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Warning footer ── */}
                <p className="text-center text-xs text-gray-700 mt-8">
                    ⚠ Purge is permanent and irreversible. All associated data will be deleted from the database.
                </p>
            </main>

            {/* ── Dialogs ── */}
            <PurgeDialog
                target={purgeTarget}
                onConfirm={handlePurge}
                onCancel={() => setPurgeTarget(null)}
                loading={purging}
            />
            <Toast toast={toast} onDismiss={() => setToast(null)} />

            {/* ── Inline animation styles ── */}
            <style>{`
                @keyframes slide-up {
                    from { transform: translateY(1rem); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
                .animate-slide-up { animation: slide-up 0.2s ease-out both; }
            `}</style>
        </div>
    );
}
