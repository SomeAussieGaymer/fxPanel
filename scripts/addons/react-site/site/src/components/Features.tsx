import { useInView } from "../hooks/useInView";

const features = [
  {
    icon: "⚡",
    title: "Custom Framework",
    desc: "Built from the ground up for performance and immersion with proprietary systems.",
  },
  {
    icon: "💰",
    title: "Active Economy",
    desc: "Dynamic player-driven economy with businesses, stocks, and real estate.",
  },
  {
    icon: "🏢",
    title: "Realistic Jobs",
    desc: "Over 50 unique jobs and career paths with progression systems.",
  },
  {
    icon: "🚗",
    title: "Custom Vehicles",
    desc: "500+ hand-picked vehicles with realistic handling and modifications.",
  },
  {
    icon: "🏠",
    title: "Housing System",
    desc: "Purchase, customize, and manage properties across the entire map.",
  },
  {
    icon: "⚖️",
    title: "Legal System",
    desc: "Full court system with judges, lawyers, and player-driven cases.",
  },
];

export function Features() {
  const { ref, isVisible } = useInView();

  return (
    <section id="features" className="relative py-24 px-6">
      <div className="max-w-7xl mx-auto" ref={ref}>
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Why Choose <span className="gradient-text">Horizon</span>
          </h2>
          <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
            Everything you need for the ultimate roleplay experience, built by a
            passionate team.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`glow-card glass p-6 rounded-xl ${isVisible ? "animate-on-scroll visible" : "animate-on-scroll"}`}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {f.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
