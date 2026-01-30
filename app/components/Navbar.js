'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navbar({ isAdmin = false, isStudent = false, isTeacher = false, onLogout, onReportClick, classId, rollNumber }) {
    const [isOpen, setIsOpen] = useState(false);
    const [navClassId, setNavClassId] = useState(classId);

    // Load classId from localStorage for admins if not provided via props
    useEffect(() => {
        if (typeof window !== 'undefined' && isAdmin && !classId) {
            const stored = localStorage.getItem('adminClassId');
            if (stored) setNavClassId(stored);
        }
    }, [isAdmin, classId]);

    // Keep state in sync if prop changes
    useEffect(() => {
        if (classId) setNavClassId(classId);
    }, [classId]);

    return (
        <nav className="border-b border-[var(--border)] p-4 sticky top-0 bg-black/80 backdrop-blur-md z-50">
            <div className="max-w-4xl mx-auto flex justify-between items-center">

                <Link href="/" className="text-lg font-bold tracking-tight">
                    SHADOW
                </Link>

                {(isAdmin || isStudent || isTeacher) && (
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex flex-col gap-1 p-2"
                    >
                        <span className={`w-5 h-0.5 bg-white transition-transform duration-300 ${isOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                        <span className={`w-5 h-0.5 bg-white transition-opacity duration-300 ${isOpen ? 'opacity-0' : ''}`}></span>
                        <span className={`w-5 h-0.5 bg-white transition-transform duration-300 ${isOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-col gap-3 max-w-4xl mx-auto">
                    {isAdmin ? (
                        <>
                            <Link href="/admin/dashboard" onClick={() => setIsOpen(false)} className="text-sm text-[var(--text-dim)] hover:text-white transition">
                                Dashboard
                            </Link>
                            <Link href="/admin/timetable" onClick={() => setIsOpen(false)} className="text-sm text-[var(--text-dim)] hover:text-white transition">
                                Edit Timetable
                            </Link>
                            <Link href="/admin/teachers" onClick={() => setIsOpen(false)} className="text-sm text-[var(--text-dim)] hover:text-white transition">
                                Teachers
                            </Link>
                            <Link href="/admin/settings" onClick={() => setIsOpen(false)} className="text-sm text-[var(--text-dim)] hover:text-white transition">
                                Settings
                            </Link>
                            <Link href="/admin/special-dates" onClick={() => setIsOpen(false)} className="text-sm text-[var(--text-dim)] hover:text-white transition">
                                Special Dates
                            </Link>
                            {navClassId && (
                                <Link href={`/admin/reports/${navClassId}`} onClick={() => setIsOpen(false)} className="text-sm text-[var(--text-dim)] hover:text-white transition">
                                    Reports
                                </Link>
                            )}
                            <button onClick={() => { onLogout?.(); setIsOpen(false); }} className="text-sm text-[var(--danger-text)] hover:text-red-400 text-left transition">
                                Logout
                            </button>
                        </>
                    ) : isTeacher ? (
                        <>
                            <Link href="/teacher/dashboard" onClick={() => setIsOpen(false)} className="text-sm text-[var(--text-dim)] hover:text-white transition">
                                Dashboard
                            </Link>
                            <Link href="/teacher/settings" onClick={() => setIsOpen(false)} className="text-sm text-[var(--text-dim)] hover:text-white transition">
                                Settings
                            </Link>
                            <button onClick={() => { onLogout?.(); setIsOpen(false); }} className="text-sm text-[var(--danger-text)] hover:text-red-400 text-left transition">
                                Logout
                            </button>
                        </>
                    ) : isStudent ? (
                        <>
                            <Link href={`/student/${classId}/${rollNumber}`} onClick={() => setIsOpen(false)} className="text-sm text-[var(--text-dim)] hover:text-white transition">
                                Dashboard
                            </Link>
                            <Link href={`/student/${classId}/${rollNumber}/calendar`} onClick={() => setIsOpen(false)} className="text-sm text-[var(--text-dim)] hover:text-white transition">
                                Calendar
                            </Link>
                            <Link href={`/student/${classId}/${rollNumber}/bunk-effect`} onClick={() => setIsOpen(false)} className="text-sm text-[var(--text-dim)] hover:text-white transition">
                                Bunk Effect
                            </Link>
                            {onReportClick && (
                                <button onClick={() => { onReportClick(); setIsOpen(false); }} className="text-sm text-[var(--text-dim)] hover:text-white text-left transition">
                                    Report Issue
                                </button>
                            )}
                            <button onClick={() => { onLogout?.(); setIsOpen(false); }} className="text-sm text-[var(--danger-text)] hover:text-red-400 text-left transition">
                                Logout
                            </button>
                        </>
                    ) : (
                        null
                    )}
                </div>
            )}
        </nav>
    );
}