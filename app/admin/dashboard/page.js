"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Save, Plus, X, Calendar as CalendarIcon, CheckCircle, ShieldAlert } from 'lucide-react';
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
    const [absentInputs, setAbsentInputs] = useState({}); // Track raw input text
    const [verificationCodes, setVerificationCodes] = useState({}); // Track teacher codes
    const [verificationStatuses, setVerificationStatuses] = useState({}); // Track verification status
    const [showCalendar, setShowCalendar] = useState(false);
    const [attendanceDates, setAttendanceDates] = useState([]);
    const [hasModifications, setHasModifications] = useState(false);
    const [isViewingPastDate, setIsViewingPastDate] = useState(false);
    const [defaultTimetable, setDefaultTimetable] = useState(null);
    const [lastModified, setLastModified] = useState(null);
    const [classStrength, setClassStrength] = useState(70); // Default to 70, will be updated from backend

    // Check if viewing past date
    const checkIfPastDate = (date) => {
        const today = new Date().toISOString().split('T')[0];
        setIsViewingPastDate(date < today);
    };

    // Load attendance for selected date
    const loadAttendanceForDate = async (date, classId) => {
        try {
            const res = await api.get(`/attendance/by-date/${classId}/${date}`);
            if (res.data && res.data.periods && res.data.periods.length > 0) {
                // Load the timetable structure AND absentees from attendance record
                const formattedTimetable = res.data.periods.map(period => ({
                    period: period.periodNum,
                    subjectName: period.subjectName,
                    subjectId: period.subjectId
                }));

                const newAbsentees = {};
                const newAbsentInputs = {};
                const newVerificationStatuses = {};

                res.data.periods.forEach((period, index) => {
                    newAbsentees[index] = period.absentRollNumbers || [];
                    newAbsentInputs[index] = (period.absentRollNumbers || []).sort((a, b) => a - b).join(', ');
                    newVerificationStatuses[index] = period.isVerified;
                });

                setTimetable(formattedTimetable);
                setAbsentees(newAbsentees);
                setAbsentInputs(newAbsentInputs);
                setVerificationStatuses(newVerificationStatuses);
                setVerificationCodes({}); // Reset codes input
                setHasModifications(false);

                // Set last modified time
                if (res.data.updatedAt) {
                    setLastModified(new Date(res.data.updatedAt));
                }
            } else {
                // No attendance for this date, fetch correct day's timetable
                const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                const selectedDayName = days[new Date(date + 'T00:00:00').getDay()];

                // Fetch the timetable for this specific day
                const classRes = await api.get(`/class/${classId}`);
                const daySchedule = classRes.data.timetable?.[selectedDayName] || [];
                const subjectsList = classRes.data.subjects || [];

                const formattedTimetable = daySchedule.map(slot => {
                    const sub = subjectsList.find(s => s._id === slot.subjectId);
                    return {
                        period: slot.period,
                        subjectName: sub ? sub.name : "Unknown",
                        subjectId: slot.subjectId
                    };
                });
                setTimetable(formattedTimetable);
                setAbsentees({});
                setAbsentInputs({});
                setVerificationStatuses({});
                setVerificationCodes({});
                setHasModifications(false);
                setLastModified(null);
            }
        } catch (err) {
            // No attendance data for this date, fetch correct day's timetable
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const selectedDayName = days[new Date(date + 'T00:00:00').getDay()];

            try {
                const classRes = await api.get(`/class/${classId}`);
                const daySchedule = classRes.data.timetable?.[selectedDayName] || [];
                const subjectsList = classRes.data.subjects || [];

                const formattedTimetable = daySchedule.map(slot => {
                    const sub = subjectsList.find(s => s._id === slot.subjectId);
                    return {
                        period: slot.period,
                        subjectName: sub ? sub.name : "Unknown",
                        subjectId: slot.subjectId
                    };
                });
                setTimetable(formattedTimetable);
            } catch (error) {
                setTimetable([]);
            }
            setAbsentees({});
            setAbsentInputs({});
            setVerificationStatuses({});
            setVerificationCodes({});
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
                setClassStrength(res.data.totalStudents || 70); // Fetch actual class strength

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

                // IMPROVED: Immediately load attendance for today if exists
                // This prevents the "empty inputs" flash or state mismatch
                loadAttendanceForDate(today, storedClassId);

                // Fetch list of dates with attendance
                api.get(`/attendance/dates/${storedClassId}`)
                    .then(datesRes => {
                        // Convert ISO strings to YYYY-MM-DD format for calendar comparison
                        const formattedDates = (datesRes.data.dates || []).map(dateStr => {
                            return new Date(dateStr).toISOString().split('T')[0];
                        });
                        console.log('📅 Formatted attendance dates:', formattedDates);
                        setAttendanceDates(formattedDates);
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
        const indexToRemove = timetable.findIndex(p => p.period === periodNum);
        if (indexToRemove === -1) return;

        setTimetable(prev => prev.filter(p => p.period !== periodNum));

        const shiftState = (prev) => {
            const updated = {};
            Object.keys(prev).forEach(key => {
                const k = parseInt(key, 10);
                if (isNaN(k)) return;

                if (k < indexToRemove) {
                    updated[k] = prev[k];
                } else if (k > indexToRemove) {
                    updated[k - 1] = prev[k];
                }
            });
            return updated;
        };

        setAbsentees(shiftState);
        setAbsentInputs(shiftState);
        setVerificationStatuses(shiftState);
        setVerificationCodes(shiftState);
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

            // Sync the input text as well
            setAbsentInputs(prevInputs => ({
                ...prevInputs,
                [periodIdx]: newList.sort((a, b) => a - b).join(', ')
            }));

            return { ...prev, [periodIdx]: newList };
        });
        setHasModifications(true);
    };

    const handleBulkAbsentInput = (periodIdx, inputValue) => {
        // Store the raw input value
        setAbsentInputs(prev => ({ ...prev, [periodIdx]: inputValue }));

        if (!inputValue.trim()) {
            // Clear all if empty
            setAbsentees(prev => ({ ...prev, [periodIdx]: [] }));
            setHasModifications(true);
            return;
        }

        // Parse comma-separated values
        const rollNumbers = inputValue
            .split(',')
            .map(str => parseInt(str.trim()))
            .filter(num => !isNaN(num) && num >= 1 && num <= classStrength); // Validate range

        // Remove duplicates
        const uniqueRolls = [...new Set(rollNumbers)];

        setAbsentees(prev => ({ ...prev, [periodIdx]: uniqueRolls }));
        setHasModifications(true);
    };

    const handleVerificationCodeInput = (periodIdx, value) => {
        setVerificationCodes(prev => ({ ...prev, [periodIdx]: value }));
        setHasModifications(true);
    };

    const submitAttendance = async () => {
        if (!classId) return;

        const formattedPeriods = timetable.map((slot, index) => ({
            periodNum: slot.period,
            subjectId: slot.subjectId,
            subjectName: slot.subjectName,
            absentRollNumbers: absentees[index] || [],
            verificationCode: verificationCodes[index] || ""
        }));

        try {
            const res = await api.post('/attendance/mark', {
                classId: classId,
                date: selectedDate,
                periods: formattedPeriods
            });
            notify({ message: "Attendance Saved Successfully", type: 'success' });
            setIsEditing(false);
            setHasModifications(false);

            // Refetch to get updated statuses (like verification)
            loadAttendanceForDate(selectedDate, classId);

            // Refresh attendance dates list
            api.get(`/attendance/dates/${classId}`)
                .then(datesRes => {
                    const formattedDates = (datesRes.data.dates || []).map(dateStr => {
                        return new Date(dateStr).toISOString().split('T')[0];
                    });
                    setAttendanceDates(formattedDates);
                })
                .catch(err => console.log("Failed to refresh dates"));

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
            <Navbar isAdmin={true} onLogout={handleLogout} classId={classId} />

            <div className="max-w-4xl mx-auto px-4 py-6 pb-24">

                {/* Header */}
                <div className="mb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold mb-1">Mark Attendance</h1>
                            <p className="text-[var(--text-dim)] text-sm">{className}</p>
                        </div>
                    </div>
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
                        className={`flex-1 py-3 rounded-full border transition text-sm font-medium flex items-center justify-center gap-2 relative ${showCalendar
                            ? 'bg-blue-900/20 border-blue-500/50 text-blue-400'
                            : 'bg-[var(--card-bg)] border-[var(--border)] hover:border-white/50'
                            }`}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        {formatDateDisplay(selectedDate)}
                        {/* Green dot if attendance is saved for this date */}
                        {attendanceDates.includes(selectedDate) && (
                            <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 rounded-full shadow-lg"></div>
                        )}
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
                                    <div className="flex flex-col gap-1 w-full mr-4">
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
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-lg font-semibold">{slot.subjectName}</h2>
                                                    {verificationStatuses[index] && (
                                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {/* Teacher Code Input */}
                                        {!isEditing && (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Teacher Code"
                                                    className={`bg-white/5 border border-white/10 rounded px-2 py-1 text-xs w-24 focus:outline-none focus:border-blue-500 transition ${verificationStatuses[index] ? 'opacity-50' : ''}`}
                                                    value={verificationCodes[index] || ""}
                                                    onChange={(e) => handleVerificationCodeInput(index, e.target.value)}
                                                    disabled={!!verificationStatuses[index]} // Disable if already verified? Maybe allow edit if code was wrong? But if verified, keep it.
                                                />
                                                {verificationStatuses[index] ? (
                                                    <span className="text-xs text-green-400 flex items-center gap-1">
                                                        Verified
                                                    </span>
                                                ) : (
                                                    verificationCodes[index] && <span className="text-xs text-[var(--text-dim)]">Pending</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
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

                                {/* Bulk input for absent roll numbers */}
                                <div className="mb-3">
                                    <label className="text-xs text-[var(--text-dim)] block mb-1.5">
                                        Mark Absent (comma-separated roll numbers)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 1, 5, 12, 23"
                                        value={absentInputs[index] || ''}
                                        onChange={(e) => handleBulkAbsentInput(index, e.target.value)}
                                        className="input w-full text-sm"
                                    />
                                    <p className="text-xs text-[var(--text-dim)] mt-1">
                                        {(absentees[index] || []).length} student(s) marked absent
                                    </p>
                                </div>

                                <div className="grid grid-cols-7 gap-2">
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