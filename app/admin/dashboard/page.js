"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Save, Plus, X, Calendar as CalendarIcon,
    RotateCcw, FileText, Clock, CheckCircle,
    AlertTriangle, Loader2, Camera, Lock, LockOpen,
    ZoomIn, ZoomOut, Move, Crop as CropIcon, RefreshCw
} from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Calendar from '@/app/components/Calendar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
const sanitizeRollNumber = (value) => {
    if (value === undefined || value === null) return null;
    // Remove invisible characters, spaces, and accidental quotes
    const cleaned = String(value).trim().replace(/['"]/g, '');
    return cleaned || null;
};

const sortRollNumbers = (rolls) => {
    return [...rolls].sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
    );
};

const normalizeClassRollNumbers = (classData) => {
    const rawRolls = Array.isArray(classData?.rollNumbers) ? classData.rollNumbers : [];
    const seen = new Set();
    const normalizedRolls = rawRolls
        .map((roll) => sanitizeRollNumber(roll))
        .filter((roll) => {
            if (!roll || seen.has(roll)) return false;
            seen.add(roll);
            return true;
        });

    if (normalizedRolls.length > 0) {
        return sortRollNumbers(normalizedRolls);
    }

    const totalStudents = Number(classData?.totalStudents);
    if (Number.isInteger(totalStudents) && totalStudents > 0) {
        return Array.from({ length: totalStudents }, (_, index) => String(index + 1));
    }

    return [];
};

const AUTO_RELOCK_MS = 2 * 60 * 1000;

export default function AdminDashboard() {
    const router = useRouter();
    const notify = useNotification();
    const [loading, setLoading] = useState(true);
    const [periods, setPeriods] = useState([]);
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
    const [classRollNumbers, setClassRollNumbers] = useState([]);
    const [saving, setSaving] = useState(false);
    const [pendingReports, setPendingReports] = useState(0);
    const [confirmRemovePeriod, setConfirmRemovePeriod] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanningPeriodIndex, setScanningPeriodIndex] = useState(null);
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [newStudentRoll, setNewStudentRoll] = useState('');
    const [addingStudent, setAddingStudent] = useState(false);
    const [isDateLocked, setIsDateLocked] = useState(false);
    const [autoRelockArmed, setAutoRelockArmed] = useState(false);
    const [imageToCrop, setImageToCrop] = useState(null);
    const fileInputRef = useRef(null);
    const autoRelockTimerRef = useRef(null);
    const cropperRef = useRef(null);
    const allowedRollSet = new Set(classRollNumbers);

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

    // Load attendance for selected date
    const loadAttendanceForDate = useCallback(async (date, cId) => {
        try {
            const res = await api.get(`/attendance/by-date/${cId}/${date}`);
            if (res.data && res.data.periods && res.data.periods.length > 0) {
                // Load saved attendance
                const formattedPeriods = res.data.periods.map(period => ({
                    period: period.periodNum,
                    subjectName: period.subjectName,
                    subjectId: period.subjectId
                }));

                const newAbsentees = {};
                const newAbsentInputs = {};
                res.data.periods.forEach((period, index) => {
                    const normalizedRolls = sortRollNumbers(
                        (period.absentRollNumbers || [])
                            .map((roll) => sanitizeRollNumber(roll))
                            .filter(Boolean)
                    );
                    newAbsentees[index] = normalizedRolls;
                    newAbsentInputs[index] = normalizedRolls.join(', ');
                });

                setPeriods(formattedPeriods);
                setAbsentees(newAbsentees);
                setAbsentInputs(newAbsentInputs);
                setHasModifications(false);
                setIsDateLocked(true);
                setAutoRelockArmed(false);

                if (res.data.updatedAt) {
                    setLastModified(new Date(res.data.updatedAt));
                }
            } else {
                // No attendance for this date — DO NOT auto-load (User request)
                setPeriods([]);
                setAbsentees({});
                setAbsentInputs({});
                setHasModifications(false);
                setLastModified(null);
                setIsDateLocked(false);
                setAutoRelockArmed(false);
            }
        } catch (err) {
            // Error fetching attendance — reset to empty
            setPeriods([]);
            setAbsentees({});
            setAbsentInputs({});
            setHasModifications(false);
            setLastModified(null);
            setIsDateLocked(false);
            setAutoRelockArmed(false);
        }
    }, []);

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
            const normalizedClassRollNumbers = normalizeClassRollNumbers(classRes.data);

            setSubjects(subjectsList);
            setClassName(classRes.data.className);
            setClassRollNumbers(normalizedClassRollNumbers);

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
            loadAttendanceForDate(today, storedClassId);
        }).catch(() => {
            setLoading(false);
        });
    }, [router, loadAttendanceForDate]);

    // Load attendance when date changes
    useEffect(() => {
        if (classId && selectedDate && subjects.length > 0) {
            loadAttendanceForDate(selectedDate, classId);
            checkIfPastDate(selectedDate);
            setShowCalendar(false);
        }
    }, [selectedDate, classId, subjects, loadAttendanceForDate]);

    const clearAutoRelockTimer = useCallback(() => {
        if (autoRelockTimerRef.current) {
            clearTimeout(autoRelockTimerRef.current);
            autoRelockTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (isDateLocked || !autoRelockArmed) {
            clearAutoRelockTimer();
            return;
        }

        const resetAutoRelockTimer = () => {
            clearAutoRelockTimer();
            autoRelockTimerRef.current = window.setTimeout(() => {
                setIsDateLocked(true);
                setAutoRelockArmed(false);
                notify({ message: 'Editing auto-locked after 2 minutes of inactivity.', type: 'success' });
            }, AUTO_RELOCK_MS);
        };

        const activityEvents = ['pointerdown', 'keydown', 'input', 'touchstart'];
        activityEvents.forEach((eventName) => {
            window.addEventListener(eventName, resetAutoRelockTimer, true);
        });

        resetAutoRelockTimer();

        return () => {
            activityEvents.forEach((eventName) => {
                window.removeEventListener(eventName, resetAutoRelockTimer, true);
            });
            clearAutoRelockTimer();
        };
    }, [isDateLocked, autoRelockArmed, notify, clearAutoRelockTimer]);

    const handleLogout = () => {
        localStorage.removeItem('adminClassId');
        localStorage.removeItem('token');
        router.push('/');
    };

    const handleCameraButtonClick = (periodIdx) => {
        if (isDateLocked) return;
        setScanningPeriodIndex(periodIdx);
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleImageUpload = (e) => {
        if (isDateLocked) return;
        const file = e.target.files?.[0];
        if (!file || scanningPeriodIndex === null) return;

        e.target.value = ''; // Reset input

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
            setImageToCrop(reader.result);
        };
    };

    const confirmCrop = async () => {
        if (isDateLocked) return;
        if (typeof cropperRef.current?.cropper === "undefined") {
            return;
        }

        const cropper = cropperRef.current?.cropper;
        const canvas = cropper.getCroppedCanvas({
            maxWidth: 1200,
            maxHeight: 1200,
            fillColor: '#fff',
        });

        if (!canvas) {
            notify({ message: "Could not crop image", type: 'error' });
            return;
        }

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setIsScanning(true);
        const currentIndex = scanningPeriodIndex;
        // Close modal
        setImageToCrop(null);

        try {
            if (currentIndex === 'FULL_PAGE') {
                const res = await api.post('/ai/scan-full-logbook', { imageBase64: compressedBase64 });
                const newPeriodsData = res.data.periods || {};

                if (Object.keys(newPeriodsData).length === 0) {
                    notify({ message: "No periods found in the image", type: 'error' });
                } else {
                    const sortedPeriods = Object.keys(newPeriodsData)
                        .map(p => parseInt(p, 10))
                        .filter(p => !isNaN(p))
                        .sort((a, b) => a - b);

                    if (sortedPeriods.length === 0) {
                        notify({ message: "No valid period numbers found. Check image.", type: 'error' });
                    } else {
                        const generatedPeriods = sortedPeriods.map((periodNum) => ({
                            period: periodNum,
                            subjectId: "",
                            subjectName: ""
                        }));

                        const newAbsentees = {};
                        const newAbsentInputs = {};

                        sortedPeriods.forEach((periodNum, arrayIndex) => {
                            const rolls = newPeriodsData[periodNum] || [];
                            const uniqueValidRolls = [];
                            const seen = new Set();
                            rolls.forEach(r => {
                                const strRoll = String(r);
                                if (allowedRollSet.has(strRoll) && !seen.has(strRoll)) {
                                    seen.add(strRoll);
                                    uniqueValidRolls.push(strRoll);
                                }
                            });

                            const sorted = sortRollNumbers(uniqueValidRolls);
                            newAbsentees[arrayIndex] = sorted;
                            newAbsentInputs[arrayIndex] = sorted.join(', ');
                        });

                        setPeriods(generatedPeriods);
                        setAbsentees(newAbsentees);
                        setAbsentInputs(newAbsentInputs);
                        setHasModifications(true);
                        notify({ message: "Full page scanned successfully! Please select subjects.", type: 'success' });
                    }
                }
            } else {
                const res = await api.post('/ai/scan-logbook', { imageBase64: compressedBase64 });
                const rollNumbersStr = res.data.rollNumbers || '';
                if (!rollNumbersStr) {
                    notify({ message: "No numbers found in the image", type: 'error' });
                } else {
                    handleBulkAbsentInput(currentIndex, rollNumbersStr);
                    notify({ message: "Logbook scanned successfully!", type: 'success' });
                }
            }
        } catch (apiErr) {
            const errorMsg = apiErr.response?.data?.details || apiErr.response?.data?.error || apiErr.message || "Please check server.";
            notify({ message: `AI Scan failed: ${errorMsg}`, type: 'error' });
        } finally {
            setIsScanning(false);
            setScanningPeriodIndex(null);
        }
    };

    const cancelCrop = () => {
        setImageToCrop(null);
        setScanningPeriodIndex(null);
    };

    const handleFullPageScanClick = () => {
        if (isDateLocked) return;
        setScanningPeriodIndex('FULL_PAGE');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleZoomIn = () => cropperRef.current?.cropper.zoom(0.1);
    const handleZoomOut = () => cropperRef.current?.cropper.zoom(-0.1);
    const handleRotate = () => cropperRef.current?.cropper.rotate(90);
    const handleReset = () => cropperRef.current?.cropper.reset();
    const setDragMode = (mode) => {
        if (cropperRef.current?.cropper) {
            cropperRef.current.cropper.setDragMode(mode);
        }
    };

    const addPeriod = () => {
        if (isDateLocked) return;
        const nextPeriodNum = periods.length > 0
            ? Math.max(...periods.map(p => p.period)) + 1
            : 1;
        setPeriods([...periods, { period: nextPeriodNum, subjectId: "", subjectName: "" }]);
        setHasModifications(true);
    };

    const requestRemovePeriod = (periodNum) => {
        if (isDateLocked) return;
        setConfirmRemovePeriod(periodNum);
    };

    const confirmAndRemovePeriod = () => {
        if (confirmRemovePeriod === null) return;
        const periodNum = confirmRemovePeriod;
        const indexToRemove = periods.findIndex(p => p.period === periodNum);
        if (indexToRemove === -1) return;

        setPeriods(prev => prev.filter(p => p.period !== periodNum));

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
        setConfirmRemovePeriod(null);
        notify({ message: `Period P${periodNum} removed. Click 'Save' to apply.`, type: 'success' });
    };

    const cancelRemovePeriod = () => {
        setConfirmRemovePeriod(null);
    };

    const updatePeriod = (periodNum, subjectId) => {
        if (isDateLocked) return;
        const subject = subjects.find(s => s._id === subjectId);
        setPeriods(prev => prev.map(slot =>
            slot.period === periodNum
                ? { ...slot, subjectId, subjectName: subject ? subject.name : "" }
                : slot
        ));
        setHasModifications(true);
    };

    const toggleAbsent = (periodIdx, rollNo) => {
        if (isDateLocked) return;
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
                [periodIdx]: sortRollNumbers(newList).join(', ')
            }));

            return { ...prev, [periodIdx]: sortRollNumbers(newList) };
        });
        setHasModifications(true);
    };

    const handleBulkAbsentInput = (periodIdx, inputValue) => {
        if (isDateLocked) return;
        setAbsentInputs(prev => ({ ...prev, [periodIdx]: inputValue }));

        if (!inputValue.trim()) {
            setAbsentees(prev => ({ ...prev, [periodIdx]: [] }));
            setHasModifications(true);
            return;
        }

        const uniqueRolls = [];
        const seen = new Set();
        inputValue
            .split(/[,\n]/)
            .map(str => sanitizeRollNumber(str))
            .filter(Boolean)
            .forEach((roll) => {
                if (allowedRollSet.has(roll) && !seen.has(roll)) {
                    seen.add(roll);
                    uniqueRolls.push(roll);
                }
            });

        setAbsentees(prev => ({ ...prev, [periodIdx]: sortRollNumbers(uniqueRolls) }));
        setHasModifications(true);
    };

    // Mark all present for a period (clear absentees)
    const markAllPresent = (periodIdx) => {
        if (isDateLocked) return;
        setAbsentees(prev => ({ ...prev, [periodIdx]: [] }));
        setAbsentInputs(prev => ({ ...prev, [periodIdx]: '' }));
        setHasModifications(true);
    };

    // Copy absentees from previous period
    const copyFromPrevious = (periodIdx) => {
        if (isDateLocked) return;
        if (periodIdx === 0) return;
        const prevAbsentees = absentees[periodIdx - 1] || [];
        setAbsentees(prev => ({ ...prev, [periodIdx]: sortRollNumbers(prevAbsentees) }));
        setAbsentInputs(prev => ({
            ...prev,
            [periodIdx]: sortRollNumbers(prevAbsentees).join(', ')
        }));
        setHasModifications(true);
        notify({ message: `Copied ${prevAbsentees.length} absentee(s) from P${periods[periodIdx - 1]?.period || periodIdx}`, type: 'success' });
    };

    const unlockDateForEdit = () => {
        const readableDate = selectedDate
            ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })
            : 'this date';

        const confirmed = window.confirm(`Unlock attendance for ${readableDate}?`);
        if (!confirmed) return;

        setIsDateLocked(false);
        setAutoRelockArmed(true);
        notify({ message: 'Editing unlocked. Save after making changes.', type: 'success' });
    };

    const addStudentToClass = async () => {
        if (!classId || addingStudent) return;

        const parseRolls = (input) => {
            const rolls = new Set();
            input.split(/[\n,]+/).forEach(part => {
                part = part.trim();
                if (part.includes('-')) {
                    const [start, end] = part.split('-').map(str => parseInt(str.trim(), 10));
                    if (!isNaN(start) && !isNaN(end) && start <= end) {
                        for (let i = start; i <= end; i++) rolls.add(String(i));
                    }
                } else if (part) {
                    rolls.add(part);
                }
            });
            return Array.from(rolls).filter(Boolean).map(sanitizeRollNumber).filter(Boolean);
        };

        const rollArray = parseRolls(newStudentRoll);

        if (rollArray.length === 0) {
            notify({ message: 'Enter valid roll numbers.', type: 'error' });
            return;
        }

        setAddingStudent(true);
        try {
            const res = await api.patch(`/class/${classId}/students`, { rollNumbers: rollArray });
            const updatedRolls = normalizeClassRollNumbers({ rollNumbers: res.data.rollNumbers });
            setClassRollNumbers(updatedRolls);
            setNewStudentRoll('');
            setShowAddStudentModal(false);
            const msg = rollArray.length > 1 ? `${rollArray.length} students added successfully.` : `Student ${rollArray[0]} added successfully.`;
            notify({ message: msg, type: 'success' });
        } catch (err) {
            if (err.response?.status === 409) {
                notify({ message: err.response?.data?.error || 'Roll number already exists in this class.', type: 'error' });
            } else {
                notify({ message: err.response?.data?.error || 'Failed to add student.', type: 'error' });
            }
        } finally {
            setAddingStudent(false);
        }
    };

    const submitAttendance = async () => {
        if (!classId) return;
        if (isDateLocked) return;
        if (classRollNumbers.length === 0) {
            notify({ message: "No students found in this class. Add students first.", type: 'error' });
            return;
        }

        const validPeriods = periods.filter(slot => slot.subjectId);
        if (periods.length > 0 && validPeriods.length !== periods.length) {
            notify({ message: "Please select a subject for all classes", type: 'error' });
            return;
        }

        setSaving(true);
        const formattedPeriods = periods.map((slot, index) => ({
            periodNum: slot.period,
            subjectId: slot.subjectId,
            subjectName: slot.subjectName,
            absentRollNumbers: sortRollNumbers(absentees[index] || [])
        }));

        try {
            await api.post('/attendance/mark', {
                classId: classId,
                date: selectedDate,
                periods: formattedPeriods
            });
            notify({ message: "Attendance Saved Successfully ✓", type: 'success' });
            setHasModifications(false);
            setIsDateLocked(true);
            setAutoRelockArmed(false);

            // Refresh attendance dates list
            api.get(`/attendance/dates/${classId}`)
                .then(datesRes => {
                    const formattedDates = (datesRes.data.dates || []).map(dateStr => {
                        return new Date(dateStr).toISOString().split('T')[0];
                    });
                    setAttendanceDates(formattedDates);
                })
                .catch(() => { });

            loadAttendanceForDate(selectedDate, classId);
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



    if (loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading...</div>;

    return (
        <>
            <Navbar isAdmin={true} onLogout={handleLogout} classId={classId} />
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
            />

            {imageToCrop && (
                <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 p-4 sm:p-6 animate-fade-in backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">Crop Image</h2>
                            <p className="text-sm text-[var(--text-dim)]">Highlight only the wanted numbers</p>
                        </div>
                        <button onClick={cancelCrop} className="p-2.5 bg-white/5 rounded-full hover:bg-white/10 transition border border-white/10">
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-hidden rounded-2xl bg-black/50 border border-white/10 mb-4 relative touch-none">
                        <Cropper
                            ref={cropperRef}
                            style={{ height: "100%", width: "100%" }}
                            preview=".img-preview"
                            src={imageToCrop}
                            viewMode={1}
                            dragMode="crop"
                            minCropBoxHeight={50}
                            minCropBoxWidth={50}
                            background={false}
                            responsive={true}
                            restore={true}
                            autoCropArea={0.8}
                            checkOrientation={false}
                            guides={true}
                            center={true}
                            highlight={true}
                            cropBoxMovable={true}
                            cropBoxResizable={true}
                            toggleDragModeOnDblclick={false}
                        />
                    </div>

                    <div className="flex items-center justify-between mb-6 bg-white/5 rounded-2xl p-1.5 border border-white/10 overflow-x-auto gap-2">
                        <div className="flex items-center gap-1">
                            <button onClick={handleZoomIn} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition text-white" title="Zoom In"><ZoomIn className="w-5 h-5" /></button>
                            <button onClick={handleZoomOut} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition text-white" title="Zoom Out"><ZoomOut className="w-5 h-5" /></button>
                            <button onClick={handleRotate} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition text-white" title="Rotate"><RotateCcw className="w-5 h-5" /></button>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setDragMode('move')} className="p-3 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl transition" title="Move Image"><Move className="w-5 h-5" /></button>
                            <button onClick={() => setDragMode('crop')} className="p-3 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl transition" title="Draw Crop Box"><CropIcon className="w-5 h-5" /></button>
                            <button onClick={handleReset} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition text-[var(--text-dim)] hover:text-white" title="Reset"><RefreshCw className="w-5 h-5" /></button>
                        </div>
                    </div>

                    <div className="pb-8 sm:pb-4 flex justify-end gap-3">
                        <button
                            onClick={cancelCrop}
                            className="px-6 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmCrop}
                            className="bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-3 flex items-center gap-2 rounded-xl transition font-bold"
                        >
                            <CheckCircle className="w-5 h-5 flex-shrink-0" />
                            <span>Confirm & Scan</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-4xl mx-auto px-4 py-6 pb-24">

                {/* ─── Header with Quick Stats ─── */}
                <div className="mb-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-2xl font-bold mb-1" style={{ letterSpacing: '-0.03em' }}>
                                Mark Attendance
                            </h1>
                            <p className="text-[var(--text-dim)] text-sm">{className}</p>
                            <p className="text-[var(--text-dim)] text-xs mt-1">{classRollNumbers.length} students</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {/* <button
                                onClick={() => setShowAddStudentModal(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/15 transition"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Student
                            </button> */}
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
                    </div>



                    {lastModified && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
                            <Clock className="w-3 h-3" />
                            Last modified: {lastModified.toLocaleString('en-US', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                        </div>
                    )}
                </div>

                {isDateLocked && periods.length > 0 && (
                    <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-start gap-2 text-amber-300 text-sm">
                            <Lock className="w-4 h-4 mt-0.5" />
                            <span>Saved attendance is locked to prevent accidental edits.</span>
                        </div>
                        <button
                            type="button"
                            onClick={unlockDateForEdit}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-400/40 text-amber-200 hover:bg-amber-400/10 text-xs font-medium transition"
                        >
                            <LockOpen className="w-3.5 h-3.5" />
                            Unlock to Edit
                        </button>
                    </div>
                )}

                {!isDateLocked && autoRelockArmed && periods.length > 0 && (
                    <div className="mb-5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3">
                        <div className="flex items-start gap-2 text-blue-200 text-sm">
                            <LockOpen className="w-4 h-4 mt-0.5" />
                            <span>Editing is unlocked. It will auto-lock after 2 minutes of inactivity.</span>
                        </div>
                    </div>
                )}

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

                {/* ─── Period Cards ─── */}
                {periods.length > 0 && (
                    <div className="space-y-4">
                        {periods.map((slot, index) => {
                            const absentCount = (absentees[index] || []).length;

                            return (
                                <div key={index} className="card animate-fade-in" style={{ position: 'relative', overflow: 'hidden' }}>
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
                                                disabled={isDateLocked}
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
                                                onClick={() => requestRemovePeriod(slot.period)}
                                                className="w-8 h-8 bg-red-500/10 text-red-400 rounded-lg text-xs hover:bg-red-500/20 flex items-center justify-center transition"
                                                title="Remove period"
                                                disabled={isDateLocked}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* ─── Remove Confirmation Overlay ─── */}
                                    {confirmRemovePeriod === slot.period && (
                                        <div className="animate-fade-in rounded-xl" style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'rgba(0, 0, 0, 0.85)',
                                            backdropFilter: 'blur(4px)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '1rem',
                                            zIndex: 10,
                                            borderRadius: 'inherit',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <AlertTriangle className="w-5 h-5 text-red-400" />
                                                <p style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>
                                                    Remove Period P{slot.period}?
                                                </p>
                                            </div>
                                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                                                {slot.subjectName ? `${slot.subjectName} — ` : ''}This action cannot be undone
                                            </p>
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <button
                                                    type="button"
                                                    onClick={cancelRemovePeriod}
                                                    style={{
                                                        padding: '0.5rem 1.5rem',
                                                        borderRadius: '9999px',
                                                        border: '1px solid rgba(255,255,255,0.15)',
                                                        background: 'transparent',
                                                        color: 'white',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 500,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={confirmAndRemovePeriod}
                                                    style={{
                                                        padding: '0.5rem 1.5rem',
                                                        borderRadius: '9999px',
                                                        border: '1px solid rgba(239,68,68,0.4)',
                                                        background: 'rgba(239,68,68,0.15)',
                                                        color: '#f87171',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                    }}
                                                >
                                                    Yes, Remove
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Quick actions */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <button
                                            onClick={() => markAllPresent(index)}
                                            className="text-xs px-3 py-1.5 rounded-full border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 transition flex items-center gap-1.5"
                                            disabled={isDateLocked}
                                        >
                                            <CheckCircle className="w-3 h-3" />
                                            All Present
                                        </button>
                                        {index > 0 && (
                                            <button
                                                onClick={() => copyFromPrevious(index)}
                                                className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-[var(--text-dim)] hover:text-white hover:border-white/20 transition flex items-center gap-1.5"
                                                disabled={isDateLocked}
                                            >
                                                <RotateCcw className="w-3 h-3" />
                                                Copy P{periods[index - 1]?.period}
                                            </button>
                                        )}
                                    </div>

                                    {/* Bulk input */}
                                    <div className="mb-3 relative">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Type absent roll numbers (e.g. 1, 5, 12, 23)"
                                                value={absentInputs[index] || ''}
                                                onChange={(e) => handleBulkAbsentInput(index, e.target.value)}
                                                className="input flex-1 text-sm !rounded-xl"
                                                disabled={isDateLocked || (isScanning && scanningPeriodIndex === index)}
                                            />
                                            <button
                                                onClick={() => handleCameraButtonClick(index)}
                                                disabled={isDateLocked || (isScanning && scanningPeriodIndex === index)}
                                                className="px-4 bg-white/5 border border-white/10 text-[var(--text-dim)] hover:bg-white/10 hover:text-white rounded-xl transition flex items-center justify-center disabled:opacity-50"
                                                title="Scan Logbook"
                                            >
                                                {isScanning && scanningPeriodIndex === index ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <Camera className="w-5 h-5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Grid */}
                                    <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
                                        {classRollNumbers.map((roll) => {
                                            const isAbsent = (absentees[index] || []).includes(roll);

                                            return (
                                                <button
                                                    key={roll}
                                                    onClick={() => toggleAbsent(index, roll)}
                                                    className={`grid-box ${isAbsent ? 'absent' : 'present'}`}
                                                    disabled={isDateLocked}
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
                <div className="text-center my-6 flex flex-wrap gap-3 justify-center">
                    <button
                        onClick={addPeriod}
                        className="btn btn-outline inline-flex w-auto px-6 items-center gap-2"
                        disabled={isDateLocked}
                    >
                        <Plus className="w-4 h-4" />
                        Add Period
                    </button>
                    {!isDateLocked && (
                        <button
                            onClick={handleFullPageScanClick}
                            className="btn bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 inline-flex w-auto px-6 items-center gap-2 transition"
                            disabled={isScanning}
                            title="Scan entire logbook page"
                        >
                            {isScanning && scanningPeriodIndex === 'FULL_PAGE' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Camera className="w-4 h-4" />
                            )}
                            Scan Full Page
                        </button>
                    )}
                    {periods.length === 0 && (
                        <p className="text-[var(--text-dim)] text-sm mt-4 w-full">
                            No classes scheduled for {getDayName(selectedDate)}.<br />
                            <span className="text-xs">Tap "Add Period" or "Scan Full Page" to begin.</span>
                        </p>
                    )}
                </div>

                {/* ─── Save Button — Fixed at bottom ─── */}
                {!isDateLocked && (periods.length > 0 || hasModifications) && (
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

                {showAddStudentModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="w-full max-w-md glass-card !mb-0 shadow-2xl">
                            <h2 className="text-xl font-bold mb-2">Add Students</h2>
                            <p className="text-sm text-[var(--text-dim)] mb-4">
                                Add single roll numbers, comma-separated lists, or ranges. <br />
                                <span className="opacity-70 text-xs">Example: "1", "1,5,10", or "1-60"</span>
                            </p>
                            <textarea
                                className="input mb-4 min-h-[100px] resize-none whitespace-pre-wrap"
                                placeholder="e.g. 1-60  or  12, 14, 15"
                                value={newStudentRoll}
                                onChange={(e) => setNewStudentRoll(e.target.value)}
                                disabled={addingStudent}
                                autoFocus
                            ></textarea>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddStudentModal(false);
                                        setNewStudentRoll('');
                                    }}
                                    className="px-4 py-2 rounded-lg border border-white/10 text-[var(--text-dim)] hover:text-white hover:border-white/20 transition"
                                    disabled={addingStudent}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={addStudentToClass}
                                    className="btn btn-primary !w-auto px-4 py-2"
                                    disabled={addingStudent}
                                >
                                    {addingStudent ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Adding...
                                        </span>
                                    ) : (
                                        'Add Student'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </>
    );
}
