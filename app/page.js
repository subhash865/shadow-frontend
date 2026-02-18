'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Calendar, Users, TrendingUp, Bell, Shield, Clock,
    GraduationCap, School, ChevronRight, Zap, BarChart3,
    BookOpen, ArrowRight, Sparkles
} from 'lucide-react';
import Navbar from './components/Navbar';
import api from '@/utils/api';
import { useNotification } from './components/Notification';

// Animated counter hook
function useCounter(target, duration = 2000) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const started = useRef(false);

    useEffect(() => {
        if (!target || started.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !started.current) {
                    started.current = true;
                    const startTime = performance.now();
                    const animate = (now) => {
                        const elapsed = now - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        // Ease-out cubic
                        const eased = 1 - Math.pow(1 - progress, 3);
                        setCount(Math.floor(eased * target));
                        if (progress < 1) requestAnimationFrame(animate);
                    };
                    requestAnimationFrame(animate);
                }
            },
            { threshold: 0.3 }
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [target, duration]);

    return { count, ref };
}

export default function Home() {
    const router = useRouter();
    const notify = useNotification();
    const [className, setClassName] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ totalClasses: 0, totalStudents: 0 });
    const [savedAdmin, setSavedAdmin] = useState(null);
    const [savedStudent, setSavedStudent] = useState(null);
    const [activeTab, setActiveTab] = useState('student');

    const classCounter = useCounter(stats.totalClasses);
    const studentCounter = useCounter(stats.totalStudents);

    useEffect(() => {
        const adminClassId = localStorage.getItem('adminClassId');
        const adminToken = localStorage.getItem('token');
        const studentClassId = localStorage.getItem('studentClassId');
        const studentRoll = localStorage.getItem('studentRoll');

        if (adminClassId && adminToken) {
            api.get(`/class/${adminClassId}`)
                .then(res => setSavedAdmin({ classId: adminClassId, className: res.data.className }))
                .catch(() => {
                    localStorage.removeItem('adminClassId');
                    localStorage.removeItem('token');
                });
        }

        if (studentClassId && studentRoll) {
            api.get(`/class/${studentClassId}`)
                .then(res => setSavedStudent({
                    classId: studentClassId,
                    rollNumber: studentRoll,
                    className: res.data.className
                }))
                .catch(() => {
                    localStorage.removeItem('studentClassId');
                    localStorage.removeItem('studentRoll');
                    localStorage.removeItem('studentClassName');
                });
        }

        api.get('/class/stats/all')
            .then(res => setStats(res.data))
            .catch(() => { });
    }, []);

    const handleStudentLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.get(`/class/lookup/${className.trim()}`);
            const classId = res.data.classId;
            localStorage.setItem('studentClassId', classId);
            localStorage.setItem('studentRoll', rollNumber);
            localStorage.setItem('studentClassName', className.trim());
            router.push(`/student/${classId}/${rollNumber}`);
        } catch (err) {
            notify({ message: "Class not found! Check the name.", type: 'error' });
            setLoading(false);
        }
    };

    const features = [
        {
            icon: Calendar,
            title: 'Smart Calendar',
            desc: 'Navigate through months, view daily breakdowns, and spot attendance patterns at a glance.',
            color: 'blue',
            gradient: 'from-blue-500/20 to-blue-600/5',
        },
        {
            icon: TrendingUp,
            title: 'Live Analytics',
            desc: 'Real-time percentage tracking per subject with visual progress bars and color alerts.',
            color: 'emerald',
            gradient: 'from-emerald-500/20 to-emerald-600/5',
        },
        {
            icon: Zap,
            title: 'Bunk Calculator',
            desc: 'Know exactly how many classes you can skip while staying above the minimum threshold.',
            color: 'amber',
            gradient: 'from-amber-500/20 to-amber-600/5',
        },
        {
            icon: BarChart3,
            title: 'Admin Dashboard',
            desc: 'One-tap attendance marking with smart timetable auto-loading and bulk input support.',
            color: 'purple',
            gradient: 'from-purple-500/20 to-purple-600/5',
        },
        {
            icon: Bell,
            title: 'Announcements',
            desc: 'Admins can post class-wide announcements. Students get notified with a live badge counter.',
            color: 'rose',
            gradient: 'from-rose-500/20 to-rose-600/5',
        },
        {
            icon: Shield,
            title: 'Report Issues',
            desc: 'Students can flag attendance errors. Admins review, approve, or respond directly.',
            color: 'cyan',
            gradient: 'from-cyan-500/20 to-cyan-600/5',
        },
    ];

    const colorMap = {
        blue: { text: 'text-blue-400', border: 'border-blue-500/20', glow: 'bg-blue-500/10' },
        emerald: { text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'bg-emerald-500/10' },
        amber: { text: 'text-amber-400', border: 'border-amber-500/20', glow: 'bg-amber-500/10' },
        purple: { text: 'text-purple-400', border: 'border-purple-500/20', glow: 'bg-purple-500/10' },
        rose: { text: 'text-rose-400', border: 'border-rose-500/20', glow: 'bg-rose-500/10' },
        cyan: { text: 'text-cyan-400', border: 'border-cyan-500/20', glow: 'bg-cyan-500/10' },
    };

    return (
        <>
            <Navbar />

            {/* ═══════════ HERO ═══════════ */}
            <section className="relative overflow-hidden">
                {/* Gradient orbs */}
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-purple-600/6 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="max-w-5xl mx-auto px-4 pt-16 pb-12 relative">
                    <div className="text-center">
                        {/* Badge */}
                        <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-[var(--text-dim)] mb-8">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Smart Attendance Tracking for Students</span>
                        </div>

                        {/* Headline */}
                        <h1 className="animate-fade-up delay-100 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]"
                            style={{ letterSpacing: '-0.04em' }}>
                            <span className="bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text text-transparent">
                                Attendance
                            </span>
                            <br />
                            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-violet-400 bg-clip-text text-transparent">
                                made effortless.
                            </span>
                        </h1>

                        {/* Subhead */}
                        <p className="animate-fade-up delay-200 text-base sm:text-lg text-[var(--text-dim)] max-w-xl mx-auto mb-10 leading-relaxed">
                            Track records, plan leaves intelligently, and stay on top of academic requirements — all in one place.
                        </p>

                        {/* Stats pills */}
                        <div className="animate-fade-up delay-300 flex justify-center gap-4 sm:gap-6 mb-12">
                            <div ref={classCounter.ref} className="glass-card flex items-center gap-3 px-5 sm:px-6 py-3 !rounded-full" style={{ animation: 'float 6s ease-in-out infinite' }}>
                                <div className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center">
                                    <School className="w-4 h-4 text-blue-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xl sm:text-2xl font-bold tracking-tight">{classCounter.count}</p>
                                    <p className="text-[10px] sm:text-xs text-[var(--text-dim)] tracking-wide uppercase">Classes</p>
                                </div>
                            </div>
                            <div ref={studentCounter.ref} className="glass-card flex items-center gap-3 px-5 sm:px-6 py-3 !rounded-full" style={{ animation: 'float 6s ease-in-out infinite 1s' }}>
                                <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                    <GraduationCap className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xl sm:text-2xl font-bold tracking-tight">{studentCounter.count}</p>
                                    <p className="text-[10px] sm:text-xs text-[var(--text-dim)] tracking-wide uppercase">Students</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════ RETURNING USERS ═══════════ */}
            {(savedAdmin || savedStudent) && (
                <section className="max-w-md mx-auto px-4 mb-10 animate-fade-up delay-400">
                    <div className="glass-card">
                        <p className="text-xs uppercase tracking-widest text-[var(--text-dim)] mb-4 text-center font-medium">Continue where you left off</p>
                        <div className="space-y-3">
                            {savedStudent && (
                                <button
                                    onClick={() => router.push(`/student/${savedStudent.classId}/${savedStudent.rollNumber}`)}
                                    className="w-full py-3.5 px-5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                            <GraduationCap className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-semibold text-emerald-400">Student Dashboard</p>
                                            <p className="text-xs text-[var(--text-dim)]">{savedStudent.className} · Roll #{savedStudent.rollNumber}</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}
                            {savedAdmin && (
                                <button
                                    onClick={() => router.push('/admin/dashboard')}
                                    className="w-full py-3.5 px-5 rounded-xl border border-blue-500/20 bg-blue-950/20 hover:bg-blue-950/40 transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center">
                                            <Shield className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-semibold text-blue-400">Admin Panel</p>
                                            <p className="text-xs text-[var(--text-dim)]">{savedAdmin.className}</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}
                        </div>
                    </div>
                </section>
            )}

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
                                type="number"
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
                                    onClick={() => router.push('/admin/setup')}
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

            {/* ═══════════ HOW IT WORKS ═══════════ */}
            <section className="max-w-5xl mx-auto px-4 mb-20">
                <div className="text-center mb-10">
                    <p className="text-xs uppercase tracking-widest text-[var(--text-dim)] mb-3">How it works</p>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ letterSpacing: '-0.03em' }}>
                        Three simple steps
                    </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        {
                            step: '01',
                            title: 'Admin sets up',
                            desc: 'Create a class, add subjects, define the weekly timetable, and set your class strength.',
                            icon: BookOpen,
                            color: 'blue',
                        },
                        {
                            step: '02',
                            title: 'Mark attendance',
                            desc: 'Each day, the admin taps absent students on a smart grid. The timetable auto-loads.',
                            icon: Users,
                            color: 'purple',
                        },
                        {
                            step: '03',
                            title: 'Students track',
                            desc: 'View live percentages, plan bunks safely, browse calendar history, and report errors.',
                            icon: TrendingUp,
                            color: 'emerald',
                        },
                    ].map((item, i) => (
                        <div key={i} className={`glass-card text-center group animate-fade-up delay-${(i + 1) * 100}`}>
                            {/* Step number */}
                            <div className="text-xs font-mono text-[var(--text-dim)] mb-4 tracking-widest">{item.step}</div>

                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-xl ${colorMap[item.color]?.glow} ${colorMap[item.color]?.border} border flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                                <item.icon className={`w-5 h-5 ${colorMap[item.color]?.text}`} />
                            </div>

                            <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                            <p className="text-sm text-[var(--text-dim)] leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══════════ FEATURES ═══════════ */}
            <section className="max-w-5xl mx-auto px-4 mb-20">
                <div className="text-center mb-10">
                    <p className="text-xs uppercase tracking-widest text-[var(--text-dim)] mb-3">Features</p>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ letterSpacing: '-0.03em' }}>
                        Everything you need
                    </h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {features.map((f, i) => {
                        const colors = colorMap[f.color];
                        return (
                            <div
                                key={i}
                                className={`glass-card group cursor-default animate-fade-up delay-${Math.min((i + 1) * 100, 600)}`}
                            >
                                <div className={`w-10 h-10 rounded-lg ${colors.glow} ${colors.border} border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <f.icon className={`w-5 h-5 ${colors.text}`} />
                                </div>
                                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                                <p className="text-sm text-[var(--text-dim)] leading-relaxed">{f.desc}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ═══════════ BENEFITS ═══════════ */}
            <section className="max-w-4xl mx-auto px-4 mb-20">
                <div className="glass-card bg-gradient-to-br from-white/[0.04] to-transparent !p-8 sm:!p-10">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ letterSpacing: '-0.03em' }}>
                            Built for everyone
                        </h2>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                    <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                                </div>
                                <h3 className="font-semibold text-emerald-400">For Students</h3>
                            </div>
                            <ul className="space-y-3">
                                {[
                                    'Know your exact attendance anytime',
                                    'Plan leaves without risking detention',
                                    'Subject-wise tracking & alerts',
                                    'Calendar view of entire history',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-dim)]">
                                        <span className="text-emerald-400 mt-0.5 text-xs">✓</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center">
                                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                                </div>
                                <h3 className="font-semibold text-blue-400">For Admins</h3>
                            </div>
                            <ul className="space-y-3">
                                {[
                                    'Auto-loading timetable — one tap start',
                                    'Bulk input for fast attendance marking',
                                    'Flexible timetable & subject management',
                                    'Report review & response system',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-dim)]">
                                        <span className="text-blue-400 mt-0.5 text-xs">✓</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
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