"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Save, Plus, X, Calendar as CalendarIcon } from 'lucide-react';
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
    const [todayName, setTodayName] = useState("");
    const [selectedDate, setSelectedDate] = useState('');
    const [overrideDay, setOverrideDay] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [absentees, setAbsentees] = useState({});
    const [showCalendar, setShowCalendar] = useState(false);
    const [attendanceDates, setAttendanceDates] = useState([]);
    const [hasModifications, setHasModifications] = useState(false);
    const [isViewingPastDate, setIsViewingPastDate] = useState(false);
    const [defaultTimetable, setDefaultTimetable] = useState(null);
    const [lastModified, setLastModified] = useState(null);

    // Check if viewing past date
    const checkIfPastDate = (date) => {
        const today = new Date().toISOString().split('T')[0];
        setIsViewingPastDate(date < today);
    };

    // Load attendance for selected date
    const loadAttendanceForDate = async (date, classId) => {
        try {
            const res = await api.get(`/attendance/by-date/${classId}/${date}`);
            if (res.data && res.data.periods) {
                // Load the timetable structure AND absentees from attendance record
                const formattedTimetable = res.data.periods.map(period => ({
                    period: period.periodNum,
                    subjectName: period.subjectName,
                    subjectId: period.subjectId
                }));

                const newAbsentees = {};
                res.data.periods.forEach((period, index) => {
                    newAbsentees[index] = period.absentRollNumbers || [];
                });

                setTimetable(formattedTimetable);
                setAbsentees(newAbsentees);
                setHasModifications(false);

                // Set last modified time
                if (res.data.updatedAt) {
                    setLastModified(new Date(res.data.updatedAt));
                }
            } else {
                // No attendance for this date, use default timetable
                if (defaultTimetable) {
                    setTimetable(defaultTimetable);
                }
                setAbsentees({});
                setHasModifications(false);
                setLastModified(null);
            }
        } catch (err) {
            // No attendance data for this date, use default timetable
            console.log("No attendance for", date);
            if (defaultTimetable) {
                setTimetable(defaultTimetable);
            }
            setAbsentees({});
            setHasModifications(false);
            setLastModified(null);
        }
    };

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

        api.get(`/class/${storedClassId}`)
            .then(res => {
                const subjects = res.data.subjects;
                setSubjects(subjects);
                setClassName(res.data.className);

                const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                const currentDay = days[new Date().getDay()];
                setTodayName(currentDay);

                const dayToLoad = overrideDay || currentDay;
                const todaySchedule = res.data.timetable?.[dayToLoad] || [];

                const formattedTimetable = todaySchedule.map(slot => {
                    const sub = subjects.find(s => s._id === slot.subjectId);
                    return {
                        period: slot.period,
                        subjectName: sub ? sub.name : "Unknown",
                        subjectId: slot.subjectId
                    };
                });

                setTimetable(formattedTimetable);
                setDefaultTimetable(formattedTimetable); // Store as default
                setLoading(false);

                // Load attendance for today immediately after setting default
                loadAttendanceForDate(today, storedClassId);

                // Fetch list of dates with attendance
                api.get(`/attendance/dates/${storedClassId}`)
                    .then(datesRes => {
                        setAttendanceDates(datesRes.data.dates || []);
                    })
                    .catch(err => console.log("No attendance dates yet"));
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [router, overrideDay]);

    // Load attendance when date changes (not on initial load)
    useEffect(() => {
        // Only load if we've already loaded once (defaultTimetable exists)
        // and the date or classId actually changed
        if (classId && selectedDate && defaultTimetable) {
            loadAttendanceForDate(selectedDate, classId);
            checkIfPastDate(selectedDate);
            setShowCalendar(false); // Close calendar after selection

            // Update todayName to match selected date
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const selectedDayName = days[new Date(selectedDate + 'T00:00:00').getDay()];
            setTodayName(selectedDayName);
        }
    }, [selectedDate]); // Only depend on selectedDate, not classId or defaultTimetable

    // Reload timetable when overrideDay changes
    useEffect(() => {
        if (overrideDay && classId) {
            // Reload from default schedule when override changes
            api.get(`/class/${classId}`)
                .then(res => {
                    const todaySchedule = res.data.timetable?.[overrideDay] || [];
                    const formattedTimetable = todaySchedule.map(slot => {
                        const sub = subjects.find(s => s._id === slot.subjectId);
                        return {
                            period: slot.period,
                            subjectName: sub ? sub.name : "Unknown",
                            subjectId: slot.subjectId
                        };
                    });
                    setTimetable(formattedTimetable);
                    setDefaultTimetable(formattedTimetable);
                });
        }
    }, [overrideDay]);

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
        setTimetable(timetable.filter(p => p.period !== periodNum));
        setAbsentees(prev => {
            const updated = { ...prev };
            delete updated[timetable.findIndex(p => p.period === periodNum)];
            return updated;
        });
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
            if (currentList.includes(rollNo)) {
                return { ...prev, [periodIdx]: currentList.filter(r => r !== rollNo) };
            } else {
                return { ...prev, [periodIdx]: [...currentList, rollNo] };
            }
        });
        setHasModifications(true);
    };

    const submitAttendance = async () => {
        if (!classId) return;

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
            notify({ message: "Attendance Saved Successfully", type: 'success' });
            setIsEditing(false);
            setHasModifications(false);

            // Refresh attendance dates list
            api.get(`/attendance/dates/${classId}`)
                .then(datesRes => setAttendanceDates(datesRes.data.dates || []))
                .catch(err => console.log("Failed to refresh dates"));

            // Reload the attendance for current date to show saved data
            loadAttendanceForDate(selectedDate, classId);
        } catch (err) {
            notify({ message: "Failed to save attendance", type: 'error' });
        }
    };

    // Format date for display
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

    // Determine button text
    const getButtonText = () => {
        if (hasModifications || isEditing) {
            return 'Save Changes';
        }
        if (isViewingPastDate) {
            return 'Update Attendance';
        }
        return 'Save Attendance';
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading...</div>;

    return (
        <>
            <Navbar isAdmin={true} onLogout={handleLogout} />

            <div className="max-w-4xl mx-auto px-4 py-6 pb-24">

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold mb-1">Mark Attendance</h1>
                    <p className="text-[var(--text-dim)] text-sm">{className}</p>
                    {lastModified && (
                        <p className="text-xs text-[var(--text-dim)] mt-1">
                            Last modified: {lastModified.toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    )}
                </div>

                {/* Date Display and Edit Mode Row */}
                <div className="flex gap-3 mb-6">
                    <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        className={`flex-1 py-3 rounded-full border transition text-sm font-medium flex items-center justify-center gap-2 ${showCalendar
                            ? 'bg-blue-900/20 border-blue-500/50 text-blue-400'
                            : 'bg-[var(--card-bg)] border-[var(--border)] hover:border-white/50'
                            }`}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        {formatDateDisplay(selectedDate)}
                    </button>
                    <button
                        onClick={() => {
                            setIsEditing(!isEditing);
                            if (!isEditing) setHasModifications(true);
                        }}
                        className={`flex-1 py-3 rounded-full border transition text-sm font-medium flex items-center justify-center gap-2 ${isEditing
                            ? 'bg-orange-900/20 border-orange-500/50 text-orange-400'
                            : 'bg-[var(--card-bg)] border-[var(--border)] hover:border-white/50'
                            }`}
                    >
                        <Edit className="w-4 h-4" />
                        Edit Mode
                    </button>
                </div>

                {/* Calendar View */}
                {showCalendar && (
                    <div className="mb-6">
                        <Calendar
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                            attendanceDates={attendanceDates}
                        />
                    </div>
                )}

                {/* Edit Mode Panel */}
                {isEditing && (
                    <div className="card mb-6 border-orange-500/30 bg-orange-900/10">
                        <h2 className="text-sm uppercase text-orange-400 mb-3">Editing Options</h2>

                        {/* Day Override in Edit Mode */}
                        <div className="mb-3">
                            <label className="text-xs text-[var(--text-dim)] block mb-2">Use Different Day's Schedule</label>
                            <select
                                value={overrideDay || todayName}
                                onChange={(e) => {
                                    setOverrideDay(e.target.value === todayName ? null : e.target.value);
                                    setHasModifications(true);
                                }}
                                className="input w-full"
                            >
                                <option value={todayName}>{todayName} (Default)</option>
                                <option value="Monday">Monday</option>
                                <option value="Tuesday">Tuesday</option>
                                <option value="Wednesday">Wednesday</option>
                                <option value="Thursday">Thursday</option>
                                <option value="Friday">Friday</option>
                                <option value="Saturday">Saturday</option>
                            </select>
                        </div>

                        <p className="text-xs text-[var(--text-dim)]">
                            Modify periods, add/remove, or change subjects for this date only
                        </p>
                    </div>
                )}

                {/* Timetable & Attendance */}
                {timetable.length === 0 ? (
                    <div className="card text-center py-12">
                        <p className="text-[var(--text-dim)] mb-4">No classes scheduled for {overrideDay || todayName}</p>
                        <button
                            onClick={() => router.push('/admin/timetable')}
                            className="btn btn-primary inline-flex w-auto px-6"
                        >
                            Set Up Timetable Now
                        </button>
                    </div>
                ) : (
                    <>
                        {timetable.map((slot, index) => (
                            <div key={index} className="card mb-4">

                                <div className="flex justify-between items-center mb-4 pb-3 border-b border-[var(--border)]">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-bold text-[var(--text-dim)]">P{slot.period}</span>
                                        {isEditing ? (
                                            <select
                                                className="input w-auto min-w-[150px]"
                                                value={slot.subjectId}
                                                onChange={(e) => updatePeriod(slot.period, e.target.value)}
                                            >
                                                <option value="">-- Select --</option>
                                                {subjects.map(sub => (
                                                    <option key={sub._id} value={sub._id}>{sub.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <h2 className="text-lg font-semibold">{slot.subjectName}</h2>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-md text-sm font-semibold ${(absentees[index] || []).length > 0
                                            ? 'bg-[var(--danger)] text-[var(--danger-text)]'
                                            : 'bg-[var(--success)] text-[var(--success-text)]'
                                            }`}>
                                            {(absentees[index] || []).length} Absent
                                        </span>
                                        {isEditing && (
                                            <button
                                                onClick={() => removePeriod(slot.period)}
                                                className="px-2 py-1 bg-red-900/20 text-red-400 rounded-full text-xs hover:bg-red-900/30 flex items-center"
                                                title="Remove period"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-7 gap-2">
                                    {[...Array(70)].map((_, i) => {
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
                        ))}

                        {isEditing && (
                            <div className="text-center mb-6">
                                <button
                                    onClick={addPeriod}
                                    className="btn btn-outline inline-flex w-auto px-6 items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Period
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Save Button - Absolute positioned */}
                {timetable.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black to-transparent">
                        <div className="max-w-4xl mx-auto">
                            <button
                                onClick={submitAttendance}
                                className="btn btn-primary w-full flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {getButtonText()}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </>
    );
}