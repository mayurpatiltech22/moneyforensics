import React from "react";
import { motion } from "framer-motion";
import { Shield, Users, AlertTriangle, Clock } from "lucide-react";
import { AnalysisSummary } from "@/lib/types";

interface DashboardStatsProps {
  summary: AnalysisSummary;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ summary }) => {
  const stats = [
    {
      label: "Accounts Analyzed",
      value: summary.total_accounts_analyzed.toLocaleString(),
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Suspicious Flagged",
      value: summary.suspicious_accounts_flagged.toLocaleString(),
      icon: AlertTriangle,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Fraud Rings",
      value: summary.fraud_rings_detected.toLocaleString(),
      icon: Shield,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Processing Time",
      value: `${summary.processing_time_seconds}s`,
      icon: Clock,
      color: "text-success",
      bg: "bg-success/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">{stat.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default DashboardStats;
