"use client";
import { useState, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';
import { UserPlus, Mail, BookOpen, Copy, Check } from 'lucide-react';

export default function ManageTeachers() {
    const notify = useNotification();
    const [subjects, setSubjects] = useState([]);
    const [formData, setFormData] = useState({ name: '', email: '', subjectId: '' });
    const [loading, setLoading] = useState(false);
    const [createdTeacher, setCreatedTeacher] = useState(null);
    const [classId, setClassId] = useState(null);

    useEffect(() => {
        const storedClassId = localStorage.getItem('adminClassId');
        if (storedClassId) {
            setClassId(storedClassId);
            fetchClassDetails(storedClassId);
        }
    }, []);

    const fetchClassDetails = async (id) => {
        try {
            const res = await api.get(`/class/${id}`);
            setSubjects(res.data.subjects || []);
            if (res.data.subjects?.length > 0) {
                setFormData(prev => ({ ...prev, subjectId: res.data.subjects[0]._id }));
            }
        } catch (err) {
            console.error("Failed to load class data");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setCreatedTeacher(null);

        try {
            const res = await api.post('/class/create-teacher', formData);
            setCreatedTeacher(res.data.teacher);
            notify({ message: "Teacher Assigned Successfully!", type: 'success' });
        } catch (err) {
            notify({ message: err.response?.data?.error || "Failed to assign teacher", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        notify({ message: "Copied to clipboard!", type: 'success' });
    };

    return (
        <>
            <Navbar isAdmin={true} classId={classId} />

            <div className="max-w-2xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-2">Manage Teachers</h1>
                <p className="text-[var(--text-dim)] mb-8">Assign teachers to your subjects</p>

                <div className="card mb-8">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-blue-400" />
                        Assign New Teacher
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-[var(--text-dim)] mb-1">Teacher Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="input w-full"
                                placeholder="e.g. John Doe"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--text-dim)] mb-1">Email Address</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="input w-full"
                                placeholder="teacher@school.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--text-dim)] mb-1">Assign Subject</label>
                            <select
                                value={formData.subjectId}
                                onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                                className="input w-full"
                                required
                            >
                                {subjects.map(sub => (
                                    <option key={sub._id} value={sub._id}>{sub.name}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full"
                        >
                            {loading ? "Assigning..." : "Assign Teacher"}
                        </button>
                    </form>
                </div>

                {createdTeacher && (
                    <div className="card border-green-500/30 bg-green-900/10 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-2 mb-4 text-green-400">
                            <Check className="w-5 h-5" />
                            <h3 className="font-bold">Teacher Created Successfully</h3>
                        </div>

                        <div className="space-y-3">
                            <div className="p-3 bg-white/5 rounded flex justify-between items-center group">
                                <div>
                                    <p className="text-xs text-[var(--text-dim)]">Email</p>
                                    <p className="font-mono">{createdTeacher.email}</p>
                                </div>
                                <button onClick={() => copyToClipboard(createdTeacher.email)} className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-white/10 rounded">
                                    <Copy className="w-4 h-4 text-[var(--text-dim)]" />
                                </button>
                            </div>

                            {createdTeacher.password && (
                                <div className="p-3 bg-white/5 rounded flex justify-between items-center group">
                                    <div>
                                        <p className="text-xs text-[var(--text-dim)]">Temporary Password</p>
                                        <p className="font-mono text-orange-400">{createdTeacher.password}</p>
                                    </div>
                                    <button onClick={() => copyToClipboard(createdTeacher.password)} className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-white/10 rounded">
                                        <Copy className="w-4 h-4 text-[var(--text-dim)]" />
                                    </button>
                                </div>
                            )}

                            <div className="p-3 bg-white/5 rounded flex justify-between items-center group">
                                <div>
                                    <p className="text-xs text-[var(--text-dim)]">Verification Code</p>
                                    <p className="font-mono text-blue-400">{createdTeacher.teacherCode}</p>
                                </div>
                                <button onClick={() => copyToClipboard(createdTeacher.teacherCode)} className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-white/10 rounded">
                                    <Copy className="w-4 h-4 text-[var(--text-dim)]" />
                                </button>
                            </div>
                        </div>

                        <p className="text-xs text-[var(--text-dim)] mt-4">
                            Please share these credentials with the teacher immediately.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}
