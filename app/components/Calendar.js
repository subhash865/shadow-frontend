'use client';
import { useState } from 'react';

export default function Calendar({ selectedDate, onSelectDate, attendanceDates = [], taskDates = [], multiSelect = false, selectedDates = [], allowFuture = false, enableAllDates = false }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const daysInMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0
    ).getDate();

    const firstDayOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
    ).getDay();

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const formatDate = (day) => {
        const year = currentMonth.getFullYear();
        const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        return `${year}-${month}-${dayStr}`;
    };

    const isToday = (day) => {
        const today = new Date();
        return day === today.getDate() &&
            currentMonth.getMonth() === today.getMonth() &&
            currentMonth.getFullYear() === today.getFullYear();
    };

    const isSelected = (day) => {
        if (multiSelect) {
            return selectedDates.includes(formatDate(day));
        }
        return formatDate(day) === selectedDate;
    };

    const hasAttendance = (day) => {
        return attendanceDates.includes(formatDate(day));
    };



    return (
        <div className="card">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <button onClick={prevMonth} className="px-3 py-1 hover:bg-white/5 rounded">
                    ←
                </button>
                <h2 className="text-lg font-semibold">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h2>
                <button onClick={nextMonth} className="px-3 py-1 hover:bg-white/5 rounded">
                    →
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs text-[var(--text-dim)] font-semibold py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before month starts */}
                {[...Array(firstDayOfMonth)].map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Day cells */}
                {[...Array(daysInMonth)].map((_, i) => {
                    const day = i + 1;
                    const dateStr = formatDate(day);
                    const today = new Date().toISOString().split('T')[0];

                    // If enableAllDates=true, allow everything
                    // Else if allowFuture=true (bunk), block past (except today)
                    // Else (attendance), block future (except today)
                    let isDisabled = false;
                    if (!enableAllDates) {
                        isDisabled = allowFuture ? (dateStr < today) : (dateStr > today);
                    }

                    const hasData = attendanceDates.includes(dateStr);
                    const hasTask = taskDates.includes(dateStr);
                    const isSelectedDate = isSelected(day);

                    return (
                        <button
                            key={day}
                            onClick={() => !isDisabled && onSelectDate(dateStr)}
                            disabled={isDisabled}
                            className={`
                aspect-square rounded-md flex items-center justify-center text-sm font-medium transition relative select-none
                ${isSelectedDate ? (multiSelect ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white') : ''}
                ${isToday(day) && !isSelectedDate ? 'border-2 border-blue-400' : ''}
                ${hasData && !isSelectedDate && !isDisabled ? 'bg-green-900/20 text-green-400' : ''}
                ${hasTask && !isSelectedDate && !isDisabled ? 'bg-purple-900/20 text-purple-400 border border-purple-500/30' : ''}
                ${hasData && isDisabled ? 'text-green-500/60 opacity-60 cursor-not-allowed' : ''}
                ${isDisabled && !hasData && !hasTask ? 'text-[var(--text-dim)] opacity-30 cursor-not-allowed' : ''}
                ${!isDisabled && !isSelectedDate && !hasData && !hasTask ? 'hover:bg-white/10 cursor-pointer text-white' : ''}
              `}
                        >
                            {day}
                            {/* Green dot for attendance marked */}
                            {hasData && !isSelectedDate && (
                                <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full shadow-lg"></div>
                            )}
                            {/* Purple dot for tasks */}
                            {hasTask && !isSelectedDate && (
                                <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-purple-500 rounded-full shadow-lg"></div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-4 text-xs text-[var(--text-dim)]">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 border-2 border-blue-400 rounded"></div>
                    <span>Today</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className={`w-3 h-3 ${multiSelect ? 'bg-orange-500' : 'bg-blue-500'} rounded`}></div>
                    <span>Selected</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-900/20 rounded"></div>
                    <span>Has Data</span>
                </div>
            </div>
        </div>
    );
}
