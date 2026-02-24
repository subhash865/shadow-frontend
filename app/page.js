'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Calendar, Shield,
    GraduationCap, School, ChevronRight,
    ArrowRight
} from 'lucide-react';
import Navbar from './components/Navbar';
import api from '@/utils/api';
import { useNotification } from './components/Notification';



export default function Home() {
    const router = useRouter();
    const notify = useNotification();
    const [className, setClassName] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [loading, setLoading] = useState(false);

    const [sessionChecked, setSessionChecked] = useState(false);
    const [activeTab, setActiveTab] = useState('student');



    useEffect(() => {
        const adminClassId = localStorage.getItem('adminClassId');
        const adminToken = localStorage.getItem('token');
        const studentClassId = localStorage.getItem('studentClassId');
        const studentRoll = localStorage.getItem('studentRoll');
        const studentClassName = localStorage.getItem('studentClassName');
        const studentToken = localStorage.getItem('studentToken');

        // Auto-redirect: Admin with valid token
        if (adminClassId && adminToken) {
            api.post('/class/verify-token')
                .then(res => {
                    // Token is valid — renew and redirect
                    localStorage.setItem('token', res.data.token);
                    localStorage.setItem('adminClassId', res.data.classId);
                    router.push('/admin/attention');
                })
                .catch(() => {
                    localStorage.removeItem('adminClassId');
                    localStorage.removeItem('token');
                    setSessionChecked(true);
                });
            return; // Don't check student — admin takes priority
        }

        // Auto-redirect: Returning student
        if (studentClassId && studentRoll) {
            const ensureToken = studentToken
                ? Promise.resolve()
                : (studentClassName
                    ? api.post('/student/access', { className: studentClassName, rollNumber: studentRoll })
                        .then((accessRes) => {
                            localStorage.setItem('studentToken', accessRes.data.token);
                        })
                    : Promise.reject(new Error('Missing student session data')));

            ensureToken
                .then(() => api.get(`/class/${studentClassId}`))
                .then(() => {
                    // Class still exists — redirect to student dashboard
                    router.push(`/student/${studentClassId}/${studentRoll}/attention`);
                })
                .catch(() => {
                    localStorage.removeItem('studentClassId');
                    localStorage.removeItem('studentRoll');
                    localStorage.removeItem('studentClassName');
                    localStorage.removeItem('studentToken');
                    setSessionChecked(true);
                });
            return;
        }

        // No saved session — show landing page
        setSessionChecked(true);


    }, []);

    const handleStudentLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/student/access', {
                className: className.trim(),
                rollNumber: String(rollNumber).trim()
            });

            const classId = res.data.classId;
            const normalizedRollNumber = res.data.rollNumber;
            localStorage.setItem('studentClassId', classId);
            localStorage.setItem('studentRoll', normalizedRollNumber);
            localStorage.setItem('studentClassName', res.data.className || className.trim());
            localStorage.setItem('studentToken', res.data.token);
            router.push(`/student/${classId}/${normalizedRollNumber}/attention`);
        } catch (err) {
            notify({ message: err.response?.data?.error || "Class or roll number not found.", type: 'error' });
            setLoading(false);
        }
    };



    if (!sessionChecked) {
        return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading...</div>;
    }

    return (
        <>
            <Navbar />

            {/* ═══════════ HERO ═══════════ */}
            <section className="relative overflow-hidden">
                {/* Gradient orbs */}
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-yellow-500/4 rounded-full blur-[120px] pointer-events-none"></div>
                {/* Centered yellow glow behind headline */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-yellow-400/6 rounded-full blur-[150px] pointer-events-none"></div>

                <div className="max-w-5xl mx-auto px-4 pt-16 pb-12 relative">
                    <div className="text-center">
                        {/* Badge */}


                        {/* Headline */}
                        <h1 className="animate-fade-up delay-100 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]"
                            style={{ letterSpacing: '-0.04em' }}>
                            <span className="bg-gradient-to-b from-white via-white to-gray-400 bg-clip-text text-transparent">
                                Track attendance smartly,
                            </span>
                            <br />
                            <span className="relative inline-block">
                                <span className="absolute -inset-x-16 -inset-y-8 bg-yellow-400/20 blur-[50px] rounded-full pointer-events-none"></span>
                                <span className="relative bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-300 bg-clip-text text-transparent">
                                    plan your days wisely.
                                </span>
                            </span>
                        </h1>

                        {/* Subhead */}



                    </div>
                </div>
            </section>

            {/* ═══════════ LOGIN SECTION ═══════════ */}
            <section className="max-w-md mx-auto px-4 mb-20">
                {/* Tab switcher */}
                <div className="flex mb-6 bg-white/3 rounded-full p-1 border border-white/6">
                    <button
                        onClick={() => setActiveTab('student')}
                        className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === 'student'
                            ? 'bg-white text-black shadow-lg'
                            : 'text-[var(--text-dim)] hover:text-white'
                            }`}
                    >
                        Student
                    </button>
                    <button
                        onClick={() => setActiveTab('admin')}
                        className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === 'admin'
                            ? 'bg-white text-black shadow-lg'
                            : 'text-[var(--text-dim)] hover:text-white'
                            }`}
                    >
                        Admin
                    </button>
                </div>

                {/* Student form */}
                {activeTab === 'student' && (
                    <div className="animate-fade-in">
                        <form onSubmit={handleStudentLogin} className="glass-card">
                            <div className="flex items-center gap-2 mb-5">
                                <GraduationCap className="w-5 h-5 text-emerald-400" />
                                <h2 className="text-sm font-semibold uppercase tracking-wider">Student Access</h2>
                            </div>

                            <input
                                id="student-class-name"
                                type="text"
                                className="input mb-3"
                                placeholder="Class Name (e.g. S6 CSE-B)"
                                value={className}
                                onChange={(e) => setClassName(e.target.value)}
                                required
                            />

                            <input
                                id="student-roll-number"
                                type="text"
                                className="input mb-5"
                                placeholder="Roll Number"
                                value={rollNumber}
                                onChange={(e) => setRollNumber(e.target.value)}
                                required
                            />

                            <button id="student-login-btn" type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
                                        Loading...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        View My Attendance
                                        <ArrowRight className="w-4 h-4" />
                                    </span>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {/* Admin form */}
                {activeTab === 'admin' && (
                    <div className="animate-fade-in">
                        <div className="glass-card">
                            <div className="flex items-center gap-2 mb-5">
                                <Shield className="w-5 h-5 text-blue-400" />
                                <h2 className="text-sm font-semibold uppercase tracking-wider">Admin Access</h2>
                            </div>

                            <div className="space-y-3">
                                <button
                                    id="admin-login-btn"
                                    onClick={() => router.push('/admin/login')}
                                    className="w-full py-3.5 px-5 rounded-xl border border-blue-500/20 bg-blue-950/20 hover:bg-blue-950/40 transition-all flex items-center justify-between group"
                                >
                                    <div className="text-left">
                                        <p className="text-sm font-semibold">Login to Existing Class</p>
                                        <p className="text-xs text-[var(--text-dim)]">Use your class name & admin PIN</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
                                </button>

                                <button
                                    id="admin-setup-btn"
                                    onClick={() => router.push('/admin/create')}
                                    className="w-full py-3.5 px-5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all flex items-center justify-between group"
                                >
                                    <div className="text-left">
                                        <p className="text-sm font-semibold">Create New Class</p>
                                        <p className="text-xs text-[var(--text-dim)]">Set up a class as representative</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </section>



            {/* ═══════════ FOOTER ═══════════ */}
            <footer className="border-t border-white/5 py-8">
                <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
                            <span className="text-xs font-bold">S</span>
                        </div>
                        <span className="text-sm font-semibold">Shadow</span>
                    </div>
                    <p className="text-xs text-[var(--text-dim)]">
                        Built for students, by students. Track smarter, not harder.
                    </p>
                </div>
            </footer>
        </>
    );
}
