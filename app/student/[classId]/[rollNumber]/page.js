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

  // Report Issue Modal State (Removed - converted to inline confirm)
  const myReports = reportsResponse?.reports || [];

  // Subject sort & filter
  const [subjectSort, setSubjectSort] = useState('default');
  const [subjectFilter, setSubjectFilter] = useState('all');

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

  // Get subject specific works



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
      />

      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">

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

        <div className="space-y-4">
          {(() => {
            let subjects = [...(data.subjects || [])];

            if (subjects.length === 0) return (
              <p className="text-center text-[var(--text-dim)] py-8">
                No subjects found.
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
                                    onClick={async () => {
                                      const matchedSub = data?.subjects?.find(
                                        s => s.subjectName === selectedSubject || s._id === selectedSubjectId
                                      );
                                      if (await confirm({
                                        title: 'Dispute Absence',
                                        message: `You are reporting that you were present for ${selectedSubject} on ${new Date(datePart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}. The administrator will verify this. Proceed?`,
                                        confirmText: 'Submit Dispute',
                                        confirmColor: 'amber'
                                      })) {
                                        try {
                                          await api.post('/reports/submit', {
                                            classId,
                                            studentRoll: String(rollNumber),
                                            date: datePart,
                                            subjectId: matchedSub?._id,
                                            subjectName: matchedSub?.subjectName || 'Unknown',
                                            issueDescription: "Student disputes this absence — claims to have been present."
                                          });
                                          notify({ message: "Dispute submitted to admin.", type: 'success' });
                                          mutate(reportsKey);
                                        } catch (err) {
                                          notify({ message: err.response?.data?.error || "Failed to submit dispute", type: 'error' });
                                        }
                                      }
                                    }}
                                    className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                                  >
                                    Dispute
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
      </div>

      {/* --- My Reports Section --- */}
      <div className="max-w-2xl mx-auto px-4 pb-24">
        <h2 className="text-sm uppercase text-[var(--text-dim)] mb-4 mt-8">My Disputes</h2>
        {myReports.length === 0 ? (
          <div className="card text-center py-6 text-sm text-[var(--text-dim)] border border-white/5">
            No active disputes.
          </div>
        ) : (
          <div className="space-y-3">
            {myReports.map((r, i) => (
              <div key={i} className="card p-4 relative flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold">{r.subjectName}</h3>
                    <p className="text-xs text-[var(--text-dim)] mt-0.5">
                      {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${r.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    r.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                    {r.status}
                  </span>
                </div>
                {r.adminResponse && (
                  <div className="mt-1 bg-white/5 border border-white/10 rounded-lg p-3 text-xs">
                    <p className="font-semibold text-white/50 mb-1">Admin Response:</p>
                    <p className="text-white/80">{r.adminResponse}</p>
                  </div>
                )}
                {(r.status === 'Resolved' || r.status === 'Rejected') && (
                  <button
                    onClick={async () => {
                      if (await confirm({ title: 'Dismiss Dispute', message: 'Remove this dispute from your view?', confirmText: 'Dismiss', confirmColor: 'danger' })) {
                        api.delete(`/reports/delete/${r._id}`).then(() => {
                          notify({ message: 'Dispute dismissed', type: 'success' });
                          mutate(reportsKey);
                        }).catch(() => notify({ message: 'Failed to dismiss', type: 'error' }));
                      }
                    }}
                    className="mt-2 text-xs font-medium text-white/30 hover:text-white transition w-max"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
