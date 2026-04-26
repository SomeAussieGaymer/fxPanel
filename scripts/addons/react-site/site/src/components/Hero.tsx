export function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-slate-950 hero-gradient" />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-float-delayed" />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "-2s" }} />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-8">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-sm text-slate-300">
            NOW LIVE &mdash; 127/256 Online
          </span>
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.1]">
          <span className="text-white">Where Your</span>
          <br />
          <span className="gradient-text">Story Begins</span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Immerse yourself in the most detailed roleplay experience. Custom
          framework, active economy, and a thriving community waiting for you.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://cfx.re/join/abc123"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold hover:shadow-xl hover:shadow-indigo-500/25 transition-all hover:-translate-y-0.5"
          >
            Connect Now
          </a>
          <a
            href="https://discord.gg/example"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/5 transition-all"
          >
            Join Discord
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg
          className="w-6 h-6 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
}
