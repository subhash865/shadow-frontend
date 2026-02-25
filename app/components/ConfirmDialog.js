"use client";
import { useState, useCallback, useRef } from 'react';

let globalShowConfirm = null;

/**
 * Custom styled confirm dialog to replace native browser confirm().
 * Usage:
 *   import { ConfirmProvider, useConfirm } from '@/app/components/ConfirmDialog';
 *   // Wrap your page with <ConfirmProvider>
 *   const confirm = useConfirm();
 *   const ok = await confirm('Are you sure?', 'This action cannot be undone.');
 */

export function ConfirmProvider({ children }) {
    const [state, setState] = useState({ open: false, title: '', message: '', confirmText: 'Confirm', cancelText: 'Cancel', type: 'default' });
    const resolveRef = useRef(null);

    const showConfirm = useCallback(({ title, message, confirmText, cancelText, type }) => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setState({ open: true, title: title || 'Confirm', message: message || '', confirmText: confirmText || 'Confirm', cancelText: cancelText || 'Cancel', type: type || 'default' });
        });
    }, []);

    globalShowConfirm = showConfirm;

    const handleConfirm = () => {
        setState(s => ({ ...s, open: false }));
        resolveRef.current?.(true);
    };

    const handleCancel = () => {
        setState(s => ({ ...s, open: false }));
        resolveRef.current?.(false);
    };

    const isDanger = state.type === 'danger';

    return (
        <>
            {children}
            {state.open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="w-full max-w-sm bg-[#0a0a0a] border border-[#333] rounded-xl shadow-2xl overflow-hidden">
                        <div className="p-5">
                            <h3 className="text-lg font-bold text-white mb-2">{state.title}</h3>
                            {state.message && (
                                <p className="text-sm text-[var(--text-dim)] leading-relaxed">{state.message}</p>
                            )}
                        </div>
                        <div className="flex border-t border-[#222]">
                            <button
                                onClick={handleCancel}
                                className="flex-1 py-3.5 text-sm font-medium text-[var(--text-dim)] hover:bg-white/5 hover:text-white transition border-r border-[#222]"
                            >
                                {state.cancelText}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className={`flex-1 py-3.5 text-sm font-bold transition ${isDanger
                                    ? 'text-red-400 hover:bg-red-500/10'
                                    : 'text-blue-400 hover:bg-blue-500/10'
                                    }`}
                            >
                                {state.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export function useConfirm() {
    return useCallback((titleOrOptions, message, options = {}) => {
        let config = {};
        if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
            config = titleOrOptions;
        } else {
            config = { title: titleOrOptions, message, ...options };
        }

        if (!globalShowConfirm) {
            // Fallback to native confirm if provider not mounted
            return Promise.resolve(window.confirm(config.message || config.title));
        }
        return globalShowConfirm({
            title: config.title,
            message: config.message,
            confirmText: config.confirmText,
            cancelText: config.cancelText,
            type: config.type || config.confirmColor
        });
    }, []);
}
