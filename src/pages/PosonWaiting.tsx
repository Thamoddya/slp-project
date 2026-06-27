import { useEffect, useRef } from "react";

// ─── Floating lantern data ────────────────────────────────────────────────────
const LANTERNS = [
  { left: "8%", delay: "0s", dur: "14s", scale: 1.1, hue: 30 },
  { left: "22%", delay: "2.5s", dur: "11s", scale: 0.85, hue: 50 },
  { left: "38%", delay: "5s", dur: "16s", scale: 1.0, hue: 20 },
  { left: "55%", delay: "1s", dur: "13s", scale: 0.9, hue: 40 },
  { left: "70%", delay: "3.5s", dur: "15s", scale: 1.15, hue: 10 },
  { left: "84%", delay: "6s", dur: "12s", scale: 0.8, hue: 55 },
  { left: "14%", delay: "8s", dur: "17s", scale: 0.95, hue: 35 },
  { left: "62%", delay: "4s", dur: "10s", scale: 1.05, hue: 25 },
];

const STAR_COUNT = 90;

function generateStars() {
  return Array.from({ length: STAR_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 65,
    r: Math.random() * 1.6 + 0.4,
    delay: Math.random() * 4,
    dur: Math.random() * 3 + 2,
  }));
}

const STARS = generateStars();

// ─── Buddhist flag stripe colors ──────────────────────────────────────────────
const FLAG_COLORS = ["#0039A6", "#FFD700", "#FF0000", "#FFFFFF", "#FF7F00"];

export default function PosonWaiting() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // subtle particles on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const particles: {
      x: number;
      y: number;
      vy: number;
      a: number;
      r: number;
    }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vy: -(Math.random() * 0.4 + 0.15),
        a: Math.random(),
        r: Math.random() * 2 + 1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.y += p.vy;
        p.a -= 0.001;
        if (p.y < 0 || p.a <= 0) {
          p.y = canvas.height;
          p.x = Math.random() * canvas.width;
          p.a = Math.random() * 0.6 + 0.2;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 200, 80, ${p.a * 0.5})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div style={styles.root}>
      {/* canvas particle layer */}
      <canvas ref={canvasRef} style={styles.canvas} />

      {/* star field */}
      <svg
        style={styles.starField}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        {STARS.map((s) => (
          <circle
            key={s.id}
            cx={s.x}
            cy={s.y}
            r={s.r * 0.12}
            fill="white"
            opacity={0.7}
            style={{
              animation: `starTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite alternate`,
            }}
          />
        ))}
      </svg>

      {/* moon – glow comes purely from box-shadow, no separate glow div */}
      <div style={styles.moonWrap}>
        <div style={styles.moon}>
          <div style={styles.moonSheen} />
        </div>
      </div>

      {/* floating lanterns */}
      {LANTERNS.map((l, i) => (
        <div
          key={i}
          style={{
            ...styles.lanternWrap,
            left: l.left,
            animationDuration: l.dur,
            animationDelay: l.delay,
            transform: `scale(${l.scale})`,
          }}
        >
          <div style={styles.lanternBody}>
            {FLAG_COLORS.map((c, ci) => (
              <div
                key={ci}
                style={{
                  ...styles.lanternStripe,
                  background: c,
                  opacity: ci === 3 ? 0.9 : 1,
                }}
              />
            ))}
            <div
              style={{
                ...styles.lanternGlow,
                filter: `hue-rotate(${l.hue}deg)`,
              }}
            />
          </div>
          <div style={styles.lanternString} />
          <div style={styles.lanternTassel} />
        </div>
      ))}

      {/* horizon stupa silhouette */}
      <svg
        viewBox="0 0 1440 320"
        preserveAspectRatio="xMidYMax slice"
        style={styles.horizonSvg}
      >
        {/* ground */}
        <rect x={0} y={260} width={1440} height={60} fill="#0d1c0e" />
        {/* trees left */}
        <ellipse cx={60} cy={255} rx={30} ry={50} fill="#0d1c0e" />
        <ellipse cx={110} cy={265} rx={22} ry={40} fill="#0d1c0e" />
        <ellipse cx={180} cy={250} rx={35} ry={55} fill="#0d1c0e" />
        {/* trees right */}
        <ellipse cx={1380} cy={255} rx={30} ry={50} fill="#0d1c0e" />
        <ellipse cx={1330} cy={265} rx={22} ry={40} fill="#0d1c0e" />
        <ellipse cx={1260} cy={250} rx={35} ry={55} fill="#0d1c0e" />
        <ellipse cx={1200} cy={268} rx={25} ry={38} fill="#0d1c0e" />

        {/* Ruwanwelisaya stupa – centre */}
        {/* base platform */}
        <rect x={630} y={230} width={180} height={30} rx={4} fill="#1a2e1a" />
        {/* lower drum */}
        <ellipse cx={720} cy={230} rx={80} ry={18} fill="#1a2e1a" />
        {/* dome body */}
        <path d="M650,230 Q660,140 720,100 Q780,140 790,230 Z" fill="#1a2e1a" />
        {/* spire */}
        <rect x={714} y={68} width={12} height={34} rx={2} fill="#1a2e1a" />
        <polygon points="720,48 712,68 728,68" fill="#1a2e1a" />
        {/* flag on top */}
        <rect
          x={716}
          y={34}
          width={18}
          height={14}
          rx={1}
          fill="#f59e0b"
          opacity={0.8}
        />

        {/* smaller stupa left */}
        <rect x={420} y={245} width={110} height={20} rx={3} fill="#0d1c0e" />
        <ellipse cx={475} cy={245} rx={48} ry={10} fill="#0d1c0e" />
        <path d="M435,245 Q442,190 475,168 Q508,190 515,245 Z" fill="#0d1c0e" />
        <rect x={471} y={148} width={8} height={22} rx={1} fill="#0d1c0e" />
        <polygon points="475,135 469,148 481,148" fill="#0d1c0e" />

        {/* smaller stupa right */}
        <rect x={910} y={245} width={110} height={20} rx={3} fill="#0d1c0e" />
        <ellipse cx={965} cy={245} rx={48} ry={10} fill="#0d1c0e" />
        <path
          d="M925,245 Q932,190 965,168 Q998,190 1005,245 Z"
          fill="#0d1c0e"
        />
        <rect x={961} y={148} width={8} height={22} rx={1} fill="#0d1c0e" />
        <polygon points="965,135 959,148 971,148" fill="#0d1c0e" />
      </svg>

      {/* main content */}
      <div style={styles.content}>
        {/* Dhamma wheel */}
        <svg viewBox="0 0 80 80" style={styles.wheel}>
          <circle
            cx={40}
            cy={40}
            r={36}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={3}
          />
          <circle cx={40} cy={40} r={8} fill="#f59e0b" />
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (i * 45 * Math.PI) / 180;
            const x1 = 40 + 9 * Math.cos(angle);
            const y1 = 40 + 9 * Math.sin(angle);
            const x2 = 40 + 34 * Math.cos(angle);
            const y2 = 40 + 34 * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#f59e0b"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        <p style={styles.poyaLabel}>පොසොන් පෝය · POSON POYA</p>
        <h1 style={styles.heading}>
          <span style={styles.headingLine1}>ඉක්මනින්</span>
          <span style={styles.headingLine2}>පැමිණේ</span>
        </h1>
        <p style={styles.subHeading}>
          Poson Route Guidance · Anuradhapura 2026
        </p>

        <div style={styles.divider}>
          {FLAG_COLORS.map((c, i) => (
            <div key={i} style={{ ...styles.dividerBar, background: c }} />
          ))}
        </div>

        <p style={styles.body}>
          The pilgrim route guidance service is being prepared for
          <br />
          the sacred Poson Poya festival.
        </p>
        <p style={styles.bodySi}>
          ශ්‍රී ලංකාවේ බෞද්ධ ශිෂ්ඨාචාරය රැගෙන ආ<br />
          පොසොන් මංගල්‍ය සඳහා සේවාව සූදානම් වෙමින් පවතී.
        </p>

        <div style={styles.badge}>
          <span style={styles.badgeDot} />
          <span style={styles.badgeText}>Stay Tuned</span>
        </div>
      </div>

      {/* lotus row — REMOVED (clipped into stupa at bottom) */}

      {/* inline keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Sinhala:wght@400;700&family=Cinzel:wght@400;700;900&display=swap');

        @keyframes floatLantern {
          0%   { transform: translateY(110vh) rotate(-4deg); opacity: 0; }
          8%   { opacity: 1; }
          90%  { opacity: 0.9; }
          100% { transform: translateY(-18vh) rotate(4deg); opacity: 0; }
        }
        @keyframes moonPulse {
          0%, 100% { transform: scale(1);   box-shadow: 0 0 60px 20px rgba(255,220,80,.35), 0 0 120px 60px rgba(255,200,50,.15); }
          50%       { transform: scale(1.04); box-shadow: 0 0 80px 30px rgba(255,230,100,.45), 0 0 160px 80px rgba(255,210,60,.2); }
        }
        @keyframes wheelSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes starTwinkle {
          0%   { opacity: 0.2; }
          100% { opacity: 1; }
        }
        @keyframes shimmerText {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.9); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "fixed",
    inset: 0,
    background:
      "radial-gradient(ellipse at 50% 0%, #1a2744 0%, #0a0f1e 55%, #030610 100%)",
    overflow: "hidden",
    fontFamily: "'Cinzel', serif",
  },
  canvas: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 1,
  },
  starField: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "70%",
    pointerEvents: "none",
    zIndex: 2,
  },
  // ── Moon ────────────────────────────────────────────────────────────────────
  // No separate glow div — glow comes from box-shadow only, which eliminates
  // the visible dark-circle artefact the glow <div> was creating.
  moonWrap: {
    position: "absolute",
    top: "4%",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 3,
  },
  moon: {
    width: 84,
    height: 84,
    borderRadius: "50%",
    background:
      "radial-gradient(circle at 35% 35%, #fffbe8 0%, #fce97a 45%, #e8b800 100%)",
    boxShadow:
      "0 0 0 18px rgba(255,220,70,.08), 0 0 55px 22px rgba(255,220,80,.38), 0 0 110px 55px rgba(255,200,50,.18)",
    animation: "moonPulse 5s ease-in-out infinite",
    position: "relative",
    overflow: "hidden",
  },
  moonSheen: {
    position: "absolute",
    top: "12%",
    left: "15%",
    width: "30%",
    height: "18%",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.55)",
    transform: "rotate(-20deg)",
  },
  // ── Lanterns ─────────────────────────────────────────────────────────────
  lanternWrap: {
    position: "absolute",
    bottom: "-20%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    animation: "floatLantern linear infinite",
    zIndex: 4,
    pointerEvents: "none",
  },
  lanternBody: {
    width: 28,
    height: 44,
    borderRadius: "50% 50% 40% 40% / 40% 40% 60% 60%",
    overflow: "hidden",
    display: "flex",
    flexDirection: "row",
    boxShadow: "0 0 18px 6px rgba(255,180,50,.5)",
    border: "1px solid rgba(255,220,100,.4)",
    position: "relative",
  },
  lanternStripe: {
    flex: 1,
    height: "100%",
  },
  lanternGlow: {
    position: "absolute",
    inset: 0,
    background: "rgba(255,200,50,.25)",
  },
  lanternString: {
    width: 1,
    height: 10,
    background: "rgba(255,200,100,.7)",
  },
  lanternTassel: {
    width: 3,
    height: 8,
    background: "rgba(255,180,50,.7)",
    borderRadius: "0 0 3px 3px",
  },
  // ── Stupa silhouette ──────────────────────────────────────────────────────
  // 25% gives the content zone more room on short desktop viewports.
  horizonSvg: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    height: "25%",
    zIndex: 5,
    pointerEvents: "none",
  },
  // ── Content ───────────────────────────────────────────────────────────────
  // top: max(100px, 18vh) — clears the moon on any screen height.
  // bottom: 25% — stays above the stupa.
  // justify-content: center — text is always vertically centred in the band.
  content: {
    position: "absolute",
    top: "max(100px, 18vh)",
    bottom: "25%",
    left: 0,
    right: 0,
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "0 24px",
    gap: 6,
    overflow: "hidden",
  },
  // ── Dhamma wheel ──────────────────────────────────────────────────────────
  // Sized in vh so it shrinks on short desktop windows.
  wheel: {
    width: "clamp(42px, 8vh, 64px)",
    height: "clamp(42px, 8vh, 64px)",
    animation: "wheelSpin 20s linear infinite",
    filter: "drop-shadow(0 0 10px rgba(245,158,11,0.75))",
    flexShrink: 0,
  },
  // ── Typography ───────────────────────────────────────────────────────────
  poyaLabel: {
    fontFamily: "'Noto Serif Sinhala', 'Cinzel', serif",
    letterSpacing: "0.3em",
    fontSize: "clamp(9px, 1.5vw, 11px)",
    color: "#fbbf24",
    opacity: 0.85,
    textTransform: "uppercase" as const,
    animation: "fadeUp 1s 0.3s both",
    margin: 0,
    lineHeight: 1,
  },
  heading: {
    margin: 0,
    display: "flex",
    flexDirection: "column" as const,
    gap: 0,
    animation: "fadeUp 1s 0.5s both",
  },
  headingLine1: {
    fontFamily: "'Noto Serif Sinhala', serif",
    // vmin adapts to the *shorter* dimension — prevents giant text on wide-but-short
    // desktop windows while still scaling up on tall mobile/tablet screens.
    fontSize: "clamp(1.6rem, 8vmin, 4rem)",
    fontWeight: 700,
    lineHeight: 1.1,
    background:
      "linear-gradient(135deg, #fde68a 0%, #f59e0b 40%, #fffbe0 70%, #fbbf24 100%)",
    backgroundSize: "200% auto",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    animation: "shimmerText 4s linear infinite, fadeUp 1s 0.5s both",
    display: "block",
  },
  headingLine2: {
    fontFamily: "'Noto Serif Sinhala', serif",
    fontSize: "clamp(1.6rem, 8vmin, 4rem)",
    fontWeight: 700,
    lineHeight: 1.1,
    background:
      "linear-gradient(135deg, #f59e0b 0%, #fde68a 50%, #f59e0b 100%)",
    backgroundSize: "200% auto",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    animation: "shimmerText 4s 2s linear infinite, fadeUp 1s 0.6s both",
    display: "block",
  },
  subHeading: {
    fontFamily: "'Cinzel', serif",
    fontSize: "clamp(0.55rem, 2vw, 0.78rem)",
    letterSpacing: "0.22em",
    color: "#d97706",
    opacity: 0.9,
    animation: "fadeUp 1s 0.7s both",
    margin: 0,
    lineHeight: 1,
  },
  divider: {
    display: "flex",
    gap: 2,
    borderRadius: 4,
    overflow: "hidden",
    animation: "fadeUp 1s 0.9s both",
    flexShrink: 0,
  },
  dividerBar: {
    width: 28,
    height: 3,
    borderRadius: 2,
  },
  body: {
    color: "rgba(253,230,138,.8)",
    fontSize: "clamp(0.65rem, 2vw, 0.82rem)",
    lineHeight: 1.65,
    maxWidth: 380,
    fontFamily: "'Cinzel', serif",
    fontWeight: 400,
    margin: 0,
    animation: "fadeUp 1s 1s both",
  },
  bodySi: {
    fontFamily: "'Noto Serif Sinhala', serif",
    color: "rgba(253,230,138,.6)",
    fontSize: "clamp(0.6rem, 1.8vw, 0.76rem)",
    lineHeight: 1.8,
    maxWidth: 360,
    margin: 0,
    animation: "fadeUp 1s 1.1s both",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 20px",
    borderRadius: 999,
    border: "1px solid rgba(245,158,11,.5)",
    background: "rgba(245,158,11,.08)",
    backdropFilter: "blur(8px)",
    animation: "fadeUp 1s 1.3s both",
    marginTop: 4,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#f59e0b",
    animation: "pulse 2s ease-in-out infinite",
    display: "inline-block",
  },
  badgeText: {
    fontFamily: "'Cinzel', serif",
    color: "#fbbf24",
    fontSize: "0.78rem",
    letterSpacing: "0.2em",
    fontWeight: 700,
  },
};
