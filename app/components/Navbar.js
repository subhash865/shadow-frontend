'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useSWR from 'swr';
import api from '@/utils/api';
import {
    LayoutDashboard, Calendar, FileText,
    LogOut, Zap, BookOpen, Flag, Menu, X,
    HelpCircle, Calculator, Megaphone
} from 'lucide-react';

// ── Spear SVG for Attention ─────────────────────────────────────────────────
function SpearIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20L14 10" />
            <path d="M14 10L19 4L20 9L15 10Z" fill="currentColor" stroke="none" />
            <path d="M14 10L19 4L20 9L15 10Z" />
        </svg>
    );
}

const fetcher = (url) => api.get(url).then(res => res.data);
const swrCfg = { revalidateOnFocus: true, refreshInterval: 60000, dedupingInterval: 30000, shouldRetryOnError: false };

export default function Navbar({ isAdmin = false, isStudent = false, onLogout, onReportClick, classId, rollNumber }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [navClassId, setNavClassId] = useState(classId || null);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== 'undefined' && isAdmin && !classId) {
            const stored = localStorage.getItem('adminClassId');
            if (stored) setNavClassId(stored);
        }
    }, [isAdmin, classId]);

    useEffect(() => {
        if (classId) setNavClassId(classId);
    }, [classId]);

    useEffect(() => { setDrawerOpen(false); }, [pathname]);

    useEffect(() => {
        document.body.style.overflow = drawerOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [drawerOpen]);

    // ── SWR data for dot detection ─────────────────────────────────────────
    const announcementsKey = navClassId ? `/announcements/${navClassId}` : null;
    const reportKey = isStudent && navClassId && rollNumber
        ? `/student/report/${navClassId}/${rollNumber}` : null;

    const { data: announcementsData } = useSWR(announcementsKey, fetcher, swrCfg);
    const { data: reportData } = useSWR(reportKey, fetcher, swrCfg);

    // ── Dot state ──────────────────────────────────────────────────────────
    const [hasNewAnnouncements, setHasNewAnnouncements] = useState(false);
    const [hasNewAttendance, setHasNewAttendance] = useState(false);

    const attnSeenKey = navClassId ? `attn_seen_${navClassId}_${rollNumber || 'admin'}` : null;
    const attendSeenKey = navClassId && rollNumber ? `attend_seen_${navClassId}_${rollNumber}` : null;

    const attentionPath = isStudent && navClassId && rollNumber ? `/student/${navClassId}/${rollNumber}/attention` : '/admin/attention';
    const attendancePath = isStudent && navClassId && rollNumber ? `/student/${navClassId}/${rollNumber}` : '/admin/dashboard';

    // Compare announcements with stored seen time
    useEffect(() => {
        if (!announcementsData || !attnSeenKey) return;
        const list = announcementsData.announcements || [];
        if (!list.length) return;
        const latest = Math.max(...list.map(a => new Date(a.createdAt).getTime()));
        const stored = Number(localStorage.getItem(attnSeenKey) || '0');
        setHasNewAnnouncements(latest > stored);
    }, [announcementsData, attnSeenKey]);

    // Compare attendance lastUpdated with stored seen time
    useEffect(() => {
        if (!reportData?.lastUpdated || !attendSeenKey) return;
        const current = new Date(reportData.lastUpdated).getTime();
        const stored = Number(localStorage.getItem(attendSeenKey) || '0');
        setHasNewAttendance(current > stored);
    }, [reportData?.lastUpdated, attendSeenKey]);

    // Mark as seen when user is on the respective page
    useEffect(() => {
        if (pathname === attentionPath && attnSeenKey && announcementsData) {
            const list = announcementsData.announcements || [];
            if (list.length) {
                const latest = Math.max(...list.map(a => new Date(a.createdAt).getTime()));
                localStorage.setItem(attnSeenKey, String(latest));
            }
            setHasNewAnnouncements(false);
        }
        if (pathname === attendancePath && attendSeenKey && reportData?.lastUpdated) {
            const current = new Date(reportData.lastUpdated).getTime();
            localStorage.setItem(attendSeenKey, String(current));
            setHasNewAttendance(false);
        }
    }, [pathname, announcementsData, reportData?.lastUpdated]);

    // ── Shared right-slide drawer ──────────────────────────────────────────
    const DrawerLink = ({ href, icon: Icon, label }) => {
        const active = pathname === href;
        return (
            <Link href={href} onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active ? 'bg-white/8 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                <span className="flex-1">{label}</span>
                {active && <div className="w-1.5 h-1.5 rounded-full bg-white/60" />}
            </Link>
        );
    };

    const DrawerButton = ({ onClick, icon: Icon, label, danger = false }) => (
        <button onClick={() => { onClick?.(); setDrawerOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all ${danger ? 'text-red-400 hover:bg-red-500/8' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
            {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
            <span>{label}</span>
        </button>
    );

    const Drawer = ({ children }) => (
        <>
            {drawerOpen && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                    onClick={() => setDrawerOpen(false)} />
            )}
            <div className="fixed top-0 right-0 bottom-0 z-[70] w-72 flex flex-col border-l border-white/8"
                style={{
                    background: 'rgba(10,10,12,0.97)',
                    backdropFilter: 'blur(24px)',
                    transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                    willChange: 'transform',
                }}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
                    <span className="text-xs font-bold text-white/40 tracking-widest uppercase">Menu</span>
                    <button onClick={() => setDrawerOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white hover:bg-white/8 transition">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
                    {children}
                </div>
            </div>
        </>
    );

    // ── Bottom tab bar shared by both admin and student ─────────────────────
    const TabItem = ({ onClick, label, active, dot = false, children }) => (
        <button onClick={onClick}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all ${active ? 'text-white' : 'text-white/30 hover:text-white/60'}`}>
            <div className={`relative p-1.5 rounded-xl transition-all ${active ? 'bg-white/10' : ''}`}>
                {children}
                {dot && !active && (
                    <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500 ring-1 ring-black" />
                )}
            </div>
            <span className={`text-[10px] font-semibold tracking-wide ${active ? 'text-white' : 'text-white/30'}`}>
                {label}
            </span>
        </button>
    );

    const BottomBar = ({ children }) => (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/8 flex"
            style={{
                background: 'rgba(8,8,10,0.97)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}>
            {children}
        </nav>
    );

    // ── ADMIN ──────────────────────────────────────────────────────────────
    if (isAdmin) {
        return (
            <>
                <BottomBar>
                    <TabItem label="Attend" active={pathname === '/admin/dashboard'} onClick={() => router.push('/admin/dashboard')}>
                        <LayoutDashboard className="w-5 h-5" />
                    </TabItem>
                    <TabItem label="Attention" active={pathname === '/admin/attention'} dot={hasNewAnnouncements} onClick={() => router.push('/admin/attention')}>
                        <Megaphone className="w-5 h-5" />
                    </TabItem>
                    <TabItem label="More" active={drawerOpen} onClick={() => setDrawerOpen(true)}>
                        <Menu className="w-5 h-5" />
                    </TabItem>
                </BottomBar>

                <Drawer>
                    <DrawerLink href="/admin/subjects" icon={BookOpen} label="Subjects" />
                    {navClassId && <DrawerLink href={`/admin/reports/${navClassId}`} icon={FileText} label="Reports" />}
                    <div className="border-t border-white/6 my-2" />
                    <DrawerLink href="/guide" icon={HelpCircle} label="Guide" />
                    <DrawerButton onClick={onLogout} icon={LogOut} label="Logout" danger />
                </Drawer>
            </>
        );
    }

    // ── STUDENT ────────────────────────────────────────────────────────────
    if (isStudent) {
        const calcPath = `/student/${classId}/${rollNumber}/calculator`;
        const isAttendanceActive = pathname === attendancePath;
        const isAttentionActive = pathname === attentionPath;
        const isCalcActive = pathname === calcPath;

        return (
            <>
                <BottomBar>
                    <TabItem label="Attention" active={isAttentionActive} dot={hasNewAnnouncements} onClick={() => router.push(attentionPath)}>
                        <Megaphone className="w-5 h-5" />
                    </TabItem>
                    <TabItem label="Attend" active={isAttendanceActive} dot={hasNewAttendance} onClick={() => router.push(attendancePath)}>
                        <LayoutDashboard className="w-5 h-5" />
                    </TabItem>

                    <TabItem label="CGPA" active={isCalcActive} onClick={() => router.push(calcPath)}>
                        <Calculator className="w-5 h-5" />
                    </TabItem>
                    <TabItem label="More" active={drawerOpen} onClick={() => setDrawerOpen(true)}>
                        <Menu className="w-5 h-5" />
                    </TabItem>
                </BottomBar>

                <Drawer>
                    <DrawerLink href={attendancePath} icon={LayoutDashboard} label="Attendance" />
                    <DrawerLink href={attentionPath} icon={Megaphone} label="Attention" />
                    <DrawerLink href={calcPath} icon={Calculator} label="CGPA Calculator" />
                    <DrawerLink href={`/student/${classId}/${rollNumber}/calendar`} icon={Calendar} label="Calendar" />
                    <DrawerLink href={`/student/${classId}/${rollNumber}/bunk-effect`} icon={Zap} label="Skip Effect" />
                    {onReportClick && <DrawerButton onClick={onReportClick} icon={Flag} label="Report Issue" />}
                    <div className="border-t border-white/6 my-2" />
                    <DrawerLink href="/guide" icon={HelpCircle} label="Guide" />
                    <DrawerButton onClick={onLogout} icon={LogOut} label="Logout" danger />
                </Drawer>
            </>
        );
    }

    return null;
}