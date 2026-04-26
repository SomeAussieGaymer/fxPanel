import { useInView } from "../hooks/useInView";

const staff = [
  {
    name: "Alex Martinez",
    role: "Owner",
    color: "from-amber-400 to-orange-500",
    emoji: "👑",
    desc: "Founded Horizon RP with a vision for the best roleplay experience.",
  },
  {
    name: "Sarah Chen",
    role: "Head Admin",
    color: "from-red-400 to-pink-500",
    emoji: "⚖️",
    desc: "Keeping the community safe and fair for over 2 years.",
  },
  {
    name: "James Wilson",
    role: "Lead Developer",
    color: "from-indigo-400 to-purple-500",
    emoji: "💻",
    desc: "Architect of our custom framework and gameplay systems.",
  },
  {
    name: "Emily Brooks",
    role: "Community Manager",
    color: "from-emerald-400 to-cyan-500",
    emoji: "💬",
    desc: "Building bridges between staff and community every day.",
  },
];

export function Staff() {
  const { ref, isVisible } = useInView();

  return (
    <section id="team" className="pb-24 px-6">
      <div className="max-w-7xl mx-auto" ref={ref}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {staff.map((s, i) => (
            <div
              key={s.name}
              className={`glass rounded-xl p-6 text-center hover:border-white/20 transition-all ${isVisible ? "animate-on-scroll visible" : "animate-on-scroll"}`}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <div
                className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${s.color} flex items-center justify-center text-3xl mb-4`}
              >
                {s.emoji}
              </div>
              <h3 className="text-white font-semibold">{s.name}</h3>
              <p className="text-indigo-400 text-sm mt-1">{s.role}</p>
              <p className="text-slate-500 text-xs mt-3 leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
