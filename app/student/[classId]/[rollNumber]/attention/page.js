"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import Calendar from '@/app/components/Calendar';

export default function StudentAttention() {
    const params = useParams();
    const { classId, rollNumber } = params;
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [className, setClassName] = useState('');
    const [announcements, setAnnouncements] = useState([]);
    const [filterSubject, setFilterSubject] = useState('all');
    const [selectedDate, setSelectedDate] = useState(null); // YYYY-MM-DD
    const [subjects, setSubjects] = useState([]);

    useEffect(() => {
        if (!classId || !rollNumber) return;

        // Fetch class info
        api.get(`/student/report/${classId}/${rollNumber}`)
            .then(res => {
                setClassName(res.data.className);
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
    let filtered = announcements;

    // Date Filter
    if (selectedDate) {
        filtered = filtered.filter(a => {
            if (!a.dueDate) return false;
            return new Date(a.dueDate).toISOString().split('T')[0] === selectedDate;
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

    if (loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading...</div>;

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
                            <p className="text-xs text-[var(--text-dim)] mt-2">
                                📅 {new Date(announcement.dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
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
            <Navbar isStudent={true} onLogout={handleLogout} classId={classId} rollNumber={rollNumber} />

            <div className="max-w-3xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold mb-1">Attention Board</h1>
                    <p className="text-[var(--text-dim)] text-sm">{className} - Roll No. {rollNumber}</p>
                </div>

                {/* Task Calendar */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-sm font-semibold text-[var(--text-dim)] uppercase">Deadlines & Tasks</h2>
                        {selectedDate && (
                            <button
                                onClick={() => setSelectedDate(null)}
                                className="text-xs text-blue-400 hover:text-white transition"
                            >
                                Clear Date Filter
                            </button>
                        )}
                    </div>
                    <Calendar
                        taskDates={taskDates}
                        selectedDate={selectedDate || ''}
                        onSelectDate={handleDateSelect}
                        enableAllDates={true}
                    />
                    <div className="flex justify-center gap-4 mt-2 text-[10px] text-[var(--text-dim)]">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span>Task Due</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-md"></div>
                            <span>Selected</span>
                        </div>
                    </div>
                </div>

                {/* Subject Filter Row */}
                {filterOptions.length > 0 && (
                    <div className="mb-6">
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            <button
                                onClick={() => setFilterSubject('all')}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${filterSubject === 'all'
                                    ? 'bg-blue-900/20 text-blue-400 border border-blue-500/30'
                                    : 'bg-[var(--card-bg)] text-[var(--text-dim)] border border-[var(--border)] hover:border-white/30'
                                    }`}
                            >
                                All Subjects
                            </button>
                            {filterOptions.map(sub => (
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
                        {filtered.map(renderCard)}
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
