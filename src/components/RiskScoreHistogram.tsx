import React from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { SuspiciousAccount } from "@/lib/types";

interface RiskScoreHistogramProps {
  accounts: SuspiciousAccount[];
}

const BANDS = [
  {
    key: "low",
    label: "Low",
    range: "0–30",
    min: 0,
    max: 30,
    color: "hsl(var(--success))",
    bgClass: "bg-success/10",
    textClass: "text-success",
    borderClass: "border-success/30",
    description: "Minimal risk",
  },
  {
    key: "medium",
    label: "Medium",
    range: "30–60",
    min: 30,
    max: 60,
    color: "hsl(var(--warning))",
    bgClass: "bg-warning/10",
    textClass: "text-warning",
    borderClass: "border-warning/30",
    description: "Warrants review",
  },
  {
    key: "high",
    label: "High",
    range: "60–80",
    min: 60,
    max: 80,
    color: "hsl(var(--destructive) / 0.7)",
    bgClass: "bg-destructive/10",
    textClass: "text-destructive",
    borderClass: "border-destructive/30",
    description: "Likely suspicious",
  },
  {
    key: "critical",
    label: "Critical",
    range: "80–100",
    min: 80,
    max: 100,
    color: "hsl(var(--destructive))",
    bgClass: "bg-destructive/20",
    textClass: "text-destructive",
    borderClass: "border-destructive/50",
    description: "Immediate action",
  },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs space-y-1">
      <p className="font-semibold text-foreground">
        {d.label} Risk{" "}
        <span className="font-mono text-muted-foreground">({d.range})</span>
      </p>
      <p className="text-muted-foreground">
        <span
          className="font-bold text-sm font-mono"
          style={{ color: d.color }}
        >
          {d.count}
        </span>{" "}
        accounts
      </p>
      <p className="text-muted-foreground">{d.pct.toFixed(1)}% of flagged</p>
      <p className="text-muted-foreground/70 italic">{d.description}</p>
    </div>
  );
};

const RiskScoreHistogram: React.FC<RiskScoreHistogramProps> = ({ accounts }) => {
  const data = BANDS.map((band) => {
    const count = accounts.filter(
      (a) =>
        a.suspicion_score >= band.min &&
        (band.max === 100 ? a.suspicion_score <= band.max : a.suspicion_score < band.max)
    ).length;
    return { ...band, count };
  });

  const total = data.reduce((s, d) => s + d.count, 0);
  const enriched = data.map((d) => ({
    ...d,
    pct: total > 0 ? (d.count / total) * 100 : 0,
  }));

  const critical = enriched.find((d) => d.key === "critical");
  const high = enriched.find((d) => d.key === "high");
  const atRisk = (critical?.count ?? 0) + (high?.count ?? 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-card border border-border rounded-lg p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Risk Score Distribution
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Accounts bucketed by suspicion score band
            </p>
          </div>
        </div>

        {total > 0 && (
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-lg font-bold font-mono text-foreground leading-none">
                {total}
              </p>
              <p className="text-[10px] text-muted-foreground">flagged total</p>
            </div>
            {atRisk > 0 && (
              <div className="pl-3 border-l border-border">
                <p className="text-lg font-bold font-mono text-destructive leading-none">
                  {atRisk}
                </p>
                <p className="text-[10px] text-muted-foreground">high+critical</p>
              </div>
            )}
          </div>
        )}
      </div>

      {total === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-xs">
          No suspicious accounts to display
        </div>
      ) : (
        <>
          {/* Histogram */}
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={enriched}
                margin={{ top: 20, right: 8, left: -16, bottom: 0 }}
                barCategoryGap="24%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted)/0.12)" }} />
                <ReferenceLine
                  y={0}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={72}>
                  {enriched.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} fillOpacity={0.88} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="top"
                    style={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 10,
                      fontFamily: "monospace",
                      fontWeight: 600,
                    }}
                    formatter={(v: number) => (v > 0 ? v : "")}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Band summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-border">
            {enriched.map((band) => (
              <motion.div
                key={band.key}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className={`rounded-md border ${band.borderClass} ${band.bgClass} px-3 py-2`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${band.textClass}`}>
                    {band.label}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {band.range}
                  </span>
                </div>
                <p className={`text-xl font-bold font-mono ${band.textClass} leading-none`}>
                  {band.count}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] text-muted-foreground">{band.description}</span>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {band.pct.toFixed(0)}%
                  </span>
                </div>
                {/* Mini progress bar */}
                <div className="mt-1.5 h-1 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${band.pct}%`, backgroundColor: band.color }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default RiskScoreHistogram;
