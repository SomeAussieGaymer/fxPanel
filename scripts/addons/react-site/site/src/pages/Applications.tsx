import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { useInView } from "../hooks/useInView";

const applicationTypes = [
  {
    id: "staff",
    icon: "⚖️",
    title: "Staff Application",
    status: "open",
    desc: "Join our moderation team and help maintain a positive community experience.",
    fields: ["age", "timezone", "experience", "availability", "scenario"],
    color: "from-indigo-500 to-purple-500",
  },
  {
    id: "pd",
    icon: "🚔",
    title: "Police Department",
    status: "open",
    desc: "Protect and serve the citizens of Horizon. Includes patrol, detective, and SWAT divisions.",
    fields: ["character", "backstory", "experience", "availability", "scenario"],
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "ems",
    icon: "🏥",
    title: "EMS / Fire Department",
    status: "open",
    desc: "Save lives as a paramedic or firefighter. First responder roleplay at its finest.",
    fields: ["character", "backstory", "experience", "availability"],
    color: "from-red-400 to-pink-500",
  },
  {
    id: "mechanic",
    icon: "🔧",
    title: "Certified Mechanic",
    status: "open",
    desc: "Run a shop, customize vehicles, and provide repair services across the city.",
    fields: ["character", "backstory", "experience"],
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "gang",
    icon: "🏴",
    title: "Gang Whitelist",
    status: "closed",
    desc: "Apply for an official gang roster spot. Requires existing roleplay references.",
    fields: ["character", "backstory", "references", "experience"],
    color: "from-slate-500 to-slate-600",
  },
  {
    id: "business",
    icon: "🏢",
    title: "Business Owner",
    status: "open",
    desc: "Pitch your business idea and get an official storefront in the city.",
    fields: ["character", "business_plan", "backstory", "experience"],
    color: "from-emerald-500 to-green-500",
  },
];

const fieldConfig: Record<string, { label: string; type: "text" | "textarea" | "select"; options?: string[] }> = {
  age: { label: "Your Age", type: "text" },
  timezone: { label: "Timezone", type: "select", options: ["EST", "CST", "MST", "PST", "GMT", "CET", "Other"] },
  experience: { label: "RP Experience", type: "textarea" },
  availability: { label: "Weekly Availability", type: "select", options: ["10-20 hours", "20-30 hours", "30-40 hours", "40+ hours"] },
  scenario: { label: "How would you handle a rule breaker?", type: "textarea" },
  character: { label: "Character Name & Background", type: "textarea" },
  backstory: { label: "Character Backstory", type: "textarea" },
  references: { label: "RP References (names/servers)", type: "textarea" },
  business_plan: { label: "Business Plan & Concept", type: "textarea" },
};

function ApplicationCard({
  app,
  onSelect,
}: {
  app: (typeof applicationTypes)[0];
  onSelect: () => void;
}) {
  return (
    <div className="glow-card glass rounded-xl p-6 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center text-2xl`}
        >
          {app.icon}
        </div>
        <span
          className={`text-[10px] px-2 py-1 rounded-full font-medium ${
            app.status === "open"
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {app.status === "open" ? "✓ OPEN" : "✗ CLOSED"}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-white">{app.title}</h3>
      <p className="text-sm text-slate-400 mt-2 flex-1">{app.desc}</p>
      <button
        onClick={onSelect}
        disabled={app.status === "closed"}
        className={`mt-4 w-full py-2.5 rounded-lg text-sm font-medium transition-all ${
          app.status === "open"
            ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-indigo-500/25"
            : "bg-white/5 text-slate-600 cursor-not-allowed"
        }`}
      >
        {app.status === "open" ? "Apply Now" : "Currently Closed"}
      </button>
    </div>
  );
}

function ApplicationForm({
  app,
  onBack,
}: {
  app: (typeof applicationTypes)[0];
  onBack: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto glass rounded-xl p-12 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-white">
          Application Submitted!
        </h2>
        <p className="text-slate-400 mt-3">
          Your <strong className="text-white">{app.title}</strong> application
          has been received. We&apos;ll review it and get back to you on Discord
          within 48 hours.
        </p>
        <button
          onClick={onBack}
          className="mt-6 px-6 py-2 rounded-lg border border-white/10 text-white text-sm hover:bg-white/5 transition-all"
        >
          Back to Applications
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to all applications
      </button>

      <div className="glass rounded-xl overflow-hidden">
        <div
          className={`p-6 bg-gradient-to-r ${app.color} bg-opacity-20`}
          style={{ background: `linear-gradient(135deg, rgba(99,102,241,0.1), rgba(6,182,212,0.1))` }}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center text-3xl`}
            >
              {app.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{app.title}</h2>
              <p className="text-sm text-slate-400">{app.desc}</p>
            </div>
          </div>
        </div>

        <form
          className="p-6 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          {/* Discord username */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Discord Username
            </label>
            <input
              type="text"
              required
              placeholder="username#0000"
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Dynamic fields */}
          {app.fields.map((fieldId) => {
            const field = fieldConfig[fieldId];
            if (!field) return null;

            return (
              <div key={fieldId}>
                <label className="block text-sm font-medium text-white mb-2">
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    required
                    rows={4}
                    placeholder={`Enter your ${field.label.toLowerCase()}...`}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none"
                  />
                ) : field.type === "select" ? (
                  <select
                    required
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  >
                    <option value="" className="bg-slate-900">
                      Select...
                    </option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt} className="bg-slate-900">
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder={`Enter your ${field.label.toLowerCase()}...`}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                )}
              </div>
            );
          })}

          {/* Agreement */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              required
              className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-400">
              I have read and agree to the{" "}
              <span className="text-white">server rules</span> and understand
              that providing false information will result in my application
              being denied.
            </span>
          </label>

          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold hover:shadow-xl hover:shadow-indigo-500/25 transition-all"
          >
            Submit Application
          </button>
        </form>
      </div>
    </div>
  );
}

export function ApplicationsPage() {
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const { ref, isVisible } = useInView();

  const selected = applicationTypes.find((a) => a.id === selectedApp);

  return (
    <>
      <PageHeader
        title="Server"
        highlight="Applications"
        description="Apply for whitelisted roles, staff positions, and more."
      />

      <section className="pb-24 px-6" ref={ref}>
        <div className="max-w-5xl mx-auto">
          {selected ? (
            <ApplicationForm
              app={selected}
              onBack={() => setSelectedApp(null)}
            />
          ) : (
            <>
              {/* Stats */}
              <div className="glass rounded-xl p-4 mb-8 flex flex-wrap items-center justify-center gap-8 text-center">
                {[
                  { label: "Applications This Month", value: "142" },
                  { label: "Acceptance Rate", value: "34%" },
                  { label: "Avg. Response Time", value: "24hrs" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-lg font-bold gradient-text">
                      {s.value}
                    </div>
                    <div className="text-xs text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Application cards */}
              <div
                className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${isVisible ? "animate-on-scroll visible" : "animate-on-scroll"}`}
              >
                {applicationTypes.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    onSelect={() => setSelectedApp(app.id)}
                  />
                ))}
              </div>

              {/* Info box */}
              <div className="mt-8 glass rounded-xl p-6">
                <h3 className="text-sm font-semibold text-white mb-2">
                  📋 Application Tips
                </h3>
                <ul className="text-sm text-slate-400 space-y-1">
                  <li>
                    • Be detailed and honest in your responses — quality matters
                    more than length
                  </li>
                  <li>
                    • Join our Discord before applying so we can reach you with
                    updates
                  </li>
                  <li>
                    • Include relevant experience from other RP servers if
                    applicable
                  </li>
                  <li>
                    • Applications are reviewed weekly — please be patient
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
