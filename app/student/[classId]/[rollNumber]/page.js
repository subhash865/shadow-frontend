"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useConfirm } from '@/app/components/ConfirmDialog';
import { useNotification } from '@/app/components/Notification';
import useSWR, { mutate } from 'swr';

export default function StudentDashboard() {
  const params = useParams();
  const { classId, rollNumber } = params;
  const router = useRouter();
  const notify = useNotification();
  const confirm = useConfirm();

  const [minPercentage, setMinPercentage] = useState(75);

  const fetcher = url => api.get(url).then(res => res.data);
  const reportKey = classId && rollNumber ? `/student/report/${classId}/${rollNumber}` : null;
  const reportsKey = classId && rollNumber ? `/reports/${classId}/${rollNumber}` : null;
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

  const { data, error, isLoading: reportLoading } = useSWR(
    reportKey,
    fetcher,
    {
      ...swrConfig,
      onSuccess: (resData) => {
        if (typeof window !== 'undefined') {
          if (reportCacheKey) {
            localStorage.setItem(reportCacheKey, JSON.stringify(resData));
          }
          if (subjectCacheKey && Array.isArray(resData?.subjects)) {
            localStorage.setItem(subjectCacheKey, JSON.stringify(resData.subjects));
          }
        }
      },
      fallbackData: getCachedReport()
    }
  );

  const announcementsKey = classId ? `/announcements/${classId}` : null;
  const { data: announcementsResponse } = useSWR(
    announcementsKey,
    fetcher,
    swrConfig
  );
  const allAnnouncements = announcementsResponse?.announcements || [];

  const { data: reportsResponse } = useSWR(
    reportsKey,
    fetcher,
    swrConfig
  );

  const loading = reportLoading && !data;

  useEffect(() => {
    if (error) {
      const status = error?.response?.status;
      notify({
        message: status === 503
          ? "Server is busy, retrying..."
          : "Student not found or Server Error",
        type: 'error'
      });
    }
  }, [error]);

  // History/Works Modal
  const [historyModal, setHistoryModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [modalTab, setModalTab] = useState('history'); // 'history' | 'works'

  // Report Issue Modal State
  const [reportModal, setReportModal] = useState(false);
  const [editingReportId, setEditingReportId] = useState(null);
  const [reportDate, setReportDate] = useState('');
  const [reportSubjectId, setReportSubjectId] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const myReports = reportsResponse?.reports || [];

  // Subject sort & filter
  const [subjectSort, setSubjectSort] = useState('default'); // 'default' | 'asc' | 'desc'
  const [subjectFilter, setSubjectFilter] = useState('all');  // 'all' | 'danger' | 'safe'

  const handleEditReportClick = (report) => {
    setEditingReportId(report._id);
    setReportDate(report.date || '');
    const matchedSubject = data?.subjects?.find(s => s.subjectName === report.subjectName || s._id === report.subjectId);
    setReportSubjectId(matchedSubject ? matchedSubject._id : '');
    setReportDescription(report.issueDescription || '');
    setReportModal(true);
  };

  const openNewReportModal = () => {
    setEditingReportId(null);
    setReportDate('');
    setReportSubjectId('');
    setReportDescription('');
    setReportModal(true);
  };

  // Load saved min percentage from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('studentMinPercentage');
    if (saved) setMinPercentage(parseInt(saved));
  }, []);

  const handleMinPercentageChange = (value) => {
    const val = parseInt(value);
    setMinPercentage(val);
    localStorage.setItem('studentMinPercentage', val.toString());
  };

  // Calculate dynamic bunk message based on student's threshold
  const getBunkMessage = (attended, total, percentage) => {
    if (total === 0) return { text: 'No classes yet', type: 'neutral' };

    if (percentage >= minPercentage + 5) {
      const canBunk = Math.floor((attended / (minPercentage / 100)) - total);
      return { text: `Safe! You can skip ${Math.max(0, canBunk)} more`, type: 'safe' };
    } else if (percentage < minPercentage) {
      const mustAttend = Math.ceil(((minPercentage / 100) * total - attended) / (1 - (minPercentage / 100)));
      return { text: `Attend next ${Math.max(1, mustAttend)} to recover`, type: 'danger' };
    } else {
      return { text: 'Borderline — be careful', type: 'warning' };
    }
  };

  const getDeadlineStatus = (dueDate) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due - now;
    const diffDays = Math.ceil(diffMs / 86400000);

    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, type: 'danger' };
    if (diffDays === 0) return { text: 'Due today!', type: 'urgent' };
    if (diffDays === 1) return { text: 'Due tomorrow', type: 'urgent' };
    if (diffDays <= 3) return { text: `${diffDays}d left`, type: 'warning' };
    return { text: `${diffDays}d left`, type: 'safe' };
  };

  // Fetching is now handled by SWR and localStorage caching above

  const handleLogout = () => {
    localStorage.removeItem('studentClassId');
    localStorage.removeItem('studentRoll');
    localStorage.removeItem('studentClassName');
    localStorage.removeItem('studentToken');
    // Clear calculator data (stored in sessionStorage for privacy)
    sessionStorage.removeItem('shadow_calc_sgpa');
    sessionStorage.removeItem('shadow_calc_cgpa');
    router.push('/');
  };

  const fetchHistory = async (subjectId, subjectName) => {
    setHistoryModal(true);
    setSelectedSubject(subjectName);
    setSelectedSubjectId(subjectId);
    setModalTab('history'); // Reset to history tab by default
    setHistoryLoading(true);
    setHistoryData([]);

    try {
      const res = await api.get(`/student/history/${classId}/${rollNumber}/${subjectId}`);
      setHistoryData(res.data.history);
    } catch (err) {
      notify({ message: "Failed to load history", type: 'error' });
      // Keep modal open so they can switch to works if needed
      setHistoryLoading(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  const submitReport = async (e) => {
    e.preventDefault();
    if (!reportDate || !reportSubjectId || !reportDescription.trim()) {
      notify({ message: "Please fill all fields", type: 'error' });
      return;
    }

    setReportSubmitting(true);
    const selectedSub = data.subjects.find(s => s._id === reportSubjectId);

    try {
      if (editingReportId) {
        await api.patch(`/reports/edit/${editingReportId}`, {
          studentRoll: String(rollNumber),
          date: reportDate,
          subjectId: reportSubjectId,
          subjectName: selectedSub?.subjectName || 'Unknown',
          issueDescription: reportDescription
        });
        notify({ message: "Report updated successfully!", type: 'success' });
      } else {
        await api.post('/reports/submit', {
          classId,
          studentRoll: String(rollNumber),
          date: reportDate,
          subjectId: reportSubjectId,
          subjectName: selectedSub?.subjectName || 'Unknown',
          issueDescription: reportDescription
        });
        notify({ message: "Report submitted successfully!", type: 'success' });
      }

      setReportModal(false);
      setEditingReportId(null);
      setReportDate('');
      setReportSubjectId('');
      setReportDescription('');

      mutate(reportsKey);
    } catch (err) {
      notify({ message: err.response?.data?.error || "Failed to process report", type: 'error' });
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    const ok = await confirm('Delete Report?', 'Are you sure you want to delete this report?', { confirmText: 'Delete', type: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/reports/delete/${reportId}`);
      notify({ message: "Report deleted successfully", type: 'success' });
      mutate(reportsKey);
    } catch (err) {
      notify({ message: err.response?.data?.error || "Failed to delete report", type: 'error' });
    }
  };



  // Get subject specific works
  const subjectWorks = selectedSubjectId
    ? allAnnouncements.filter(a => a.subjectId === selectedSubjectId || a.subjectName === selectedSubject)
    : [];

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading Report...</div>;
  if (!data) return <div className="flex h-screen items-center justify-center text-[var(--text-dim)]">Student Not Found</div>;

  return (
    <>
      <Navbar
        isStudent={true}
        onLogout={handleLogout}
        classId={classId}
        rollNumber={rollNumber}
        onReportClick={openNewReportModal}
      />

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-2xl font-bold">Roll No. {data.studentRoll}</h1>
              <p className="text-[var(--text-dim)]">{data.className}</p>
              {data.lastUpdated && (
                <p className="text-xs text-[var(--text-dim)] mt-1">
                  Last Updated: {new Date(data.lastUpdated).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              )}
            </div>
          </div>
        </div>


        {/* Minimum Attendance Slider */}
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm text-[var(--text-dim)]">My Minimum Attendance</label>
            <span className="text-lg font-bold text-white">{minPercentage}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="95"
            step="5"
            value={minPercentage}
            onChange={(e) => handleMinPercentageChange(e.target.value)}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 ${((minPercentage - 50) / 45) * 100}%, #333 ${((minPercentage - 50) / 45) * 100}%)`
            }}
          />
          <div className="flex justify-between text-xs text-[var(--text-dim)] mt-1.5">
            <span>50%</span>
            <span>75%</span>
            <span>95%</span>
          </div>
        </div>

        {/* Subject-wise Attendance */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm uppercase text-[var(--text-dim)]">Subject-wise Attendance</h2>
        </div>

        {/* Premium Filter + Sort bar */}
        {(data.subjects?.length || 0) > 1 && (
          <div className="mb-5">
            {/* Stats row */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-white/30 uppercase tracking-wider">
                {(() => {
                  const visible = (data.subjects || []).filter(s => {
                    if (subjectFilter === 'danger') return s.percentage < minPercentage;
                    if (subjectFilter === 'safe') return s.percentage >= minPercentage;
                    return true;
                  });
                  return `${visible.length} of ${data.subjects?.length} subjects`;
                })()}
              </p>
              {(subjectSort !== 'default' || subjectFilter !== 'all') && (
                <button
                  onClick={() => { setSubjectSort('default'); setSubjectFilter('all'); }}
                  className="text-[10px] text-white/30 hover:text-white/70 transition"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Pill row */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">

              {/* Sort pills */}
              <button
                onClick={() => setSubjectSort(subjectSort === 'asc' ? 'default' : 'asc')}
                className={`
                  flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                  whitespace-nowrap transition-all duration-200 border
                  ${subjectSort === 'asc'
                    ? 'bg-blue-500/15 border-blue-500/50 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                    : 'bg-transparent border-white/8 text-white/40 hover:border-white/20 hover:text-white/70'
                  }
                `}
              >
                <span>↑</span> Lowest
              </button>
              <button
                onClick={() => setSubjectSort(subjectSort === 'desc' ? 'default' : 'desc')}
                className={`
                  flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                  whitespace-nowrap transition-all duration-200 border
                  ${subjectSort === 'desc'
                    ? 'bg-blue-500/15 border-blue-500/50 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                    : 'bg-transparent border-white/8 text-white/40 hover:border-white/20 hover:text-white/70'
                  }
                `}
              >
                <span>↓</span> Highest
              </button>

              {/* Divider */}
              <div className="flex-shrink-0 w-px bg-white/8 my-1" />

              {/* Filter: At-risk */}
              <button
                onClick={() => setSubjectFilter(subjectFilter === 'danger' ? 'all' : 'danger')}
                className={`
                  flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                  whitespace-nowrap transition-all duration-200 border
                  ${subjectFilter === 'danger'
                    ? 'bg-red-500/15 border-red-500/50 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                    : 'bg-transparent border-white/8 text-white/40 hover:border-white/20 hover:text-white/70'
                  }
                `}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${subjectFilter === 'danger' ? 'bg-red-400' : 'bg-white/20'}`} />
                At Risk
              </button>

              {/* Filter: Safe */}
              <button
                onClick={() => setSubjectFilter(subjectFilter === 'safe' ? 'all' : 'safe')}
                className={`
                  flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                  whitespace-nowrap transition-all duration-200 border
                  ${subjectFilter === 'safe'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                    : 'bg-transparent border-white/8 text-white/40 hover:border-white/20 hover:text-white/70'
                  }
                `}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${subjectFilter === 'safe' ? 'bg-emerald-400' : 'bg-white/20'}`} />
                Safe
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {(() => {
            let subjects = [...(data.subjects || [])];
            // Apply filter
            if (subjectFilter === 'danger') subjects = subjects.filter(s => s.percentage < minPercentage);
            if (subjectFilter === 'safe') subjects = subjects.filter(s => s.percentage >= minPercentage);
            // Apply sort
            if (subjectSort === 'asc') subjects.sort((a, b) => a.percentage - b.percentage);
            if (subjectSort === 'desc') subjects.sort((a, b) => b.percentage - a.percentage);

            if (subjects.length === 0) return (
              <p className="text-center text-[var(--text-dim)] py-8">
                No subjects match the current filter.
              </p>
            );

            return subjects.map((sub, idx) => {
              const percentage = sub.percentage;
              const isSafe = percentage >= minPercentage;
              const bunkInfo = getBunkMessage(sub.attended, sub.total, percentage);

              return (
                <div key={sub._id || idx} className="card relative group hover:border-[var(--text-dim)] transition-colors cursor-pointer" onClick={() => fetchHistory(sub._id, sub.subjectName)}>
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-semibold">{sub.subjectName}</h2>
                    <span className={`px-3 py-1 rounded-md text-sm font-semibold ${isSafe ? 'bg-[var(--success)] text-[var(--success-text)]' : 'bg-[var(--danger)] text-[var(--danger-text)]'
                      }`}>
                      {percentage.toFixed(1)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-[var(--text-dim)]">Classes Attended</p>
                      <p className="text-2xl font-bold">{sub.attended}</p>
                    </div>
                    <div>
                      <p className="text-[var(--text-dim)]">Total Classes</p>
                      <p className="text-2xl font-bold">{sub.total}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden relative">
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white/40 z-10"
                        style={{ left: `${minPercentage}%` }}
                      />
                      <div
                        className={`h-full rounded-full transition-all ${bunkInfo.type === 'safe' ? 'bg-green-500' :
                          bunkInfo.type === 'danger' ? 'bg-red-500' : 'bg-orange-500'}`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </div>

                  <p className={`text-sm italic mb-1 ${bunkInfo.type === 'safe' ? 'text-green-400/80' :
                    bunkInfo.type === 'danger' ? 'text-red-400/80' : 'text-orange-400/80'}`}>
                    {bunkInfo.text}
                  </p>
                  <p className="text-xs text-[var(--text-dim)] text-right mt-2 flex items-center justify-end gap-1 group-hover:text-white transition-colors">
                    Tap for Details &amp; Tasks →
                  </p>
                </div>
              );
            });
          })()}
        </div>

        {/* Quick Navigate */}
        <div className="mt-8 mb-6">
          <h2 className="text-sm uppercase text-[var(--text-dim)] mb-4">Quick Navigate</h2>
          <div className="grid grid-cols-3 gap-3">
            <Link
              href={`/student/${classId}/${rollNumber}/calendar`}
              className="card text-center py-4 hover:border-blue-500/50 transition group"
            >
              <p className="text-2xl mb-2">📅</p>
              <p className="text-xs text-[var(--text-dim)] group-hover:text-blue-400 transition">Calendar</p>
            </Link>
            <Link
              href={`/student/${classId}/${rollNumber}/bunk-effect`}
              className="card text-center py-4 hover:border-purple-500/50 transition group"
            >
              <p className="text-2xl mb-2">🧮</p>
              <p className="text-xs text-[var(--text-dim)] group-hover:text-purple-400 transition">Skip Effect</p>
            </Link>
            <Link
              href={`/student/${classId}/${rollNumber}/attention`}
              className="card text-center py-4 hover:border-orange-500/50 transition group relative"
            >
              <p className="text-2xl mb-2">📢</p>
              <p className="text-xs text-[var(--text-dim)] group-hover:text-orange-400 transition">Attention</p>
            </Link>
          </div>
        </div>

        {/* --- History & Works Modal --- */}
        {historyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
            <div
              className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-white/8"
              style={{ background: 'rgba(12,12,14,0.95)' }}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/6 flex justify-between items-center flex-shrink-0">
                <div>
                  <h3 className="font-bold text-base leading-tight">{selectedSubject}</h3>
                  <p className="text-xs text-white/30 mt-0.5">
                    {modalTab === 'history' ? `${historyData.length} records` : `${subjectWorks.length} items`}
                  </p>
                </div>
                <button
                  onClick={() => setHistoryModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white hover:bg-white/8 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Pill Tabs */}
              <div className="px-5 py-3 border-b border-white/6 flex gap-2 flex-shrink-0">
                {[
                  { id: 'history', label: 'Attendance' },
                  { id: 'works', label: 'Works & Tasks' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setModalTab(tab.id)}
                    className={`
                      px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border
                      ${modalTab === tab.id
                        ? 'bg-blue-500/15 border-blue-500/50 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.12)]'
                        : 'bg-transparent border-white/8 text-white/40 hover:border-white/20 hover:text-white/70'
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="overflow-y-auto p-4 flex-1">

                {modalTab === 'history' && (
                  <>
                    {historyLoading ? (
                      <div className="text-center py-10 text-white/30 text-sm animate-pulse">Loading records…</div>
                    ) : historyData.length === 0 ? (
                      <div className="text-center py-10 text-white/30 text-sm">No classes recorded yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {historyData.map((record, i) => {
                          const isPresent = record.status === 'Present';
                          // record.date is a MongoDB ISO Date → extract YYYY-MM-DD first
                          const datePart = typeof record.date === 'string'
                            ? record.date.slice(0, 10)
                            : new Date(record.date).toISOString().slice(0, 10);
                          return (
                            <div
                              key={i}
                              className="flex justify-between items-center px-4 py-3 rounded-xl border border-white/6"
                              style={{ background: 'rgba(255,255,255,0.03)' }}
                            >
                              <span className="text-sm text-white/80 font-medium">
                                {new Date(datePart + 'T00:00:00').toLocaleDateString('en-US', {
                                  weekday: 'short', month: 'short', day: 'numeric'
                                })}
                              </span>
                              <div className="flex items-center gap-2">
                                {!isPresent && (
                                  <button
                                    onClick={() => {
                                      setHistoryModal(false);
                                      // Pre-fill the report modal with this date + subject
                                      setEditingReportId(null);
                                      setReportDate(datePart);
                                      const matchedSub = data?.subjects?.find(
                                        s => s.subjectName === selectedSubject || s._id === selectedSubjectId
                                      );
                                      setReportSubjectId(matchedSub?._id || '');
                                      setReportDescription('');
                                      setReportModal(true);
                                    }}
                                    className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                                  >
                                    Report
                                  </button>
                                )}
                                <span className={`
                                  text-xs font-bold px-3 py-1 rounded-lg border
                                  ${isPresent
                                    ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-400'
                                    : 'bg-red-500/12 border-red-500/30 text-red-400'
                                  }
                                `}>
                                  {record.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {modalTab === 'works' && (
                  <div className="space-y-3">
                    {subjectWorks.length === 0 ? (
                      <div className="text-center py-10 text-white/30 text-sm">No assignments for this subject.</div>
                    ) : (
                      subjectWorks.map((work) => {
                        const status = getDeadlineStatus(work.dueDate);
                        return (
                          <div
                            key={work._id}
                            className="rounded-xl border border-white/8 p-4"
                            style={{ background: 'rgba(255,255,255,0.03)' }}
                          >
                            <div className="flex justify-between items-start mb-1.5">
                              <h4 className="font-semibold text-sm leading-snug flex-1 pr-3">{work.title}</h4>
                              {status && (
                                <span className={`
                                  flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg border
                                  ${status.type === 'danger' ? 'bg-red-500/12 border-red-500/30 text-red-400' :
                                    status.type === 'urgent' ? 'bg-orange-500/12 border-orange-500/30 text-orange-400' :
                                      status.type === 'warning' ? 'bg-yellow-500/12 border-yellow-500/30 text-yellow-400' :
                                        'bg-emerald-500/12 border-emerald-500/30 text-emerald-400'}
                                `}>
                                  {status.text}
                                </span>
                              )}
                            </div>
                            {work.description && (
                              <p className="text-xs text-white/40 mb-3 leading-relaxed">{work.description}</p>
                            )}
                            <div className="flex justify-between items-center text-[10px] text-white/25 border-t border-white/6 pt-2.5 mt-1">
                              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/8 uppercase font-bold tracking-wider text-white/40">
                                {work.type || 'task'}
                              </span>
                              <span>
                                {new Date(work.createdAt + 'T00:00:00').toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- Report Issue Modal --- */}
        {reportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
            <div
              className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-white/8"
              style={{ background: 'rgba(12,12,14,0.95)' }}
            >
              <div className="px-5 py-4 border-b border-white/6 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base">
                    {editingReportId ? 'Edit Report' : 'Report Attendance Issue'}
                  </h3>
                  {reportDate && (
                    <p className="text-xs text-white/30 mt-0.5">
                      {new Date(reportDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setReportModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white hover:bg-white/8 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={submitReport} className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-2">Date of Issue</label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-2">Subject</label>
                  <select
                    value={reportSubjectId}
                    onChange={(e) => setReportSubjectId(e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">-- Select Subject --</option>
                    {data.subjects?.map((sub) => (
                      <option key={sub._id} value={sub._id}>{sub.subjectName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-2">Describe the Issue</label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="e.g., I was marked absent but I attended the class..."
                    className="input min-h-[100px] resize-none"
                    maxLength={500}
                    required
                  />
                  <p className="text-xs text-white/25 mt-1 text-right">{reportDescription.length}/500</p>
                </div>

                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="btn btn-primary w-full"
                >
                  {reportSubmitting ? 'Submitting…' : editingReportId ? 'Update Report' : 'Submit Report'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- My Reports: Status Board --- */}
        {myReports.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm uppercase text-white/30 font-semibold tracking-wider mb-4">
              Report Status ({myReports.length})
            </h2>
            <div className="space-y-3">
              {myReports.map((report) => (
                <div
                  key={report._id}
                  className="rounded-xl border border-white/8 p-4"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  {/* Top row: subject + status badge */}
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-sm leading-tight">{report.subjectName}</h3>
                    <span className={`
                      flex-shrink-0 ml-3 text-[10px] font-bold px-2.5 py-1 rounded-lg border
                      ${report.status === 'resolved'
                        ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-400'
                        : report.status === 'rejected'
                          ? 'bg-red-500/12 border-red-500/30 text-red-400'
                          : 'bg-amber-500/12 border-amber-500/30 text-amber-400'
                      }
                    `}>
                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                    </span>
                  </div>

                  {/* Date */}
                  <p className="text-xs text-white/30 mb-2">
                    {new Date(report.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </p>

                  {/* Issue description */}
                  <p className="text-xs text-white/50 leading-relaxed mb-3">{report.issueDescription}</p>

                  {/* Admin response if any */}
                  {report.adminResponse && (
                    <div className="mt-2 px-3 py-2.5 rounded-xl border border-blue-500/20 bg-blue-500/8">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Admin Response</p>
                      <p className="text-xs text-white/60 leading-relaxed">{report.adminResponse}</p>
                    </div>
                  )}

                  {/* Delete after resolved/rejected */}
                  {report.status !== 'pending' && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => handleDeleteReport(report._id)}
                        className="text-[10px] text-white/20 hover:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded-lg border border-transparent hover:border-red-500/20 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
