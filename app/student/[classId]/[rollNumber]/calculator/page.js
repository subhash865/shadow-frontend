"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import {
    Plus, Trash2, Calculator, TrendingUp,
    RotateCcw, Percent, BookOpen, GraduationCap,
    ChevronDown, Download
} from 'lucide-react';

// ─── Grade thresholds (marks out of 100) ──────────────────────────────────────
const getGradeFromMarks = (marks) => {
    const m = parseFloat(marks);
    if (isNaN(m) || m < 0) return null;
    if (m > 92) return { grade: 'O', points: 10 };
    if (m > 84) return { grade: 'A+', points: 9.5 };
    if (m > 77) return { grade: 'A', points: 9 };
    if (m > 70) return { grade: 'B+', points: 8 };
    if (m > 64) return { grade: 'B', points: 7 };
    if (m > 56) return { grade: 'C', points: 6 };
    if (m > 49) return { grade: 'P', points: 5 };
    return { grade: 'F', points: 0 };
};

const GRADE_COLORS = {
    O: 'text-yellow-300 bg-yellow-500/15 border-yellow-500/25',
    'A+': 'text-green-300  bg-green-500/15  border-green-500/25',
    A: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/25',
    'B+': 'text-blue-300   bg-blue-500/15   border-blue-500/25',
    B: 'text-sky-300    bg-sky-500/15    border-sky-500/25',
    C: 'text-indigo-300 bg-indigo-500/15 border-indigo-500/25',
    P: 'text-orange-300 bg-orange-500/15 border-orange-500/25',
    F: 'text-red-300    bg-red-500/15    border-red-500/25',
};

const SESSION_SGPA = 'shadow_calc_sgpa';
const SESSION_CGPA = 'shadow_calc_cgpa';

const uid = () => Date.now() + Math.random();
const newSubject = () => ({ id: uid(), name: '', credits: 3, marks: '' });
const newSem = (n) => ({ id: uid(), sem: n, sgpa: '' });

// ─── Goal badge ───────────────────────────────────────────────────────────────
function GoalBadge({ value }) {
    if (value === null || isNaN(value)) return null;
    let label, cls;
    if (value >= 10) { label = 'Outstanding!'; cls = 'from-yellow-500/20 to-orange-500/10 border-yellow-500/30 text-yellow-300'; }
    else if (value >= 9.5) { label = 'Excellent!'; cls = 'from-green-500/20  to-emerald-500/10 border-green-500/30  text-green-300'; }
    else if (value >= 9) { label = 'Very Good!'; cls = 'from-blue-500/20   to-sky-500/10     border-blue-500/30   text-blue-300'; }
    else if (value >= 8) { label = 'Good'; cls = 'from-indigo-500/20 to-violet-500/10  border-indigo-500/30 text-indigo-300'; }
    else if (value >= 7) { label = 'Above Average'; cls = 'from-orange-500/20 to-amber-500/10  border-orange-500/30 text-orange-300'; }
    else if (value > 6) { label = 'Average'; cls = 'from-red-500/20    to-rose-500/10    border-red-500/30    text-red-300'; }
    else if (value > 5) { label = 'Pass'; cls = 'from-red-500/20    to-rose-500/10    border-red-500/30    text-red-300'; }

    else { label = 'Fail'; cls = 'from-red-600/20    to-rose-600/10    border-red-600/30    text-red-400'; }
    return (
        <div className={`mt-3 text-xs font-semibold px-3 py-1.5 rounded-xl border bg-gradient-to-r ${cls} inline-block`}>
            {label}
        </div>
    );
}

// ─── Result Card ──────────────────────────────────────────────────────────────
function ResultCard({ label, value, gradient = 'from-violet-500/10 to-indigo-500/5', children }) {
    return (
        <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${gradient} p-5 text-center`}>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-5xl font-black text-white tracking-tight">
                {value ?? '—'}
            </p>
            {children}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — SGPA PREDICTOR
// ═══════════════════════════════════════════════════════════════════════════════
function SgpaTab({ rows, setRows, sgpa }) {
    const add = () => setRows(p => [...p, newSubject()]);
    const remove = (id) => setRows(p => p.filter(r => r.id !== id));
    const update = (id, field, val) => setRows(p => p.map(r => r.id === id ? { ...r, [field]: val } : r));
    const reset = () => setRows([newSubject()]);

    return (
        <div className="space-y-4">
            {/* Grading reference */}
            <details className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden group">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-xs text-gray-400 hover:text-gray-200 transition list-none select-none">
                    <span className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5" /> Grading Scale Reference</span>
                    <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="grid grid-cols-4 gap-1.5 p-3 pt-0 border-t border-white/6">
                    {[
                        { range: '> 92', grade: 'O', pts: 10 },
                        { range: '> 84', grade: 'A+', pts: 9.5 },
                        { range: '> 77', grade: 'A', pts: 9 },
                        { range: '> 70', grade: 'B+', pts: 8 },
                        { range: '> 63', grade: 'B', pts: 7 },
                        { range: '> 56', grade: 'C', pts: 6 },
                        { range: '> 49', grade: 'P', pts: 5 },
                        { range: '≤ 49', grade: 'F', pts: 0 },
                    ].map(g => (
                        <div key={g.grade} className={`rounded-lg border px-2 py-1.5 text-center text-[10px] ${GRADE_COLORS[g.grade]}`}>
                            <p className="font-bold text-sm">{g.grade}</p>
                            <p className="opacity-70">{g.pts} pts</p>
                            <p className="opacity-50 text-[9px]">{g.range}</p>
                        </div>
                    ))}
                </div>
            </details>

            {/* Subject rows */}
            <div className="space-y-3">
                {rows.map((row, idx) => {
                    const gradeInfo = getGradeFromMarks(row.marks);
                    const marksNum = parseFloat(row.marks);
                    const hasMarks = !isNaN(marksNum) && row.marks !== '';
                    return (
                        <div key={row.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 space-y-3 animate-fade-in">
                            {/* Row header */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Subject {idx + 1}</span>
                                <div className="flex items-center gap-2">
                                    {hasMarks && gradeInfo && (
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${GRADE_COLORS[gradeInfo.grade]}`}>
                                            {gradeInfo.grade} · {gradeInfo.points} pts
                                        </span>
                                    )}
                                    {rows.length > 1 && (
                                        <button onClick={() => remove(row.id)} className="p-1.5 rounded-lg hover:bg-red-500/15 text-gray-600 hover:text-red-400 transition">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Name */}
                            <input
                                type="text"
                                value={row.name}
                                onChange={e => update(row.id, 'name', e.target.value)}
                                placeholder="Subject name (optional)"
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20 transition"
                            />

                            {/* Credits + Marks */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Credits */}
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1.5">Credits</label>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => update(row.id, 'credits', Math.max(1, row.credits - 1))}
                                            className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white text-lg flex items-center justify-center transition active:scale-95">−</button>
                                        <span className="flex-1 text-center text-lg font-bold text-white">{row.credits}</span>
                                        <button onClick={() => update(row.id, 'credits', Math.min(5, row.credits + 1))}
                                            className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white text-lg flex items-center justify-center transition active:scale-95">+</button>
                                    </div>
                                </div>

                                {/* Marks */}
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1.5">Marks <span className="text-gray-700">(out of 100)</span></label>
                                    <input
                                        type="number"
                                        value={row.marks}
                                        onChange={e => {
                                            const v = e.target.value;
                                            if (v === '' || (parseFloat(v) >= 0 && parseFloat(v) <= 100)) update(row.id, 'marks', v);
                                        }}
                                        placeholder="e.g. 88"
                                        min="0" max="100"
                                        className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20 transition text-center font-bold text-lg"
                                    />
                                </div>
                            </div>

                            {/* Progress bar */}
                            {hasMarks && (
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${gradeInfo?.grade === 'F' ? 'bg-red-500' :
                                            gradeInfo?.grade === 'P' ? 'bg-orange-500' :
                                                gradeInfo?.grade === 'O' ? 'bg-yellow-400' : 'bg-green-500'
                                            }`}
                                        style={{ width: `${Math.min(100, marksNum)}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <button onClick={add}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-white/15 hover:border-white/30 text-gray-500 hover:text-white text-sm transition">
                    <Plus className="w-4 h-4" /> Add Subject
                </button>
                <button onClick={reset}
                    className="px-4 py-3 rounded-2xl border border-white/8 hover:bg-white/5 text-gray-600 hover:text-gray-300 transition" title="Reset">
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>

            {/* Result */}
            <ResultCard
                label="Predicted SGPA"
                value={sgpa !== null ? sgpa.toFixed(2) : null}
                gradient="from-violet-500/10 to-indigo-500/5"
            >
                <GoalBadge value={sgpa} />
                {sgpa !== null && (
                    <div className="mt-3">
                        <p className="text-xs text-gray-600">
                            {rows.filter(r => r.marks !== '' && getGradeFromMarks(r.marks)?.grade !== 'F').length} subject(s) passing ·{' '}
                            Total credits: {rows.reduce((s, r) => s + r.credits, 0)}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1.5 opacity-80">
                            *Note: The minimum marks required for each grade may vary depending on the subject’s average performance. This calculation represents an ideal case.
                        </p>
                    </div>
                )}
            </ResultCard>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — MARKS CONVERTER
// ═══════════════════════════════════════════════════════════════════════════════
function MarksConverterTab() {
    const [obtained, setObtained] = useState('');
    const [srcTotal, setSrcTotal] = useState('20');
    const [tgtTotal, setTgtTotal] = useState('5');

    const result = (() => {
        const o = parseFloat(obtained), s = parseFloat(srcTotal), t = parseFloat(tgtTotal);
        if (isNaN(o) || isNaN(s) || isNaN(t) || s === 0) return null;
        if (o > s) return null;
        return (o / s) * t;
    })();

    const percentage = (() => {
        const o = parseFloat(obtained), s = parseFloat(srcTotal);
        if (isNaN(o) || isNaN(s) || s === 0 || o > s) return null;
        return (o / s) * 100;
    })();

    const clear = () => { setObtained(''); setSrcTotal('20'); setTgtTotal('5'); };

    return (
        <div className="space-y-4">
            {/* Info banner */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.06] px-4 py-3 text-xs text-blue-300 flex items-start gap-2">
                <Percent className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                <span>Convert any marks to a different scale instantly. For example: internal marks out of 20 → converted to 5.</span>
            </div>

            {/* Inputs */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 space-y-5">

                {/* Obtained marks */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Marks Obtained</label>
                    <input
                        type="number"
                        value={obtained}
                        onChange={e => setObtained(e.target.value)}
                        placeholder="e.g. 18"
                        min="0"
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-xl font-bold text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/50 transition text-center"
                    />
                </div>

                {/* From → To */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-2">Out of (Original Total)</label>
                        <input
                            type="number"
                            value={srcTotal}
                            onChange={e => setSrcTotal(e.target.value)}
                            min="1"
                            className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-white/20 transition text-center"
                        />
                    </div>
                    <div className="pb-2.5 text-gray-600 font-bold text-lg">→</div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-2">Target Total</label>
                        <input
                            type="number"
                            value={tgtTotal}
                            onChange={e => setTgtTotal(e.target.value)}
                            min="1"
                            className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-white/20 transition text-center"
                        />
                    </div>
                </div>
            </div>

            {/* Formula display */}
            {obtained !== '' && (
                <div className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-2.5 text-center text-xs text-gray-500 font-mono">
                    {obtained} / {srcTotal} × {tgtTotal}{result !== null ? <> = <span className="text-white font-bold">{result.toFixed(2)}</span></> : ' = Invalid'}
                </div>
            )}

            {/* Result */}
            <ResultCard
                label="Converted Marks"
                value={result !== null ? result.toFixed(2) : null}
                gradient="from-blue-500/10 to-sky-500/5"
            >
                {result !== null && percentage !== null && (
                    <>
                        <p className="text-sm text-gray-400 mt-1">
                            out of <span className="text-white font-semibold">{tgtTotal}</span>
                        </p>
                        <div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden mx-auto max-w-[200px]">
                            <div
                                className="h-full rounded-full bg-blue-400 transition-all"
                                style={{ width: `${Math.min(100, percentage)}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{percentage.toFixed(1)}%</p>
                    </>
                )}
            </ResultCard>

            <button onClick={clear}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-white/8 hover:bg-white/5 text-gray-600 hover:text-gray-300 text-sm transition">
                <RotateCcw className="w-3.5 h-3.5" /> Clear
            </button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — CGPA CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════
function CgpaTab({ sems, setSems, currentSgpa, cgpa }) {
    const [imported, setImported] = useState(false);

    const add = () => setSems(p => [...p, newSem(p.length + 1)]);
    const remove = (id) => setSems(p => p.filter(r => r.id !== id));
    const update = (id, val) => {
        if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= 10))
            setSems(p => p.map(r => r.id === id ? { ...r, sgpa: val } : r));
    };
    const reset = () => { setSems([newSem(1)]); setImported(false); };

    const importSgpa = () => {
        if (currentSgpa === null) return;
        setSems(p => {
            const next = [...p, newSem(p.length + 1)];
            next[next.length - 1].sgpa = currentSgpa.toFixed(2);
            return next;
        });
        setImported(true);
    };

    return (
        <div className="space-y-4">
            {/* Import button */}
            <button
                onClick={importSgpa}
                disabled={currentSgpa === null}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-medium transition
                    ${currentSgpa !== null
                        ? 'border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/15 active:scale-[0.98]'
                        : 'border-white/8 bg-white/[0.02] text-gray-600 cursor-not-allowed'
                    }`}
            >
                <Download className="w-4 h-4" />
                {currentSgpa !== null
                    ? `Import Predicted SGPA (${currentSgpa.toFixed(2)}) from Tab 1`
                    : 'No predicted SGPA yet — fill Tab 1 first'}
            </button>
            {imported && (
                <p className="text-xs text-violet-400 text-center -mt-1">✓ Imported as Semester {sems.length}</p>
            )}

            {/* Semester rows */}
            <div className="space-y-3">
                {sems.map((row, idx) => (
                    <div key={row.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-xs font-bold text-indigo-400">
                            S{row.sem}
                        </div>
                        <div className="flex-1">
                            <label className="text-xs text-gray-500">Semester {row.sem} SGPA</label>
                            <input
                                type="number"
                                value={row.sgpa}
                                onChange={e => update(row.id, e.target.value)}
                                placeholder="e.g. 8.75"
                                min="0" max="10" step="0.01"
                                className="w-full bg-transparent outline-none text-xl font-bold text-white placeholder-gray-700"
                            />
                        </div>
                        {row.sgpa !== '' && !isNaN(parseFloat(row.sgpa)) && (
                            <GoalBadge value={parseFloat(row.sgpa)} />
                        )}
                        {sems.length > 1 && (
                            <button onClick={() => remove(row.id)}
                                className="p-2 rounded-xl hover:bg-red-500/15 text-gray-700 hover:text-red-400 transition flex-shrink-0">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Add / Reset */}
            <div className="flex gap-3">
                <button onClick={add}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-white/15 hover:border-white/30 text-gray-500 hover:text-white text-sm transition">
                    <Plus className="w-4 h-4" /> Add Semester
                </button>
                <button onClick={reset}
                    className="px-4 py-3 rounded-2xl border border-white/8 hover:bg-white/5 text-gray-600 hover:text-gray-300 transition" title="Reset">
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>

            {/* Result */}
            <ResultCard
                label="Cumulative GPA (CGPA)"
                value={cgpa !== null ? cgpa.toFixed(2) : null}
                gradient="from-indigo-500/10 to-blue-500/5"
            >
                <GoalBadge value={cgpa} />
                {cgpa !== null && (
                    <p className="text-xs text-gray-600 mt-3">
                        Average of {sems.filter(r => r.sgpa !== '' && !isNaN(parseFloat(r.sgpa))).length} semester(s)
                    </p>
                )}
            </ResultCard>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function CalculatorPage() {
    const { classId, rollNumber } = useParams();
    const router = useRouter();
    const [tab, setTab] = useState('sgpa');

    const handleLogout = () => {
        localStorage.removeItem('studentClassId');
        localStorage.removeItem('studentRoll');
        localStorage.removeItem('studentClassName');
        localStorage.removeItem('studentToken');
        sessionStorage.removeItem('shadow_calc_sgpa');
        sessionStorage.removeItem('shadow_calc_cgpa');
        router.push('/');
    };

    // ── State seeded from sessionStorage ──────────────────────────────────────
    const [subjects, setSubjects] = useState(() => {
        if (typeof window === 'undefined') return [newSubject()];
        try { const s = JSON.parse(sessionStorage.getItem(SESSION_SGPA) || 'null'); return s?.length ? s : [newSubject()]; }
        catch { return [newSubject()]; }
    });

    const [sems, setSems] = useState(() => {
        if (typeof window === 'undefined') return [newSem(1)];
        try { const s = JSON.parse(sessionStorage.getItem(SESSION_CGPA) || 'null'); return s?.length ? s : [newSem(1)]; }
        catch { return [newSem(1)]; }
    });

    // ── Persist on change ─────────────────────────────────────────────────────
    useEffect(() => { try { sessionStorage.setItem(SESSION_SGPA, JSON.stringify(subjects)); } catch { } }, [subjects]);
    useEffect(() => { try { sessionStorage.setItem(SESSION_CGPA, JSON.stringify(sems)); } catch { } }, [sems]);

    // ── SGPA calculation ──────────────────────────────────────────────────────
    const sgpa = (() => {
        const valid = subjects.filter(r => r.marks !== '');
        if (!valid.length) return null;
        const totalCreds = valid.reduce((s, r) => s + r.credits, 0);
        const weightedSum = valid.reduce((s, r) => s + r.credits * (getGradeFromMarks(r.marks)?.points ?? 0), 0);
        if (!totalCreds) return null;
        // Round to 2 decimal places to avoid floating-point drift (e.g. 9.0999... → 9.10)
        return Math.round((weightedSum / totalCreds) * 100) / 100;
    })();

    // ── CGPA calculation ──────────────────────────────────────────────────────
    const cgpa = (() => {
        const valid = sems.map(r => parseFloat(r.sgpa)).filter(v => !isNaN(v) && v >= 0 && v <= 10);
        return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
    })();

    const TABS = [
        { id: 'sgpa', label: 'SGPA', fullLabel: 'Grade & SGPA', icon: Calculator },
        { id: 'converter', label: 'Convert', fullLabel: 'Marks Converter', icon: Percent },
        { id: 'cgpa', label: 'CGPA', fullLabel: 'CGPA Calc', icon: TrendingUp },
    ];

    return (
        <>
            <Navbar isStudent={true} onLogout={handleLogout} classId={classId} rollNumber={rollNumber} />

            <div className="max-w-xl mx-auto px-4 py-8 pb-20">

                {/* Page header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white leading-none">Academic Toolkit</h1>
                        <p className="text-xs text-gray-500 mt-0.5">Client-side only · Cleared on logout</p>
                    </div>
                </div>

                {/* Summary chips */}
                {(sgpa !== null || cgpa !== null) && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {sgpa !== null && (
                            <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-300">
                                <Calculator className="w-3 h-3" /> SGPA: <span className="font-bold">{sgpa.toFixed(2)}</span>
                            </div>
                        )}
                        {cgpa !== null && (
                            <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                                <TrendingUp className="w-3 h-3" /> CGPA: <span className="font-bold">{cgpa.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab bar */}
                <div className="flex gap-1 p-1 rounded-2xl border border-white/8 bg-white/[0.02] mb-6">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all
                                ${tab === t.id ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <t.icon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="hidden sm:inline">{t.fullLabel}</span>
                            <span className="sm:hidden">{t.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                {tab === 'sgpa' && <SgpaTab rows={subjects} setRows={setSubjects} sgpa={sgpa} />}
                {tab === 'converter' && <MarksConverterTab />}
                {tab === 'cgpa' && <CgpaTab sems={sems} setSems={setSems} currentSgpa={sgpa} cgpa={cgpa} />}

                <p className="text-center text-xs text-gray-700 mt-8">
                    No data sent to server · Wiped on logout
                </p>
            </div>
        </>
    );
}
