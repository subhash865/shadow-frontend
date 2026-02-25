'use client';
import { useState, createContext, useContext, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const NotificationContext = createContext(null);

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        return ({ message }) => console.log('Notification:', message);
    }
    return context;
}

export default function NotificationProvider({ children }) {
    const [notification, setNotification] = useState(null);

    const showNotification = useCallback(({ message, type = 'success', duration = 3500 }) => {
        setNotification({ message, type });
        if (duration > 0) {
            setTimeout(() => setNotification(null), duration);
        }
    }, []);

    const closeNotification = () => setNotification(null);

    const config = {
        success: {
            icon: <CheckCircle className="w-4 h-4 flex-shrink-0" />,
            accent: 'border-l-emerald-500',
            iconColor: 'text-emerald-400',
            label: 'Success',
            labelColor: 'text-emerald-400',
        },
        error: {
            icon: <AlertCircle className="w-4 h-4 flex-shrink-0" />,
            accent: 'border-l-red-500',
            iconColor: 'text-red-400',
            label: 'Error',
            labelColor: 'text-red-400',
        },
        info: {
            icon: <Info className="w-4 h-4 flex-shrink-0" />,
            accent: 'border-l-blue-500',
            iconColor: 'text-blue-400',
            label: 'Info',
            labelColor: 'text-blue-400',
        },
    };

    const c = config[notification?.type] || config.success;

    return (
        <NotificationContext.Provider value={showNotification}>
            {children}
            {notification && (
                <div
                    className="fixed top-5 left-1/2 z-50"
                    style={{ transform: 'translateX(-50%)', animation: 'slideDown 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
                >
                    <div
                        className={`
                            flex items-start gap-3 pl-4 pr-3 py-3 rounded-2xl shadow-2xl
                            border border-white/10 border-l-2 ${c.accent}
                            min-w-[280px] max-w-sm
                        `}
                        style={{
                            background: 'rgba(18, 18, 22, 0.88)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                        }}
                    >
                        {/* Icon */}
                        <span className={`mt-0.5 ${c.iconColor}`}>{c.icon}</span>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                            <p className={`text-[11px] font-semibold uppercase tracking-wider mb-0.5 ${c.labelColor}`}>
                                {c.label}
                            </p>
                            <p className="text-sm text-white/90 leading-snug break-words">
                                {notification.message}
                            </p>
                        </div>

                        {/* Close */}
                        <button
                            onClick={closeNotification}
                            className="mt-0.5 p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors flex-shrink-0"
                            aria-label="Dismiss"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-16px) scale(0.96); }
                    to   { opacity: 1; transform: translateY(0)   scale(1);    }
                }
            `}</style>
        </NotificationContext.Provider>
    );
}
