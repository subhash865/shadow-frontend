"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import Calendar from '@/app/components/Calendar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';

export default function BunkEffect() {
    const params = useParams();
    const { classId, rollNumber } = params;
    const router = useRouter();
    const notify = useNotification();
    const [loading, setLoading] = useState(true);
    const [className, setClassName] = useState('');
    const [subjects, setSubjects] = useState([]);
    const [selectedDates, setSelectedDates] = useState([]);
    const [attendanceDates, setAttendanceDates] = useState([]);
    const [impactData, setImpactData] = useState(null);
    const [calculating, setCalculating] = useState(false);

    useEffect(() => {
        if (!classId || !rollNumber) return;

        // Fetch current attendance report
        api.get(`/student/report/${classId}/${rollNumber}`)
            .then(res => {
                setClassName(res.data.className);
                setSubjects(res.data.subjects || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Fetch Error:", err);
                setLoading(false);
            });

        // Fetch attendance dates
        api.get(`/attendance/dates/${classId}`)
            .then(res => setAttendanceDates(res.data.dates || []))
            .catch(err => console.log("No attendance dates"));
    }, [classId, rollNumber]);

    const handleDateToggle = (date) => {
        if (selectedDates.includes(date)) {
            setSelectedDates(selectedDates.filter(d => d !== date));
        } else {
            setSelectedDates([...selectedDates, date]);
        }
    };

    const calculateImpact = async () => {
        if (selectedDates.length === 0) {
            notify({ message: "Please select at least one date!", type: 'error' });
            return;
        }

        setCalculating(true);
        try {
            const res = await api.post('/student/simulate-bunk', {
                classId,
                rollNumber: parseInt(rollNumber),
                dates: selectedDates
            });
            setImpactData(res.data);
        } catch (err) {
            notify({ message: "Failed to calculate impact", type: 'error' });
            console.error(err);
        } finally {
            setCalculating(false);
        }
    };

    const clearSelection = () => {
        setSelectedDates([]);
        setImpactData(null);
    };

    const handleLogout = () => {
        localStorage.removeItem('studentClassId');
        localStorage.removeItem('studentRoll');
        router.push('/');
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading...</div>;

    return (
        <>
            <Navbar isStudent={true} onLogout={handleLogout} classId={classId} rollNumber={rollNumber} />

            <div className="max-w-3xl mx-auto px-4 py-8">

                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Bunk Effect Calculator</h1>
                    <p className="text-[var(--text-dim)]">{className} - Roll No. {rollNumber}</p>
                </div>

                {/* Instructions */}
                <div className="card mb-6 bg-blue-900/10 border-blue-500/30">
                    <h2 className="text-sm font-semibold text-blue-400 mb-2">How it works</h2>
                    <ul className="text-sm text-[var(--text-dim)] space-y-1">
                        <li>• Select future dates you're planning to bunk</li>
                        <li>• Click "Calculate Impact" to see how it affects your attendance</li>
                        <li>• View detailed before/after percentages for each subject</li>
                    </ul>
                </div>

                {/* Calendar */}
                <div className="mb-6">
                    <h2 className="text-sm uppercase text-[var(--text-dim)] mb-3">Select Dates to Bunk</h2>
                    <Calendar
                        selectedDate={selectedDates[selectedDates.length - 1] || new Date().toISOString().split('T')[0]}
                        onSelectDate={handleDateToggle}
                        attendanceDates={attendanceDates}
                        multiSelect={true}
                        selectedDates={selectedDates}
                        allowFuture={true}
                    />

                    {selectedDates.length > 0 && (
                        <div className="mt-4 p-3 bg-[var(--card-bg)] rounded-md border border-[var(--border)]">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-semibold">Selected Dates ({selectedDates.length})</span>
                                <button onClick={clearSelection} className="text-xs text-red-400 hover:text-red-300">
                                    Clear All
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedDates.sort().map(date => (
                                    <span key={date} className="px-2 py-1 bg-orange-900/20 text-orange-400 rounded text-xs">
                                        {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Calculate Button */}
                <button
                    onClick={calculateImpact}
                    disabled={calculating || selectedDates.length === 0}
                    className="btn btn-primary w-full mb-6"
                >
                    {calculating ? 'Calculating...' : `Calculate Impact (${selectedDates.length} dates)`}
                </button>

                {/* Impact Results */}
                {impactData && (
                    <div className="card">
                        <h2 className="text-sm uppercase text-[var(--text-dim)] mb-4">Impact Analysis</h2>

                        <div className="space-y-4">
                            {impactData.impacts.map((impact, idx) => {
                                const hasClass = impact.classesOnSelectedDates > 0;
                                const percentChange = impact.afterPercentage - impact.currentPercentage;
                                const isSafe = impact.afterPercentage >= 80;
                                const isDanger = impact.afterPercentage < 75;

                                return (
                                    <div key={idx} className="p-4 bg-[var(--bg)] rounded-md border border-[var(--border)]">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="font-semibold">{impact.subjectName}</h3>
                                            {!hasClass && (
                                                <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                                                    No classes on selected dates
                                                </span>
                                            )}
                                        </div>

                                        {hasClass && (
                                            <>
                                                <div className="grid grid-cols-2 gap-4 mb-3">
                                                    <div>
                                                        <p className="text-xs text-[var(--text-dim)] mb-1">Current</p>
                                                        <p className="text-2xl font-bold">{impact.currentPercentage.toFixed(1)}%</p>
                                                        <p className="text-xs text-[var(--text-dim)]">{impact.currentAttended}/{impact.currentTotal} classes</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-[var(--text-dim)] mb-1">After Bunk</p>
                                                        <p className={`text-2xl font-bold ${isSafe ? 'text-green-400' : isDanger ? 'text-red-400' : 'text-orange-400'
                                                            }`}>
                                                            {impact.afterPercentage.toFixed(1)}%
                                                        </p>
                                                        <p className="text-xs text-[var(--text-dim)]">{impact.afterAttended}/{impact.afterTotal} classes</p>
                                                    </div>
                                                </div>

                                                <div className={`p-2 rounded text-sm ${percentChange < 0 ? 'bg-red-900/20 text-red-400' : 'bg-gray-700 text-gray-300'
                                                    }`}>
                                                    <span className="font-semibold">
                                                        {percentChange < 0 ? '⚠️' : '✓'} {percentChange.toFixed(1)}%
                                                    </span>
                                                    {' - '}
                                                    {impact.classesOnSelectedDates} class{impact.classesOnSelectedDates > 1 ? 'es' : ''} on selected dates
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

            </div>
        </>
    );
}
