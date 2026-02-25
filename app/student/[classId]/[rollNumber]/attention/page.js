"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import NotificationSetup from '@/app/components/NotificationSetup';
import api from '@/utils/api';
import Calendar from '@/app/components/Calendar';
import useSWR from 'swr';

export default function StudentAttention() {
    const params = useParams();
    const { classId, rollNumber } = params;
    const router = useRouter();
    const [filterSubject, setFilterSubject] = useState('all');
    const [filterUrgency, setFilterUrgency] = useState('all');
    const [selectedDate, setSelectedDate] = useState(null);
    const [hasNewAnnouncements, setHasNewAnnouncements] = useState(false);
    const fetcher = (url) => api.get(url).then((res) => res.data);
    const reportKey = classId && rollNumber ? `/student/report/${classId}/${rollNumber}` : null;
    const announcementsKey = classId ? `/announcements/${classId}` : null;
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

    const { data: reportData, isLoading: reportLoading } = useSWR(
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

    const { data: announcementsResponse, isLoading: announcementsLoading } = useSWR(
        announcementsKey,
        fetcher,
        swrConfig
    );

    const className = reportData?.className || '';
    const subjects = (reportData?.subjects || []).map((s) => ({ _id: s._id, name: s.subjectName }));
    const announcements = announcementsResponse?.announcements || [];
    const loading = (reportLoading && !reportData) || (announcementsLoading && !announcementsResponse);

    const handleLogout = () => {
        localStorage.removeItem('studentClassId');
        localStorage.removeItem('studentRoll');
        localStorage.removeItem('studentClassName');
        localStorage.removeItem('studentToken');
        router.push('/');
    };

    const getTimeAgo = (dateStr) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getDueStatus = (dueDate) => {
        if (!dueDate) return null;
        const now = new Date();
        const due = new Date(dueDate);
        const diffMs = due - now;
        const diffDays = Math.ceil(diffMs / 86400000);

        if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, color: 'red', urgent: true };
        if (diffDays === 0) return { text: 'Due today!', color: 'orange', urgent: true };
        if (diffDays === 1) return { text: 'Due tomorrow', color: 'orange', urgent: false };
        if (diffDays <= 3) return { text: `${diffDays} days left`, color: 'yellow', urgent: false };
        return { text: `${diffDays} days left`, color: 'green', urgent: false };
    };

    // Calculate Task Dates for Calendar
    const taskDates = announcements
        .filter(a => a.dueDate)
        .map(a => new Date(a.dueDate).toISOString().split('T')[0]);

    // Handle Calendar Selection
    const handleDateSelect = (dateStr) => {
        if (selectedDate === dateStr) {
            setSelectedDate(null); // Toggle off
        } else {
            setSelectedDate(dateStr); // Filter to this date
        }
    };

    // Apply filters
    let filtered = [...announcements];

    // Date Filter
    if (selectedDate) {
        filtered = filtered.filter(a => {
            if (!a.dueDate) return false;
            return new Date(a.dueDate).toISOString().split('T')[0] === selectedDate;
        });
    }

    // Urgent Filter: due within 2 days (overdue, today, tomorrow, 2 days left)
    if (filterUrgency === 'urgent') {
        filtered = filtered.filter(a => {
            if (!a.dueDate) return false;
            const now = new Date();
            const due = new Date(a.dueDate);
            const diffDays = Math.ceil((due - now) / 86400000);
            return diffDays <= 2; // overdue (<0), today (0), tomorrow (1), 2 days left (2)
        });
    }

    // Subject Filter
    if (filterSubject !== 'all') {
        filtered = filtered.filter(a => a.subjectName === filterSubject || (filterSubject === 'General' && (!a.subjectId || a.subjectName === 'General')));
    }

    // Sorting: Nearest deadline first
    filtered.sort((a, b) => {
        if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // ── New-announcement detector ─────────────────────────────────────────
    const seenKey = classId ? `attn_seen_${classId}_${rollNumber}` : null;

    useEffect(() => {
        if (!seenKey || announcements.length === 0) return;
        try {
            const stored = JSON.parse(localStorage.getItem(seenKey) || 'null');
            const latest = announcements
                .map(a => new Date(a.createdAt).getTime())
                .sort((a, b) => b - a)[0];

            if (!stored || stored.latest !== latest || stored.count !== announcements.length) {
                setHasNewAnnouncements(true);
            }
        } catch { /* ignore */ }
    }, [announcements, seenKey]);

    // Mark as seen when user lands on this page
    useEffect(() => {
        if (!seenKey || announcements.length === 0) return;
        const latest = announcements
            .map(a => new Date(a.createdAt).getTime())
            .sort((a, b) => b - a)[0];
        localStorage.setItem(seenKey, JSON.stringify({ count: announcements.length, latest }));
        setHasNewAnnouncements(false);
    }, [seenKey, announcements.length]);

    if (!mounted || loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading...</div>;

    const renderCard = (announcement) => {
        const dueStatus = getDueStatus(announcement.dueDate);

        return (
            <div
                key={announcement._id}
                className="card relative"
            >
                <div className="flex gap-3">
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-tight mb-1">{announcement.title}</h3>

                        {announcement.description && (
                            <p className="text-sm text-[var(--text-dim)] mb-2 whitespace-pre-wrap">{announcement.description}</p>
                        )}

                        {/* Tags */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/20 border border-blue-500/20 text-blue-400">
                                {announcement.subjectName}
                            </span>
                            {dueStatus && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${dueStatus.color === 'red' ? 'bg-red-900/20 border-red-500/30 text-red-400' :
                                    dueStatus.color === 'orange' ? 'bg-orange-900/20 border-orange-500/30 text-orange-400' :
                                        dueStatus.color === 'yellow' ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400' :
                                            'bg-green-900/20 border-green-500/30 text-green-400'
                                    }`}>
                                    {dueStatus.text}
                                </span>
                            )}
                            <span className="text-xs text-[var(--text-dim)]">
                                {getTimeAgo(announcement.createdAt)}
                            </span>
                        </div>

                        {/* Due date display */}
                        {announcement.dueDate && (
                            <p className="flex items-center gap-1.5 text-xs text-[var(--text-dim)] mt-2">
                                <svg className="w-3 h-3 flex-shrink-0 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <rect x="3" y="4" width="18" height="18" rx="2" />
                                    <path d="M16 2v4M8 2v4M3 10h18" />
                                </svg>
                                {new Date(announcement.dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Get unique subject names for filter
    const filterOptions = [...new Set([
        'General',
        ...announcements.map(a => a.subjectName || 'General'),
        ...subjects.map(s => s.name)
    ])].filter(Boolean).sort();

    return (
        <>
            <Navbar isStudent={true} onLogout={handleLogout} classId={classId} rollNumber={rollNumber}
                hasNewAnnouncements={hasNewAnnouncements}
            />

            <div className="max-w-3xl mx-auto px-4 py-8 pb-24">

                {/* Header */}
                <div className="mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold mb-1">Attention Board</h1>
                            <p className="text-[var(--text-dim)] text-sm">{className} - Roll No. {rollNumber}</p>
                        </div>
                        <NotificationSetup classId={classId} rollNumber={rollNumber} />
                    </div>
                </div>

                {/* Task Calendar — collapsible, starts closed */}
                <div className="mb-6">
                    <Calendar
                        taskDates={taskDates}
                        selectedDate={selectedDate || ''}
                        onSelectDate={handleDateSelect}
                        enableAllDates={true}
                        collapsible={true}
                        defaultExpanded={false}
                    />
                    {selectedDate && (
                        <button
                            onClick={() => setSelectedDate(null)}
                            className="mt-2 text-xs text-white/40 hover:text-white transition flex items-center gap-1"
                        >
                            <span>✕</span> Clear date filter
                        </button>
                    )}
                </div>

                {/* Compact Filter Row: Dropdown + Urgent toggle */}
                {filterOptions.length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-white/30 uppercase tracking-wider">
                                {filtered.length} {filtered.length === 1 ? 'task' : 'tasks'}
                                {selectedDate ? ` on ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                            </p>
                            {(filterSubject !== 'all' || filterUrgency === 'urgent' || selectedDate) && (
                                <button
                                    onClick={() => { setFilterSubject('all'); setFilterUrgency('all'); setSelectedDate(null); }}
                                    className="text-[10px] text-white/30 hover:text-white/70 transition"
                                >
                                    Reset all
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Subject dropdown */}
                            <div className="relative flex-1">
                                <select
                                    value={filterSubject}
                                    onChange={(e) => setFilterSubject(e.target.value)}
                                    className={`
                                        w-full appearance-none px-3 py-2 pr-8 rounded-xl text-xs font-semibold border
                                        bg-transparent transition-all duration-200 cursor-pointer outline-none
                                        ${filterSubject !== 'all'
                                            ? 'border-blue-500/50 text-blue-400 bg-blue-500/8'
                                            : 'border-white/10 text-white/50 hover:border-white/20'
                                        }
                                    `}
                                    style={{ colorScheme: 'dark' }}
                                >
                                    <option className="bg-white text-black" value="all">All Subjects</option>
                                    {filterOptions.map(sub => (
                                        <option className="bg-white text-black" key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                                {/* custom chevron */}
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M6 9l6 6 6-6" />
                                    </svg>
                                </div>
                            </div>

                            {/* Urgent toggle pill */}
                            <button
                                onClick={() => setFilterUrgency(filterUrgency === 'urgent' ? 'all' : 'urgent')}
                                className={`
                                    flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                                    transition-all duration-200 border
                                    ${filterUrgency === 'urgent'
                                        ? 'bg-red-500/15 border-red-500/50 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                                        : 'bg-transparent border-white/10 text-white/40 hover:border-white/20 hover:text-white/70'
                                    }
                                `}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${filterUrgency === 'urgent' ? 'bg-red-400' : 'bg-white/20'}`} />
                                Urgent
                            </button>
                        </div>
                    </div>
                )}

                {/* Active Date Header if selected */}
                {selectedDate && (
                    <div className="mb-4">
                        <h3 className="text-lg font-bold">
                            Work for {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h3>
                    </div>
                )}

                {/* Task List */}
                {filtered.length > 0 ? (
                    <div className="space-y-3">
                        {filtered.map(a => renderCard(a))}
                    </div>
                ) : (
                    <div className="card text-center py-12 border-dashed border-[var(--border)]">
                        <p className="text-4xl mb-4 opacity-50">👍</p>
                        <p className="text-[var(--text-dim)]">
                            {announcements.length === 0
                                ? 'No announcements yet.'
                                : selectedDate
                                    ? `No works due on ${new Date(selectedDate).toLocaleDateString()}.`
                                    : 'No tasks found.'
                            }
                        </p>
                        {selectedDate && (
                            <button
                                onClick={() => setSelectedDate(null)}
                                className="mt-4 text-sm text-blue-400 underline"
                            >
                                View all tasks
                            </button>
                        )}
                    </div>
                )}

            </div>
        </>
    );
}
