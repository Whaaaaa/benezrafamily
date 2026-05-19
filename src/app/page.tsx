import Link from "next/link";

const features = [
  {
    href: "/meals",
    emoji: "🍽️",
    label: "Meal Planner",
    desc: "Plan dinners for the whole month",
    gradient: "linear-gradient(135deg, #7C3AED, #A855F7)",
    glow: "rgba(124,58,237,0.45)",
  },
  {
    href: "/shopping",
    emoji: "🛒",
    label: "Shopping List",
    desc: "Never forget an ingredient",
    gradient: "linear-gradient(135deg, #EC4899, #F43F5E)",
    glow: "rgba(236,72,153,0.45)",
  },
  {
    href: "/budget",
    emoji: "💰",
    label: "Budget Tracker",
    desc: "Stay on top of finances",
    gradient: "linear-gradient(135deg, #F59E0B, #EF4444)",
    glow: "rgba(245,158,11,0.45)",
  },
];

const floaties = [
  { emoji: "🌟", top: "6%",  left: "5%",  delay: "0s",   size: "text-4xl sm:text-5xl" },
  { emoji: "🎉", top: "10%", right: "6%", delay: "1.2s", size: "text-3xl sm:text-4xl" },
  { emoji: "💫", top: "35%", right: "4%", delay: "0.7s", size: "text-2xl sm:text-3xl" },
  { emoji: "❤️",  top: "22%", left: "33%", delay: "2s",   size: "text-xl" },
  { emoji: "🌈", top: "55%", left: "8%",  delay: "1.6s", size: "text-2xl" },
];

export default function Home() {
  return (
    <div>
      <section className="relative min-h-[88dvh] sm:min-h-[78vh] flex flex-col justify-end pb-14 sm:pb-20 overflow-hidden">
        {/* Animated rainbow gradient fallback */}
        <div
          className="absolute inset-0 animate-rainbow"
          style={{
            background:
              "linear-gradient(135deg, #7C3AED, #EC4899, #F59E0B, #10B981, #3B82F6, #7C3AED)",
            backgroundSize: "400% 400%",
          }}
        />
        {/* Hero photo — save your image to public/hero.jpg */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero.jpg')" }}
        />
        {/* Bottom-up dark overlay for legibility */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(10,5,35,0.88) 0%, rgba(10,5,35,0.25) 55%, transparent 100%)",
          }}
        />

        {/* Floating decorations */}
        {floaties.map(({ emoji, delay, size, ...pos }) => (
          <div
            key={emoji}
            className={`absolute ${size} animate-float select-none pointer-events-none opacity-70`}
            style={{ animationDelay: delay, ...pos } as React.CSSProperties}
          >
            {emoji}
          </div>
        ))}

        {/* Content */}
        <div className="relative z-10 text-center px-5 animate-slide-up">
          <h1 className="text-5xl sm:text-7xl font-black text-white drop-shadow-2xl mb-3 leading-none tracking-tight">
            BenEzra
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #FDE68A, #FCA5A5, #C4B5FD)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Family
            </span>
          </h1>
          <p className="text-white/80 text-lg sm:text-xl font-semibold mb-10 drop-shadow">
            Your home. Your plans. All in one place. ✨
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
            {features.map((f) => (
              <Link
                key={f.href}
                href={f.href}
                className="group flex flex-col items-center gap-2 rounded-2xl p-5 text-white font-bold transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: f.gradient,
                  boxShadow: `0 10px 40px ${f.glow}`,
                }}
              >
                <span className="text-4xl group-hover:animate-wiggle transition-transform">
                  {f.emoji}
                </span>
                <span className="text-base">{f.label}</span>
                <span className="text-xs font-semibold opacity-80 text-center leading-snug">
                  {f.desc}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
