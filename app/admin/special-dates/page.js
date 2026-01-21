"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import Calendar from '@/app/components/Calendar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';

export default function SpecialDates() {
    const router = useRouter();
    const notify = useNotification();
    const [classId, setClassId] = useState('');
    const [loading, setLoading] = useState(true);
    const [className, setClassName] = useState('');
    const [specialDates, setSpecialDates] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [modalType, setModalType] = useState('exam');
    const [modalTitle, setModalTitle] = useState('');

    useEffect(() => {
        const storedClassId = localStorage.getItem('adminClassId');
        if (!storedClassId) {
            router.push('/admin/login');
            return;
        }
        setClassId(storedClassId);

        // Fetch class info
        api.get(`/class/${storedClassId}`)
            .then(res => {
                setClassName(res.data.className);
                setLoading(false);
            })
            .catch(err => console.error(err));

        // Fetch special dates
        loadSpecialDates(storedClassId);
    }, [router]);

    const loadSpecialDates = (classId) => {
        api.get(`/special-dates/${classId}`)
            .then(res => {
                setSpecialDates(res.data.specialDates || []);
            })
            .catch(err => console.log("No special dates yet"));
    };

    const handleDateClick = (date) => {
        const today = new Date().toISOString().split('T')[0];
        if (date < today) {
            notify({ message: "You can only mark current or future dates", type: 'error' });
            return;
        }

        // Check if date already marked
        const existing = specialDates.find(sd => sd.date.split('T')[0] === date);
        if (existing) {
            notify({ message: `This date is already marked as ${existing.type}: ${existing.title}`, type: 'error' });
            return;
        }

        setSelectedDate(date);
        setModalType('exam');
        setModalTitle('');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!modalTitle.trim()) {
            notify({ message: "Please enter a title", type: 'error' });
            return;
        }

        try {
            await api.post('/special-dates', {
                classId,
                date: selectedDate,
                type: modalType,
                title: modalTitle.trim()
            });

            setShowModal(false);
            loadSpecialDates(classId);
        } catch (err) {
            notify({ message: "Failed to save special date", type: 'error' });
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this special date?")) return;

        try {
            await api.delete(`/special-dates/${id}`);
            loadSpecialDates(classId);
        } catch (err) {
            notify({ message: "Failed to delete", type: 'error' });
            console.error(err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminClassId');
        router.push('/admin/login');
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading...</div>;

    // Prepare special dates for calendar
    const examDates = specialDates.filter(sd => sd.type === 'exam').map(sd => sd.date.split('T')[0]);
    const holidayDates = specialDates.filter(sd => sd.type === 'holiday').map(sd => sd.date.split('T')[0]);

    return (
        <>
            <Navbar isAdmin={true} onLogout={handleLogout} />

            <div className="max-w-3xl mx-auto px-4 py-8">

                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Special Dates</h1>
                    <p className="text-[var(--text-dim)]">{className}</p>
                </div>

                {/* Calendar */}
                <div className="mb-6">
                    <Calendar
                        selectedDate={selectedDate || new Date().toISOString().split('T')[0]}
                        onSelectDate={handleDateClick}
                        attendanceDates={[]}
                        examDates={examDates}
                        holidayDates={holidayDates}
                        allowFuture={true}
                    />
                </div>

                {/* Legend */}
                <div className="flex gap-4 mb-6 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                        <span>Exam</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span>Holiday</span>
                    </div>
                </div>

                {/* List of Special Dates */}
                <div className="card">
                    <h2 className="text-sm uppercase text-[var(--text-dim)] mb-4">Marked Dates</h2>

                    {specialDates.length === 0 ? (
                        <p className="text-center text-[var(--text-dim)] py-8">No special dates marked yet</p>
                    ) : (
                        <div className="space-y-3">
                            {specialDates.sort((a, b) => new Date(a.date) - new Date(b.date)).map(sd => (
                                <div key={sd._id} className="flex items-center justify-between p-3 bg-[var(--bg)] rounded-md border border-[var(--border)]">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${sd.type === 'exam' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                        <div>
                                            <p className="font-semibold">{sd.title}</p>
                                            <p className="text-sm text-[var(--text-dim)]">
                                                {new Date(sd.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                {' - '}
                                                <span className="capitalize">{sd.type}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(sd._id)}
                                        className="text-red-400 hover:text-red-300 text-sm"
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
                    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4">
                            Mark {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </h2>

                        <div className="space-y-4">
                            {/* Type Selector */}
                            <div>
                                <label className="block text-sm text-[var(--text-dim)] mb-2">Type</label>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setModalType('exam')}
                                        className={`flex-1 py-2 rounded-md border transition ${modalType === 'exam'
                                            ? 'bg-red-500 border-red-500 text-white'
                                            : 'border-[var(--border)] hover:border-white/50'
                                            }`}
                                    >
                                        Exam
                                    </button>
                                    <button
                                        onClick={() => setModalType('holiday')}
                                        className={`flex-1 py-2 rounded-md border transition ${modalType === 'holiday'
                                            ? 'bg-green-500 border-green-500 text-white'
                                            : 'border-[var(--border)] hover:border-white/50'
                                            }`}
                                    >
                                        Holiday
                                    </button>
                                </div>
                            </div>

                            {/* Title Input */}
                            <div>
                                <label className="block text-sm text-[var(--text-dim)] mb-2">
                                    Title / Name
                                </label>
                                <input
                                    type="text"
                                    value={modalTitle}
                                    onChange={(e) => setModalTitle(e.target.value)}
                                    placeholder={modalType === 'exam' ? 'e.g., Mid-term Exam' : 'e.g., Republic Day'}
                                    className="input w-full"
                                    autoFocus
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2 border border-[var(--border)] rounded-md hover:border-white/50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 btn btn-primary"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
