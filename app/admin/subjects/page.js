"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Trash2, Plus, BookOpen, X, Check } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';

export default function SubjectManager() {
    const router = useRouter();
    const notify = useNotification();
    const [loading, setLoading] = useState(true);
    const [classId, setClassId] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        const storedId = localStorage.getItem('adminClassId');
        if (!storedId) {
            router.push('/admin/login');
            return;
        }
        setClassId(storedId);

        api.get(`/class/${storedId}`)
            .then(res => {
                setSubjects(res.data.subjects || []);
                setLoading(false);
            })
            .catch(() => {
                notify({ message: "Failed to load subjects", type: 'error' });
                setLoading(false);
            });
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('adminClassId');
        localStorage.removeItem('token');
        router.push('/');
    };

    const addSubject = async () => {
        const name = newSubjectName.trim();
        if (!name) {
            notify({ message: 'Please enter a subject name', type: 'error' });
            return;
        }
        setIsAdding(true);

        try {
            const res = await api.post(`/class/${classId}/add-subject`, { name });
            // Refresh full list from server to ensure consistency
            const refresh = await api.get(`/class/${classId}`);
            setSubjects(refresh.data.subjects || []);
            setNewSubjectName('');
            notify({ message: `"${name}" added successfully!`, type: 'success' });
        } catch (err) {
            console.error('Add subject error:', err);
            notify({ message: err.response?.data?.error || 'Failed to add subject', type: 'error' });
        } finally {
            setIsAdding(false);
        }
    };

    const deleteSubject = async (subjectId) => {
        if (!confirm('Are you sure you want to delete this subject?')) return;

        try {
            await api.delete(`/class/${classId}/delete-subject/${subjectId}`);
            setSubjects(subjects.filter(s => s._id !== subjectId));
            notify({ message: 'Subject deleted!', type: 'success' });
        } catch (err) {
            notify({ message: err.response?.data?.error || 'Failed to delete subject', type: 'error' });
        }
    };

    const startEdit = (subject) => {
        setEditingId(subject._id);
        setEditName(subject.name);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
    };

    const saveEdit = async (subjectId) => {
        if (!editName.trim()) return;

        try {
            const res = await api.put(`/class/${classId}/edit-subject/${subjectId}`, { name: editName });
            setSubjects(subjects.map(s => s._id === subjectId ? { ...s, name: editName } : s));
            setEditingId(null);
            setEditName('');
            notify({ message: 'Subject updated!', type: 'success' });
        } catch (err) {
            notify({ message: 'Failed to update subject', type: 'error' });
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading...</div>;

    return (
        <>
            <Navbar isAdmin={true} onLogout={handleLogout} />

            <div className="max-w-2xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="mb-8 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold mb-1">Manage Subjects</h1>
                        <p className="text-[var(--text-dim)] text-sm">Add or remove subjects for your class</p>
                    </div>
                </div>

                {/* Add New Subject */}
                <div className="card mb-8">
                    <h2 className="text-sm font-semibold uppercase text-[var(--text-dim)] mb-4">Add New Subject</h2>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newSubjectName}
                            onChange={(e) => setNewSubjectName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addSubject();
                                }
                            }}
                            placeholder="Data Structures, Mathematics, etc."
                            className="input flex-1"
                            disabled={isAdding}
                        />
                        <button
                            type="button"
                            onClick={() => addSubject()}
                            disabled={isAdding}
                            style={{
                                padding: '0.625rem 1.5rem',
                                borderRadius: '9999px',
                                background: 'white',
                                color: 'black',
                                border: '1px solid white',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                cursor: isAdding ? 'not-allowed' : 'pointer',
                                opacity: isAdding ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                flexShrink: 0,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {isAdding ? (
                                <span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid black', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }}></span>
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            {isAdding ? 'Adding...' : 'Add'}
                        </button>
                    </div>
                </div>

                {/* Subject List */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold uppercase text-[var(--text-dim)] mb-2">
                        Your Subjects ({subjects.length})
                    </h2>

                    {subjects.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-xl">
                            <p className="text-4xl mb-3 opacity-50">📚</p>
                            <p className="text-[var(--text-dim)]">No subjects added yet.</p>
                            <p className="text-xs text-[var(--text-dim)] mt-1">Add your first subject above to get started.</p>
                        </div>
                    ) : (
                        subjects.map(subject => (
                            <div key={subject._id} className="card flex items-center justify-between">
                                {editingId === subject._id ? (
                                    <div className="flex gap-2 w-full">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(subject._id)}
                                            className="input flex-1"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => saveEdit(subject._id)}
                                            className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={cancelEdit}
                                            className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="font-medium">{subject.name}</span>
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() => startEdit(subject)}
                                                className="p-2 text-[var(--text-dim)] hover:text-white hover:bg-white/10 rounded-lg transition"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteSubject(subject._id)}
                                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>

            </div>
        </>
    );
}