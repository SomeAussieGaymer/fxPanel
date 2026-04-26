import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { useInView } from "../hooks/useInView";

interface ForumPost {
  id: number;
  title: string;
  author: string;
  avatar: string;
  category: string;
  replies: number;
  views: number;
  lastActivity: string;
  pinned?: boolean;
  locked?: boolean;
  hot?: boolean;
}

const categories = [
  { id: "all", label: "All", icon: "📋" },
  { id: "announcements", label: "Announcements", icon: "📢" },
  { id: "general", label: "General", icon: "💬" },
  { id: "guides", label: "Guides & Tutorials", icon: "📚" },
  { id: "suggestions", label: "Suggestions", icon: "💡" },
  { id: "support", label: "Support", icon: "🔧" },
  { id: "off-topic", label: "Off-Topic", icon: "🎮" },
];

const posts: ForumPost[] = [
  {
    id: 1,
    title: "Server Update v3.2 — New Drug System & Business Overhaul",
    author: "Alex Martinez",
    avatar: "👑",
    category: "announcements",
    replies: 47,
    views: 1243,
    lastActivity: "2 hours ago",
    pinned: true,
  },
  {
    id: 2,
    title: "Community Meeting — Saturday at 8PM EST",
    author: "Emily Brooks",
    avatar: "💬",
    category: "announcements",
    replies: 23,
    views: 567,
    lastActivity: "5 hours ago",
    pinned: true,
  },
  {
    id: 3,
    title: "Ultimate Beginner's Guide to Horizon RP",
    author: "James Wilson",
    avatar: "💻",
    category: "guides",
    replies: 89,
    views: 5621,
    lastActivity: "1 day ago",
    pinned: true,
  },
  {
    id: 4,
    title: "How to Start a Business — Complete Walkthrough",
    author: "RocketRyan",
    avatar: "🚀",
    category: "guides",
    replies: 34,
    views: 2103,
    lastActivity: "3 hours ago",
    hot: true,
  },
  {
    id: 5,
    title: "Suggestion: Add fishing as a side activity",
    author: "ChillVibes",
    avatar: "🎣",
    category: "suggestions",
    replies: 56,
    views: 890,
    lastActivity: "4 hours ago",
    hot: true,
  },
  {
    id: 6,
    title: "Anyone else having issues with the garage system?",
    author: "SpeedDemon",
    avatar: "🚗",
    category: "support",
    replies: 12,
    views: 234,
    lastActivity: "6 hours ago",
  },
  {
    id: 7,
    title: "Best RP moments of the week — Share yours!",
    author: "StoryTeller",
    avatar: "📖",
    category: "general",
    replies: 67,
    views: 1456,
    lastActivity: "30 minutes ago",
    hot: true,
  },
  {
    id: 8,
    title: "Looking for a mechanic shop partner",
    author: "WrenchKing",
    avatar: "🔧",
    category: "general",
    replies: 8,
    views: 145,
    lastActivity: "1 hour ago",
  },
  {
    id: 9,
    title: "Gang territory suggestions for next update",
    author: "StreetWise",
    avatar: "🗺️",
    category: "suggestions",
    replies: 41,
    views: 723,
    lastActivity: "8 hours ago",
  },
  {
    id: 10,
    title: "What other games is everyone playing?",
    author: "GamerGal",
    avatar: "🎮",
    category: "off-topic",
    replies: 93,
    views: 2341,
    lastActivity: "12 hours ago",
  },
  {
    id: 11,
    title: "Police Department recruitment — Apply within",
    author: "Sarah Chen",
    avatar: "⚖️",
    category: "announcements",
    replies: 31,
    views: 892,
    lastActivity: "2 days ago",
    locked: true,
  },
  {
    id: 12,
    title: "How to make money fast (legally!) — Tips & Tricks",
    author: "HustleHard",
    avatar: "💰",
    category: "guides",
    replies: 72,
    views: 4892,
    lastActivity: "1 day ago",
  },
];

function ForumStats() {
  const stats = [
    { label: "Total Posts", value: "12,847" },
    { label: "Members", value: "3,291" },
    { label: "Online Now", value: "127" },
    { label: "Newest Member", value: "Axel_RP" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((s) => (
        <div key={s.label} className="glass rounded-xl p-4 text-center">
          <div className="text-lg font-bold gradient-text">{s.value}</div>
          <div className="text-xs text-slate-500 mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function PostRow({ post }: { post: ForumPost }) {
  return (
    <div className="group flex items-center gap-4 p-4 rounded-xl hover:bg-white/[0.02] transition-colors cursor-pointer border-b border-white/5 last:border-0">
      {/* Avatar */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center text-lg">
        {post.avatar}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {post.pinned && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
              PINNED
            </span>
          )}
          {post.locked && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
              LOCKED
            </span>
          )}
          {post.hot && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-medium">
              🔥 HOT
            </span>
          )}
          <h3 className="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors truncate">
            {post.title}
          </h3>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-slate-500">by {post.author}</span>
          <span className="text-xs text-slate-600">•</span>
          <span className="text-xs text-slate-500">{post.lastActivity}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-6 text-xs text-slate-500">
        <div className="text-center w-16">
          <div className="text-white font-medium">{post.replies}</div>
          <div>replies</div>
        </div>
        <div className="text-center w-16">
          <div className="text-white font-medium">{post.views.toLocaleString()}</div>
          <div>views</div>
        </div>
      </div>
    </div>
  );
}

export function ForumsPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const { ref, isVisible } = useInView();

  const filtered =
    activeCategory === "all"
      ? posts
      : posts.filter((p) => p.category === activeCategory);

  const pinned = filtered.filter((p) => p.pinned);
  const regular = filtered.filter((p) => !p.pinned);

  return (
    <>
      <PageHeader
        title="Community"
        highlight="Forums"
        description="Discuss strategies, share stories, and connect with fellow roleplayers."
      />

      <section className="pb-24 px-6" ref={ref}>
        <div className="max-w-5xl mx-auto">
          <ForumStats />

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
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

          {/* Create post bar */}
          <div className="glass rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-sm">
              👤
            </div>
            <div className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-sm text-slate-500 cursor-pointer hover:bg-white/[0.07] transition-colors">
              Start a new discussion...
            </div>
            <button className="px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm font-medium hover:bg-indigo-500/30 transition-colors">
              New Post
            </button>
          </div>

          {/* Posts */}
          <div
            className={`${isVisible ? "animate-on-scroll visible" : "animate-on-scroll"}`}
          >
            {pinned.length > 0 && (
              <div className="glass rounded-xl mb-4 overflow-hidden">
                <div className="px-4 py-2 bg-amber-500/5 border-b border-white/5">
                  <span className="text-xs font-medium text-amber-400">
                    📌 Pinned
                  </span>
                </div>
                {pinned.map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </div>
            )}

            <div className="glass rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5">
                <span className="text-xs font-medium text-slate-400">
                  Recent Discussions
                </span>
              </div>
              {regular.length > 0 ? (
                regular.map((post) => <PostRow key={post.id} post={post} />)
              ) : (
                <div className="p-12 text-center text-slate-500 text-sm">
                  No posts in this category yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
