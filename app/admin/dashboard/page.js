"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Save, Plus, X, Calendar as CalendarIcon,
    RotateCcw, FileText, Clock, Users, CheckCircle,
    AlertTriangle, Loader2
} from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Calendar from '@/app/components/Calendar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';

export default function AdminDashboard() {
    const router = useRouter();
    const notify = useNotification();
    const [loading, setLoading] = useState(true);
    const [timetable, setTimetable] = useState([]);
    const [classId, setClassId] = useState(null);
    const [className, setClassName] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [subjects, setSubjects] = useState([]);
    const [absentees, setAbsentees] = useState({});
    const [absentInputs, setAbsentInputs] = useState({});
    const [showCalendar, setShowCalendar] = useState(false);
    const [attendanceDates, setAttendanceDates] = useState([]);
    const [hasModifications, setHasModifications] = useState(false);
    const [isViewingPastDate, setIsViewingPastDate] = useState(false);
    const [lastModified, setLastModified] = useState(null);
    const [classStrength, setClassStrength] = useState(70);
    const [saving, setSaving] = useState(false);
    const [pendingReports, setPendingReports] = useState(0);
    const [savedTimetable, setSavedTimetable] = useState(null); // weekly timetable from class data
    const [timetableLoaded, setTimetableLoaded] = useState(false); // whether today's schedule was auto-loaded

    // Check if viewing past date
    const checkIfPastDate = (date) => {
        const today = new Date().toISOString().split('T')[0];
        setIsViewingPastDate(date < today);
    };

    // Get day name from date string
    const getDayName = (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    };

    // Auto-load timetable from saved weekly schedule
    const loadTimetableForDay = useCallback((dateStr, weeklyTimetable, subjectsList) => {
        if (!weeklyTimetable || !subjectsList) return [];

        const dayName = getDayName(dateStr);
        const daySchedule = weeklyTimetable[dayName] || [];

        if (daySchedule.length === 0) return [];

        return daySchedule
            .sort((a, b) => a.period - b.period)
            .map(slot => {
                const subject = subjectsList.find(s => s._id === slot.subjectId);
                return {
                    period: slot.period,
                    subjectId: slot.subjectId || '',
                    subjectName: subject ? subject.name : ''
                };
            });
    }, []);

    // Load attendance for selected date
    const loadAttendanceForDate = useCallback(async (date, cId, weeklyTT, subjectsList) => {
        try {
            const res = await api.get(`/attendance/by-date/${cId}/${date}`);
            if (res.data && res.data.periods && res.data.periods.length > 0) {
                // Load saved attendance
                const formattedTimetable = res.data.periods.map(period => ({
                    period: period.periodNum,
                    subjectName: period.subjectName,
                    subjectId: period.subjectId
                }));

                const newAbsentees = {};
                const newAbsentInputs = {};
                res.data.periods.forEach((period, index) => {
                    newAbsentees[index] = period.absentRollNumbers || [];
                    newAbsentInputs[index] = (period.absentRollNumbers || []).sort((a, b) => a - b).join(', ');
                });

                setTimetable(formattedTimetable);
                setAbsentees(newAbsentees);
                setAbsentInputs(newAbsentInputs);
                setHasModifications(false);
                setTimetableLoaded(true);

                if (res.data.updatedAt) {
                    setLastModified(new Date(res.data.updatedAt));
                }
            } else {
                // No attendance for this date — auto-load from weekly schedule
                const autoSchedule = loadTimetableForDay(date, weeklyTT, subjectsList);
                setTimetable(autoSchedule);
                setAbsentees({});
                setAbsentInputs({});
                setHasModifications(false);
                setLastModified(null);
                setTimetableLoaded(autoSchedule.length > 0);
            }
        } catch (err) {
            const autoSchedule = loadTimetableForDay(date, weeklyTT, subjectsList);
            setTimetable(autoSchedule);
            setAbsentees({});
            setAbsentInputs({});
            setHasModifications(false);
            setLastModified(null);
            setTimetableLoaded(autoSchedule.length > 0);
        }
    }, [loadTimetableForDay]);

    useEffect(() => {
        const storedClassId = localStorage.getItem('adminClassId');
        if (!storedClassId) {
            router.push('/admin/login');
            return;
        }
        setClassId(storedClassId);

        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
        checkIfPastDate(today);

        // Parallel data fetching for speed
        Promise.all([
            api.get(`/class/${storedClassId}`),
            api.get(`/attendance/dates/${storedClassId}`).catch(() => ({ data: { dates: [] } })),
            api.get(`/reports/class/${storedClassId}`).catch(() => ({ data: { reports: [] } })),
        ]).then(([classRes, datesRes, reportsRes]) => {
            const subjectsList = classRes.data.subjects;
            const weeklyTT = classRes.data.timetable;

            setSubjects(subjectsList);
            setClassName(classRes.data.className);
            setClassStrength(classRes.data.totalStudents || 70);
            setSavedTimetable(weeklyTT);

            // Format attendance dates
            const formattedDates = (datesRes.data.dates || []).map(dateStr => {
                return new Date(dateStr).toISOString().split('T')[0];
            });
            setAttendanceDates(formattedDates);

            // Count pending reports
            const pending = (reportsRes.data.reports || []).filter(r => r.status === 'pending').length;
            setPendingReports(pending);

            setLoading(false);

            // Load attendance for today
            loadAttendanceForDate(today, storedClassId, weeklyTT, subjectsList);
        }).catch(() => {
            setLoading(false);
        });
    }, [router, loadAttendanceForDate]);

    // Load attendance when date changes
    useEffect(() => {
        if (classId && selectedDate && savedTimetable && subjects.length > 0) {
            loadAttendanceForDate(selectedDate, classId, savedTimetable, subjects);
            checkIfPastDate(selectedDate);
            setShowCalendar(false);
        }
    }, [selectedDate, classId, savedTimetable, subjects, loadAttendanceForDate]);

    const handleLogout = () => {
        localStorage.removeItem('adminClassId');
        localStorage.removeItem('token');
        router.push('/');
    };

    const addPeriod = () => {
        const nextPeriodNum = timetable.length > 0
            ? Math.max(...timetable.map(p => p.period)) + 1
            : 1;
        setTimetable([...timetable, { period: nextPeriodNum, subjectId: "", subjectName: "" }]);
        setHasModifications(true);
    };

    const removePeriod = (periodNum) => {
        const indexToRemove = timetable.findIndex(p => p.period === periodNum);
        if (indexToRemove === -1) return;

        setTimetable(prev => prev.filter(p => p.period !== periodNum));

        const shiftState = (prev) => {
            const updated = {};
            Object.keys(prev).forEach(key => {
                const k = parseInt(key, 10);
                if (isNaN(k)) return;
                if (k < indexToRemove) updated[k] = prev[k];
                else if (k > indexToRemove) updated[k - 1] = prev[k];
            });
            return updated;
        };

        setAbsentees(shiftState);
        setAbsentInputs(shiftState);
        setHasModifications(true);
    };

    const updatePeriod = (periodNum, subjectId) => {
        const subject = subjects.find(s => s._id === subjectId);
        setTimetable(prev => prev.map(slot =>
            slot.period === periodNum
                ? { ...slot, subjectId, subjectName: subject ? subject.name : "" }
                : slot
        ));
        setHasModifications(true);
    };

    const toggleAbsent = (periodIdx, rollNo) => {
        setAbsentees(prev => {
            const currentList = prev[periodIdx] || [];
            let newList;
            if (currentList.includes(rollNo)) {
                newList = currentList.filter(r => r !== rollNo);
            } else {
                newList = [...currentList, rollNo];
            }

            setAbsentInputs(prevInputs => ({
                ...prevInputs,
                [periodIdx]: newList.sort((a, b) => a - b).join(', ')
            }));

            return { ...prev, [periodIdx]: newList };
        });
        setHasModifications(true);
    };

    const handleBulkAbsentInput = (periodIdx, inputValue) => {
        setAbsentInputs(prev => ({ ...prev, [periodIdx]: inputValue }));

        if (!inputValue.trim()) {
            setAbsentees(prev => ({ ...prev, [periodIdx]: [] }));
            setHasModifications(true);
            return;
        }

        const rollNumbers = inputValue
            .split(',')
            .map(str => parseInt(str.trim()))
            .filter(num => !isNaN(num) && num >= 1 && num <= classStrength);

        const uniqueRolls = [...new Set(rollNumbers)];
        setAbsentees(prev => ({ ...prev, [periodIdx]: uniqueRolls }));
        setHasModifications(true);
    };

    // Mark all present for a period (clear absentees)
    const markAllPresent = (periodIdx) => {
        setAbsentees(prev => ({ ...prev, [periodIdx]: [] }));
        setAbsentInputs(prev => ({ ...prev, [periodIdx]: '' }));
        setHasModifications(true);
    };

    // Copy absentees from previous period
    const copyFromPrevious = (periodIdx) => {
        if (periodIdx === 0) return;
        const prevAbsentees = absentees[periodIdx - 1] || [];
        setAbsentees(prev => ({ ...prev, [periodIdx]: [...prevAbsentees] }));
        setAbsentInputs(prev => ({
            ...prev,
            [periodIdx]: prevAbsentees.sort((a, b) => a - b).join(', ')
        }));
        setHasModifications(true);
        notify({ message: `Copied ${prevAbsentees.length} absentee(s) from P${timetable[periodIdx - 1]?.period || periodIdx}`, type: 'success' });
    };

    const submitAttendance = async () => {
        if (!classId) return;

        const validPeriods = timetable.filter(slot => slot.subjectId);
        if (validPeriods.length === 0) {
            notify({ message: "Please add at least one class with a subject selected", type: 'error' });
            return;
        }

        setSaving(true);
        const formattedPeriods = timetable.map((slot, index) => ({
            periodNum: slot.period,
            subjectId: slot.subjectId,
            subjectName: slot.subjectName,
            absentRollNumbers: absentees[index] || []
        }));

        try {
            await api.post('/attendance/mark', {
                classId: classId,
                date: selectedDate,
                periods: formattedPeriods
            });
            notify({ message: "Attendance Saved Successfully ✓", type: 'success' });
            setHasModifications(false);

            // Refresh attendance dates list
            api.get(`/attendance/dates/${classId}`)
                .then(datesRes => {
                    const formattedDates = (datesRes.data.dates || []).map(dateStr => {
                        return new Date(dateStr).toISOString().split('T')[0];
                    });
                    setAttendanceDates(formattedDates);
                })
                .catch(() => { });

            loadAttendanceForDate(selectedDate, classId, savedTimetable, subjects);
        } catch (err) {
            notify({ message: "Failed to save attendance", type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Format date for display
    const formatDateDisplay = (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00');
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

    // Get total counts for the header
    const totalAbsent = Object.values(absentees).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    const totalPresent = timetable.length > 0 ? (timetable.length * classStrength) - totalAbsent : 0;

    if (loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading...</div>;

    return (
        <>
            <Navbar isAdmin={true} onLogout={handleLogout} classId={classId} />

            <div className="max-w-4xl mx-auto px-4 py-6 pb-24">

                {/* ─── Header with Quick Stats ─── */}
                <div className="mb-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-2xl font-bold mb-1" style={{ letterSpacing: '-0.03em' }}>
                                Mark Attendance
                            </h1>
                            <p className="text-[var(--text-dim)] text-sm">{className}</p>
                        </div>
                        {/* Pending reports badge */}
                        {pendingReports > 0 && (
                            <button
                                onClick={() => router.push(`/admin/reports/${classId}`)}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/15 transition"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                {pendingReports} pending report{pendingReports > 1 ? 's' : ''}
                            </button>
                        )}
                    </div>

                    {/* Quick stats row */}
                    {timetable.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="glass-card !p-3 text-center !rounded-xl">
                                <p className="text-lg font-bold">{timetable.length}</p>
                                <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Periods</p>
                            </div>
                            <div className="glass-card !p-3 text-center !rounded-xl">
                                <p className="text-lg font-bold text-emerald-400">{totalPresent}</p>
                                <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Present</p>
                            </div>
                            <div className="glass-card !p-3 text-center !rounded-xl">
                                <p className={`text-lg font-bold ${totalAbsent > 0 ? 'text-red-400' : 'text-[var(--text-dim)]'}`}>{totalAbsent}</p>
                                <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Absent</p>
                            </div>
                        </div>
                    )}

                    {lastModified && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
                            <Clock className="w-3 h-3" />
                            Last modified: {lastModified.toLocaleString('en-US', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                        </div>
                    )}
                </div>

                {/* ─── Date Selector ─── */}
                <div className="mb-6">
                    <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        className={`w-full py-3 rounded-full border transition text-sm font-medium flex items-center justify-center gap-2 relative ${showCalendar
                            ? 'bg-blue-950/30 border-blue-500/40 text-blue-400'
                            : 'glass-card !rounded-full !py-3 !mb-0 hover:border-white/20'
                            }`}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        <span>{formatDateDisplay(selectedDate)}</span>
                        <span className="text-[var(--text-dim)] text-xs ml-1">
                            · {getDayName(selectedDate)}
                        </span>
                        {attendanceDates.includes(selectedDate) && (
                            <div className="absolute top-2 right-4 w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30"></div>
                        )}
                    </button>
                </div>

                {/* Calendar View */}
                {showCalendar && (
                    <div className="mb-6 animate-fade-in">
                        <Calendar
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                            attendanceDates={attendanceDates}
                        />
                    </div>
                )}

                {/* ─── Timetable auto-load notice ─── */}
                {timetable.length > 0 && !lastModified && timetableLoaded && (
                    <div className="flex items-center gap-2 px-4 py-2.5 mb-4 rounded-xl bg-blue-950/20 border border-blue-500/15 text-xs text-blue-400">
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Timetable auto-loaded for {getDayName(selectedDate)}. Mark absentees below.</span>
                    </div>
                )}

                {/* ─── Period Cards ─── */}
                {timetable.length > 0 && (
                    <div className="space-y-4">
                        {timetable.map((slot, index) => {
                            const absentCount = (absentees[index] || []).length;
                            const presentCount = classStrength - absentCount;

                            return (
                                <div key={index} className="card animate-fade-in">
                                    {/* Period header */}
                                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-[var(--border)]">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-[var(--text-dim)] bg-white/5 w-9 h-9 rounded-lg flex items-center justify-center">
                                                P{slot.period}
                                            </span>
                                            <select
                                                className="input w-auto min-w-[150px] !py-2"
                                                value={slot.subjectId}
                                                onChange={(e) => updatePeriod(slot.period, e.target.value)}
                                            >
                                                <option value="">-- Select Subject --</option>
                                                {subjects.map(sub => (
                                                    <option key={sub._id} value={sub._id}>{sub.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${absentCount > 0
                                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                }`}>
                                                {absentCount > 0 ? `${absentCount} absent` : 'All present'}
                                            </span>
                                            <button
                                                onClick={() => removePeriod(slot.period)}
                                                className="w-8 h-8 bg-red-500/10 text-red-400 rounded-lg text-xs hover:bg-red-500/20 flex items-center justify-center transition"
                                                title="Remove period"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quick actions */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <button
                                            onClick={() => markAllPresent(index)}
                                            className="text-xs px-3 py-1.5 rounded-full border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 transition flex items-center gap-1.5"
                                        >
                                            <CheckCircle className="w-3 h-3" />
                                            All Present
                                        </button>
                                        {index > 0 && (
                                            <button
                                                onClick={() => copyFromPrevious(index)}
                                                className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-[var(--text-dim)] hover:text-white hover:border-white/20 transition flex items-center gap-1.5"
                                            >
                                                <RotateCcw className="w-3 h-3" />
                                                Copy P{timetable[index - 1]?.period}
                                            </button>
                                        )}
                                    </div>

                                    {/* Bulk input */}
                                    <div className="mb-3">
                                        <input
                                            type="text"
                                            placeholder="Type absent roll numbers (e.g. 1, 5, 12, 23)"
                                            value={absentInputs[index] || ''}
                                            onChange={(e) => handleBulkAbsentInput(index, e.target.value)}
                                            className="input w-full text-sm !rounded-xl"
                                        />
                                    </div>

                                    {/* Grid */}
                                    <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
                                        {[...Array(classStrength)].map((_, i) => {
                                            const roll = i + 1;
                                            const isAbsent = (absentees[index] || []).includes(roll);

                                            return (
                                                <button
                                                    key={roll}
                                                    onClick={() => toggleAbsent(index, roll)}
                                                    className={`grid-box ${isAbsent ? 'absent' : 'present'}`}
                                                >
                                                    {roll}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ─── Add Class Button ─── */}
                <div className="text-center my-6">
                    <button
                        onClick={addPeriod}
                        className="btn btn-outline inline-flex w-auto px-8 items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Period
                    </button>
                    {timetable.length === 0 && !timetableLoaded && (
                        <p className="text-[var(--text-dim)] text-sm mt-4">
                            No classes scheduled for {getDayName(selectedDate)}.<br />
                            <span className="text-xs">Tap "Add Period" to manually add classes, or set up your weekly timetable first.</span>
                        </p>
                    )}
                </div>

                {/* ─── Save Button — Fixed at bottom ─── */}
                {timetable.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent z-50">
                        <div className="max-w-4xl mx-auto">
                            <button
                                onClick={submitAttendance}
                                disabled={saving}
                                className={`btn btn-primary w-full flex items-center justify-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        {hasModifications ? 'Save Changes' : isViewingPastDate ? 'Update Attendance' : 'Save Attendance'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </>
    );
}