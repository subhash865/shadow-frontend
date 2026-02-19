"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import Calendar from '@/app/components/Calendar';
import api from '@/utils/api';

export default function StudentCalendar() {
    const params = useParams();
    const { classId, rollNumber } = params;
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [className, setClassName] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [dayAttendance, setDayAttendance] = useState(null);
    const [attendanceDates, setAttendanceDates] = useState([]);

    useEffect(() => {
        if (!classId || !rollNumber) return;

        // Set today as default
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);

        // Fetch class name
        api.get(`/student/report/${classId}/${rollNumber}`)
            .then(res => {
                setClassName(res.data.className);
                setLoading(false);
            })
            .catch(err => {
                console.error("Fetch Error:", err);
                setLoading(false);
            });

        // Fetch attendance dates
        api.get(`/attendance/dates/${classId}`)
            .then(res => {
                const formattedDates = (res.data.dates || []).map(dateStr => {
                    return new Date(dateStr).toISOString().split('T')[0];
                });
                setAttendanceDates(formattedDates);
            })
            .catch(() => { });
    }, [classId, rollNumber]);

    // Load day-specific attendance when date changes
    useEffect(() => {
        if (classId && selectedDate && rollNumber) {
            api.get(`/student/day-attendance/${classId}/${rollNumber}/${selectedDate}`)
                .then(res => {
                    setDayAttendance(res.data);
                })
                .catch(err => {
                    setDayAttendance(null);
                    console.log("No attendance for this date");
                });
        }
    }, [selectedDate, classId, rollNumber]);

    const handleLogout = () => {
        localStorage.removeItem('studentClassId');
        localStorage.removeItem('studentRoll');
        localStorage.removeItem('studentClassName');
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

    if (loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading...</div>;

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
