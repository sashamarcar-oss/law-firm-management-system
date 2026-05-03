"use client";

import { ArrowUpRight, ArrowDownRight } from "lucide-react";

type Props = {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend = 0,
}: Props) {
  const isPositive = trend >= 0;

  return (
    <div className="group relative bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300">

      {/* Glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/10 group-hover:to-indigo-500/5 transition"></div>

      <div className="relative flex items-center justify-between">
        
        {/* Left */}
        <div>
          <p className="text-sm text-slate-500">{title}</p>

          <h3 className="text-3xl font-bold mt-1 tracking-tight">
            {value}
          </h3>

          {/* Trend */}
          <div className={`flex items-center gap-1 mt-2 text-sm ${
            isPositive ? "text-green-600" : "text-red-600"
          }`}>
            {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            <span>{Math.abs(trend)}%</span>
            <span className="text-slate-400 ml-1">vs last week</span>
          </div>
        </div>

        {/* Icon */}
        <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 group-hover:scale-110 transition">
          <Icon size={22} />
        </div>

      </div>
    </div>
  );
}