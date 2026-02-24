"use client";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// Scroll-reveal hook
function useReveal() {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setVisible(true); },
            { threshold: 0.15 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);
    return [ref, visible];
}

function RevealSection({ children, className = '', delay = 0 }) {
    const [ref, visible] = useReveal();
    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(40px)',
                transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
            }}
        >
            {children}
        </div>
    );
}

// Interactive counter
function Counter({ end, label, emoji, suffix = '' }) {
    const [count, setCount] = useState(0);
    const [ref, visible] = useReveal();

    useEffect(() => {
        if (!visible) return;
        let current = 0;
        const step = Math.max(1, Math.floor(end / 40));
        const timer = setInterval(() => {
            current += step;
            if (current >= end) { setCount(end); clearInterval(timer); }
            else setCount(current);
        }, 30);
        return () => clearInterval(timer);
    }, [visible, end]);

    return (
        <div ref={ref} className="text-center">
            <div className="text-3xl mb-2" style={{ animation: visible ? 'float 3s ease-in-out infinite' : 'none' }}>{emoji}</div>
            <div className="text-3xl font-black text-white">{count}{suffix}</div>
            <div className="text-xs text-[var(--text-dim)] mt-1">{label}</div>
        </div>
    );
}

export default function GuidePage() {
    const [activeStep, setActiveStep] = useState(0);
    const [openFaq, setOpenFaq] = useState(null);
    const [easterEggClicks, setEasterEggClicks] = useState(0);
    const [showSecret, setShowSecret] = useState(false);

    const steps = [
        {
            emoji: '🏫',
            title: 'Admin Creates Class',
            desc: 'Your CR or teacher creates a classroom with a secret PIN. Think of it as the "One Ring to Rule Them All" — but for attendance.',
            color: '#3b82f6'
        },
        {
            emoji: '📋',
            title: 'Mark Attendance',
            desc: 'Admin taps roll numbers or scans the logbook. Absent students get marked. Present ones breathe a sigh of relief. 😮‍💨',
            color: '#8b5cf6'
        },
        {
            emoji: '📱',
            title: 'Students Check In',
            desc: 'Enter your class name and roll number. That\'s it. No passwords, no OTPs, no "verify you\'re not a robot" nonsense.',
            color: '#10b981'
        },
        {
            emoji: '📊',
            title: 'Track Everything',
            desc: 'See subject-wise attendance, calculate skip effects, and know exactly how many classes you can ✨strategically miss✨.',
            color: '#f59e0b'
        },
        {
            emoji: '📢',
            title: 'Stay Updated',
            desc: 'Attention board keeps you in the loop with announcements and deadlines. No more "I didn\'t know about the assignment" excuse.',
            color: '#ef4444'
        }
    ];

    const features = [
        {
            emoji: '🎯',
            title: 'Subject-wise Attendance',
            desc: 'Know which subjects love you back — and which ones you should probably attend more.',
            color: 'from-blue-500/20 to-blue-600/5',
            border: 'border-blue-500/20 hover:border-blue-500/40'
        },
        {
            emoji: '🧮',
            title: 'Skip Effect Calculator',
            desc: '"What if I skip 3 more classes?" — This calculator answers that question so your anxiety doesn\'t have to.',
            color: 'from-purple-500/20 to-purple-600/5',
            border: 'border-purple-500/20 hover:border-purple-500/40'
        },
        {
            emoji: '📅',
            title: 'Attendance Calendar',
            desc: 'A visual map of your attendance journey. Green = good days. Red = days you chose sleep over class.',
            color: 'from-emerald-500/20 to-emerald-600/5',
            border: 'border-emerald-500/20 hover:border-emerald-500/40'
        },
        {
            emoji: '📢',
            title: 'Attention Board',
            desc: 'Announcements, deadlines, and tasks — all in one place. With filters so you can stress about only what matters.',
            color: 'from-orange-500/20 to-orange-600/5',
            border: 'border-orange-500/20 hover:border-orange-500/40'
        },
        {
            emoji: '🔔',
            title: 'Push Notifications',
            desc: 'Get notified when a new announcement drops. Because checking the app voluntarily? We don\'t do that here.',
            color: 'from-yellow-500/20 to-yellow-600/5',
            border: 'border-yellow-500/20 hover:border-yellow-500/40'
        },
        {
            emoji: '🔒',
            title: 'Privacy Mode',
            desc: 'Don\'t want people seeing your attendance? Admin can enable privacy mode. What happens in your profile stays in your profile.',
            color: 'from-red-500/20 to-red-600/5',
            border: 'border-red-500/20 hover:border-red-500/40'
        },
        {
            emoji: '🐛',
            title: 'Report Issues',
            desc: 'Marked absent when you were present? Report it directly from the app. Justice served — digitally.',
            color: 'from-cyan-500/20 to-cyan-600/5',
            border: 'border-cyan-500/20 hover:border-cyan-500/40'
        },
        {
            emoji: '📸',
            title: 'Scan Logbook',
            desc: 'Point your camera at the attendance logbook and let AI do the reading. Because deciphering handwriting is a lost art.',
            color: 'from-pink-500/20 to-pink-600/5',
            border: 'border-pink-500/20 hover:border-pink-500/40'
        },
    ];

    const faqs = [
        {
            q: 'Is this app going to snitch on me?',
            a: 'Nope. Shadow just shows you the data your class admin posts. We\'re the messenger, not the judge. 📬'
        },
        {
            q: 'Can I fake my attendance here?',
            a: 'Nice try. Only the admin can mark attendance. This app is for tracking, not for creative fiction. 🎭'
        },
        {
            q: 'What if my admin marks me absent by mistake?',
            a: 'Hit the "Report Issue" button, explain your case, and your admin can fix it. Democracy wins. ⚖️'
        },
        {
            q: 'Does this work on my phone?',
            a: 'It\'s a PWA — installs like an app, works offline-ish, and won\'t eat your storage. Your phone will thank you. 📱'
        },
        {
            q: 'Who made this and why?',
            a: 'Built by students, for students. Because we were tired of manually calculating if we could skip Friday\'s class. 🫠'
        },
        {
            q: 'Is my data safe?',
            a: 'Your attendance data is stored securely. Plus, with Privacy Mode, even you and your classmates won\'t know your attendance secrets. 🤫 until admin unblocks it'
        }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveStep(prev => (prev + 1) % steps.length);
        }, 3500);
        return () => clearInterval(timer);
    }, []);

    const handleEasterEgg = () => {
        const n = easterEggClicks + 1;
        setEasterEggClicks(n);
        if (n >= 7) {
            setShowSecret(true);
            setTimeout(() => setShowSecret(false), 4000);
            setEasterEggClicks(0);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white overflow-x-hidden">
            {/* Back nav */}
            <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/6">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-sm font-bold hover:opacity-80 transition">
                        <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-black text-xs font-black">S</div>
                        SHADOW
                    </Link>
                    <Link
                        href="/"
                        className="text-xs px-4 py-2 rounded-full border border-white/10 text-[var(--text-dim)] hover:text-white hover:border-white/20 transition"
                    >
                        ← Back to App
                    </Link>
                </div>
            </div>

            <div className="pt-14">

                {/* ─── HERO ─── */}
                <section className="relative px-4 pt-16 pb-20 text-center overflow-hidden">
                    {/* Animated gradient background */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-15"
                            style={{
                                background: 'radial-gradient(circle, #3b82f6 0%, #8b5cf6 40%, transparent 70%)',
                                animation: 'pulse-glow 4s ease-in-out infinite',
                            }}
                        />
                    </div>

                    <div className="relative z-10">
                        <div
                            className="inline-block text-6xl mb-6 cursor-pointer select-none"
                            onClick={handleEasterEgg}
                            style={{ animation: 'float 3s ease-in-out infinite' }}
                            title="Try clicking me multiple times 👀"
                        >
                            👻
                        </div>

                        {showSecret && (
                            <div className="text-sm text-purple-400 mb-4 animate-fade-in">
                                ✨ You found the easter egg! You&apos;re clearly not paying attention in class. ✨
                            </div>
                        )}

                        <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight" style={{ letterSpacing: '-0.04em' }}>
                            Meet <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent" style={{ backgroundSize: '200% auto', animation: 'shimmer 3s linear infinite' }}>Shadow</span>
                        </h1>
                        <p className="text-lg text-[var(--text-dim)] max-w-lg mx-auto mb-2">
                            Attendance is temporary, but your CGPA is Mandatory.
                        </p>
                        <p className="text-sm text-[var(--text-dim)] opacity-60">
                            But Minimum attendance is necessary to get the CGPA
                        </p>

                        <div className="flex justify-center gap-3 mt-8">
                            <Link href="/" className="btn btn-primary !w-auto !px-8 !py-3 text-sm inline-flex">
                                Get Started
                            </Link>
                            <a href="#features" className="btn btn-outline !w-auto !px-8 !py-3 text-sm inline-flex">
                                See Features
                            </a>
                        </div>
                    </div>
                </section>

                {/* ─── FUN STATS ─── */}
                <RevealSection className="px-4 py-12">
                    <div className="max-w-2xl mx-auto grid grid-cols-3 gap-6">
                        <Counter end={100} suffix="%" label="Free Forever" emoji="💸" />
                        <Counter end={0} label="Passwords Needed" emoji="🔑" />
                        <Counter end={999} suffix="+" label="Excuses Prevented" emoji="🫠" />
                    </div>
                </RevealSection>

                {/* ─── HOW IT WORKS ─── */}
                <section className="px-4 py-16">
                    <RevealSection>
                        <h2 className="text-2xl font-black text-center mb-2 tracking-tight">How It Works</h2>
                        <p className="text-sm text-[var(--text-dim)] text-center mb-10">
                            Five steps. Zero headaches. Maybe one existential crisis about your attendance.
                        </p>
                    </RevealSection>

                    <div className="max-w-2xl mx-auto">
                        {/* Step indicators */}
                        <div className="flex justify-between items-center mb-8 px-4">
                            {steps.map((step, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveStep(i)}
                                    className="flex flex-col items-center gap-2 transition-all duration-500 group"
                                    style={{ opacity: activeStep === i ? 1 : 0.3 }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all duration-500"
                                        style={{
                                            backgroundColor: activeStep === i ? step.color + '22' : 'transparent',
                                            border: activeStep === i ? `2px solid ${step.color}` : '2px solid #333',
                                            transform: activeStep === i ? 'scale(1.15)' : 'scale(1)'
                                        }}
                                    >
                                        {step.emoji}
                                    </div>
                                    <div
                                        className="h-0.5 w-6 rounded transition-all duration-500 hidden sm:block"
                                        style={{ backgroundColor: activeStep === i ? step.color : '#333' }}
                                    />
                                </button>
                            ))}
                        </div>

                        {/* Active step card */}
                        <div
                            key={activeStep}
                            className="glass-card text-center py-8 px-6 animate-fade-in"
                            style={{ borderColor: steps[activeStep].color + '33' }}
                        >
                            <div className="text-4xl mb-4">{steps[activeStep].emoji}</div>
                            <h3 className="text-xl font-bold mb-3">
                                <span className="text-[var(--text-dim)] text-sm mr-2">Step {activeStep + 1}</span>
                                {steps[activeStep].title}
                            </h3>
                            <p className="text-[var(--text-dim)] text-sm max-w-md mx-auto leading-relaxed">
                                {steps[activeStep].desc}
                            </p>
                        </div>
                    </div>
                </section>

                {/* ─── FEATURES GRID ─── */}
                <section id="features" className="px-4 py-16">
                    <RevealSection>
                        <h2 className="text-2xl font-black text-center mb-2 tracking-tight">Features That Slap</h2>
                        <p className="text-sm text-[var(--text-dim)] text-center mb-10">
                            No cap. These features go hard.
                        </p>
                    </RevealSection>

                    <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {features.map((feat, i) => (
                            <RevealSection key={i} delay={i * 0.08}>
                                <div
                                    className={`group relative p-5 rounded-2xl border bg-gradient-to-br ${feat.color} ${feat.border} transition-all duration-300 cursor-default overflow-hidden hover:scale-[1.02]`}
                                >
                                    <div className="absolute top-3 right-3 text-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-300 group-hover:scale-125 transform">
                                        {feat.emoji}
                                    </div>
                                    <div className="text-2xl mb-3">{feat.emoji}</div>
                                    <h3 className="font-bold text-sm mb-1.5">{feat.title}</h3>
                                    <p className="text-xs text-[var(--text-dim)] leading-relaxed">{feat.desc}</p>
                                </div>
                            </RevealSection>
                        ))}
                    </div>
                </section>

                {/* ─── MEME BREAK ─── */}
                <RevealSection className="px-4 py-12">
                    <div className="max-w-xl mx-auto text-center">
                        <div className="glass-card py-10 px-6 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-5" style={{
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)'
                            }} />
                            <div className="relative">
                                <p className="text-4xl mb-4">🧠</p>
                                <p className="text-lg font-bold mb-2 italic">&quot;My attendance is above 75%.&quot;</p>
                                <p className="text-[var(--text-dim)] text-sm mb-4">— Nobody who doesn&apos;t use Shadow</p>
                                <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-[var(--text-dim)]">
                                    💡 Fun fact: Students using Shadow skip 40% more effectively. (We made that up, but it sounds right.)
                                </div>
                            </div>
                        </div>
                    </div>
                </RevealSection>

                {/* ─── WHO IS THIS FOR ─── */}
                <section className="px-4 py-16">
                    <RevealSection>
                        <h2 className="text-2xl font-black text-center mb-2 tracking-tight">Built For</h2>
                        <p className="text-sm text-[var(--text-dim)] text-center mb-10">
                            If you relate to any of these, you&apos;re in the right place.
                        </p>
                    </RevealSection>

                    <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { emoji: '😴', title: 'The Sleeper', desc: 'Needs to know if they can afford one more "sick day"' },
                            { emoji: '🤓', title: 'The Perfectionist', desc: 'Refreshes attendance every 5 minutes. We see you.' },
                            { emoji: '😎', title: 'The CR', desc: 'Tired of everyone DMing "bro what\'s my attendance?"' }
                        ].map((person, i) => (
                            <RevealSection key={i} delay={i * 0.1}>
                                <div className="glass-card text-center py-8 px-4 hover:scale-105 transition-transform duration-300 cursor-default">
                                    <div className="text-4xl mb-3" style={{ animation: 'float 3s ease-in-out infinite', animationDelay: `${i * 0.5}s` }}>
                                        {person.emoji}
                                    </div>
                                    <h3 className="font-bold text-sm mb-2">{person.title}</h3>
                                    <p className="text-xs text-[var(--text-dim)] leading-relaxed">{person.desc}</p>
                                </div>
                            </RevealSection>
                        ))}
                    </div>
                </section>

                {/* ─── FAQ ─── */}
                <section className="px-4 py-16">
                    <RevealSection>
                        <h2 className="text-2xl font-black text-center mb-2 tracking-tight">FAQs</h2>
                        <p className="text-sm text-[var(--text-dim)] text-center mb-10">
                            Questions we&apos;ve been asked. Some of them reasonable.
                        </p>
                    </RevealSection>

                    <div className="max-w-2xl mx-auto space-y-2">
                        {faqs.map((faq, i) => (
                            <RevealSection key={i} delay={i * 0.05}>
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${openFaq === i
                                        ? 'bg-white/5 border-white/15'
                                        : 'bg-white/2 border-white/6 hover:border-white/12'
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-semibold pr-4">{faq.q}</span>
                                        <span
                                            className="text-[var(--text-dim)] text-lg transition-transform duration-300 flex-shrink-0"
                                            style={{ transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)' }}
                                        >
                                            +
                                        </span>
                                    </div>
                                    <div
                                        className="overflow-hidden transition-all duration-300"
                                        style={{
                                            maxHeight: openFaq === i ? '200px' : '0',
                                            opacity: openFaq === i ? 1 : 0,
                                            marginTop: openFaq === i ? '12px' : '0'
                                        }}
                                    >
                                        <p className="text-sm text-[var(--text-dim)] leading-relaxed">{faq.a}</p>
                                    </div>
                                </button>
                            </RevealSection>
                        ))}
                    </div>
                </section>

                {/* ─── CTA ─── */}
                <RevealSection className="px-4 py-20">
                    <div className="max-w-xl mx-auto text-center">
                        <div className="text-5xl mb-6" style={{ animation: 'float 2.5s ease-in-out infinite' }}>🚀</div>
                        <h2 className="text-3xl font-black mb-3 tracking-tight">Ready to Track?</h2>
                        <p className="text-[var(--text-dim)] text-sm mb-8 max-w-md mx-auto">
                            Stop guessing your attendance percentage. Start knowing it.
                            <br />
                            <span className="opacity-60">(Your future self will thank you. Probably.)</span>
                        </p>
                        <Link href="/" className="btn btn-primary !w-auto !px-10 !py-3.5 text-sm font-bold inline-flex mx-auto">
                            Open Shadow →
                        </Link>
                    </div>
                </RevealSection>

                {/* ─── FOOTER ─── */}
                <footer className="border-t border-white/6 px-4 py-8">
                    <div className="max-w-2xl mx-auto text-center">
                        <p className="text-xs text-[var(--text-dim)]">
                            Built with 💀 by students who were too lazy to calculate attendance.
                        </p>
                        <p className="text-[10px] text-[var(--text-dim)] opacity-40 mt-2">
                            Shadow v2.0 — &quot;Attendance is temporary, but your CGPA is Mandatory.&quot;
                        </p>
                    </div>
                </footer>

            </div>
        </div>
    );
}
