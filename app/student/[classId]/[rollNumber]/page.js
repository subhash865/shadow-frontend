"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

  // New State for History Modal
  const [historyModal, setHistoryModal] = useState(false); // Controls visibility
  const [selectedSubject, setSelectedSubject] = useState(null); // Stores subject name
  const [historyData, setHistoryData] = useState([]); // Stores the list of dates
  const [historyLoading, setHistoryLoading] = useState(false);

  // Report Issue Modal State
  const [reportModal, setReportModal] = useState(false);
  const [reportDate, setReportDate] = useState('');
  const [reportSubjectId, setReportSubjectId] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [myReports, setMyReports] = useState([]);

  useEffect(() => {
    if (!classId || !rollNumber) return;

    api.get(`/student/report/${classId}/${rollNumber}`)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch Error:", err);
        notify({ message: "Student not found or Server Error", type: 'error' });
        setLoading(false);
      });

    // Fetch student's reports
    api.get(`/reports/${classId}/${rollNumber}`)
      .then(res => {
        setMyReports(res.data.reports || []);
      })
      .catch(err => {
        console.error("Failed to fetch reports:", err);
      });
  }, [classId, rollNumber]);

  const handleLogout = () => {
    localStorage.removeItem('studentClassId');
    localStorage.removeItem('studentRoll');
    router.push('/');
  };

  // New Function to fetch history
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

  // Submit Report Function
  const submitReport = async (e) => {
    e.preventDefault();
    if (!reportDate || !reportSubjectId || !reportDescription.trim()) {
      notify({ message: "Please fill all fields", type: 'error' });
      return;
    }

    setReportSubmitting(true);
    const selectedSubject = data.subjects.find(s => s._id === reportSubjectId);

    try {
      await api.post('/reports/submit', {
        classId,
        studentRoll: parseInt(rollNumber),
        date: reportDate,
        subjectId: reportSubjectId,
        subjectName: selectedSubject?.subjectName || 'Unknown',
        issueDescription: reportDescription
      });

      notify({ message: "Report submitted successfully!", type: 'success' });
      setReportModal(false);
      setReportDate('');
      setReportSubjectId('');
      setReportDescription('');

      // Refresh reports list
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

  return (
    <>
      <Navbar isStudent={true} onLogout={handleLogout} classId={classId} rollNumber={rollNumber} />

      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-2xl font-bold">Roll No. {data.studentRoll}</h1>
              <p className="text-[var(--text-dim)]">{data.className}</p>
            </div>
            <button
              onClick={() => setReportModal(true)}
              className="btn btn-outline px-4 py-2 text-sm"
            >
              Report Issue
            </button>
          </div>
        </div>

        <h2 className="text-sm uppercase text-[var(--text-dim)] mb-4">Overall Attendance</h2>
        <div className="space-y-4">
          {data.subjects?.map((sub, idx) => {
            const percentage = sub.percentage;
            const isSafe = percentage >= 80;

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

                <p className="text-sm text-[var(--text-dim)] italic mb-4">
                  {sub.message}
                </p>

                {/* New View History Button */}
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

        {/* --- History Modal --- */}
        {historyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#0a0a0a] border border-[#333] w-full max-w-md rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">

              {/* Modal Header */}
              <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#0a0a0a]">
                <h3 className="font-bold text-lg">{selectedSubject} History</h3>
                <button
                  onClick={() => setHistoryModal(false)}
                  className="text-[var(--text-dim)] hover:text-white text-xl leading-none"
                >
                  &times;
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
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

              {/* Modal Footer */}
              <div className="p-4 border-t border-[#333] bg-[#0a0a0a]">
                <button
                  onClick={() => setHistoryModal(false)}
                  className="w-full py-3 bg-white text-black font-medium rounded-full active:scale-95 transition-transform"
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

              {/* Modal Header */}
              <div className="p-4 border-b border-[#333] flex justify-between items-center">
                <h3 className="font-bold text-lg">Report Attendance Issue</h3>
                <button
                  onClick={() => setReportModal(false)}
                  className="text-[var(--text-dim)] hover:text-white text-xl leading-none"
                >
                  &times;
                </button>
              </div>

              {/* Modal Body */}
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