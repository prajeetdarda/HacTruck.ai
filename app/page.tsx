"use client";

import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { useState, useEffect } from "react";
import "./landing/landing.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sg",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jb",
  display: "swap",
});

export default function LandingPage() {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [clock, setClock] = useState("--:-- CT");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      setClock(`${p(d.getHours())}:${p(d.getMinutes())} CT`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.08 }
    );
    document.querySelectorAll(".lp .reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={`lp ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      data-theme={theme}
    >
      {/* ════ NAV ════ */}
      <header className="lp-nav fixed top-0 inset-x-0 z-40">
        <div className="max-w-[1320px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5">
            <svg viewBox="0 0 28 28" className="w-7 h-7">
              <rect x="2" y="2" width="24" height="24" rx="6" fill="none" stroke="var(--fg)" strokeWidth="1.4" />
              <path d="M8 15 L13 15 L13 10 L20 10" stroke="var(--accent)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              <circle cx="20" cy="10" r="1.8" fill="var(--accent)" />
              <circle cx="8" cy="15" r="1.8" fill="var(--fg)" />
            </svg>
            <span className="font-semibold tracking-tight text-[17px]">HacTruck</span>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-[14px] ink-2">
            <a href="#maria"     className="hover:text-[color:var(--fg)] transition-colors">Who it&apos;s for</a>
            <a href="#solution"  className="hover:text-[color:var(--fg)] transition-colors">How it helps</a>
            <a href="#how"       className="hover:text-[color:var(--fg)] transition-colors">How it works</a>
            <a href="#hackathon" className="hover:text-[color:var(--fg)] transition-colors">Hackathon</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label="Toggle theme"
              className="theme-toggle"
            />
            <a href="/dispatch" className="lp-btn lp-btn-ghost !py-2 !px-4 text-[13px]">
              Open app →
            </a>
          </div>
        </div>
      </header>

      {/* ════ HERO ════ */}
      <section id="top" className="relative pt-28 pb-24 lg:pt-36 lg:pb-24 overflow-hidden">
        <div
          className="absolute left-1/2 -top-40 -translate-x-1/2 w-[900px] h-[600px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(closest-side, color-mix(in oklch, var(--accent) 30%, transparent), transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        <div className="relative max-w-[1320px] mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">

            {/* ── Copy ── */}
            <div>
              <div className="reveal">
                <span className="chip">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ok)" }} />
                  Built for fleets of 5–50 trucks
                </span>
              </div>

              <h1 className="display d-xl mt-7 reveal">
                Dispatch, <span className="ochre">without the chaos.</span>
              </h1>

              <p className="mt-6 text-[19px] md:text-[20px] leading-snug max-w-[46ch] ink-2 reveal">
                HacTruck is the quiet intelligence layer small carriers never got.
                It watches your fleet, spots trouble early, and tells you what to do —
                before the phone rings.
              </p>

              <div className="mt-9 flex flex-wrap gap-3 reveal">
                <a href="/dispatch" className="lp-btn lp-btn-primary">
                  See the demo
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </a>
                <a href="#maria" className="lp-btn lp-btn-ghost">Meet Maria</a>
              </div>

              <dl className="mt-14 grid grid-cols-3 gap-6 max-w-md reveal">
                {[
                  { label: "On-time",    value: "94%" },
                  { label: "Saved / wk", value: "$4.1k" },
                  { label: "Response",   value: "41s" },
                ].map((s) => (
                  <div key={s.label}>
                    <dt className="eyebrow">{s.label}</dt>
                    <dd className="mt-1 display d-md">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* ── Maria + Phone scene ── */}
            <div className="relative reveal">
              <div className="relative mx-auto max-w-[560px] aspect-square">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "radial-gradient(closest-side, color-mix(in oklch, var(--accent) 20%, transparent), transparent 70%)",
                    filter: "blur(40px)",
                    transform: "scale(0.9)",
                  }}
                />
                <svg viewBox="0 0 560 560" className="relative w-full h-full" style={{ overflow: "visible" }}>
                  <defs>
                    <linearGradient id="lp-skin" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%"   stopColor="#E8BC9B" />
                      <stop offset="100%" stopColor="#C89077" />
                    </linearGradient>
                    <linearGradient id="lp-sweater" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%"   stopColor="var(--accent)" />
                      <stop offset="100%" stopColor="#B47413" />
                    </linearGradient>
                    <filter id="lp-softShadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
                      <feOffset dy="10" />
                      <feComponentTransfer><feFuncA type="linear" slope="0.3" /></feComponentTransfer>
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>

                  {/* steam */}
                  <g opacity="0.6">
                    <path className="steam" style={{ animationDelay: "0s" }}   d="M120 280 q 4 -10 0 -22" stroke="var(--fg-3)" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <path className="steam" style={{ animationDelay: "0.8s" }} d="M132 280 q -4 -10 0 -22" stroke="var(--fg-3)" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <path className="steam" style={{ animationDelay: "1.6s" }} d="M144 280 q 4 -10 0 -22" stroke="var(--fg-3)" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </g>
                  {/* mug */}
                  <g transform="translate(100,290)">
                    <rect x="0" y="0" width="48" height="58" rx="4" fill="var(--panel-2)" stroke="var(--line-2)" strokeWidth="1.5" />
                    <path d="M48 14 q 14 4 0 28" stroke="var(--line-2)" strokeWidth="1.5" fill="none" />
                    <rect x="4" y="4" width="40" height="10" rx="2" fill="var(--fg)" opacity="0.85" />
                  </g>

                  {/* Maria */}
                  <g className="breathe">
                    <path d="M200 420 Q 280 330 360 420 L360 560 L200 560 Z" fill="url(#lp-sweater)" />
                    <rect x="264" y="300" width="32" height="40" fill="url(#lp-skin)" />
                    <ellipse cx="280" cy="260" rx="58" ry="66" fill="url(#lp-skin)" />
                    <path d="M222 260 Q 215 190 280 178 Q 345 180 340 250 L338 224 Q 320 204 280 208 Q 240 206 222 260 Z" fill="#2C1D11" />
                    <path d="M228 230 Q 236 208 260 208 Q 275 224 290 216 Q 316 208 332 228 Q 326 210 300 204 Q 272 198 248 212 Z" fill="#2C1D11" />
                    <ellipse cx="226" cy="264" rx="6" ry="10" fill="#B87656" />
                    <g className="eye-blink">
                      <ellipse cx="258" cy="262" rx="3" ry="4" fill="#1A1108" />
                      <ellipse cx="302" cy="262" rx="3" ry="4" fill="#1A1108" />
                    </g>
                    <path d="M246 246 L 266 244" stroke="#2C1D11" strokeWidth="3" strokeLinecap="round" />
                    <path d="M294 244 L 314 246" stroke="#2C1D11" strokeWidth="3" strokeLinecap="round" />
                    <path d="M280 272 Q 278 286 284 290" stroke="#B87656" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6" />
                    <path d="M266 298 L 294 298" stroke="#8C4A3B" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M226 226 Q 280 174 334 226" stroke="var(--fg)" strokeWidth="4" fill="none" strokeLinecap="round" />
                    <ellipse cx="226" cy="260" rx="12" ry="14" fill="var(--fg)" />
                    <path d="M220 272 Q 210 294 228 306" stroke="var(--fg)" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <circle cx="228" cy="306" r="4" fill="var(--accent)" />
                    <g transform="translate(380,390)">
                      <path d="M0 -10 Q -20 30 -10 70" stroke="url(#lp-sweater)" strokeWidth="26" fill="none" strokeLinecap="round" />
                      <ellipse cx="-14" cy="74" rx="18" ry="14" fill="url(#lp-skin)" />
                    </g>
                  </g>

                  {/* Phone */}
                  <g transform="translate(330,280) rotate(-8)" filter="url(#lp-softShadow)" className="notif-glow">
                    <rect x="0" y="0" width="184" height="300" rx="28" fill="#0B0E16" stroke="rgba(148,163,184,0.25)" strokeWidth="1.5" />
                    <rect x="5" y="5" width="174" height="290" rx="23" fill="var(--bg-2)" />
                    <rect x="72" y="10" width="40" height="7" rx="3.5" fill="#05070F" />
                    <text x="18" y="30" fontFamily="JetBrains Mono" fontSize="8" fill="var(--fg-3)">7:14</text>
                    <g transform="translate(150,22)">
                      <rect width="3" height="8" fill="var(--fg-2)" />
                      <rect x="5" width="3" height="6" y="2" fill="var(--fg-2)" />
                      <rect x="10" width="3" height="4" y="4" fill="var(--fg-2)" />
                    </g>
                    <g transform="translate(16,44)">
                      <circle cx="10" cy="10" r="10" fill="var(--accent)" />
                      <text x="10" y="13.5" textAnchor="middle" fontFamily="Space Grotesk" fontWeight="700" fontSize="10" fill="#1A1108">JH</text>
                      <text x="28" y="10" fontFamily="Space Grotesk" fontWeight="600" fontSize="10" fill="var(--fg)">J. Hall · T-1142</text>
                      <text x="28" y="22" fontFamily="JetBrains Mono" fontSize="7" fill="var(--fg-3)">driver</text>
                    </g>
                    <line x1="10" y1="78" x2="174" y2="78" stroke="var(--line)" />
                    <g className="bubble-anim" style={{ animationDelay: ".2s" }}>
                      <rect x="14" y="92" width="112" height="26" rx="13" fill="rgba(148,163,184,0.12)" />
                      <text x="22" y="108" fontFamily="Space Grotesk" fontSize="10" fill="var(--fg)">stuck at sysco 40 min</text>
                    </g>
                    <g className="bubble-anim" style={{ animationDelay: ".6s" }}>
                      <rect x="14" y="124" width="84" height="26" rx="13" fill="rgba(148,163,184,0.12)" />
                      <text x="22" y="140" fontFamily="Space Grotesk" fontSize="10" fill="var(--fg)">they said 20</text>
                    </g>
                    <g className="bubble-anim" style={{ animationDelay: "1.1s" }}>
                      <rect x="26" y="162" width="150" height="70" rx="12" fill="var(--bad)" opacity="0.08" />
                      <rect x="26" y="162" width="150" height="70" rx="12" fill="none" stroke="var(--bad)" strokeOpacity="0.5" />
                      <circle cx="36" cy="176" r="2.5" fill="var(--bad)" className="dot-bad" />
                      <text x="44" y="179" fontFamily="JetBrains Mono" fontSize="7" fill="var(--bad)" letterSpacing="1">HACTRUCK · ALERT</text>
                      <text x="36" y="195" fontFamily="Space Grotesk" fontWeight="600" fontSize="11" fill="var(--fg)">Detention in 00:32.</text>
                      <text x="36" y="210" fontFamily="Space Grotesk" fontSize="10" fill="var(--fg-2)">Call Sysco? One tap —</text>
                      <text x="36" y="222" fontFamily="Space Grotesk" fontSize="10" fill="var(--fg-2)">we&apos;ll log the claim.</text>
                    </g>
                    <g className="bubble-anim" style={{ animationDelay: "1.8s" }}>
                      <rect x="14" y="242" width="42" height="22" rx="11" fill="rgba(148,163,184,0.12)" />
                      <circle cx="24" cy="253" r="1.8" fill="var(--fg-3)">
                        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="32" cy="253" r="1.8" fill="var(--fg-3)">
                        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" begin="0.2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="40" cy="253" r="1.8" fill="var(--fg-3)">
                        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
                      </circle>
                    </g>
                    <g transform="translate(92,280)">
                      <circle r="14" fill="var(--accent)" />
                      <circle r="14" fill="none" stroke="var(--accent)" strokeWidth="1.5" className="tap-ring" opacity="0.6" />
                      <path d="M-5 0 L-1 4 L6 -4" stroke="#1A1108" strokeWidth="2" fill="none" strokeLinecap="round" />
                    </g>
                  </g>

                  {/* floating caption */}
                  <g transform="translate(72,110)">
                    <rect width="150" height="36" rx="10" fill="var(--panel-2)" stroke="var(--line)" />
                    <circle cx="14" cy="18" r="3" fill="var(--ok)" />
                    <text x="26" y="16" fontFamily="JetBrains Mono" fontSize="8" fill="var(--fg-3)" letterSpacing="1">AI NUDGE · 07:12</text>
                    <text x="26" y="28" fontFamily="Space Grotesk" fontSize="10" fill="var(--fg)">&quot;Call Sysco now — save $480.&quot;</text>
                  </g>
                </svg>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ════ DASHBOARD ════ */}
      <section id="dashboard" className="relative py-16 lg:py-20">
        <div className="max-w-[1320px] mx-auto px-6 lg:px-10">
          <div className="flex items-end justify-between mb-6 reveal">
            <div>
              <div className="eyebrow">The command view</div>
              <h2 className="display d-lg mt-2">One screen, every fire.</h2>
            </div>
            <div className="hidden md:flex items-center gap-2 chip">
              <span className="w-1.5 h-1.5 rounded-full dot-ok" style={{ background: "var(--ok)" }} />
              <span>{clock}</span>
            </div>
          </div>

          <div className="lp-panel overflow-hidden reveal" style={{ boxShadow: "var(--shadow)" }}>
            <div className="lp-line-b px-5 h-11 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--bad)", opacity: 0.6 }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--warn)", opacity: 0.6 }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--ok)", opacity: 0.6 }} />
                <span className="mono text-[11px] ink-3 ml-3">hactruck.app / dispatch</span>
              </div>
              <div className="flex items-center gap-3 mono text-[11px] ink-3">
                <span className="hidden sm:inline">22 units online</span>
                <span className="w-1.5 h-1.5 rounded-full dot-ok" style={{ background: "var(--ok)" }} />
              </div>
            </div>

            <div className="grid grid-cols-12">
              <aside className="col-span-12 lg:col-span-3 border-b lg:border-b-0 lg:border-r" style={{ borderColor: "var(--line)" }}>
                <div className="px-5 py-4 lp-line-b flex items-center justify-between">
                  <span className="eyebrow">Fleet</span>
                  <span className="mono text-[10px] ink-3">Risk ↓</span>
                </div>
                <ul className="text-[14px]">
                  {(
                    [
                      { id: "T-1142", name: "M. Alvarez",   score: "91", color: "var(--bad)",  pulse: true,  hi: true  },
                      { id: "T-0874", name: "D. Kowalski",  score: "68", color: "var(--warn)", pulse: false, hi: false },
                      { id: "T-2203", name: "R. Jensen",    score: "54", color: "var(--warn)", pulse: false, hi: false },
                      { id: "T-0551", name: "J. Patel",     score: "12", color: "var(--ok)",   pulse: false, hi: false },
                      { id: "T-3320", name: "S. Whitfield", score: "08", color: "var(--ok)",   pulse: false, hi: false },
                    ] as const
                  ).map((t, i, arr) => (
                    <li
                      key={t.id}
                      className={`px-5 py-3.5 flex items-center gap-3${i < arr.length - 1 ? " lp-line-b" : ""}`}
                      style={t.hi ? { background: "color-mix(in oklch, var(--bad) 8%, transparent)" } : {}}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full${t.pulse ? " dot-bad" : ""}`} style={{ background: t.color }} />
                      <div className="flex-1">
                        <div className="mono text-[13px]">{t.id}</div>
                        <div className="text-[11px] ink-3">{t.name}</div>
                      </div>
                      <div className="mono text-[14px]" style={{ color: t.color }}>{t.score}</div>
                    </li>
                  ))}
                </ul>
              </aside>

              <div className="col-span-12 lg:col-span-6 relative min-h-[380px] lg:min-h-[480px] overflow-hidden" style={{ background: "var(--bg-2)" }}>
                <div className="absolute inset-0 grid-bg grid-fade opacity-80 map-layer" />
                <svg className="absolute inset-0 w-full h-full map-layer" viewBox="0 0 800 480" preserveAspectRatio="none">
                  <path d="M0,260 C120,220 220,290 340,250 C480,200 560,280 700,240 L800,250 L800,480 L0,480 Z"
                    fill="color-mix(in oklch, var(--info) 5%, transparent)" stroke="var(--line)" strokeWidth="1" />
                  <path d="M40,340 C200,260 280,300 400,240 C500,200 580,210 720,150"
                    fill="none" stroke="var(--info)" strokeWidth="1.5" strokeDasharray="2 6" className="dash-flow" opacity="0.85" />
                  <path d="M80,100 C220,150 340,130 480,180 C600,220 680,190 760,230"
                    fill="none" stroke="var(--ok)" strokeWidth="1.5" strokeDasharray="2 6" className="dash-flow" opacity="0.8" />
                  <g fontFamily="JetBrains Mono" fontSize="9" fill="var(--fg-3)">
                    <g><circle cx="40"  cy="340" r="2.5" fill="var(--fg-3)" /><text x="48"  y="343">DAL</text></g>
                    <g><circle cx="400" cy="240" r="2.5" fill="var(--fg-3)" /><text x="408" y="243">OKC</text></g>
                    <g><circle cx="720" cy="150" r="2.5" fill="var(--fg-3)" /><text x="728" y="153">KC</text></g>
                    <g><circle cx="80"  cy="100" r="2.5" fill="var(--fg-3)" /><text x="88"  y="103">ABQ</text></g>
                  </g>
                  <g transform="translate(430,260)"><circle r="5" fill="var(--bad)" className="dot-bad" /></g>
                  <circle cx="260" cy="170" r="4" fill="var(--ok)" />
                  <circle cx="600" cy="200" r="4" fill="var(--info)" />
                  <circle cx="500" cy="170" r="4" fill="var(--ok)" />
                </svg>
                <div className="absolute top-4 left-4 chip">LIVE · US · TX · OK · KS</div>
                <div className="absolute bottom-4 left-4 chip">32.77° N · 96.80° W</div>
              </div>

              <aside className="col-span-12 lg:col-span-3 border-b lg:border-b-0 lg:border-l" style={{ borderColor: "var(--line)" }}>
                <div className="px-5 py-4 lp-line-b flex items-center justify-between">
                  <span className="eyebrow">Priority</span>
                  <span className="mono text-[10px]" style={{ color: "var(--ok)" }}>AI triaged</span>
                </div>
                <div className="p-5 space-y-3">
                  <div className="rounded-xl p-4" style={{ background: "color-mix(in oklch, var(--bad) 6%, transparent)", border: "1px solid color-mix(in oklch, var(--bad) 25%, transparent)" }}>
                    <div className="mono text-[10px] tracking-widest" style={{ color: "var(--bad)" }}>CRITICAL</div>
                    <div className="mt-1 text-[14px] leading-snug">T-1142 idle 52m at Sysco DC.</div>
                    <button className="lp-btn mt-3 !py-1.5 !px-3 text-[12px]" style={{ background: "var(--bad)", color: "white" }}>
                      Call shipper
                    </button>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: "color-mix(in oklch, var(--warn) 6%, transparent)", border: "1px solid color-mix(in oklch, var(--warn) 25%, transparent)" }}>
                    <div className="mono text-[10px] tracking-widest" style={{ color: "var(--warn)" }}>HOS · 1h 12m</div>
                    <div className="mt-1 text-[14px] leading-snug">T-0874 → TA Love&apos;s #441</div>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: "color-mix(in oklch, var(--info) 6%, transparent)", border: "1px solid color-mix(in oklch, var(--info) 25%, transparent)" }}>
                    <div className="mono text-[10px] tracking-widest" style={{ color: "var(--info)" }}>SMART MATCH</div>
                    <div className="mt-1 text-[14px] leading-snug">T-0551 · DAL→OKC · 92% fit</div>
                  </div>
                </div>
              </aside>
            </div>
          </div>

          {/* CTA to full app */}
          <div className="mt-6 text-center reveal">
            <a href="/dispatch" className="lp-btn lp-btn-ghost">
              Open the live dispatch app →
            </a>
          </div>
        </div>
      </section>

      {/* ════ MARIA ════ */}
      <section id="maria" className="relative py-28 lg:py-36">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-[1fr_1.3fr] gap-16 items-center">
            <div className="reveal">
              <div className="eyebrow">Who we built this for</div>
              <h2 className="display d-lg mt-3">Meet Maria.</h2>
            </div>
            <div className="reveal">
              <p className="text-[20px] leading-snug ink-2 max-w-[52ch]">
                She runs 22 trucks at a family carrier. Her &quot;system&quot; is a headset, four cups of coffee,
                and forty browser tabs. She isn&apos;t looking for a platform — she&apos;s looking for{" "}
                <span className="ink">thirty minutes of quiet.</span>
              </p>
              <figure className="mt-10 pl-5 border-l-2" style={{ borderColor: "var(--accent)" }}>
                <blockquote className="text-[20px] leading-snug ink">
                  &quot;I don&apos;t need fancy. I need something to tell me which fire to put out first.
                  Then the next one.&quot;
                </blockquote>
                <figcaption className="mt-3 eyebrow">— Maria · Alvarez Carrier</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* ════ PROBLEM ════ */}
      <section id="problem" className="relative py-24 lg:py-32 lp-line-t">
        <div className="max-w-[1320px] mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-16 lg:gap-24 mb-16 reveal">
            <div>
              <div className="eyebrow">The day, on repeat</div>
              <h2 className="display d-lg mt-3">Three ambushes.</h2>
            </div>
            <p className="text-[19px] leading-snug ink-2 max-w-[48ch] self-end">
              Nothing she fights today was on the schedule. This is every Tuesday.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-10 reveal">
            {[
              { time: "07:00", title: "Where is everyone?",  body: "Half the trucks show \"last ping 42 min ago.\" The coffee hasn't even finished brewing." },
              { time: "11:00", title: "Shipper calls first.", body: "They want an ETA you don't have. Every minute of silence is trust leaking out." },
              { time: "17:00", title: "Paper chase.",         body: "You stay until 19:30 stitching a day you already lived, so billing goes out clean." },
            ].map((item) => (
              <div key={item.time}>
                <div className="mono text-[12px] ink-3 tracking-widest">{item.time}</div>
                <h3 className="mt-3 display d-md" style={{ fontSize: "clamp(22px, 2vw, 30px)" }}>{item.title}</h3>
                <p className="mt-4 text-[15px] ink-2 leading-snug max-w-[36ch]">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-24 lp-panel p-8 md:p-10 reveal">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { stat: "41%",    label: "of the day is finding things out" },
                { stat: "$287",   label: "detention missed · per truck · per week" },
                { stat: "7.2m",   label: "to answer \"where's my load?\"" },
                { stat: "1 in 3", label: "loads booked under rate" },
              ].map((s) => (
                <div key={s.stat}>
                  <div className="display d-md ochre">{s.stat}</div>
                  <div className="mt-1 text-[13px] ink-2">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════ SOLUTION ════ */}
      <section id="solution" className="relative py-28 lg:py-36">
        <div className="max-w-[1320px] mx-auto px-6 lg:px-10">
          <div className="max-w-[40ch] mb-16 reveal">
            <div className="eyebrow">What HacTruck does</div>
            <h2 className="display d-lg mt-3">Two jobs. Done before the phone rings.</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 reveal">
            <article className="lp-panel p-8 lg:p-10">
              <div className="flex items-center gap-3 eyebrow">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--info)" }} />
                Module 01
              </div>
              <h3 className="display d-md mt-3">Smart Dispatch</h3>
              <p className="mt-3 text-[16px] ink-2 leading-snug max-w-[42ch]">
                Score every open load against every truck in under a second.
              </p>
              <div className="mt-7 lp-panel-2 overflow-hidden">
                <div className="lp-line-b px-4 py-3 flex items-center justify-between">
                  <span className="mono text-[11px] ink-3">Load #88532</span>
                  <span className="mono text-[10px]" style={{ color: "var(--ok)" }}>RANKED</span>
                </div>
                <table className="w-full text-[13px]">
                  <tbody className="mono">
                    {[
                      { id: "T-0551", score: 92, width: "92%", color: "var(--ok)",   hi: true  },
                      { id: "T-3320", score: 78, width: "78%", color: "var(--info)", hi: false },
                      { id: "T-0874", score: 54, width: "54%", color: "var(--warn)", hi: false },
                    ].map((row, i, arr) => (
                      <tr
                        key={row.id}
                        className={i < arr.length - 1 ? "lp-line-b" : ""}
                        style={row.hi ? { background: "color-mix(in oklch, var(--ok) 6%, transparent)" } : {}}
                      >
                        <td className="p-3.5 ink">{row.id}</td>
                        <td className="p-3.5 ink-2">DAL→OKC</td>
                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <span className="w-16 h-1.5 rounded-full" style={{ background: "var(--line)" }}>
                              <span className="block h-full rounded-full" style={{ background: row.color, width: row.width }} />
                            </span>
                            <b style={row.hi ? { color: row.color } : { color: "var(--fg-2)" }}>{row.score}</b>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="lp-panel p-8 lg:p-10">
              <div className="flex items-center gap-3 eyebrow">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                Module 02
              </div>
              <h3 className="display d-md mt-3">Proactive Alerts</h3>
              <p className="mt-3 text-[16px] ink-2 leading-snug max-w-[42ch]">
                Silence is a signal. We flag what&apos;s about to go sideways — early.
              </p>
              <div className="mt-7 relative pl-6">
                <span className="absolute left-[5px] top-2 bottom-2 w-px" style={{ background: "var(--line-2)" }} />
                {[
                  { time: "07:14 · Detention risk", color: "var(--bad)",  body: "Called shipper at 07:16 · saved $480.", pulse: true  },
                  { time: "09:02 · HOS window",     color: "var(--warn)", body: "Rerouted T-0874 · 0:18 buffer.",       pulse: false },
                  { time: "13:22 · Resolved early", color: "var(--ok)",   body: "Appt reschedule — zero dead time.",    pulse: false },
                ].map((item, i, arr) => (
                  <div key={item.time} className={`relative${i < arr.length - 1 ? " mb-6" : ""}`}>
                    <span
                      className={`absolute -left-[22px] top-1.5 w-3 h-3 rounded-full${item.pulse ? " dot-bad" : ""}`}
                      style={{ background: item.color, border: "2px solid var(--bg)" }}
                    />
                    <div className="mono text-[11px]" style={{ color: item.color }}>{item.time}</div>
                    <div className="mt-1 text-[15px] ink">{item.body}</div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ════ HOW IT WORKS ════ */}
      <section id="how" className="relative py-28 lg:py-36 lp-line-t">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-10">
          <div className="max-w-[36ch] mb-16 reveal">
            <div className="eyebrow">How it works</div>
            <h2 className="display d-lg mt-3">Three moves. Under a second.</h2>
          </div>
          <ol className="grid md:grid-cols-3 gap-10 lg:gap-14 reveal">
            {[
              { num: "01", title: "Fleet data in",      body: "ELD, TMS, broker email, Mapbox. No rip-and-replace.",                          accent: false },
              { num: "02", title: "AI scores & alerts", body: "Real-time risk scoring and a one-sentence \"do this now.\"",                    accent: true  },
              { num: "03", title: "Dispatcher acts",    body: "One tap to call, book, reroute. Audit trail auto-kept.",                        accent: false },
            ].map((step) => (
              <li key={step.num}>
                <div className={`mono text-[13px] tracking-widest${step.accent ? " ochre" : " ink-3"}`}>{step.num}</div>
                <h3 className="display mt-3 text-[22px] md:text-[24px]">{step.title}</h3>
                <p className="mt-3 text-[15px] ink-2 leading-snug max-w-[30ch]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ════ TECH STRIP ════ */}
      <section className="relative py-16 lp-line-t lp-line-b" style={{ background: "var(--bg-2)" }}>
        <div className="max-w-[1320px] mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="eyebrow">Built with</div>
            <div className="flex flex-wrap items-center gap-x-10 gap-y-4 ink">
              {["Next.js", "React", "Mapbox", "OpenAI", "Tailwind"].flatMap((tech, i, arr) =>
                i < arr.length - 1
                  ? [
                      <span key={tech} className="font-medium tracking-tight">{tech}</span>,
                      <span key={`sep-${i}`} className="w-px h-4" style={{ background: "var(--line-2)" }} />,
                    ]
                  : [<span key={tech} className="font-medium tracking-tight">{tech}</span>]
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ════ HACKATHON ════ */}
      <section id="hackathon" className="relative py-16 lg:py-20">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-10">
          <div className="lp-panel px-8 py-6 relative overflow-hidden reveal flex flex-wrap items-center gap-x-10 gap-y-5">
            <div
              className="absolute -right-10 -top-10 w-[180px] h-[180px] rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(closest-side, color-mix(in oklch, var(--accent) 25%, transparent), transparent 70%)",
                filter: "blur(30px)",
              }}
            />

            {/* mini badge */}
            <svg viewBox="0 0 120 120" className="w-[72px] h-[72px] shrink-0 relative">
              <circle cx="60" cy="60" r="54" fill="none" stroke="var(--line-2)" />
              <circle cx="60" cy="60" r="46" fill="none" stroke="var(--accent)" strokeOpacity="0.5" />
              <polygon points="60,18 96,39 96,81 60,102 24,81 24,39" fill="var(--panel-2)" stroke="var(--accent)" strokeWidth="1.2" />
              <circle cx="60" cy="60" r="40" fill="none" stroke="var(--line-2)" strokeDasharray="1.5 5">
                <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="60s" repeatCount="indefinite" />
              </circle>
              <path d="M 42 60 L 52 60 L 52 50 L 66 50" stroke="var(--accent)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <circle cx="66" cy="50" r="2.5" fill="var(--accent)" />
              <circle cx="42" cy="60" r="2.5" fill="var(--fg)" />
            </svg>

            {/* title */}
            <div className="relative shrink-0">
              <div className="eyebrow mb-1">Hackathon</div>
              <div className="font-semibold text-[18px] tracking-tight leading-tight">
                Built at <span className="ochre">GlobeHack S1</span>
              </div>
              <div className="text-[13px] ink-3 mt-0.5">ASU · 2026 · Trucker Path track</div>
            </div>

            {/* divider */}
            <div className="hidden lg:block w-px h-10 self-center" style={{ background: "var(--line-2)" }} />

            {/* stats inline */}
            <div className="flex gap-8 relative">
              {[
                { label: "Format", value: "GTM Sprint"   },
                { label: "Track",  value: "Trucker Path" },
                { label: "Teams",  value: "30+"          },
              ].map((s) => (
                <div key={s.label}>
                  <div className="eyebrow">{s.label}</div>
                  <div className="mt-0.5 font-medium text-[14px]">{s.value}</div>
                </div>
              ))}
            </div>

            {/* link — pushed right */}
            <a href="https://www.globehack.dev/" target="_blank" rel="noopener noreferrer"
               className="ml-auto relative mono text-[11px] ink-3 hover:text-[color:var(--accent)] transition-colors tracking-wide shrink-0">
              globehack.dev →
            </a>
          </div>
        </div>
      </section>

      {/* ════ CTA ════ */}
      <section id="cta" className="relative py-32 lg:py-40 text-center">
        <div className="max-w-[780px] mx-auto px-6 lg:px-10">
          <h2 className="display d-xl reveal">
            Help Maria make <br /><span className="ochre">smarter calls</span>, faster.
          </h2>
          <p className="mt-8 text-[18px] ink-2 leading-snug max-w-[46ch] mx-auto reveal">
            Clone the repo. Plug in your ELD keys. Ten minutes to a quieter Monday.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 justify-center reveal">
            <a href="https://github.com/prajeetdarda/HacTruck.ai.git" target="_blank" rel="noopener noreferrer" className="lp-btn lp-btn-primary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.9.57.1.78-.25.78-.55v-2.14c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.97.1-.75.4-1.27.73-1.56-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.73.8 1.18 1.83 1.18 3.08 0 4.41-2.7 5.39-5.27 5.67.41.36.78 1.06.78 2.13v3.16c0 .31.21.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
              </svg>
              View on GitHub
            </a>
            <a href="/dispatch" className="lp-btn lp-btn-ghost">Open dispatch app →</a>
            <a href="https://devpost.com/software/hactruck" target="_blank" rel="noopener noreferrer" className="lp-btn lp-btn-ghost">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6.002 1.61L0 12.004 6.002 22.39h11.996L24 12.004 17.998 1.61zm1.593 16.526h-2.78V5.864h2.78c3.994 0 6.397 2.118 6.397 6.07-.001 4.018-2.403 6.202-6.397 6.202z"/></svg>
              DevPost
            </a>
          </div>
        </div>
      </section>

      {/* ════ FOOTER ════ */}
      <footer className="lp-line-t py-10" style={{ background: "var(--bg-2)" }}>
        <div className="max-w-[1320px] mx-auto px-6 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 28 28" className="w-5 h-5">
                <rect x="2" y="2" width="24" height="24" rx="6" fill="none" stroke="var(--fg)" strokeWidth="1.4" />
                <path d="M8 15 L13 15 L13 10 L20 10" stroke="var(--accent)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              </svg>
              <span className="font-medium text-[14px]">HacTruck</span>
              <span className="mono text-[11px] ink-3 ml-2">© 2026 · MIT</span>
            </div>
            <div className="mono text-[11px] ink-3 tracking-widest uppercase">
              For dispatchers who don&apos;t have time for this
            </div>
          </div>
          <div className="lp-line-t mt-6 pt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-[13px] ink-3">
              Built by{" "}
              <a
                href="https://www.linkedin.com/in/prajeet-darda"
                target="_blank"
                rel="noopener noreferrer"
                className="ink-2 hover:text-[color:var(--accent)] transition-colors font-medium"
              >
                Prajeet Darda
              </a>
              {" "}at ASU GlobeHack S1, 2026
            </p>
            <div className="flex items-center gap-4 mono text-[11px] ink-3">
              <a href="https://github.com/prajeetdarda/HacTruck.ai.git" target="_blank" rel="noopener noreferrer" className="hover:text-[color:var(--fg)] transition-colors">GitHub</a>
              <a href="https://devpost.com/software/hactruck" target="_blank" rel="noopener noreferrer" className="hover:text-[color:var(--fg)] transition-colors">DevPost</a>
              <a href="https://www.linkedin.com/in/prajeet-darda" target="_blank" rel="noopener noreferrer" className="hover:text-[color:var(--fg)] transition-colors">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
