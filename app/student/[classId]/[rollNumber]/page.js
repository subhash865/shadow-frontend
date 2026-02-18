"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';

export default function StudentDashboard() {
  const params = useParams();
  const { classId, rollNumber } = params;
  const router = useRouter();
  const notify = useNotification();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [minPercentage, setMinPercentage] = useState(75);
  const [announcementCount, setAnnouncementCount] = useState(0);

  // History Modal
  const [historyModal, setHistoryModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Report Issue Modal State
  const [reportModal, setReportModal] = useState(false);
  const [reportDate, setReportDate] = useState('');
  const [reportSubjectId, setReportSubjectId] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [myReports, setMyReports] = useState([]);

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

  const fetchData = async (showRefresh = false) => {
    if (!classId || !rollNumber) return;
    if (showRefresh) setRefreshing(true);

    try {
      const [reportRes, reportsRes, announcementsRes] = await Promise.allSettled([
        api.get(`/student/report/${classId}/${rollNumber}`),
        api.get(`/reports/${classId}/${rollNumber}`),
        api.get(`/announcements/${classId}`)
      ]);

      if (reportRes.status === 'fulfilled') {
        setData(reportRes.value.data);
      } else {
        notify({ message: "Student not found or Server Error", type: 'error' });
      }

      if (reportsRes.status === 'fulfilled') {
        setMyReports(reportsRes.value.data.reports || []);
      }

      if (announcementsRes.status === 'fulfilled') {
        const announcements = announcementsRes.value.data.announcements || [];
        // Count recent announcements (last 24h)
        const now = new Date();
        const recentCount = announcements.filter(a => {
          const created = new Date(a.createdAt);
          return (now - created) < 86400000;
        }).length;
        setAnnouncementCount(recentCount);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [classId, rollNumber]);

  const handleLogout = () => {
    localStorage.removeItem('studentClassId');
    localStorage.removeItem('studentRoll');
    localStorage.removeItem('studentClassName');
    router.push('/');
  };

  const fetchHistory = async (subjectId, subjectName) => {
    setHistoryModal(true);
    setSelectedSubject(subjectName);
    setHistoryLoading(true);
    setHistoryData([]);

    try {
      const res = await api.get(`/student/history/${classId}/${rollNumber}/${subjectId}`);
      setHistoryData(res.data.history);
    } catch (err) {
      notify({ message: "Failed to load history", type: 'error' });
      setHistoryModal(false);
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
      await api.post('/reports/submit', {
        classId,
        studentRoll: parseInt(rollNumber),
        date: reportDate,
        subjectId: reportSubjectId,
        subjectName: selectedSub?.subjectName || 'Unknown',
        issueDescription: reportDescription
      });

      notify({ message: "Report submitted successfully!", type: 'success' });
      setReportModal(false);
      setReportDate('');
      setReportSubjectId('');
      setReportDescription('');

      const res = await api.get(`/reports/${classId}/${rollNumber}`);
      setMyReports(res.data.reports || []);
    } catch (err) {
      notify({ message: "Failed to submit report", type: 'error' });
    } finally {
      setReportSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading Report...</div>;
  if (!data) return <div className="flex h-screen items-center justify-center text-[var(--text-dim)]">Student Not Found</div>;

  // Calculate overall stats
  const totalAttended = data.subjects?.reduce((sum, s) => sum + s.attended, 0) || 0;
  const totalClasses = data.subjects?.reduce((sum, s) => sum + s.total, 0) || 0;
  const overallPercentage = totalClasses > 0 ? (totalAttended / totalClasses) * 100 : 0;
  const worstSubject = data.subjects?.length > 0
    ? data.subjects.reduce((worst, s) => s.percentage < worst.percentage ? s : worst, data.subjects[0])
    : null;
  const subjectsAtRisk = data.subjects?.filter(s => s.percentage < minPercentage).length || 0;

  return (
    <>
      <Navbar
        isStudent={true}
        onLogout={handleLogout}
        classId={classId}
        rollNumber={rollNumber}
        onReportClick={() => setReportModal(true)}
      />

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header with refresh */}
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
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2 rounded-full border border-[var(--border)] hover:border-white/50 transition"
              title="Refresh data"
            >
              <svg
                className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Overall Summary Card */}
        <div className="card mb-6 bg-gradient-to-br from-white/5 to-transparent border-white/15">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className={`text-3xl font-bold ${overallPercentage >= minPercentage ? 'text-green-400' : 'text-red-400'}`}>
                {overallPercentage.toFixed(1)}%
              </p>
              <p className="text-xs text-[var(--text-dim)] mt-1">Overall</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{totalAttended}<span className="text-lg text-[var(--text-dim)]">/{totalClasses}</span></p>
              <p className="text-xs text-[var(--text-dim)] mt-1">Attended</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{data.subjects?.length || 0}</p>
              <p className="text-xs text-[var(--text-dim)] mt-1">Subjects</p>
            </div>
          </div>
          {subjectsAtRisk > 0 && (
            <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2 py-1 rounded-full bg-red-900/30 text-red-400 border border-red-500/30 font-medium">
                ⚠ {subjectsAtRisk} subject{subjectsAtRisk > 1 ? 's' : ''} below {minPercentage}%
              </span>
              {worstSubject && worstSubject.percentage < minPercentage && (
                <span className="text-xs text-[var(--text-dim)]">
                  Weakest: {worstSubject.subjectName} ({worstSubject.percentage.toFixed(1)}%)
                </span>
              )}
            </div>
          )}
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
        <h2 className="text-sm uppercase text-[var(--text-dim)] mb-4">Subject-wise Attendance</h2>
        <div className="space-y-4">
          {data.subjects?.map((sub, idx) => {
            const percentage = sub.percentage;
            const isSafe = percentage >= minPercentage;
            const bunkInfo = getBunkMessage(sub.attended, sub.total, percentage);

            return (
              <div key={idx} className="card relative group">
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

                {/* Progress bar */}
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

                <p className={`text-sm italic mb-4 ${bunkInfo.type === 'safe' ? 'text-green-400/80' :
                    bunkInfo.type === 'danger' ? 'text-red-400/80' :
                      'text-orange-400/80'
                  }`}>
                  {bunkInfo.text}
                </p>

                <button
                  onClick={() => fetchHistory(sub._id, sub.subjectName)}
                  className="w-full py-2 rounded-md border border-[var(--border)] text-sm text-[var(--text-dim)] hover:text-white hover:border-white transition-colors"
                >
                  View Detailed History
                </button>
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

        {/* --- History Modal --- */}
        {historyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#0a0a0a] border border-[#333] w-full max-w-md rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">

              <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#0a0a0a]">
                <h3 className="font-bold text-lg">{selectedSubject} History</h3>
                <button
                  onClick={() => setHistoryModal(false)}
                  className="text-[var(--text-dim)] hover:text-white text-xl leading-none"
                >
                  &times;
                </button>
              </div>

              <div className="overflow-y-auto p-4 flex-1">
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
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
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
              </div>

              <div className="p-4 border-t border-[#333] bg-[#0a0a0a]">
                <button
                  onClick={() => setHistoryModal(false)}
                  className="w-auto py-2 bg-white text-black font-medium rounded-full active:scale-95 transition-transform text-sm"
                >
                  Close
                </button>
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
                  <p className="text-xs text-[var(--text-dim)] mt-2">
                    Submitted {new Date(report.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}