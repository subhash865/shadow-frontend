"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Calendar, Save, X, BookOpen, Settings2, Edit2 } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';

console.log('🚀 Timetable Editor - CODE UPDATED v2');

export default function TimetableEditor() {
    const router = useRouter();
    const notify = useNotification();
    const [loading, setLoading] = useState(true);
    const [classId, setClassId] = useState(null);

    // Data States
    const [subjects, setSubjects] = useState([]);
    const [timetable, setTimetable] = useState({
        Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: []
    });

    // UI States
    const [isManageMode, setIsManageMode] = useState(false); // For deleting subjects
    const [newSubjectName, setNewSubjectName] = useState('');

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
            .catch(() => notify({ message: "Failed to load class data", type: 'error' }));
    }, [router, notify]);

    // --- Subject Handlers ---

    const addNewSubject = async (e) => {
        e.preventDefault();
        if (!newSubjectName.trim()) return;

        try {
            const res = await api.post(`/class/${classId}/add-subject`, { name: newSubjectName });
            setSubjects([...subjects, res.data.subject]);
            setNewSubjectName('');
            notify({ message: 'Subject added', type: 'success' });
        } catch (err) {
            notify({ message: 'Failed to add subject', type: 'error' });
        }
    };

    const deleteSubject = async (subjectId) => {
        if (!confirm("Delete this subject? It will be removed from the timetable too.")) return;

        try {
            // Note: Ensure your backend supports this endpoint, otherwise this UI won't work
            await api.delete(`/class/${classId}/delete-subject/${subjectId}`);
            setSubjects(subjects.filter(s => s._id !== subjectId));

            // Optional: Clean up timetable
            // This is a UI-only cleanup, backend should handle the logic or you save timetable after
            notify({ message: 'Subject deleted', type: 'success' });
        } catch (err) {
            notify({ message: 'Failed to delete (Check backend routes)', type: 'error' });
        }
    };

    // --- Timetable Handlers ---

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
            const otherPeriods = daySchedule.filter(p => p.period !== periodNum);
            const updatedSchedule = [...otherPeriods, { period: periodNum, subjectId }]
                .sort((a, b) => a.period - b.period);

            return { ...prev, [day]: updatedSchedule };
        });
    };

    const saveTimetable = async () => {
        // Debug logging
        console.log('🔍 Saving timetable...');
        console.log('📋 ClassId:', classId);
        console.log('🔑 Token exists:', !!localStorage.getItem('token'));
        console.log('📅 Timetable data:', timetable);

        try {
            await api.put('/class/update-timetable', { classId, timetable });
            notify({ message: "Timetable Saved Successfully! 💾", type: 'success' });
            router.push('/admin/dashboard');
        } catch (err) {
            console.error('❌ Save failed:', err.response?.data || err.message);
            console.error('📊 Full error:', err);
            const errorMsg = err.response?.data?.error || "Failed to save. Check console for details.";
            notify({ message: errorMsg, type: 'error' });
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-[var(--text-dim)]">Loading Editor...</div>;

    return (
        <>
            <Navbar isAdmin={true} />

            <div className="max-w-6xl mx-auto px-4 py-8 pb-24">

                {/* --- Header --- */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Calendar className="w-8 h-8 text-white" />
                            Timetable Editor
                        </h1>
                        <p className="text-[var(--text-dim)] mt-1">Configure your weekly class schedule</p>
                    </div>
                </div>

                {/* --- Subject Manager (Cleaner UI) --- */}
                <div className="bg-[#0A0A0A] border border-[var(--border)] rounded-xl p-5 mb-8 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-white uppercase tracking-wider">
                            <BookOpen className="w-4 h-4" />
                            <span>Your Subjects</span>
                        </div>

                        <button
                            onClick={async () => {
                                if (isManageMode) {
                                    // Save all changes
                                    try {
                                        for (const sub of subjects) {
                                            await api.put(`/class/${classId}/edit-subject/${sub._id}`, { name: sub.name });
                                        }
                                        notify({ message: 'Subjects saved!', type: 'success' });
                                        setIsManageMode(false);
                                    } catch (err) {
                                        notify({ message: 'Failed to save subjects', type: 'error' });
                                    }
                                } else {
                                    setIsManageMode(true);
                                }
                            }}
                            className={`px-4 py-2 rounded-full font-medium transition text-sm flex items-center gap-2 ${isManageMode
                                ? 'bg-orange-600 text-white hover:bg-orange-700'
                                : 'bg-[var(--card-bg)] border border-[var(--border)] hover:border-white/50'
                                }`}
                        >
                            <Edit2 className="w-4 h-4" />
                            {isManageMode ? 'Done' : 'Edit'}
                        </button>
                    </div>

                    {/* Subjects displayed vertically (full width) */}
                    <div className="space-y-2">
                        {subjects.map(sub => (
                            <div
                                key={sub._id}
                                className={`flex items-center justify-between px-4 py-3 rounded-full text-sm font-medium transition ${isManageMode
                                    ? 'bg-blue-900/20 text-blue-400 border border-blue-500/30'
                                    : 'bg-[#1a1a1a] text-gray-300 border border-white/5'
                                    }`}
                            >
                                {isManageMode ? (
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
                                ) : (
                                    <span>{sub.name}</span>
                                )}

                                {isManageMode && (
                                    <button
                                        onClick={() => deleteSubject(sub._id)}
                                        className="p-1 hover:bg-red-500/20 rounded-full text-red-400 transition"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}

                        {/* Add button at bottom */}
                        {!isManageMode && (
                            <form onSubmit={addNewSubject} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newSubjectName}
                                    onChange={(e) => setNewSubjectName(e.target.value)}
                                    placeholder="New Subject Name"
                                    className="flex-1 px-4 py-3 bg-black border border-green-500 text-white rounded-full text-sm outline-none focus:border-green-400"
                                />
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-green-600 text-white rounded-full text-sm font-medium hover:bg-green-700 transition flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* --- Weekly Grid Layout --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {DAYS.map(day => {
                        const daySchedule = timetable[day] || [];

                        return (
                            <div key={day} className="flex flex-col bg-[#0A0A0A] border border-[var(--border)] rounded-xl overflow-hidden h-full">

                                {/* Day Header */}
                                <div className="px-5 py-4 border-b border-[var(--border)] bg-white/5 flex justify-between items-center">
                                    <h3 className="font-semibold text-lg text-white">{day}</h3>
                                    <button
                                        onClick={() => addPeriod(day)}
                                        className="text-xs bg-white text-black px-2 py-1 rounded hover:bg-gray-200 transition font-medium flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Add
                                    </button>
                                </div>

                                {/* Periods List */}
                                <div className="p-4 flex-1 space-y-3">
                                    {daySchedule.length === 0 ? (
                                        <div className="h-24 flex items-center justify-center text-[var(--text-dim)] text-sm italic border border-dashed border-[var(--border)] rounded-lg">
                                            No classes
                                        </div>
                                    ) : (
                                        daySchedule
                                            .sort((a, b) => a.period - b.period)
                                            .map((slot) => (
                                                <div key={slot.period} className="flex items-center gap-3 animate-fade-in group">

                                                    {/* Period Badge */}
                                                    <div className="w-8 h-8 flex items-center justify-center rounded bg-[#1a1a1a] border border-[var(--border)] text-xs font-bold text-[var(--text-dim)]">
                                                        {slot.period}
                                                    </div>

                                                    {/* Custom Select Dropdown */}
                                                    <div className="relative flex-1">
                                                        <select
                                                            className="w-full appearance-none bg-[#111] text-sm text-white border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-gray-500 cursor-pointer transition hover:bg-[#161616]"
                                                            value={slot.subjectId || ""}
                                                            onChange={(e) => updatePeriod(day, slot.period, e.target.value)}
                                                        >
                                                            <option value="" className="text-gray-500">Select Subject...</option>
                                                            {subjects.map(sub => (
                                                                <option key={sub._id} value={sub._id}>{sub.name}</option>
                                                            ))}
                                                        </select>
                                                        {/* Custom Arrow Icon */}
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-dim)]">
                                                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </div>
                                                    </div>

                                                    {/* Delete Button (Visible on Hover/Focus) */}
                                                    <button
                                                        onClick={() => removePeriod(day, slot.period)}
                                                        className="text-[var(--text-dim)] hover:text-red-400 p-2 rounded transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                        title="Remove Period"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* --- Sticky Footer Action --- */}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
                    <button
                        onClick={saveTimetable}
                        className="bg-white text-black px-8 py-3 rounded-full font-bold shadow-2xl hover:bg-gray-200 transition-transform active:scale-95 flex items-center gap-2 border border-gray-400"
                    >
                        <Save className="w-5 h-5" />
                        Save All Changes
                    </button>
                </div>

            </div>
        </>
    );
}