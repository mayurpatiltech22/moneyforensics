export interface Transaction {
  transaction_id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  timestamp: Date;
}

export interface SuspiciousAccount {
  account_id: string;
  suspicion_score: number;
  detected_patterns: string[];
  ring_id: string;
}

export interface FraudRing {
  ring_id: string;
  member_accounts: string[];
  pattern_type: "cycle" | "smurfing" | "layered_shell";
  risk_score: number;
}

export interface PatternBreakdown {
  name: string;
  label: string;
  count: number;
  color: string;
}

export interface AnalysisSummary {
  total_accounts_analyzed: number;
  suspicious_accounts_flagged: number;
  fraud_rings_detected: number;
  processing_time_seconds: number;
  pattern_breakdown: PatternBreakdown[];
}

export interface AnalysisResult {
  suspicious_accounts: SuspiciousAccount[];
  fraud_rings: FraudRing[];
  summary: AnalysisSummary;
}

export interface GraphNode {
  id: string;
  totalSent: number;
  totalReceived: number;
  transactionCount: number;
  isSuspicious: boolean;
  ringIds: string[];
  patterns: string[];
  suspicionScore: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  amount: number;
  transactionId: string;
  timestamp: Date;
}
