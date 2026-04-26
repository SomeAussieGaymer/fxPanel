import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-slate-950 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <span className="text-xl font-bold gradient-text">HORIZON RP</span>
            <p className="text-sm text-slate-500 mt-3 leading-relaxed">
              The ultimate FiveM roleplay experience. Custom framework, active
              economy, and a thriving community.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Navigate</h4>
            <div className="space-y-2">
              {[
                { label: "Home", to: "/" },
                { label: "Forums", to: "/forums" },
                { label: "Applications", to: "/applications" },
                { label: "Store", to: "/store" },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block text-sm text-slate-400 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">
              Community
            </h4>
            <div className="space-y-2">
              <Link
                to="/rules"
                className="block text-sm text-slate-400 hover:text-white transition-colors"
              >
                Rules
              </Link>
              <Link
                to="/staff"
                className="block text-sm text-slate-400 hover:text-white transition-colors"
              >
                Staff
              </Link>
              <a
                href="https://discord.gg/example"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-slate-400 hover:text-white transition-colors"
              >
                Discord
              </a>
            </div>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Connect</h4>
            <div className="space-y-3">
              <a
                href="https://discord.gg/example"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                Discord
              </a>
              <a
                href="https://cfx.re/join/abc123"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>
                FiveM Server
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} Horizon RP. All rights reserved.
          </p>
          <p className="text-xs text-slate-700">
            Powered by{" "}
            <span className="text-slate-500">fxPanel</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
