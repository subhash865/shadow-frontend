"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';
import useSWR from 'swr';

export default function BunkEffect() {
    const params = useParams();
    const { classId, rollNumber } = params;
    const router = useRouter();
    const notify = useNotification();
    const [bunkCounts, setBunkCounts] = useState({});
    const [minPercentage, setMinPercentage] = useState(75);

    useEffect(() => {
        // Load student's own min percentage from localStorage
        const saved = localStorage.getItem('studentMinPercentage');
        if (saved) setMinPercentage(parseInt(saved));
    }, []);

    const fetcher = (url) => api.get(url).then((res) => res.data);
    const reportKey = classId && rollNumber ? `/student/report/${classId}/${rollNumber}` : null;
    const reportCacheKey = classId && rollNumber ? `cls_config_${classId}_${rollNumber}` : null;
    const subjectCacheKey = classId ? `cls_subjects_${classId}` : null;

    const getCachedReport = () => {
        if (typeof window === 'undefined' || !reportCacheKey) return null;
        try {
            return JSON.parse(localStorage.getItem(reportCacheKey) || 'null');
        } catch {
            return null;
        }
    };

    const swrConfig = {
        revalidateOnFocus: false,
        dedupingInterval: 30000,
        shouldRetryOnError: true,
        errorRetryCount: 3,
        errorRetryInterval: 5000
    };

    const { data: reportData, error: reportError, isLoading: reportLoading } = useSWR(
        reportKey,
        fetcher,
        {
            ...swrConfig,
            fallbackData: getCachedReport(),
            onSuccess: (resData) => {
                if (typeof window !== 'undefined') {
                    if (reportCacheKey) {
                        localStorage.setItem(reportCacheKey, JSON.stringify(resData));
                    }
                    if (subjectCacheKey && Array.isArray(resData?.subjects)) {
                        localStorage.setItem(subjectCacheKey, JSON.stringify(resData.subjects));
                    }
                }
            }
        }
    );

    useEffect(() => {
        if (reportError) {
            notify({ message: "Failed to load data", type: 'error' });
        }
    }, [reportError, notify]);

    const className = reportData?.className || '';
    const subjects = reportData?.subjects || [];
    const loading = reportLoading && !reportData;

    const handleLogout = () => {
        localStorage.removeItem('studentClassId');
        localStorage.removeItem('studentRoll');
        localStorage.removeItem('studentClassName');
        localStorage.removeItem('studentToken');
        router.push('/');
    };

    const updateBunkCount = (subjectId, value) => {
        const count = parseInt(value) || 0;
        setBunkCounts(prev => ({ ...prev, [subjectId]: Math.max(0, count) }));
    };

    const incrementBunk = (subjectId) => {
        setBunkCounts(prev => ({ ...prev, [subjectId]: (prev[subjectId] || 0) + 1 }));
    };

    const decrementBunk = (subjectId) => {
        setBunkCounts(prev => ({ ...prev, [subjectId]: Math.max(0, (prev[subjectId] || 0) - 1) }));
    };

    const clearAll = () => {
        setBunkCounts({});
    };

    // Calculate impact for a subject
    const getImpact = (subject) => {
        const bunkCount = bunkCounts[subject._id] || 0;
        const afterTotal = subject.total + bunkCount;
        const afterAttended = subject.attended; // skipping means not attending
        const afterPercentage = afterTotal === 0 ? 100 : (afterAttended / afterTotal) * 100;
        const percentDrop = subject.percentage - afterPercentage;

        const isSafe = afterPercentage >= minPercentage + 5;
        const isDanger = afterPercentage < minPercentage;

        // Calculate max classes you can skip while staying at minPercentage
        const maxBunkable = Math.max(0, Math.floor((subject.attended / (minPercentage / 100)) - subject.total));

        // Calculate classes needed to recover if below minimum
        let classesToRecover = 0;
        const denominator = 1 - (minPercentage / 100);
        if (afterPercentage < minPercentage && afterTotal > 0 && denominator > 0) {
            classesToRecover = Math.max(
                0,
                Math.ceil(
                    ((minPercentage / 100) * afterTotal - afterAttended) / denominator
                )
            );
        }

        return {
            bunkCount,
            afterTotal,
            afterAttended,
            afterPercentage,
            percentDrop,
            isSafe,
            isDanger,
            maxBunkable,
            classesToRecover
        };
    };

    const totalBunks = Object.values(bunkCounts).reduce((sum, c) => sum + c, 0);

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading...</div>;

    return (
        <>
            <Navbar isStudent={true} onLogout={handleLogout} classId={classId} rollNumber={rollNumber} />

            <div className="max-w-3xl mx-auto px-4 py-8 pb-24">

                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Skip Effect Calculator</h1>
                    <p className="text-[var(--text-dim)]">{className} - Roll No. {rollNumber}</p>
                </div>

                {/* Instructions */}
                <div className="card mb-6 bg-blue-900/10 border-blue-500/30">
                    <h2 className="text-sm font-semibold text-blue-400 mb-2">How it works</h2>
                    <ul className="text-sm text-[var(--text-dim)] space-y-1">
                        <li>• Set how many classes you plan to skip for each subject</li>
                        <li>• See the impact on your attendance percentage instantly</li>
                        <li>• Minimum attendance threshold: <span className="text-white font-semibold">{minPercentage}%</span></li>
                    </ul>
                </div>

                {/* Summary Bar */}
                {totalBunks > 0 && (
                    <div className="card mb-6 bg-orange-900/10 border-orange-500/30">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-semibold text-orange-400">
                                    Planning to skip {totalBunks} class{totalBunks > 1 ? 'es' : ''} total
                                </p>
                                <p className="text-xs text-[var(--text-dim)] mt-1">
                                    {Object.entries(bunkCounts).filter(([_, c]) => c > 0).map(([id, c]) => {
                                        const sub = subjects.find(s => s._id === id);
                                        return sub ? `${sub.subjectName}: ${c}` : null;
                                    }).filter(Boolean).join(' · ')}
                                </p>
                            </div>
                            <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-300 px-3 py-1 border border-red-500/30 rounded-full">
                                Clear All
                            </button>
                        </div>
                    </div>
                )}

                {/* Subject Cards */}
                <div className="space-y-4">
                    {subjects.map(subject => {
                        const impact = getImpact(subject);
                        const bunkCount = impact.bunkCount;
                        const hasImpact = bunkCount > 0;

                        return (
                            <div key={subject._id} className={`card transition ${hasImpact ? (impact.isDanger ? 'border-red-500/40' : impact.isSafe ? 'border-green-500/30' : 'border-orange-500/30') : ''}`}>

                                {/* Subject Header */}
                                <div className="flex justify-between items-center mb-4 pb-3 border-b border-[var(--border)]">
                                    <div>
                                        <h3 className="font-semibold text-lg">{subject.subjectName}</h3>
                                        <p className="text-xs text-[var(--text-dim)]">
                                            {subject.attended}/{subject.total} classes attended · Can skip {impact.maxBunkable} more
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold">{subject.percentage}%</p>
                                        <p className="text-xs text-[var(--text-dim)]">current</p>
                                    </div>
                                </div>

                                {/* Skip Counter */}
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-sm text-[var(--text-dim)]">Classes to skip</label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => decrementBunk(subject._id)}
                                            disabled={bunkCount === 0}
                                            className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center text-lg hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            min="0"
                                            value={bunkCount}
                                            onChange={(e) => updateBunkCount(subject._id, e.target.value)}
                                            className="w-14 text-center bg-transparent border border-[var(--border)] rounded-lg py-1.5 text-lg font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <button
                                            onClick={() => incrementBunk(subject._id)}
                                            className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center text-lg hover:bg-white/10 transition"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Impact Display */}
                                {hasImpact && (
                                    <div className="space-y-3">
                                        {/* Before/After Bar */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
                                                <p className="text-xs text-[var(--text-dim)] mb-1">Current</p>
                                                <p className="text-xl font-bold">{subject.percentage}%</p>
                                                <p className="text-xs text-[var(--text-dim)]">{subject.attended}/{subject.total}</p>
                                            </div>
                                            <div className={`p-3 rounded-lg border ${impact.isDanger ? 'bg-red-900/10 border-red-500/30' : impact.isSafe ? 'bg-green-900/10 border-green-500/30' : 'bg-orange-900/10 border-orange-500/30'}`}>
                                                <p className="text-xs text-[var(--text-dim)] mb-1">After Skip</p>
                                                <p className={`text-xl font-bold ${impact.isDanger ? 'text-red-400' : impact.isSafe ? 'text-green-400' : 'text-orange-400'}`}>
                                                    {impact.afterPercentage.toFixed(1)}%
                                                </p>
                                                <p className="text-xs text-[var(--text-dim)]">{impact.afterAttended}/{impact.afterTotal}</p>
                                            </div>
                                        </div>

                                        {/* Drop indicator */}
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${impact.isDanger ? 'bg-red-500' : impact.isSafe ? 'bg-green-500' : 'bg-orange-500'}`}
                                                    style={{ width: `${Math.max(0, Math.min(100, impact.afterPercentage))}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-semibold text-red-400">
                                                −{impact.percentDrop.toFixed(1)}%
                                            </span>
                                        </div>

                                        {/* Status Message */}
                                        <div className={`p-2.5 rounded-lg text-sm ${impact.isDanger ? 'bg-red-900/20 text-red-400' :
                                            impact.isSafe ? 'bg-green-900/20 text-green-400' :
                                                'bg-orange-900/20 text-orange-400'
                                            }`}>
                                            {impact.isSafe && `✓ Still safe after skipping ${bunkCount} class${bunkCount > 1 ? 'es' : ''}`}
                                            {!impact.isSafe && !impact.isDanger && `⚠ Borderline! Be careful, you're close to ${minPercentage}%`}
                                            {impact.isDanger && `✗ Below ${minPercentage}%! Attend ${impact.classesToRecover} more class${impact.classesToRecover > 1 ? 'es' : ''} to recover`}
                                        </div>
                                    </div>
                                )}

                                {/* Quick info when no skip selected */}
                                {!hasImpact && (
                                    <div className="text-center py-1">
                                        <p className={`text-xs ${impact.maxBunkable > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {impact.maxBunkable > 0
                                                ? `You can safely skip up to ${impact.maxBunkable} class${impact.maxBunkable > 1 ? 'es' : ''}`
                                                : subject.percentage < minPercentage
                                                    ? `⚠ Already below ${minPercentage}% — cannot skip`
                                                    : `Borderline — skipping is risky`
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

            </div>
        </>
    );
}
