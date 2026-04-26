import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { useInView } from "../hooks/useInView";

interface StoreItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  icon: string;
  category: string;
  description: string;
  features: string[];
  popular?: boolean;
  color: string;
}

const storeItems: StoreItem[] = [
  {
    id: "vip-bronze",
    name: "Bronze VIP",
    price: 4.99,
    icon: "🥉",
    category: "vip",
    description: "Support the server and unlock starter perks.",
    features: [
      "Custom Discord role",
      "Priority queue access",
      "Bronze name color in-game",
      "Access to VIP-only vehicles (5)",
      "/vip chat command",
    ],
    color: "from-amber-700 to-amber-900",
  },
  {
    id: "vip-silver",
    name: "Silver VIP",
    price: 9.99,
    icon: "🥈",
    category: "vip",
    description: "Enhanced perks for dedicated players.",
    features: [
      "Everything in Bronze",
      "Silver name color in-game",
      "Access to VIP-only vehicles (15)",
      "Extra character slot",
      "Custom phone wallpaper",
      "/me color customization",
    ],
    popular: true,
    color: "from-slate-400 to-slate-600",
  },
  {
    id: "vip-gold",
    name: "Gold VIP",
    price: 19.99,
    icon: "👑",
    category: "vip",
    description: "The ultimate VIP experience with all perks unlocked.",
    features: [
      "Everything in Silver",
      "Gold name color in-game",
      "Access to ALL VIP vehicles (30+)",
      "2 extra character slots",
      "Custom license plate",
      "Priority support ticket",
      "Monthly $50k in-game bonus",
      "Exclusive VIP events access",
    ],
    color: "from-yellow-500 to-amber-600",
  },
  {
    id: "vehicle-pack",
    name: "Exotic Car Pack",
    price: 7.99,
    originalPrice: 12.99,
    icon: "🏎️",
    category: "vehicles",
    description: "Unlock 10 exclusive exotic vehicles for your garage.",
    features: [
      "10 exclusive exotic vehicles",
      "Custom handling & tuning",
      "Unique liveries included",
      "Permanent unlock",
    ],
    color: "from-red-500 to-rose-600",
  },
  {
    id: "house-pack",
    name: "Premium Housing",
    price: 14.99,
    icon: "🏠",
    category: "properties",
    description: "Unlock access to premium housing locations across the map.",
    features: [
      "5 exclusive property locations",
      "Custom interior options",
      "Extra storage space",
      "Premium garage (10 slots)",
    ],
    color: "from-emerald-500 to-green-600",
  },
  {
    id: "starter-pack",
    name: "Starter Bundle",
    price: 9.99,
    originalPrice: 24.99,
    icon: "🎁",
    category: "bundles",
    description: "Everything you need to get a head start. Best value!",
    features: [
      "Bronze VIP (1 month)",
      "$100k starting cash",
      "Starter vehicle (choice of 3)",
      "Starter apartment unlock",
      "Custom outfit set",
    ],
    popular: true,
    color: "from-indigo-500 to-purple-600",
  },
];

const categories = [
  { id: "all", label: "All Items", icon: "🛍️" },
  { id: "vip", label: "VIP Tiers", icon: "⭐" },
  { id: "vehicles", label: "Vehicles", icon: "🏎️" },
  { id: "properties", label: "Properties", icon: "🏠" },
  { id: "bundles", label: "Bundles", icon: "🎁" },
];

function StoreCard({ item }: { item: StoreItem }) {
  return (
    <div className="glow-card glass rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div
        className={`p-6 bg-gradient-to-br ${item.color} bg-opacity-20 relative`}
        style={{
          background: `linear-gradient(135deg, rgba(99,102,241,0.08), rgba(6,182,212,0.08))`,
        }}
      >
        {item.popular && (
          <span className="absolute top-3 right-3 text-[10px] px-2 py-1 rounded-full bg-indigo-500/30 text-indigo-300 font-medium border border-indigo-500/20">
            ⭐ POPULAR
          </span>
        )}
        {item.originalPrice && (
          <span className="absolute top-3 right-3 text-[10px] px-2 py-1 rounded-full bg-emerald-500/30 text-emerald-300 font-medium border border-emerald-500/20">
            SALE
          </span>
        )}
        <div className="text-4xl mb-3">{item.icon}</div>
        <h3 className="text-lg font-bold text-white">{item.name}</h3>
        <p className="text-sm text-slate-400 mt-1">{item.description}</p>
      </div>

      {/* Features */}
      <div className="p-6 flex-1">
        <ul className="space-y-2">
          {item.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm text-slate-400"
            >
              <svg
                className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Price + CTA */}
      <div className="p-6 pt-0">
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-bold text-white">
            ${item.price.toFixed(2)}
          </span>
          {item.originalPrice && (
            <span className="text-sm text-slate-500 line-through">
              ${item.originalPrice.toFixed(2)}
            </span>
          )}
          {item.originalPrice && (
            <span className="text-xs text-emerald-400 font-medium">
              Save {Math.round((1 - item.price / item.originalPrice) * 100)}%
            </span>
          )}
        </div>
        <button className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all">
          Add to Cart
        </button>
      </div>
    </div>
  );
}

export function StorePage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const { ref, isVisible } = useInView();

  const filtered =
    activeCategory === "all"
      ? storeItems
      : storeItems.filter((i) => i.category === activeCategory);

  return (
    <>
      <PageHeader
        title="Server"
        highlight="Store"
        description="Support Horizon RP and unlock exclusive perks, vehicles, and more."
      />

      <section className="pb-24 px-6" ref={ref}>
        <div className="max-w-6xl mx-auto">
          {/* Trust bar */}
          <div className="glass rounded-xl p-4 mb-8 flex flex-wrap items-center justify-center gap-8 text-center text-sm">
            {[
              { icon: "🔒", text: "Secure Payments" },
              { icon: "⚡", text: "Instant Delivery" },
              { icon: "🔄", text: "24hr Refund Policy" },
              { icon: "💬", text: "Support via Discord" },
            ].map((t) => (
              <span key={t.text} className="flex items-center gap-2 text-slate-400">
                <span>{t.icon}</span>
                {t.text}
              </span>
            ))}
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  activeCategory === cat.id
                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                    : "glass text-slate-400 hover:text-white"
                }`}
              >
                <span className="mr-1.5">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Items */}
          <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${isVisible ? "animate-on-scroll visible" : "animate-on-scroll"}`}
          >
            {filtered.map((item) => (
              <StoreCard key={item.id} item={item} />
            ))}
          </div>

          {/* Disclaimer */}
          <div className="mt-12 glass rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-2">
              ℹ️ Store Information
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              All purchases are donations to support server development and
              maintenance. Items are cosmetic or quality-of-life only and do not
              provide pay-to-win advantages. Perks are tied to your Discord
              account and applied within 5 minutes of purchase. For issues,
              contact support via Discord. Prices are in USD. By purchasing, you
              agree to our Terms of Service.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
