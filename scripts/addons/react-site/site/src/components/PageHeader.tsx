export function PageHeader({
  title,
  highlight,
  description,
}: {
  title: string;
  highlight: string;
  description: string;
}) {
  return (
    <div className="relative pt-32 pb-16 px-6 overflow-hidden">
      <div className="absolute inset-0 hero-gradient opacity-50" />
      <div className="relative z-10 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold">
          <span className="text-white">{title} </span>
          <span className="gradient-text">{highlight}</span>
        </h1>
        <p className="mt-4 text-lg text-slate-400">{description}</p>
      </div>
    </div>
  );
}
