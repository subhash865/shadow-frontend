"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare } from 'lucide-react';

export default function AdminReports() {
    const params = useParams();
    const router = useRouter();
    const notify = useNotification();
    const { classId } = params;

    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState([]);
    const [respondingTo, setRespondingTo] = useState(null); // reportId
    const [adminResponse, setAdminResponse] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!classId) return;

        // Bug 3 fix: Guard against unauthenticated access
        const storedClassId = localStorage.getItem('adminClassId');
        if (!storedClassId) {
            router.push('/admin/login');
            return;
        }

        api.get(`/reports/class/${classId}`)
            .then(res => {
                setReports(res.data.reports || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch reports:", err);
                notify({ message: "Failed to load reports", type: 'error' });
                setLoading(false);
            });
    }, [classId]);

    const handleUpdateStatus = async (e, reportId, status) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        setActionLoading(true);
        try {
            const payload = { status };
            // If we are responding, include the response text
            if (respondingTo === reportId && adminResponse.trim()) {
                payload.adminResponse = adminResponse;
            }

            await api.patch(`/reports/${reportId}`, payload);

            notify({ message: `Report marked as ${status}`, type: 'success' });

            // Update local state
            setReports(prev => prev.map(r =>
                r._id === reportId ? { ...r, status, adminResponse: payload.adminResponse || r.adminResponse } : r
            ));

            setRespondingTo(null);
            setAdminResponse('');
        } catch (err) {
            notify({ message: err.response?.data?.error || "Failed to update report", type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminClassId');
        localStorage.removeItem('token');
        // Clear student keys too (in case user had a student session in same browser)
        localStorage.removeItem('studentClassId');
        localStorage.removeItem('studentRoll');
        localStorage.removeItem('studentClassName');
        localStorage.removeItem('studentToken');
        router.push('/');
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-white animate-pulse">Loading Reports...</div>;

    return (
        <>
            <Navbar isAdmin={true} onLogout={handleLogout} />

            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-full hover:bg-white/10 transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">Student Reports</h1>
                        <p className="text-[var(--text-dim)]">Manage reports submitted by students</p>
                    </div>
                </div>

                {reports.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-dim)] bg-[var(--card-bg)] rounded-lg border border-[var(--border)]">
                        No reports found for this class.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reports.map((report) => (
                            <div key={report._id} className="card border border-[var(--border)] p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-semibold">Roll No. {report.studentRoll}</h3>
                                            <span className="text-[var(--text-dim)] text-sm">•</span>
                                            <span className="text-base font-medium text-white">{report.subjectName}</span>
                                        </div>
                                        <p className="text-xs text-[var(--text-dim)]">
                                            Issue Date: {new Date(report.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${report.status === 'resolved' ? 'bg-green-900/30 text-green-400 border border-green-500/30' :
                                        report.status === 'rejected' ? 'bg-red-900/30 text-red-400 border border-red-500/30' :
                                            'bg-orange-900/30 text-orange-400 border border-orange-500/30'
                                        }`}>
                                        {report.status}
                                    </span>
                                </div>

                                <div className="bg-[#111] p-3 rounded mb-4 border border-[#222]">
                                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{report.issueDescription}</p>
                                </div>

                                {report.adminResponse && (
                                    <div className="mb-4 pl-3 border-l-2 border-blue-500">
                                        <p className="text-xs text-blue-400 font-bold mb-1">Admin Response</p>
                                        <p className="text-sm text-[var(--text-dim)]">{report.adminResponse}</p>
                                    </div>
                                )}

                                {report.status === 'pending' && (
                                    <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-[var(--border)]">
                                        {respondingTo === report._id ? (
                                            <div className="space-y-3 animate-fade-in">
                                                <textarea
                                                    value={adminResponse}
                                                    onChange={(e) => setAdminResponse(e.target.value)}
                                                    placeholder="Write a response to the student..."
                                                    className="input w-full min-h-[80px]"
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => setRespondingTo(null)}
                                                        className="btn btn-outline text-xs px-3 py-1.5"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={async (e) => { await handleUpdateStatus(e, report._id, 'rejected'); }}
                                                        className="btn bg-red-900/20 text-red-400 border-red-500/30 hover:bg-red-900/40 text-xs px-3 py-1.5"
                                                        disabled={actionLoading}
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={async (e) => { await handleUpdateStatus(e, report._id, 'resolved'); }}
                                                        className="btn btn-primary text-xs px-3 py-1.5"
                                                        disabled={actionLoading}
                                                    >
                                                        Resolve & Reply
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); setRespondingTo(report._id); }}
                                                    className="btn btn-outline flex-1 flex items-center justify-center gap-2"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                    Respond / Update Status
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
