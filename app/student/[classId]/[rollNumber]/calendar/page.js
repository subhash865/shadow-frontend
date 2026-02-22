"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import Calendar from '@/app/components/Calendar';
import api from '@/utils/api';
import useSWR from 'swr';

export default function StudentCalendar() {
    const params = useParams();
    const { classId, rollNumber } = params;
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const fetcher = (url) => api.get(url).then((res) => res.data);
    const reportKey = classId && rollNumber ? `/student/report/${classId}/${rollNumber}` : null;
    const datesKey = classId ? `/attendance/dates/${classId}` : null;
    const dayAttendanceKey = classId && rollNumber && selectedDate
        ? `/student/day-attendance/${classId}/${rollNumber}/${selectedDate}`
        : null;
    const reportCacheKey = classId && rollNumber ? `cls_config_${classId}_${rollNumber}` : null;
    const subjectCacheKey = classId ? `cls_subjects_${classId}` : null;

    const getCachedReport = () => {
        if (typeof window === 'undefined' || !reportCacheKey) return null;
        try {
            return JSON.parse(localStorage.getItem(reportCacheKey) || 'null');
        } catch {
            return null;
        }
    };

    const swrConfig = {
        revalidateOnFocus: false,
        dedupingInterval: 30000,
        shouldRetryOnError: true,
        errorRetryCount: 3,
        errorRetryInterval: 5000
    };

    const { data: reportData, isLoading: reportLoading } = useSWR(
        reportKey,
        fetcher,
        {
            ...swrConfig,
            fallbackData: getCachedReport(),
            onSuccess: (resData) => {
                if (typeof window !== 'undefined') {
                    if (reportCacheKey) {
                        localStorage.setItem(reportCacheKey, JSON.stringify(resData));
                    }
                    if (subjectCacheKey && Array.isArray(resData?.subjects)) {
                        localStorage.setItem(subjectCacheKey, JSON.stringify(resData.subjects));
                    }
                }
            }
        }
    );

    const { data: attendanceDatesResponse, isLoading: datesLoading } = useSWR(
        datesKey,
        fetcher,
        swrConfig
    );

    const { data: dayAttendanceData, isLoading: dayLoading } = useSWR(
        dayAttendanceKey,
        fetcher,
        swrConfig
    );

    const className = reportData?.className || '';
    const attendanceDates = (attendanceDatesResponse?.dates || []).map((dateStr) =>
        new Date(dateStr).toISOString().split('T')[0]
    );
    const dayAttendance = dayAttendanceData || null;
    const loading = (reportLoading && !reportData) || (datesLoading && !attendanceDatesResponse) || (dayLoading && !dayAttendanceData);

    const handleLogout = () => {
        localStorage.removeItem('studentClassId');
        localStorage.removeItem('studentRoll');
        localStorage.removeItem('studentClassName');
        localStorage.removeItem('studentToken');
        router.push('/');
    };

    const formatDateDisplay = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) return "Today";
        if (isYesterday) return "Yesterday";

        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading...</div>;

    return (
        <>
            <Navbar isStudent={true} onLogout={handleLogout} classId={classId} rollNumber={rollNumber} />

            <div className="max-w-2xl mx-auto px-4 py-8">

                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Calendar</h1>
                    <p className="text-[var(--text-dim)]">{className} - Roll No. {rollNumber}</p>
                </div>

                {/* Calendar */}
                <div className="mb-6">
                    <Calendar
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        attendanceDates={attendanceDates}
                    />
                </div>

                {/* Day-specific Attendance */}
                {selectedDate && (
                    <div className="card">
                        <h2 className="text-sm uppercase text-[var(--text-dim)] mb-4">
                            Attendance for {formatDateDisplay(selectedDate)}
                        </h2>

                        {!dayAttendance || !dayAttendance.periods || dayAttendance.periods.length === 0 ? (
                            <p className="text-center text-[var(--text-dim)] py-8">No classes on this day</p>
                        ) : (
                            <div className="space-y-3">
                                {dayAttendance.periods.map((period, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-[var(--bg)] rounded-md border border-[var(--border)]">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-[var(--text-dim)]">P{period.periodNum}</span>
                                            <span className="text-sm">{period.subjectName}</span>
                                        </div>
                                        <span className={`px-3 py-1 rounded-md text-sm font-semibold ${period.status === 'Present'
                                            ? 'bg-[var(--success)] text-[var(--success-text)]'
                                            : 'bg-[var(--danger)] text-[var(--danger-text)]'
                                            }`}>
                                            {period.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </>
    );
}
