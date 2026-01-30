"use client";
import { useState } from 'react';
import Navbar from '@/app/components/Navbar';
import api from '@/utils/api';
import { useNotification } from '@/app/components/Notification';
import { Lock } from 'lucide-react';

export default function TeacherSettings() {
    const notify = useNotification();
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            notify({ message: "New passwords do not match", type: 'error' });
            return;
        }

        setLoading(true);
        try {
            await api.post('/teacher/change-password', {
                currentPassword: passwords.current,
                newPassword: passwords.new
            });
            notify({ message: "Password updated successfully", type: 'success' });
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) {
            notify({ message: err.response?.data?.error || "Failed to update password", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className="max-w-2xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">Settings</h1>

                <div className="card">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-blue-400" />
                        Change Password
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-[var(--text-dim)] mb-1">Current Password</label>
                            <input
                                type="password"
                                name="current"
                                value={passwords.current}
                                onChange={handleChange}
                                className="input w-full"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--text-dim)] mb-1">New Password</label>
                            <input
                                type="password"
                                name="new"
                                value={passwords.new}
                                onChange={handleChange}
                                className="input w-full"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--text-dim)] mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                name="confirm"
                                value={passwords.confirm}
                                onChange={handleChange}
                                className="input w-full"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full"
                        >
                            {loading ? "Updating..." : "Update Password"}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
