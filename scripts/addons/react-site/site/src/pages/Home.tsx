import { Hero } from "../components/Hero";
import { Features } from "../components/Features";
import { Stats } from "../components/Stats";
import { Link } from "react-router-dom";
import { useInView } from "../hooks/useInView";

function QuickLinks() {
  const { ref, isVisible } = useInView();
  const links = [
    {
      to: "/forums",
      icon: "💬",
      title: "Forums",
      desc: "Discuss, share, and connect with the community",
      color: "from-blue-500/20 to-cyan-500/20",
    },
    {
      to: "/applications",
      icon: "📝",
      title: "Apply Now",
      desc: "Join our staff team or apply for whitelisted roles",
      color: "from-emerald-500/20 to-green-500/20",
    },
    {
      to: "/store",
      icon: "🛒",
      title: "Store",
      desc: "Support the server and unlock exclusive perks",
      color: "from-purple-500/20 to-pink-500/20",
    },
  ];

  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto" ref={ref}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {links.map((link, i) => (
            <Link
              key={link.to}
              to={link.to}
              className={`glow-card glass p-6 rounded-xl group ${isVisible ? "animate-on-scroll visible" : "animate-on-scroll"}`}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center text-2xl mb-4`}
              >
                {link.icon}
              </div>
              <h3 className="text-white font-semibold group-hover:text-indigo-400 transition-colors">
                {link.title}
              </h3>
              <p className="text-sm text-slate-400 mt-2">{link.desc}</p>
              <span className="inline-flex items-center gap-1 text-xs text-indigo-400 mt-4 group-hover:gap-2 transition-all">
                Visit
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-cyan-500/10" />
      <div className="absolute inset-0 hero-gradient opacity-50" />
      <div className="relative z-10 text-center max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-white">
          Ready to <span className="gradient-text">Join?</span>
        </h2>
        <p className="mt-4 text-slate-400 text-lg">
          Your next adventure is one click away. Join hundreds of players
          already online.
        </p>
        <a
          href="https://cfx.re/join/abc123"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-8 px-10 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold text-lg hover:shadow-xl hover:shadow-indigo-500/25 transition-all hover:-translate-y-0.5"
        >
          Connect Now
        </a>
      </div>
    </section>
  );
}

export function HomePage() {
  return (
    <>
      <Hero />
      <QuickLinks />
      <Features />
      <Stats />
      <CTA />
    </>
  );
}
