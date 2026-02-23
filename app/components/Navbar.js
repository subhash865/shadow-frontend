'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Calendar, FileText,
    AlertTriangle, LogOut, Zap, BookOpen, Flag, Menu, X, HelpCircle
} from 'lucide-react';

export default function Navbar({ isAdmin = false, isStudent = false, onLogout, onReportClick, classId, rollNumber }) {
    const [isOpen, setIsOpen] = useState(false);
    const [navClassId, setNavClassId] = useState(classId);
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window !== 'undefined' && isAdmin && !classId) {
            const stored = localStorage.getItem('adminClassId');
            if (stored) setNavClassId(stored);
        }
    }, [isAdmin, classId]);

    useEffect(() => {
        if (classId) setNavClassId(classId);
    }, [classId]);

    // Close menu on route change
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    const isActive = (href) => pathname === href;

    const NavLink = ({ href, icon: Icon, label, danger = false }) => {
        const active = isActive(href);
        return (
            <Link
                href={href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active
                    ? 'bg-white/8 text-white'
                    : danger
                        ? 'text-red-400 hover:bg-red-500/8'
                        : 'text-[var(--text-dim)] hover:text-white hover:bg-white/5'
                    }`}
            >
                {Icon && <Icon className="w-4 h-4" />}
                <span>{label}</span>
                {active && <div className="w-1.5 h-1.5 rounded-full bg-white ml-auto"></div>}
            </Link>
        );
    };

    const NavButton = ({ onClick, icon: Icon, label, danger = false }) => (
        <button
            onClick={() => { onClick?.(); setIsOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all ${danger ? 'text-red-400 hover:bg-red-500/8' : 'text-[var(--text-dim)] hover:text-white hover:bg-white/5'
                }`}
        >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{label}</span>
        </button>
    );

    return (
        <nav className="border-b border-white/6 sticky top-0 z-50 glass bg-black/95">
            <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/15 transition">
                        <span className="text-xs font-bold">S</span>
                    </div>
                    <span className="text-sm font-bold tracking-tight">SHADOW</span>
                </Link>

                {/* Hamburger */}
                {(isAdmin || isStudent) && (
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center hover:bg-white/10 transition"
                    >
                        {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </button>
                )}
            </div>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 glass border-b border-white/6 animate-fade-in">
                    <div className="max-w-5xl mx-auto px-4 py-3 space-y-0.5">
                        {isAdmin ? (
                            <>
                                <NavLink href="/admin/attention" icon={AlertTriangle} label="Attention" />
                                <NavLink href="/admin/subjects" icon={BookOpen} label="Subjects" />
                                <NavLink href="/admin/dashboard" icon={LayoutDashboard} label="Attendance" />

                                {navClassId && (
                                    <NavLink href={`/admin/reports/${navClassId}`} icon={FileText} label="Reports" />
                                )}
                                <div className="border-t border-white/6 my-2"></div>
                                <NavLink href="/guide" icon={HelpCircle} label="Guide" />
                                <NavButton onClick={onLogout} icon={LogOut} label="Logout" danger />
                            </>
                        ) : isStudent ? (
                            <>
                                <NavLink href={`/student/${classId}/${rollNumber}/attention`} icon={AlertTriangle} label="Announcements" />
                                <NavLink href={`/student/${classId}/${rollNumber}`} icon={LayoutDashboard} label="Attendance" />
                                <NavLink href={`/student/${classId}/${rollNumber}/calendar`} icon={Calendar} label="Calendar" />
                                <NavLink href={`/student/${classId}/${rollNumber}/bunk-effect`} icon={Zap} label="Skip Effect" />
                                {onReportClick && (
                                    <NavButton onClick={onReportClick} icon={Flag} label="Report Issue" />
                                )}
                                <div className="border-t border-white/6 my-2"></div>
                                <NavLink href="/guide" icon={HelpCircle} label="Guide" />
                                <NavButton onClick={onLogout} icon={LogOut} label="Logout" danger />
                            </>
                        ) : null}
                    </div>
                </div>
            )}
        </nav>
    );
}