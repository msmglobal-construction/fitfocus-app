interface StatCardProps {
  label: string;
  value: string;
  sublabel: string;
  icon: string;
  accent: string;
}

export function StatCard({ label, value, sublabel, icon, accent }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur transition hover:border-slate-700 hover:bg-slate-900">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">{label}</span>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${accent}`}
        >
          {icon}
        </span>
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight text-white">
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500">{sublabel}</div>
    </div>
  );
}
