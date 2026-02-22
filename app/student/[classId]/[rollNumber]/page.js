"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';
import useSWR, { mutate } from 'swr';

export default function StudentDashboard() {
  const params = useParams();
  const { classId, rollNumber } = params;
  const router = useRouter();
  const notify = useNotification();

  const [minPercentage, setMinPercentage] = useState(75);

  const fetcher = url => api.get(url).then(res => res.data);
  const reportKey = classId && rollNumber ? `/student/report/${classId}/${rollNumber}` : null;
  const reportsKey = classId && rollNumber ? `/reports/${classId}/${rollNumber}` : null;
  const announcementsKey = classId ? `/announcements/${classId}` : null;
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

  const { data: reportsResponse } = useSWR(
    reportsKey,
    fetcher,
    swrConfig
  );

  const { data: announcementsResponse } = useSWR(
    announcementsKey,
    fetcher,
    swrConfig
  );

  const allAnnouncements = announcementsResponse?.announcements || [];

  const now = new Date();
  const announcementCount = allAnnouncements.filter(a => {
    if (!a.dueDate) return false;
    const due = new Date(a.dueDate);
    const diff = due - now;
    return diff > 0 && diff < 86400000;
  }).length;

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
      return { text: `Safe! You can bunk ${Math.max(0, canBunk)} more`, type: 'safe' };
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
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffTime < 0) return { text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`, type: 'danger', days: diffDays };
    if (diffDays === 0) return { text: 'Due Today', type: 'urgent', days: 0 };
    if (diffDays === 1) return { text: 'Due Tomorrow', type: 'warning', days: 1 };
    return { text: `${diffDays} days left`, type: 'safe', days: diffDays };
  };

  // Fetching is now handled by SWR and localStorage caching above

  const handleLogout = () => {
    localStorage.removeItem('studentClassId');
    localStorage.removeItem('studentRoll');
    localStorage.removeItem('studentClassName');
    localStorage.removeItem('studentToken');
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
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      await api.delete(`/reports/delete/${reportId}`);
      notify({ message: "Report deleted successfully", type: 'success' });
      mutate(reportsKey);
    } catch (err) {
      notify({ message: err.response?.data?.error || "Failed to delete report", type: 'error' });
    }
  };

  // Get urgent deadlines (Due within 24h)
  const urgentTasks = allAnnouncements.filter(a => {
    if (!a.dueDate) return false;
    const due = new Date(a.dueDate);
    const now = new Date();
    const diff = due - now;
    return diff > 0 && diff < 86400000; // Positive and less than 24h
  });

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

        {/* Urgent Deadlines (Due in 24h) */}
        {urgentTasks.length > 0 && (
          <div className="card mb-6 bg-gradient-to-br from-red-900/10 to-transparent border-red-500/30">
            <h2 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Urgent Tasks (Due in 24h)
            </h2>

            <div className="space-y-3">
              {urgentTasks.map(task => {
                const status = getDeadlineStatus(task.dueDate);
                return (
                  <div key={task._id} className="p-3 rounded bg-[var(--bg)] border border-[var(--border)] relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                    <div className="flex justify-between items-start mb-1 pl-2">
                      <span className="font-semibold text-sm">{task.title}</span>
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                        {status?.text}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-dim)] line-clamp-2 pl-2">{task.description}</p>
                    <p className="text-[10px] text-[var(--text-dim)] mt-2 pl-2">
                      {task.subjectName || 'General'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
        <h2 className="text-sm uppercase text-[var(--text-dim)] mb-4">Subject-wise Attendance</h2>
        <div className="space-y-4">
          {data.subjects?.map((sub, idx) => {
            const percentage = sub.percentage;
            const isSafe = percentage >= minPercentage;
            const bunkInfo = getBunkMessage(sub.attended, sub.total, percentage);

            return (
              <div key={idx} className="card relative group hover:border-[var(--text-dim)] transition-colors cursor-pointer" onClick={() => fetchHistory(sub._id, sub.subjectName)}>
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
                    ></div>
                    <div
                      className={`h-full rounded-full transition-all ${bunkInfo.type === 'safe' ? 'bg-green-500' :
                        bunkInfo.type === 'danger' ? 'bg-red-500' :
                          'bg-orange-500'
                        }`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    ></div>
                  </div>
                </div>

                <p className={`text-sm italic mb-1 ${bunkInfo.type === 'safe' ? 'text-green-400/80' :
                  bunkInfo.type === 'danger' ? 'text-red-400/80' :
                    'text-orange-400/80'
                  }`}>
                  {bunkInfo.text}
                </p>
                <p className="text-xs text-[var(--text-dim)] text-right mt-2 flex items-center justify-end gap-1 group-hover:text-white transition-colors">
                  Tap for Details & Tasks →
                </p>
              </div>
            );
          }) || <p className="text-[var(--text-dim)] text-center">No subjects found</p>}
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
              <p className="text-xs text-[var(--text-dim)] group-hover:text-purple-400 transition">Bunk Effect</p>
            </Link>
            <Link
              href={`/student/${classId}/${rollNumber}/attention`}
              className="card text-center py-4 hover:border-orange-500/50 transition group relative"
            >
              <p className="text-2xl mb-2">📢</p>
              <p className="text-xs text-[var(--text-dim)] group-hover:text-orange-400 transition">Attention</p>
              {announcementCount > 0 && (
                <span className="absolute top-2 right-2 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">
                  {announcementCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* --- History & Works Modal --- */}
        {historyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#0a0a0a] border border-[#333] w-full max-w-md rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">

              <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#0a0a0a]">
                <h3 className="font-bold text-lg">{selectedSubject}</h3>
                <button
                  onClick={() => setHistoryModal(false)}
                  className="text-[var(--text-dim)] hover:text-white text-xl leading-none"
                >
                  &times;
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="flex border-b border-[#333]">
                <button
                  onClick={() => setModalTab('history')}
                  className={`flex-1 py-3 text-sm font-medium transition ${modalTab === 'history' ? 'bg-[#1a1a1a] text-white border-b-2 border-blue-500' : 'text-[var(--text-dim)] hover:bg-[#111]'}`}
                >
                  Attendance History
                </button>
                <button
                  onClick={() => setModalTab('works')}
                  className={`flex-1 py-3 text-sm font-medium transition ${modalTab === 'works' ? 'bg-[#1a1a1a] text-white border-b-2 border-blue-500' : 'text-[var(--text-dim)] hover:bg-[#111]'}`}
                >
                  Works & Tasks
                </button>
              </div>

              <div className="overflow-y-auto p-4 flex-1">

                {modalTab === 'history' && (
                  <>
                    {historyLoading ? (
                      <div className="text-center py-8 text-[var(--text-dim)] animate-pulse">Loading records...</div>
                    ) : historyData.length === 0 ? (
                      <div className="text-center py-8 text-[var(--text-dim)]">No classes recorded yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {historyData.map((record, i) => (
                          <div key={i} className="flex justify-between items-center p-3 rounded bg-[#111] border border-[#222]">
                            <span className="text-sm text-gray-300">
                              {new Date(record.date).toLocaleDateString('en-US', {
                                weekday: 'short', month: 'short', day: 'numeric'
                              })}
                            </span>
                            <span className={`text-sm font-medium px-2 py-0.5 rounded ${record.status === 'Present'
                              ? 'text-green-400 bg-green-400/10'
                              : 'text-red-400 bg-red-400/10'
                              }`}>
                              {record.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {modalTab === 'works' && (
                  <div className="space-y-3">
                    {subjectWorks.length === 0 ? (
                      <div className="text-center py-8 text-[var(--text-dim)]">
                        <p>No assignments or notices for this subject.</p>
                      </div>
                    ) : (
                      subjectWorks.map((work) => {
                        const status = getDeadlineStatus(work.dueDate);
                        return (
                          <div key={work._id} className="card p-3 border border-[#333]">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-semibold text-sm">{work.title}</h4>
                              {status && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${status.type === 'danger' ? 'bg-red-900/40 text-red-400' :
                                  status.type === 'urgent' ? 'bg-orange-900/40 text-orange-400' :
                                    status.type === 'warning' ? 'bg-yellow-900/40 text-yellow-400' :
                                      'bg-green-900/40 text-green-400'
                                  }`}>
                                  {status.text}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-dim)] mb-2">{work.description}</p>
                            <div className="flex justify-between items-center text-[10px] text-[var(--text-dim)] border-t border-[#222] pt-2">
                              <span className="bg-[#222] px-2 py-0.5 rounded uppercase font-bold tracking-wider">{work.type}</span>
                              <span>Posted {new Date(work.createdAt).toLocaleDateString()}</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#0a0a0a] border border-[#333] w-full max-w-md rounded-lg shadow-2xl overflow-hidden">

              <div className="p-4 border-b border-[#333] flex justify-between items-center">
                <h3 className="font-bold text-lg">Report Attendance Issue</h3>
                <button
                  onClick={() => setReportModal(false)}
                  className="text-[var(--text-dim)] hover:text-white text-xl leading-none"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={submitReport} className="p-4 space-y-4">
                <div>
                  <label className="text-sm text-[var(--text-dim)] block mb-2">Date of Issue</label>
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
                  <label className="text-sm text-[var(--text-dim)] block mb-2">Subject</label>
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
                  <label className="text-sm text-[var(--text-dim)] block mb-2">Describe the Issue</label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="e.g., I was marked absent but I attended the class..."
                    className="input min-h-[100px] resize-none"
                    maxLength={500}
                    required
                  />
                  <p className="text-xs text-[var(--text-dim)] mt-1">{reportDescription.length}/500 characters</p>
                </div>

                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="btn btn-primary w-full"
                >
                  {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- My Reports Section --- */}
        {myReports.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm uppercase text-[var(--text-dim)] mb-4">My Reports ({myReports.length})</h2>
            <div className="space-y-3">
              {myReports.map((report) => (
                <div key={report._id} className="card">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{report.subjectName}</h3>
                      <p className="text-sm text-[var(--text-dim)]">
                        {new Date(report.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-md text-xs font-semibold ${report.status === 'resolved'
                      ? 'bg-[var(--success)] text-[var(--success-text)]'
                      : report.status === 'rejected'
                        ? 'bg-[var(--danger)] text-[var(--danger-text)]'
                        : 'bg-orange-900/20 text-orange-400'
                      }`}>
                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-dim)] mb-2">{report.issueDescription}</p>
                  {report.adminResponse && (
                    <div className="mt-2 p-2 bg-blue-900/10 border border-blue-500/30 rounded">
                      <p className="text-xs text-blue-400 font-semibold mb-1">Admin Response:</p>
                      <p className="text-sm text-[var(--text-dim)]">{report.adminResponse}</p>
                    </div>
                  )}

                  <div className="mt-3 flex justify-end gap-2">
                    {report.status === 'pending' && (
                      <button
                        onClick={() => handleEditReportClick(report)}
                        className="text-xs flex items-center gap-1 px-2 py-1 rounded text-[var(--text-dim)] hover:text-blue-400 hover:bg-blue-500/10 transition"
                      >
                        Edit Report
                      </button>
                    )}

                    {report.status !== 'pending' && (
                      <button
                        onClick={() => handleDeleteReport(report._id)}
                        className="text-xs flex items-center gap-1 px-2 py-1 rounded text-[var(--text-dim)] hover:text-red-400 hover:bg-red-500/10 transition"
                      >
                        Delete Report
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
