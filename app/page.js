'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from './components/Navbar';
import api from '@/utils/api';
import { useNotification } from './components/Notification';

export default function Home() {
    const router = useRouter();
    const notify = useNotification();
    const [className, setClassName] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto-login disabled to allow returning to landing page
    // useEffect(() => {
    //     const savedClassId = localStorage.getItem('studentClassId');
    //     const savedRoll = localStorage.getItem('studentRoll');

    //     if (savedClassId && savedRoll) {
    //         router.push(`/student/${savedClassId}/${savedRoll}`);
    //     }
    // }, [router]);

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

            <div className="max-w-md mx-auto px-4 py-12">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Attendance.</h1>
                    <p>Track your records. Plan your leaves.</p>
                </div>

                <form onSubmit={handleStudentLogin} className="card">
                    <h2 className="text-sm uppercase text-[var(--text-dim)] mb-4">Student Access</h2>

                    <input
                        type="text"
                        className="input mb-4"
                        placeholder="Class Name (e.g. CSE-3A)"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        required
                    />

                    <input
                        type="number"
                        className="input mb-4"
                        placeholder="Roll Number"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        required
                    />

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Loading...' : 'View Attendance'}
                    </button>
                </form>

                <div className="mt-6 flex flex-col gap-2">
                    <p className="text-center text-sm">Are you a representative?</p>
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
                </div>
            </div>
        </>
    );
}