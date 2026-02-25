'use client';
import { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

export default function Calendar({
    selectedDate,
    onSelectDate,
    attendanceDates = [],
    taskDates = [],
    multiSelect = false,
    selectedDates = [],
    allowFuture = false,
    enableAllDates = false,
    collapsible = false,        // new: allows the calendar to be toggled
    defaultExpanded = true,     // new: start collapsed or expanded
}) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [expanded, setExpanded] = useState(defaultExpanded);

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

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

    const formatDate = (day) => {
        const year = currentMonth.getFullYear();
        const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}-${String(day).padStart(2, '0')}`;
    };

    const isToday = (day) => {
        const today = new Date();
        return day === today.getDate() &&
            currentMonth.getMonth() === today.getMonth() &&
            currentMonth.getFullYear() === today.getFullYear();
    };

    const isSelected = (day) => {
        if (multiSelect) return selectedDates.includes(formatDate(day));
        return formatDate(day) === selectedDate;
    };

    const today = new Date().toISOString().split('T')[0];

    // Count of task dates in current month for badge
    const taskCount = taskDates.filter(d => d.startsWith(
        `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
    )).length;

    return (
        <div
            className="rounded-2xl border border-white/8 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)' }}
        >
            {/* ── Header (always visible) ── */}
            <div
                className={`flex items-center justify-between px-4 py-3 ${collapsible ? 'cursor-pointer select-none' : ''}`}
                onClick={() => collapsible && setExpanded(e => !e)}
            >
                {/* Month nav — only when expanded */}
                <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold text-white">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </span>
                    {taskCount > 0 && !expanded && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            {taskCount} task{taskCount > 1 ? 's' : ''}
                        </span>
                    )}
                    {selectedDate && !expanded && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {selectedDate.slice(5).replace('-', '/')}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {expanded && (
                        <>
                            <button
                                onClick={e => { e.stopPropagation(); prevMonth(); }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/8 text-[var(--text-dim)] hover:text-white transition"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={e => { e.stopPropagation(); nextMonth(); }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/8 text-[var(--text-dim)] hover:text-white transition"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </>
                    )}
                    {collapsible && (
                        <div className={`w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-dim)] transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-4 h-4" />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Collapsible body ── */}
            <div
                style={{
                    maxHeight: expanded ? '420px' : '0px',
                    overflow: 'hidden',
                    transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                <div className="px-3 pb-4 border-t border-white/6">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1 mt-3 mb-1">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <div key={i} className="text-center text-[10px] font-semibold text-white/30 py-1.5 uppercase tracking-wider">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Day grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {[...Array(firstDayOfMonth)].map((_, i) => (
                            <div key={`e-${i}`} className="aspect-square" />
                        ))}

                        {[...Array(daysInMonth)].map((_, i) => {
                            const day = i + 1;
                            const dateStr = formatDate(day);
                            let isDisabled = false;
                            if (!enableAllDates) {
                                isDisabled = allowFuture ? (dateStr < today) : (dateStr > today);
                            }

                            const hasData = attendanceDates.includes(dateStr);
                            const hasTask = taskDates.includes(dateStr);
                            const isSelectedDate = isSelected(day);
                            const todayDate = isToday(day);

                            return (
                                <button
                                    key={day}
                                    onClick={() => !isDisabled && onSelectDate(dateStr)}
                                    disabled={isDisabled}
                                    className={`
                                        relative aspect-square rounded-xl flex flex-col items-center justify-center
                                        text-xs font-semibold transition-all duration-150 select-none
                                        ${isSelectedDate
                                            ? multiSelect
                                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                : 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 scale-105'
                                            : ''}
                                        ${todayDate && !isSelectedDate ? 'ring-2 ring-blue-400/60 text-blue-300' : ''}
                                        ${hasData && !isSelectedDate && !isDisabled ? 'text-emerald-400' : ''}
                                        ${hasTask && !isSelectedDate && !isDisabled ? 'text-purple-400' : ''}
                                        ${isDisabled ? 'opacity-20 cursor-not-allowed' : ''}
                                        ${!isDisabled && !isSelectedDate ? 'hover:bg-white/8 cursor-pointer' : ''}
                                        ${!isSelectedDate && !hasData && !hasTask && !isDisabled && !todayDate ? 'text-white/70' : ''}
                                    `}
                                >
                                    {day}
                                    {/* Dots row */}
                                    {(hasData || hasTask) && !isSelectedDate && (
                                        <div className="absolute bottom-1 flex gap-0.5">
                                            {hasData && <span className="w-1 h-1 rounded-full bg-emerald-400" />}
                                            {hasTask && <span className="w-1 h-1 rounded-full bg-purple-400" />}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/6 text-[10px] text-white/30">
                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Attendance</span>
                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />Task due</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded ring-2 ring-blue-400/60 inline-block" />Today</span>
                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />Selected</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
