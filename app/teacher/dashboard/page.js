"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';
import { BookOpen, AlertCircle, FileText, Check, X } from 'lucide-react';

export default function TeacherDashboard() {
    const router = useRouter();
    const notify = useNotification();
    const [loading, setLoading] = useState(true);
    const [teacher, setTeacher] = useState(null);
    const [requests, setRequests] = useState([]);
    const [activeTab, setActiveTab] = useState('classes');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    router.push('/teacher/login');
                    return;
                }

                const res = await api.get('/teacher/dashboard');
                console.log("Teacher Data:", res.data);
                console.log("Assigned Classes:", res.data.assignedClasses);
                setTeacher(res.data);

                const reqRes = await api.get('/teacher/requests');
                setRequests(reqRes.data);

                setLoading(false);
            } catch (err) {
                console.error(err);
                notify({ message: 'Failed to load dashboard', type: 'error' });
                // If unauthorized, redirect
                if (err.response?.status === 401 || err.response?.status === 403) {
                    router.push('/teacher/login');
                }
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [router, notify]);

    const handleRequestAction = async (requestId, status) => {
        try {
            await api.post(`/teacher/requests/${requestId}`, { status });
            notify({ message: `Request ${status}`, type: 'success' });

            // Remove from list or refresh
            setRequests(requests.filter(r => r._id !== requestId));
        } catch (err) {
            console.error(err);
            notify({ message: 'Action failed', type: 'error' });
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading...</div>;
    if (!teacher) return null;

    return (
        <>
            <Navbar isTeacher={true} onLogout={() => {
                localStorage.removeItem('token');
                router.push('/');
            }} />

            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
                        <p className="text-[var(--text-dim)]">Welcome back, {teacher.name}</p>
                    </div>
                    <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-center">
                        <p className="text-xs text-[var(--text-dim)] uppercase tracking-wider">Your Code</p>
                        <p className="text-xl font-mono font-bold text-blue-400">{teacher.teacherCode}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 mb-8">
                    <button
                        onClick={() => setActiveTab('classes')}
                        className={`px-6 py-3 text-sm font-medium transition ${activeTab === 'classes'
                            ? 'text-white border-b-2 border-blue-500'
                            : 'text-[var(--text-dim)] hover:text-white'
                            }`}
                    >
                        My Classes
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`px-6 py-3 text-sm font-medium transition flex items-center gap-2 ${activeTab === 'requests'
                            ? 'text-white border-b-2 border-blue-500'
                            : 'text-[var(--text-dim)] hover:text-white'
                            }`}
                    >
                        Modification Requests
                        {requests.length > 0 && (
                            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                                {requests.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'classes' ? (
                    <div className="space-y-8">
                        {/* Pending Invitations */}
                        {teacher.assignedClasses.filter(c => c.status === 'Pending').length > 0 && (
                            <div>
                                <h3 className="text-xl font-bold mb-4 text-orange-400 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5" /> Pending Invitations
                                </h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                    {teacher.assignedClasses.filter(c => c.status === 'Pending').map((item, idx) => (
                                        <div key={idx} className="card border-orange-500/30 bg-orange-900/10">
                                            <div className="flex flex-col gap-2">
                                                <h3 className="text-lg font-bold">
                                                    {item.classId?.className || "Unknown Class"}
                                                </h3>
                                                <p className="text-[var(--text-dim)] flex items-center gap-2">
                                                    <BookOpen className="w-4 h-4" />
                                                    {item.subjectName}
                                                </p>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await api.post('/teacher/accept-class', {
                                                                classId: item.classId._id,
                                                                subjectId: item.subjectId
                                                            });
                                                            notify({ message: 'Class Accepted!', type: 'success' });
                                                            // Refresh dashboard
                                                            window.location.reload();
                                                        } catch (err) {
                                                            notify({ message: 'Failed to accept', type: 'error' });
                                                        }
                                                    }}
                                                    className="btn btn-primary mt-2"
                                                >
                                                    Accept Class
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Active Classes */}
                        <div>
                            <h3 className="text-xl font-bold mb-4">Your Classes</h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                {teacher.assignedClasses.filter(c => c.status === 'Accepted').length === 0 ? (
                                    <p className="text-[var(--text-dim)]">No active classes. Accept pending invitations to get started.</p>
                                ) : (
                                    teacher.assignedClasses.filter(c => c.status === 'Accepted').map((item, idx) => (
                                        <div key={idx} className="card hover:border-white/30 transition">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-xl font-bold mb-1">
                                                        {item.classId?.className || "Unknown Class"}
                                                    </h3>
                                                    <p className="text-[var(--text-dim)] flex items-center gap-2">
                                                        <BookOpen className="w-4 h-4" />
                                                        {item.subjectName}
                                                    </p>
                                                </div>
                                                <div className="px-2 py-1 bg-green-900/20 text-green-400 text-xs rounded border border-green-500/20">
                                                    Active
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {requests.length === 0 ? (
                            <div className="text-center py-12 text-[var(--text-dim)]">
                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>No pending requests.</p>
                            </div>
                        ) : (
                            requests.map((req) => (
                                <div key={req._id} className="card flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold">{req.classId?.className}</span>
                                            <span className="text-sm px-2 py-0.5 rounded bg-white/10 text-[var(--text-dim)]">
                                                Roll No: {req.studentId}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-dim)] mb-1">
                                            Requested correction for date: <span className="text-white">{new Date(req.date).toLocaleDateString()}</span>
                                        </p>
                                        {req.reason && (
                                            <p className="text-sm text-[var(--text-dim)] bg-white/5 p-2 rounded mt-2">
                                                "{req.reason}"
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRequestAction(req._id, 'Approved')}
                                            className="btn px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 flex items-center gap-2"
                                        >
                                            <Check className="w-4 h-4" /> Approve
                                        </button>
                                        <button
                                            onClick={() => handleRequestAction(req._id, 'Rejected')}
                                            className="btn px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center gap-2"
                                        >
                                            <X className="w-4 h-4" /> Reject
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
