import React from "react";
import { motion } from "framer-motion";
import { FraudRing } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface FraudRingTableProps {
  rings: FraudRing[];
  onRingClick?: (ring: FraudRing) => void;
}

const patternLabels: Record<string, string> = {
  cycle: "Circular Routing",
  smurfing: "Smurfing",
  layered_shell: "Layered Shell",
};

const FraudRingTable: React.FC<FraudRingTableProps> = ({ rings, onRingClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-card border border-border rounded-lg overflow-hidden"
    >
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Fraud Ring Summary</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Ring ID</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Pattern</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Members</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Score</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Accounts</th>
            </tr>
          </thead>
          <tbody>
            {rings.map((ring) => (
              <tr
                key={ring.ring_id}
                className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors"
                onClick={() => onRingClick?.(ring)}
              >
                <td className="p-3 font-mono text-primary text-xs">{ring.ring_id}</td>
                <td className="p-3">
                  <Badge
                    variant="outline"
                    className={
                      ring.pattern_type === "cycle"
                        ? "border-destructive/50 text-destructive"
                        : ring.pattern_type === "smurfing"
                        ? "border-warning/50 text-warning"
                        : "border-primary/50 text-primary"
                    }
                  >
                    {patternLabels[ring.pattern_type] || ring.pattern_type}
                  </Badge>
                </td>
                <td className="p-3 font-mono text-foreground">{ring.member_accounts.length}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          ring.risk_score >= 80
                            ? "bg-destructive"
                            : ring.risk_score >= 60
                            ? "bg-warning"
                            : "bg-primary"
                        }`}
                        style={{ width: `${ring.risk_score}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-foreground">{ring.risk_score.toFixed(1)}</span>
                  </div>
                </td>
                <td className="p-3 font-mono text-xs text-muted-foreground max-w-xs truncate">
                  {ring.member_accounts.join(", ")}
                </td>
              </tr>
            ))}
            {rings.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No fraud rings detected
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default FraudRingTable;
