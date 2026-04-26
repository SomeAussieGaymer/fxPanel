import { useEffect, useState, useCallback } from "react";
import { useInView } from "../hooks/useInView";

const stats = [
  { value: 500, suffix: "+", label: "Active Players" },
  { value: 99.9, suffix: "%", label: "Uptime" },
  { value: 200, suffix: "+", label: "Custom Scripts" },
  { value: 50, suffix: "+", label: "Unique Jobs" },
];

function AnimatedNumber({
  target,
  suffix,
  started,
}: {
  target: number;
  suffix: string;
  started: boolean;
}) {
  const [display, setDisplay] = useState("0");
  const isDecimal = target % 1 !== 0;

  const animate = useCallback(() => {
    const duration = 2000;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;
      setDisplay(isDecimal ? current.toFixed(1) : Math.floor(current).toString());
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [target, isDecimal]);

  useEffect(() => {
    if (started) animate();
  }, [started, animate]);

  return (
    <>
      {display}
      {suffix}
    </>
  );
}

export function Stats() {
  const { ref, isVisible } = useInView(0.3);

  return (
    <section className="py-20 px-6 border-y border-white/5">
      <div
        className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8"
        ref={ref}
      >
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-4xl md:text-5xl font-black gradient-text">
              <AnimatedNumber
                target={s.value}
                suffix={s.suffix}
                started={isVisible}
              />
            </div>
            <div className="mt-2 text-sm text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
