'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, TrendingUp, Bell, Shield, Clock, GraduationCap, School } from 'lucide-react';
import Navbar from './components/Navbar';
import api from '@/utils/api';
import { useNotification } from './components/Notification';

export default function Home() {
    const router = useRouter();
    const notify = useNotification();
    const [className, setClassName] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ totalClasses: 0, totalStudents: 0 });

    useEffect(() => {
        // Fetch system statistics
        api.get('/class/stats/all')
            .then(res => {
                setStats(res.data);
            })
            .catch(err => {
                console.error('Failed to fetch stats:', err);
            });
    }, []);

    const handleStudentLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await api.get(`/class/lookup/${className.trim()}`);
            const classId = res.data.classId;

            localStorage.setItem('studentClassId', classId);
            localStorage.setItem('studentRoll', rollNumber);

            router.push(`/student/${classId}/${rollNumber}`);
        } catch (err) {
            notify({ message: "Class not found! Check the name.", type: 'error' });
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />

            <div className="max-w-5xl mx-auto px-4 py-12">
                {/* Hero Section */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        Attendance Made Simple
                    </h1>
                    <p className="text-xl text-[var(--text-dim)] max-w-2xl mx-auto mb-8">
                        Track attendance records, plan your leaves intelligently, and stay on top of your academic attendance requirements.
                    </p>

                    {/* Stats Display */}
                    <div className="flex justify-center gap-8 mb-8">
                        <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10">
                            <School className="w-5 h-5 text-blue-400" />
                            <div className="text-left">
                                <p className="text-2xl font-bold">{stats.totalClasses}</p>
                                <p className="text-xs text-[var(--text-dim)]">Active Classes</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10">
                            <GraduationCap className="w-5 h-5 text-green-400" />
                            <div className="text-left">
                                <p className="text-2xl font-bold">{stats.totalStudents}</p>
                                <p className="text-xs text-[var(--text-dim)]">Total Students</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Student Login Section */}
                <div className="max-w-md mx-auto mb-16">
                    <form onSubmit={handleStudentLogin} className="card">
                        <h2 className="text-sm uppercase text-[var(--text-dim)] mb-4 text-center">Student Access</h2>

                        <input
                            type="text"
                            className="input mb-4"
                            placeholder="Class Name (e.g. S6 CSE-B)"
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            required
                        />

                        <input
                            type="number"
                            className="input mb-4"
                            placeholder="Roll Number (e.g. 1-100)"
                            value={rollNumber}
                            onChange={(e) => setRollNumber(e.target.value)}
                            required
                        />

                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Loading...' : 'View My Attendance'}
                        </button>
                    </form>

                    <div className="mt-6 flex flex-col gap-2">
                        <p className="text-center text-sm text-[var(--text-dim)]">Are you a class representative?</p>
                        <button
                            onClick={() => router.push('/admin/setup')}
                            className="btn btn-outline"
                        >
                            Create New Class
                        </button>
                        <button
                            onClick={() => router.push('/admin/login')}
                            className="btn btn-outline"
                        >
                            Admin Login
                        </button>
                        <button
                            onClick={() => router.push('/teacher/login')}
                            className="btn btn-outline"
                        >
                            Teacher Login
                        </button>
                    </div>
                </div>

                {/* How It Works Section */}
                <div className="mb-16">
                    <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="card text-center hover:border-white/30 transition">
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold">1</span>
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Admin Setup</h3>
                            <p className="text-sm">
                                Class representative creates the class, adds subjects, sets up timetable, and configures class strength.
                            </p>
                        </div>
                        <div className="card text-center hover:border-white/30 transition">
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold">2</span>
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Mark Attendance</h3>
                            <p className="text-sm">
                                Admin marks daily attendance by selecting absent students for each period with an intuitive grid interface.
                            </p>
                        </div>
                        <div className="card text-center hover:border-white/30 transition">
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold">3</span>
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Students Access</h3>
                            <p className="text-sm">
                                Students view their attendance percentage, track records, and plan bunks without dropping below minimum threshold.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div className="mb-16">
                    <h2 className="text-3xl font-bold text-center mb-8">Key Features</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="card hover:border-white/30 transition">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                                    <Calendar className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Smart Calendar</h3>
                                    <p className="text-sm text-[var(--text-dim)]">
                                        Interactive calendar to track attendance history. View past records, mark special dates like exams and holidays that auto-exclude from calculations.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card hover:border-white/30 transition">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                                    <TrendingUp className="w-5 h-5 text-green-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Real-Time Analytics</h3>
                                    <p className="text-sm text-[var(--text-dim)]">
                                        Live attendance percentage tracking per subject. Visual progress bars show how close you are to minimum requirements.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card hover:border-white/30 transition">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                                    <Users className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Bunk Planning</h3>
                                    <p className="text-sm text-[var(--text-dim)]">
                                        Calculate exactly how many classes you can skip without falling below the minimum attendance threshold. Plan intelligently!
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card hover:border-white/30 transition">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                                    <Shield className="w-5 h-5 text-orange-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Flexible Timetable</h3>
                                    <p className="text-sm text-[var(--text-dim)]">
                                        Admins can swap day schedules, add/remove periods, and handle special class arrangements with edit mode.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card hover:border-white/30 transition">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                                    <Bell className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Instant Notifications</h3>
                                    <p className="text-sm text-[var(--text-dim)]">
                                        Custom notification system keeps you informed of all actions. No more missing important updates.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card hover:border-white/30 transition">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                                    <Clock className="w-5 h-5 text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Historical Records</h3>
                                    <p className="text-sm text-[var(--text-dim)]">
                                        Access complete attendance history. Admins can edit past records anytime to correct mistakes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Benefits Section */}
                <div className="card mb-12 bg-gradient-to-br from-white/5 to-white/0 border-white/20">
                    <h2 className="text-2xl font-bold text-center mb-6">Why Use This System?</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold mb-2 text-green-400">For Students</h3>
                            <ul className="space-y-2 text-sm text-[var(--text-dim)]">
                                <li>✓ Know your exact attendance percentage anytime</li>
                                <li>✓ Plan leaves without risking detention</li>
                                <li>✓ Subject-wise tracking for better management</li>
                                <li>✓ No more uncertainty about attendance status</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2 text-blue-400">For Admins</h3>
                            <ul className="space-y-2 text-sm text-[var(--text-dim)]">
                                <li>✓ Quick attendance marking with grid interface</li>
                                <li>✓ Bulk input for faster processing</li>
                                <li>✓ Flexible timetable management</li>
                                <li>✓ Complete control with edit & update capabilities</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-[var(--text-dim)] pb-8">
                    <p>Built for students, by students. Track smarter, not harder.</p>
                </div>
            </div>
        </>
    );
}