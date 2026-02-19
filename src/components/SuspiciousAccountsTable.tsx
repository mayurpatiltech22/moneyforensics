import React from "react";
import { motion } from "framer-motion";
import { SuspiciousAccount } from "@/lib/types";

interface SuspiciousAccountsTableProps {
  accounts: SuspiciousAccount[];
}

const SuspiciousAccountsTable: React.FC<SuspiciousAccountsTableProps> = ({ accounts }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-card border border-border rounded-lg overflow-hidden"
    >
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Suspicious Accounts</h3>
      </div>
      <div className="overflow-x-auto max-h-72 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Account</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Patterns</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Ring</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.account_id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="p-3 font-mono text-xs text-foreground">{acc.account_id}</td>
                <td className="p-3">
                  <span className={`font-mono text-xs font-bold ${
                    acc.suspicion_score >= 60 ? "text-destructive" : acc.suspicion_score >= 30 ? "text-warning" : "text-primary"
                  }`}>
                    {acc.suspicion_score.toFixed(1)}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {acc.detected_patterns.map((p) => (
                      <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                        {p}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3 font-mono text-xs text-primary">{acc.ring_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default SuspiciousAccountsTable;
