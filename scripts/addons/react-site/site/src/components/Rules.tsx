import { useInView } from "../hooks/useInView";

const rules = [
  {
    title: "Respect All Players",
    desc: "Treat everyone with respect. Harassment, discrimination, and toxic behavior will result in immediate action.",
  },
  {
    title: "No Cheating or Exploiting",
    desc: "Any use of cheats, mods, or exploits that give an unfair advantage is strictly prohibited.",
  },
  {
    title: "Stay In Character",
    desc: "Maintain your character in all roleplay situations. Use /ooc for out-of-character communication.",
  },
  {
    title: "Value Your Life",
    desc: "Act as your character would in real life. Don't take unnecessary risks when your life is threatened.",
  },
  {
    title: "No Random Deathmatch",
    desc: "You must have a valid roleplay reason to engage in hostile actions against other players.",
  },
  {
    title: "No Metagaming",
    desc: "Don't use information obtained outside of roleplay (streams, Discord, etc.) in your character's decisions.",
  },
  {
    title: "Follow Staff Instructions",
    desc: "Staff decisions are final. If you disagree, file an appeal through the proper channels.",
  },
  {
    title: "No Advertising",
    desc: "Do not advertise other servers, communities, or services without explicit permission.",
  },
];

export function Rules() {
  const { ref, isVisible } = useInView();

  return (
    <section id="rules" className="pb-24 px-6">
      <div className="max-w-4xl mx-auto" ref={ref}>
        <div className="space-y-4">
          {rules.map((r, i) => (
            <div
              key={r.title}
              className={`glass rounded-xl p-5 flex gap-4 items-start hover:border-white/20 transition-all ${isVisible ? "animate-on-scroll visible" : "animate-on-scroll"}`}
              style={{ transitionDelay: `${i * 0.05}s` }}
            >
              <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="text-white font-semibold">{r.title}</h3>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                  {r.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
