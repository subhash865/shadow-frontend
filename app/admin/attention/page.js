"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, BookOpen, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';

export default function AdminAttention() {
    const router = useRouter();
    const notify = useNotification();
    const [classId, setClassId] = useState(null);
    const [className, setClassName] = useState('');
    const [subjects, setSubjects] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formSubjectId, setFormSubjectId] = useState('');
    const [formDueDate, setFormDueDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const storedClassId = localStorage.getItem('adminClassId');
        if (!storedClassId) {
            router.push('/admin/login');
            return;
        }
        setClassId(storedClassId);

        // Fetch class data for subjects
        api.get(`/class/${storedClassId}`)
            .then(res => {
                setClassName(res.data.className);
                setSubjects(res.data.subjects || []);
            })
            .catch(() => { });

        // Fetch announcements
        loadAnnouncements(storedClassId);
    }, [router]);

    const loadAnnouncements = (cId) => {
        api.get(`/announcements/${cId}`)
            .then(res => {
                setAnnouncements(res.data.announcements || []);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    };

    const handleLogout = () => {
        localStorage.removeItem('adminClassId');
        localStorage.removeItem('token');
        router.push('/');
    };

    const resetForm = () => {
        setFormTitle('');
        setFormDescription('');
        setFormSubjectId('');
        setFormDueDate('');
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formTitle.trim()) {
            notify({ message: 'Please enter a title', type: 'error' });
            return;
        }

        setSubmitting(true);

        const selectedSubject = subjects.find(s => s._id === formSubjectId);

        try {
            await api.post('/announcements', {
                classId,
                title: formTitle,
                description: formDescription,
                subjectId: formSubjectId || null,
                subjectName: selectedSubject ? selectedSubject.name : 'General',
                dueDate: formDueDate || null
            });

            notify({ message: 'Announcement posted!', type: 'success' });
            resetForm();
            loadAnnouncements(classId);
        } catch (err) {
            notify({ message: 'Failed to post announcement', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/announcements/${id}`);
            notify({ message: 'Announcement deleted', type: 'success' });
            setAnnouncements(prev => prev.filter(a => a._id !== id));
        } catch (err) {
            notify({ message: 'Failed to delete', type: 'error' });
        }
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
        if (diffDays === 0) return { text: 'Due today', color: 'orange', urgent: true };
        if (diffDays === 1) return { text: 'Due tomorrow', color: 'orange', urgent: false };
        if (diffDays <= 3) return { text: `${diffDays} days left`, color: 'yellow', urgent: false };
        return { text: `${diffDays} days left`, color: 'green', urgent: false };
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading...</div>;

    return (
        <>
            <Navbar isAdmin={true} onLogout={handleLogout} classId={classId} />

            <div className="max-w-3xl mx-auto px-4 py-6">

                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-2xl font-bold mb-1">Attention Board</h1>
                        <p className="text-[var(--text-dim)] text-sm">{className}</p>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${showForm
                            ? 'bg-red-900/20 border border-red-500/40 text-red-400'
                            : 'bg-blue-900/20 border border-blue-500/40 text-blue-400 hover:bg-blue-900/30'
                            }`}
                    >
                        {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {showForm ? 'Cancel' : 'New Post'}
                    </button>
                </div>

                {/* Create Form */}
                {showForm && (
                    <div className="card mb-6 border-blue-500/30 bg-blue-900/5">
                        <h2 className="text-sm uppercase text-blue-400 mb-4">New Announcement</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Title */}
                            <div>
                                <label className="text-xs text-[var(--text-dim)] block mb-2">Title *</label>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    className="input w-full"
                                    placeholder="e.g., Mid-term exam on Unit 3 & 4"
                                    required
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs text-[var(--text-dim)] block mb-2">Description (optional)</label>
                                <textarea
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    className="input w-full min-h-[80px] resize-y"
                                    placeholder="Add details, instructions, links..."
                                    rows={3}
                                />
                            </div>

                            {/* Subject + Due Date row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-[var(--text-dim)] block mb-2">Subject</label>
                                    <select
                                        value={formSubjectId}
                                        onChange={(e) => setFormSubjectId(e.target.value)}
                                        className="input w-full"
                                    >
                                        <option value="">General</option>
                                        {subjects.map(sub => (
                                            <option key={sub._id} value={sub._id}>{sub.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-[var(--text-dim)] block mb-2">Due Date</label>
                                    <input
                                        type="date"
                                        value={formDueDate}
                                        onChange={(e) => setFormDueDate(e.target.value)}
                                        className="input w-full"
                                    />
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn btn-primary w-full"
                            >
                                {submitting ? 'Posting...' : 'Post Announcement'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Announcements List */}
                {announcements.length === 0 ? (
                    <div className="card text-center py-12">
                        <p className="text-4xl mb-4">📋</p>
                        <p className="text-[var(--text-dim)]">
                            No announcements yet. Post your first one!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {announcements.map(announcement => {
                            const dueStatus = getDueStatus(announcement.dueDate);

                            return (
                                <div
                                    key={announcement._id}
                                    className="card relative"
                                >
                                    <div className="flex gap-3">
                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className="font-semibold text-sm leading-tight">{announcement.title}</h3>
                                            </div>

                                            {announcement.description && (
                                                <p className="text-sm text-[var(--text-dim)] mb-2 whitespace-pre-wrap">{announcement.description}</p>
                                            )}

                                            {/* Tags Row */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                {/* Subject tag */}
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/20 border border-blue-500/20 text-blue-400">
                                                    {announcement.subjectName}
                                                </span>
                                                {/* Due date */}
                                                {dueStatus && (
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${dueStatus.color === 'red' ? 'bg-red-900/20 border-red-500/30 text-red-400' :
                                                        dueStatus.color === 'orange' ? 'bg-orange-900/20 border-orange-500/30 text-orange-400' :
                                                            dueStatus.color === 'yellow' ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400' :
                                                                'bg-green-900/20 border-green-500/30 text-green-400'
                                                        }`}>
                                                        {dueStatus.text}
                                                    </span>
                                                )}
                                                {/* Time */}
                                                <span className="text-xs text-[var(--text-dim)]">
                                                    {getTimeAgo(announcement.createdAt)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Delete button */}
                                        <button
                                            onClick={() => handleDelete(announcement._id)}
                                            className="flex-shrink-0 p-1.5 rounded-full hover:bg-red-900/20 text-[var(--text-dim)] hover:text-red-400 transition"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>
        </>
    );
}
