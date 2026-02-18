"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, BookOpen, FileText, Bell } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';

const TYPE_CONFIG = {
    deadline: { label: 'Deadline', color: 'red', emoji: '⏰' },
    exam: { label: 'Exam', color: 'orange', emoji: '📝' },
    assignment: { label: 'Assignment', color: 'blue', emoji: '📚' },
    update: { label: 'Update', color: 'green', emoji: '📢' },
};

export default function StudentAttention() {
    const params = useParams();
    const { classId, rollNumber } = params;
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [className, setClassName] = useState('');
    const [announcements, setAnnouncements] = useState([]);
    const [filterType, setFilterType] = useState('all');
    const [filterSubject, setFilterSubject] = useState('all');
    const [subjects, setSubjects] = useState([]);

    useEffect(() => {
        if (!classId || !rollNumber) return;

        // Fetch class info
        api.get(`/student/report/${classId}/${rollNumber}`)
            .then(res => {
                setClassName(res.data.className);
                // Extract unique subject names
                const subs = (res.data.subjects || []).map(s => ({ _id: s._id, name: s.subjectName }));
                setSubjects(subs);
            })
            .catch(() => { });

        // Fetch announcements
        api.get(`/announcements/${classId}`)
            .then(res => {
                setAnnouncements(res.data.announcements || []);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    }, [classId, rollNumber]);

    const handleLogout = () => {
        localStorage.removeItem('studentClassId');
        localStorage.removeItem('studentRoll');
        localStorage.removeItem('studentClassName');
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

    // Apply filters
    let filtered = announcements;
    if (filterType !== 'all') {
        filtered = filtered.filter(a => a.type === filterType);
    }
    if (filterSubject !== 'all') {
        filtered = filtered.filter(a => a.subjectName === filterSubject || (filterSubject === 'General' && (!a.subjectId || a.subjectName === 'General')));
    }

    // Separate urgent and upcoming 
    const urgentItems = filtered.filter(a => {
        if (a.priority === 'urgent') return true;
        const due = getDueStatus(a.dueDate);
        return due && due.urgent;
    });
    const regularItems = filtered.filter(a => !urgentItems.includes(a));

    if (loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading...</div>;

    const renderCard = (announcement) => {
        const config = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.update;
        const dueStatus = getDueStatus(announcement.dueDate);

        return (
            <div
                key={announcement._id}
                className={`card relative ${announcement.priority === 'urgent' ? 'border-red-500/40' : ''}`}
            >
                {/* Urgent badge */}
                {announcement.priority === 'urgent' && (
                    <div className="absolute top-3 right-3 flex items-center gap-1">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                        <span className="text-xs text-red-400 font-medium">URGENT</span>
                    </div>
                )}

                <div className="flex gap-3">
                    {/* Type Emoji */}
                    <div className="flex-shrink-0 text-xl mt-0.5">
                        {config.emoji}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-tight mb-1">{announcement.title}</h3>

                        {announcement.description && (
                            <p className="text-sm text-[var(--text-dim)] mb-2 whitespace-pre-wrap">{announcement.description}</p>
                        )}

                        {/* Tags */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[var(--text-dim)]">
                                {config.label}
                            </span>
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
                            <p className="text-xs text-[var(--text-dim)] mt-2">
                                📅 {new Date(announcement.dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Get unique subject names from announcements for filter
    const announcementSubjects = [...new Set(announcements.map(a => a.subjectName))];

    return (
        <>
            <Navbar isStudent={true} onLogout={handleLogout} classId={classId} rollNumber={rollNumber} />

            <div className="max-w-3xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold mb-1">Attention Board</h1>
                    <p className="text-[var(--text-dim)] text-sm">{className} - Roll No. {rollNumber}</p>
                </div>

                {/* Filter Row */}
                <div className="mb-6 space-y-3">
                    {/* Type filter */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        <button
                            onClick={() => setFilterType('all')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${filterType === 'all'
                                ? 'bg-white/10 text-white border border-white/20'
                                : 'bg-[var(--card-bg)] text-[var(--text-dim)] border border-[var(--border)] hover:border-white/30'
                                }`}
                        >
                            All ({announcements.length})
                        </button>
                        {Object.entries(TYPE_CONFIG).map(([key, config]) => {
                            const count = announcements.filter(a => a.type === key).length;
                            if (count === 0) return null;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setFilterType(key)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${filterType === key
                                        ? 'bg-white/10 text-white border border-white/20'
                                        : 'bg-[var(--card-bg)] text-[var(--text-dim)] border border-[var(--border)] hover:border-white/30'
                                        }`}
                                >
                                    {config.emoji} {config.label} ({count})
                                </button>
                            );
                        })}
                    </div>

                    {/* Subject filter */}
                    {announcementSubjects.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            <button
                                onClick={() => setFilterSubject('all')}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${filterSubject === 'all'
                                    ? 'bg-blue-900/20 text-blue-400 border border-blue-500/30'
                                    : 'bg-[var(--card-bg)] text-[var(--text-dim)] border border-[var(--border)] hover:border-white/30'
                                    }`}
                            >
                                All Subjects
                            </button>
                            {announcementSubjects.map(sub => (
                                <button
                                    key={sub}
                                    onClick={() => setFilterSubject(sub)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${filterSubject === sub
                                        ? 'bg-blue-900/20 text-blue-400 border border-blue-500/30'
                                        : 'bg-[var(--card-bg)] text-[var(--text-dim)] border border-[var(--border)] hover:border-white/30'
                                        }`}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Urgent Section */}
                {urgentItems.length > 0 && (
                    <div className="mb-6">
                        <h2 className="text-xs uppercase text-red-400 font-semibold mb-3 flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            Needs Attention ({urgentItems.length})
                        </h2>
                        <div className="space-y-3">
                            {urgentItems.map(renderCard)}
                        </div>
                    </div>
                )}

                {/* Regular Items */}
                {regularItems.length > 0 && (
                    <div>
                        {urgentItems.length > 0 && (
                            <h2 className="text-xs uppercase text-[var(--text-dim)] font-semibold mb-3">
                                Other Announcements ({regularItems.length})
                            </h2>
                        )}
                        <div className="space-y-3">
                            {regularItems.map(renderCard)}
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {filtered.length === 0 && (
                    <div className="card text-center py-12">
                        <p className="text-4xl mb-4">📋</p>
                        <p className="text-[var(--text-dim)]">
                            {announcements.length === 0
                                ? 'No announcements from your admin yet.'
                                : 'No announcements match your filters.'
                            }
                        </p>
                    </div>
                )}

            </div>
        </>
    );
}
