"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Check, X, Plus, Calendar, Save } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';

export default function TimetableEditor() {
    const router = useRouter();
    const notify = useNotification();
    const [loading, setLoading] = useState(true);
    const [classId, setClassId] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [editingSubject, setEditingSubject] = useState(null);
    const [editSubjectName, setEditSubjectName] = useState('');

    const [timetable, setTimetable] = useState({
        Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: []
    });

    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    useEffect(() => {
        const storedId = localStorage.getItem('adminClassId');
        if (!storedId) {
            router.push('/admin/login');
            return;
        }
        setClassId(storedId);

        api.get(`/class/${storedId}`)
            .then(res => {
                setSubjects(res.data.subjects);
                if (res.data.timetable && Object.keys(res.data.timetable).length > 0) {
                    setTimetable(res.data.timetable);
                }
                setLoading(false);
            })
            .catch(err => notify({ message: "Failed to load class data", type: 'error' }));
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('adminClassId');
        localStorage.removeItem('token');
        router.push('/');
    };

    const addNewSubject = async () => {
        if (!editSubjectName.trim()) return;

        try {
            const res = await api.post(`/class/${classId}/add-subject`, { name: editSubjectName });
            setSubjects([...subjects, res.data.subject]);
            setEditSubjectName('');
            setEditingSubject(null);
            notify({ message: 'Subject added!', type: 'success' });
        } catch (err) {
            notify({ message: 'Failed to add subject', type: 'error' });
        }
    };

    const updateSubject = async (subjectId) => {
        if (!editSubjectName.trim()) return;

        try {
            const res = await api.put(`/class/${classId}/edit-subject/${subjectId}`, { name: editSubjectName });
            setSubjects(subjects.map(s => s._id === subjectId ? res.data.subject : s));
            setEditingSubject(null);
            setEditSubjectName('');
            notify({ message: 'Subject updated!', type: 'success' });
        } catch (err) {
            notify({ message: 'Failed to update subject', type: 'error' });
        }
    };

    const startEditSubject = (subject) => {
        setEditingSubject(subject._id);
        setEditSubjectName(subject.name);
    };

    const startAddSubject = () => {
        setEditingSubject('new');
        setEditSubjectName('');
    };

    const cancelEdit = () => {
        setEditingSubject(null);
        setEditSubjectName('');
    };

    const addPeriod = (day) => {
        const nextPeriodNum = (timetable[day] || []).length > 0
            ? Math.max(...timetable[day].map(p => p.period)) + 1
            : 1;
        setTimetable(prev => ({
            ...prev,
            [day]: [...(prev[day] || []), { period: nextPeriodNum, subjectId: "" }]
        }));
    };

    const removePeriod = (day, periodNum) => {
        setTimetable(prev => ({
            ...prev,
            [day]: (prev[day] || []).filter(p => p.period !== periodNum)
        }));
    };

    const updatePeriod = (day, periodNum, subjectId) => {
        setTimetable(prev => {
            const daySchedule = prev[day] || [];
            const filtered = daySchedule.filter(p => p.period !== periodNum);
            if (!subjectId) {
                return { ...prev, [day]: filtered };
            }
            return {
                ...prev,
                [day]: [...filtered, { period: periodNum, subjectId }].sort((a, b) => a.period - b.period)
            };
        });
    };

    const saveTimetable = async () => {
        try {
            await api.put('/class/update-timetable', { classId, timetable });
            notify({ message: "Timetable Saved!", type: 'success' });
            router.push('/admin/dashboard');
        } catch (err) {
            const errorMsg = err.response?.data?.error || "Failed to save. Please try again.";
            notify({ message: errorMsg, type: 'error' });
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading...</div>;

    return (
        <>
            <Navbar isAdmin={true} onLogout={handleLogout} />

            <div className="max-w-4xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="mb-6 flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-white" />
                    <div>
                        <h1 className="text-2xl font-bold mb-1">Edit Weekly Timetable</h1>
                        <p className="text-[var(--text-dim)]">Set your default weekly schedule</p>
                    </div>
                </div>

                {/* Subjects Section with Edit Mode */}
                <div className="card mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-sm uppercase text-white">Your Subjects</h2>
                        <button
                            onClick={async () => {
                                if (editingSubject === 'edit-mode') {
                                    // Save all changes when clicking Done
                                    try {
                                        for (const sub of subjects) {
                                            await api.put(`/class/${classId}/edit-subject/${sub._id}`, { name: sub.name });
                                        }
                                        notify({ message: 'Subjects saved!', type: 'success' });
                                        setEditingSubject(null);
                                    } catch (err) {
                                        notify({ message: 'Failed to save subjects', type: 'error' });
                                    }
                                } else {
                                    setEditingSubject('edit-mode');
                                }
                            }}
                            className={`px-4 py-2 rounded-full font-medium transition text-sm flex items-center gap-2 ${editingSubject === 'edit-mode'
                                ? 'bg-orange-600 text-white hover:bg-orange-700'
                                : 'bg-[var(--card-bg)] border border-[var(--border)] hover:border-white/50'
                                }`}
                        >
                            <Edit2 className="w-4 h-4" />
                            {editingSubject === 'edit-mode' ? 'Done' : 'Edit'}
                        </button>
                    </div>

                    {/* Subjects displayed vertically (full width) */}
                    <div className="space-y-2">
                        {subjects.length === 0 ? (
                            <p className="text-[var(--text-dim)] text-sm">No subjects yet.</p>
                        ) : (
                            subjects.map(sub => (
                                <div
                                    key={sub._id}
                                    className={`flex items-center justify-between px-4 py-3 rounded-full text-sm font-medium transition ${editingSubject === 'edit-mode'
                                        ? 'bg-blue-900/20 text-blue-400 border border-blue-500/30'
                                        : 'bg-[#1a1a1a] text-gray-300 border border-white/5'
                                        }`}
                                >
                                    {editingSubject === 'edit-mode' ? (
                                        <>
                                            <input
                                                type="text"
                                                value={sub.name}
                                                onChange={(e) => {
                                                    const newName = e.target.value;
                                                    setSubjects(subjects.map(s =>
                                                        s._id === sub._id ? { ...s, name: newName } : s
                                                    ));
                                                }}
                                                className="bg-transparent border-none outline-none text-blue-400 flex-1"
                                                placeholder="Subject name"
                                            />
                                            <button
                                                onClick={async () => {
                                                    if (subjects.length === 1) {
                                                        notify({ message: "You need at least one subject!", type: 'error' });
                                                        return;
                                                    }
                                                    try {
                                                        await api.delete(`/class/${classId}/delete-subject/${sub._id}`);
                                                        setSubjects(subjects.filter(s => s._id !== sub._id));
                                                        notify({ message: 'Subject deleted!', type: 'success' });
                                                    } catch (err) {
                                                        notify({ message: 'Failed to delete subject', type: 'error' });
                                                    }
                                                }}
                                                className="text-red-400 hover:text-red-300 transition p-1 hover:bg-red-500/20 rounded-full"
                                                title="Delete subject"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <span>{sub.name}</span>
                                    )}
                                </div>
                            ))
                        )}

                        {/* Add button at bottom when NOT in edit mode */}
                        {!editingSubject && editingSubject !== 'new' && (
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="text"
                                    value={editSubjectName}
                                    onChange={(e) => setEditSubjectName(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (!editSubjectName.trim()) return;
                                            addNewSubject();
                                        }
                                    }}
                                    className="flex-1 px-4 py-3 bg-black border border-green-500 text-white rounded-full text-sm outline-none focus:border-green-400"
                                    placeholder="New Subject Name"
                                />
                                <button
                                    onClick={addNewSubject}
                                    className="px-6 py-3 bg-green-600 text-white rounded-full text-sm font-medium hover:bg-green-700 transition flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Weekly Timetable */}
                <div className="space-y-4 mb-6">
                    {DAYS.map(day => {
                        const daySchedule = timetable[day] || [];

                        return (
                            <div key={day} className="card">
                                <div className="flex justify-between items-center mb-4 pb-3 border-b border-[var(--border)]">
                                    <h2 className="text-lg font-semibold">{day}</h2>
                                    <span className="text-xs px-2 py-1 bg-[var(--card-bg)] border border-[var(--border)] rounded">
                                        {daySchedule.length} {daySchedule.length === 1 ? 'period' : 'periods'}
                                    </span>
                                </div>

                                <div className="space-y-2 mb-3">
                                    {daySchedule.length === 0 ? (
                                        <div className="text-center py-6 text-[var(--text-dim)] text-sm">
                                            No classes scheduled. Click "Add Period" below.
                                        </div>
                                    ) : (
                                        daySchedule
                                            .sort((a, b) => a.period - b.period)
                                            .map((slot) => (
                                                <div key={slot.period} className="flex items-center gap-2">
                                                    <span className="w-12 font-bold text-[var(--text-dim)] text-sm">P{slot.period}</span>
                                                    <select
                                                        className="input flex-1"
                                                        value={slot.subjectId || ""}
                                                        onChange={(e) => updatePeriod(day, slot.period, e.target.value)}
                                                    >
                                                        <option value="">-- Select Subject --</option>
                                                        {subjects.map(sub => (
                                                            <option key={sub._id} value={sub._id}>{sub.name}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => removePeriod(day, slot.period)}
                                                        className="px-3 py-2 bg-red-900/20 text-red-400 rounded-full text-xs hover:bg-red-900/30 transition flex items-center"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))
                                    )}
                                </div>

                                <button
                                    onClick={() => addPeriod(day)}
                                    className="w-full py-2 bg-[var(--card-bg)] border border-dashed border-[var(--border)] rounded-full text-sm hover:border-white/50 transition flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Period
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Save Button */}
                <button
                    onClick={saveTimetable}
                    className="btn btn-primary sticky bottom-4 flex items-center justify-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    Save Timetable
                </button>

            </div>
        </>
    );
}