import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import { PatternBreakdown } from "@/lib/types";
import { Activity, BarChart2, Radar as RadarIcon } from "lucide-react";

interface PatternBreakdownChartProps {
  breakdown: PatternBreakdown[];
}

/* ── Bar tooltip ─────────────────────────────────────────── */
const BarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as PatternBreakdown & { pct: number };
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs space-y-0.5">
      <p className="font-semibold text-foreground">{d.label}</p>
      <p className="font-mono text-muted-foreground">
        <span style={{ color: d.color }} className="font-bold text-sm">{d.count}</span>
        {" "}accounts flagged
      </p>
      <p className="text-muted-foreground">{d.pct.toFixed(1)}% of all flags</p>
    </div>
  );
};

/* ── Radar tooltip ───────────────────────────────────────── */
const RadarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as PatternBreakdown & { pct: number };
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs space-y-0.5">
      <p className="font-semibold text-foreground">{d.label}</p>
      <p className="font-mono">
        <span className="text-primary font-bold text-sm">{d.pct.toFixed(1)}%</span>
        <span className="text-muted-foreground ml-1">dominance</span>
      </p>
      <p className="text-muted-foreground">{d.count} accounts</p>
    </div>
  );
};

/* ── Custom polar axis tick ──────────────────────────────── */
const PolarTick = ({ payload, x, y, cx, cy, ...rest }: any) => {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const nx = x + (dx / dist) * 10;
  const ny = y + (dy / dist) * 10;
  return (
    <text
      x={nx}
      y={ny}
      textAnchor="middle"
      dominantBaseline="central"
      fill="hsl(var(--muted-foreground))"
      fontSize={9}
      fontFamily="monospace"
    >
      {payload.value}
    </text>
  );
};

/* ── Main component ──────────────────────────────────────── */
const PatternBreakdownChart: React.FC<PatternBreakdownChartProps> = ({ breakdown }) => {
  const [activeView, setActiveView] = useState<"both" | "bar" | "radar">("both");

  const total = breakdown.reduce((sum, b) => sum + b.count, 0);
  const hasData = total > 0;

  // Enrich with percentage
  const data = breakdown.map((b) => ({
    ...b,
    pct: total > 0 ? (b.count / total) * 100 : 0,
  }));

  // Dominant algorithm
  const dominant = [...data].sort((a, b) => b.count - a.count)[0];

  const views = [
    { key: "both",  label: "Both",  Icon: Activity },
    { key: "bar",   label: "Bar",   Icon: BarChart2 },
    { key: "radar", label: "Radar", Icon: RadarIcon },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card border border-border rounded-lg p-5"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Detection Pattern Breakdown</h3>
            <p className="text-[11px] text-muted-foreground">
              Flagged account count &amp; algorithm dominance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Summary pills */}
          {hasData && (
            <div className="hidden sm:flex items-center gap-3 text-right mr-2">
              <div>
                <p className="text-lg font-bold font-mono text-foreground leading-none">{total}</p>
                <p className="text-[10px] text-muted-foreground">total flags</p>
              </div>
              {dominant?.count > 0 && (
                <div className="pl-3 border-l border-border">
                  <p
                    className="text-lg font-bold font-mono leading-none"
                    style={{ color: dominant.color }}
                  >
                    {dominant.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">top pattern</p>
                </div>
              )}
            </div>
          )}

          {/* View toggle */}
          <div className="flex items-center bg-muted/30 border border-border rounded-md p-0.5 gap-0.5">
            {views.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium transition-all ${
                  activeView === key
                    ? "bg-card border border-border text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-xs">
          No pattern data available
        </div>
      ) : (
        <>
          {/* ── Charts area ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className={`grid gap-6 ${activeView === "both" ? "md:grid-cols-2" : "grid-cols-1"}`}
            >
              {/* ── Bar chart ── */}
              {(activeView === "both" || activeView === "bar") && (
                <div>
                  {activeView === "both" && (
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 font-mono">
                      Flagged Accounts (count)
                    </p>
                  )}
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data}
                        margin={{ top: 16, right: 8, left: -16, bottom: 0 }}
                        barCategoryGap="28%"
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                          angle={-18}
                          textAnchor="end"
                          height={40}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<BarTooltip />} cursor={{ fill: "hsl(var(--muted)/0.12)" }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={44}>
                          {data.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} fillOpacity={0.85} />
                          ))}
                          <LabelList
                            dataKey="count"
                            position="top"
                            style={{
                              fill: "hsl(var(--muted-foreground))",
                              fontSize: 9,
                              fontFamily: "monospace",
                            }}
                            formatter={(v: number) => (v > 0 ? v : "")}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ── Radar chart ── */}
              {(activeView === "both" || activeView === "radar") && (
                <div>
                  {activeView === "both" && (
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 font-mono">
                      Algorithm Dominance (%)
                    </p>
                  )}
                  <div className="h-52 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
                        <PolarGrid
                          stroke="hsl(var(--border))"
                          strokeDasharray="3 3"
                          gridType="polygon"
                        />
                        <PolarAngleAxis
                          dataKey="label"
                          tick={<PolarTick />}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          tickCount={4}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 8 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Radar
                          name="Dominance"
                          dataKey="pct"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="hsl(var(--primary))"
                          fillOpacity={0.18}
                          dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            if (payload.pct === 0) return <g key={payload.name} />;
                            return (
                              <circle
                                key={payload.name}
                                cx={cx}
                                cy={cy}
                                r={4}
                                fill={payload.color}
                                stroke="hsl(var(--card))"
                                strokeWidth={1.5}
                              />
                            );
                          }}
                        />
                        <Tooltip content={<RadarTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>

                    {/* Center label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center opacity-40">
                        <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                          dominance
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Percentage pills around radar */}
                  <div className="grid grid-cols-4 gap-1 mt-1">
                    {data
                      .filter((d) => d.pct > 0)
                      .sort((a, b) => b.pct - a.pct)
                      .slice(0, 4)
                      .map((d) => (
                        <div
                          key={d.name}
                          className="text-center px-1 py-1 rounded border border-border/50 bg-muted/10"
                        >
                          <p
                            className="text-[11px] font-bold font-mono"
                            style={{ color: d.color }}
                          >
                            {d.pct.toFixed(0)}%
                          </p>
                          <p className="text-[9px] text-muted-foreground truncate">{d.label}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ── Legend pills ── */}
          <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border">
            {data.map((b) => (
              <div
                key={b.name}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border/60 bg-muted/20 text-[10px]"
              >
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: b.color }}
                />
                <span className="text-muted-foreground">{b.label}</span>
                <span
                  className="font-mono font-semibold"
                  style={{ color: b.count > 0 ? b.color : "hsl(var(--muted-foreground))" }}
                >
                  {b.count}
                </span>
                {b.pct > 0 && (
                  <span className="text-muted-foreground/60">
                    ({b.pct.toFixed(0)}%)
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default PatternBreakdownChart;
