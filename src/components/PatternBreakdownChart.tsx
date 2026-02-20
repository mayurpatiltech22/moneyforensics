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
} from "recharts";
import { PatternBreakdown } from "@/lib/types";
import { Activity } from "lucide-react";

interface PatternBreakdownChartProps {
  breakdown: PatternBreakdown[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as PatternBreakdown;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-0.5">{d.label}</p>
      <p className="font-mono text-muted-foreground">
        <span style={{ color: d.color }} className="font-bold text-sm">{d.count}</span>
        {" "}accounts flagged
      </p>
    </div>
  );
};

const PatternBreakdownChart: React.FC<PatternBreakdownChartProps> = ({ breakdown }) => {
  const hasData = breakdown.some((b) => b.count > 0);
  const total = breakdown.reduce((sum, b) => sum + b.count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card border border-border rounded-lg p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Detection Pattern Breakdown</h3>
            <p className="text-[11px] text-muted-foreground">Accounts flagged per algorithm</p>
          </div>
        </div>
        {hasData && (
          <div className="text-right">
            <p className="text-xl font-bold font-mono text-foreground">{total}</p>
            <p className="text-[11px] text-muted-foreground">total flags</p>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">
          No pattern data available
        </div>
      ) : (
        <>
          {/* Bar Chart */}
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={breakdown}
                margin={{ top: 16, right: 12, left: -12, bottom: 0 }}
                barCategoryGap="28%"
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
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={42}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted)/0.15)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {breakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} fillOpacity={0.88} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="top"
                    style={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "monospace" }}
                    formatter={(v: number) => (v > 0 ? v : "")}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend pills */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            {breakdown.map((b) => (
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
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default PatternBreakdownChart;
