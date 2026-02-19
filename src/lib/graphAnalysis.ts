import { Transaction, AnalysisResult, FraudRing, SuspiciousAccount, GraphNode, GraphEdge } from "./types";

// Build adjacency list from transactions
function buildAdjacencyList(transactions: Transaction[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const t of transactions) {
    if (!adj.has(t.sender_id)) adj.set(t.sender_id, []);
    adj.get(t.sender_id)!.push(t.receiver_id);
  }
  return adj;
}

// Detect cycles of length 3-5 using DFS
function detectCycles(adj: Map<string, string[]>, maxLength: number = 5): string[][] {
  const cycles: string[][] = [];
  const seen = new Set<string>();
  const nodes = Array.from(adj.keys());

  for (const start of nodes) {
    const stack: { node: string; path: string[] }[] = [{ node: start, path: [start] }];
    while (stack.length > 0) {
      const { node, path } = stack.pop()!;
      const neighbors = adj.get(node) || [];
      for (const next of neighbors) {
        if (next === start && path.length >= 3 && path.length <= maxLength) {
          const sorted = [...path].sort().join(",");
          if (!seen.has(sorted)) {
            seen.add(sorted);
            cycles.push([...path]);
          }
        } else if (!path.includes(next) && path.length < maxLength) {
          stack.push({ node: next, path: [...path, next] });
        }
      }
    }
  }
  return cycles;
}

// Detect smurfing: fan-in/fan-out within 72h windows
function detectSmurfing(transactions: Transaction[]): Map<string, string[]> {
  const suspicious = new Map<string, string[]>();
  const WINDOW_MS = 72 * 60 * 60 * 1000;
  const sorted = [...transactions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Fan-in: many senders → one receiver
  const receiverMap = new Map<string, Transaction[]>();
  for (const t of sorted) {
    if (!receiverMap.has(t.receiver_id)) receiverMap.set(t.receiver_id, []);
    receiverMap.get(t.receiver_id)!.push(t);
  }

  for (const [receiver, txs] of receiverMap) {
    for (let i = 0; i < txs.length; i++) {
      const window = txs.filter(
        (t) => t.timestamp.getTime() >= txs[i].timestamp.getTime() &&
               t.timestamp.getTime() <= txs[i].timestamp.getTime() + WINDOW_MS
      );
      const uniqueSenders = new Set(window.map((t) => t.sender_id));
      if (uniqueSenders.size >= 3) {
        const patterns = suspicious.get(receiver) || [];
        if (!patterns.includes("fan_in")) patterns.push("fan_in");
        suspicious.set(receiver, patterns);
        for (const s of uniqueSenders) {
          const sp = suspicious.get(s) || [];
          if (!sp.includes("smurfing_source")) sp.push("smurfing_source");
          suspicious.set(s, sp);
        }
      }
    }
  }

  // Fan-out: one sender → many receivers
  const senderMap = new Map<string, Transaction[]>();
  for (const t of sorted) {
    if (!senderMap.has(t.sender_id)) senderMap.set(t.sender_id, []);
    senderMap.get(t.sender_id)!.push(t);
  }

  for (const [sender, txs] of senderMap) {
    for (let i = 0; i < txs.length; i++) {
      const window = txs.filter(
        (t) => t.timestamp.getTime() >= txs[i].timestamp.getTime() &&
               t.timestamp.getTime() <= txs[i].timestamp.getTime() + WINDOW_MS
      );
      const uniqueReceivers = new Set(window.map((t) => t.receiver_id));
      if (uniqueReceivers.size >= 3) {
        const patterns = suspicious.get(sender) || [];
        if (!patterns.includes("fan_out")) patterns.push("fan_out");
        suspicious.set(sender, patterns);
      }
    }
  }

  return suspicious;
}

// Detect layered shell networks: chains of 3+ hops with low-activity intermediaries
function detectLayeredShells(
  adj: Map<string, string[]>,
  transactionCounts: Map<string, number>
): string[][] {
  const chains: string[][] = [];
  const seen = new Set<string>();
  const nodes = Array.from(adj.keys());

  for (const start of nodes) {
    const stack: { node: string; path: string[] }[] = [{ node: start, path: [start] }];
    while (stack.length > 0) {
      const { node, path } = stack.pop()!;
      if (path.length >= 4) {
        // Check intermediaries (exclude start and end)
        const intermediaries = path.slice(1, -1);
        const allLowActivity = intermediaries.every(
          (n) => (transactionCounts.get(n) || 0) <= 3
        );
        if (allLowActivity) {
          const key = path.join(",");
          if (!seen.has(key)) {
            seen.add(key);
            chains.push([...path]);
          }
        }
      }
      if (path.length < 6) {
        const neighbors = adj.get(node) || [];
        for (const next of neighbors) {
          if (!path.includes(next)) {
            stack.push({ node: next, path: [...path, next] });
          }
        }
      }
    }
  }
  return chains;
}

// Calculate suspicion score for an account
function calcSuspicionScore(
  accountId: string,
  patterns: string[],
  ringCount: number,
  txCount: number,
  totalSent: number,
  totalReceived: number
): number {
  let score = 0;
  
  // Pattern-based scoring
  if (patterns.includes("cycle_length_3")) score += 30;
  if (patterns.includes("cycle_length_4")) score += 25;
  if (patterns.includes("cycle_length_5")) score += 20;
  if (patterns.includes("fan_in")) score += 20;
  if (patterns.includes("fan_out")) score += 20;
  if (patterns.includes("smurfing_source")) score += 10;
  if (patterns.includes("layered_shell")) score += 25;
  if (patterns.includes("low_activity_intermediary")) score += 15;

  // Multi-ring involvement
  score += Math.min(ringCount * 5, 15);

  // High-volume merchant filter (reduce score if high tx count with balanced flow)
  if (txCount > 20) {
    const ratio = Math.min(totalSent, totalReceived) / Math.max(totalSent, totalReceived, 1);
    if (ratio > 0.3) score = Math.max(score - 15, 0); // Likely merchant
  }

  return Math.min(score, 100);
}

// Main analysis function
export function analyzeTransactions(transactions: Transaction[]): AnalysisResult {
  const startTime = performance.now();

  const adj = buildAdjacencyList(transactions);
  const allAccounts = new Set<string>();
  const txCounts = new Map<string, number>();
  const sentAmounts = new Map<string, number>();
  const recvAmounts = new Map<string, number>();

  for (const t of transactions) {
    allAccounts.add(t.sender_id);
    allAccounts.add(t.receiver_id);
    txCounts.set(t.sender_id, (txCounts.get(t.sender_id) || 0) + 1);
    txCounts.set(t.receiver_id, (txCounts.get(t.receiver_id) || 0) + 1);
    sentAmounts.set(t.sender_id, (sentAmounts.get(t.sender_id) || 0) + t.amount);
    recvAmounts.set(t.receiver_id, (recvAmounts.get(t.receiver_id) || 0) + t.amount);
  }

  const fraudRings: FraudRing[] = [];
  const accountRings = new Map<string, string[]>();
  const accountPatterns = new Map<string, string[]>();
  let ringCounter = 0;

  // 1. Cycle detection
  const cycles = detectCycles(adj);
  for (const cycle of cycles) {
    ringCounter++;
    const ringId = `RING_${String(ringCounter).padStart(3, "0")}`;
    const patternName = `cycle_length_${cycle.length}`;
    fraudRings.push({
      ring_id: ringId,
      member_accounts: cycle,
      pattern_type: "cycle",
      risk_score: Math.min(70 + cycle.length * 5, 100),
    });
    for (const acc of cycle) {
      const rings = accountRings.get(acc) || [];
      rings.push(ringId);
      accountRings.set(acc, rings);
      const pats = accountPatterns.get(acc) || [];
      if (!pats.includes(patternName)) pats.push(patternName);
      accountPatterns.set(acc, pats);
    }
  }

  // 2. Smurfing detection
  const smurfingResults = detectSmurfing(transactions);
  const smurfingAccounts = Array.from(smurfingResults.keys());
  if (smurfingAccounts.length >= 2) {
    ringCounter++;
    const ringId = `RING_${String(ringCounter).padStart(3, "0")}`;
    fraudRings.push({
      ring_id: ringId,
      member_accounts: smurfingAccounts,
      pattern_type: "smurfing",
      risk_score: 80,
    });
    for (const [acc, pats] of smurfingResults) {
      const rings = accountRings.get(acc) || [];
      rings.push(ringId);
      accountRings.set(acc, rings);
      const existing = accountPatterns.get(acc) || [];
      for (const p of pats) {
        if (!existing.includes(p)) existing.push(p);
      }
      accountPatterns.set(acc, existing);
    }
  }

  // 3. Layered shell detection
  const shells = detectLayeredShells(adj, txCounts);
  for (const chain of shells) {
    ringCounter++;
    const ringId = `RING_${String(ringCounter).padStart(3, "0")}`;
    fraudRings.push({
      ring_id: ringId,
      member_accounts: chain,
      pattern_type: "layered_shell",
      risk_score: Math.min(75 + chain.length * 3, 100),
    });
    for (const acc of chain) {
      const rings = accountRings.get(acc) || [];
      rings.push(ringId);
      accountRings.set(acc, rings);
      const pats = accountPatterns.get(acc) || [];
      if (!pats.includes("layered_shell")) pats.push("layered_shell");
      const count = txCounts.get(acc) || 0;
      if (count <= 3 && chain.indexOf(acc) > 0 && chain.indexOf(acc) < chain.length - 1) {
        if (!pats.includes("low_activity_intermediary")) pats.push("low_activity_intermediary");
      }
      accountPatterns.set(acc, pats);
    }
  }

  // Build suspicious accounts list
  const suspiciousAccounts: SuspiciousAccount[] = [];
  for (const [acc, rings] of accountRings) {
    const patterns = accountPatterns.get(acc) || [];
    const score = calcSuspicionScore(
      acc,
      patterns,
      rings.length,
      txCounts.get(acc) || 0,
      sentAmounts.get(acc) || 0,
      recvAmounts.get(acc) || 0
    );
    if (score >= 20) {
      suspiciousAccounts.push({
        account_id: acc,
        suspicion_score: Math.round(score * 10) / 10,
        detected_patterns: patterns,
        ring_id: rings[0],
      });
    }
  }

  suspiciousAccounts.sort((a, b) => b.suspicion_score - a.suspicion_score);

  const endTime = performance.now();

  return {
    suspicious_accounts: suspiciousAccounts,
    fraud_rings: fraudRings,
    summary: {
      total_accounts_analyzed: allAccounts.size,
      suspicious_accounts_flagged: suspiciousAccounts.length,
      fraud_rings_detected: fraudRings.length,
      processing_time_seconds: Math.round((endTime - startTime) / 100) / 10,
    },
  };
}

// Build graph data for visualization
export function buildGraphData(
  transactions: Transaction[],
  result: AnalysisResult
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodeMap = new Map<string, GraphNode>();
  const suspiciousMap = new Map<string, SuspiciousAccount>();

  for (const sa of result.suspicious_accounts) {
    suspiciousMap.set(sa.account_id, sa);
  }

  for (const t of transactions) {
    for (const id of [t.sender_id, t.receiver_id]) {
      if (!nodeMap.has(id)) {
        const sa = suspiciousMap.get(id);
        nodeMap.set(id, {
          id,
          totalSent: 0,
          totalReceived: 0,
          transactionCount: 0,
          isSuspicious: !!sa,
          ringIds: sa ? [sa.ring_id] : [],
          patterns: sa?.detected_patterns || [],
          suspicionScore: sa?.suspicion_score || 0,
        });
      }
    }
    const sender = nodeMap.get(t.sender_id)!;
    sender.totalSent += t.amount;
    sender.transactionCount++;
    const receiver = nodeMap.get(t.receiver_id)!;
    receiver.totalReceived += t.amount;
    receiver.transactionCount++;
  }

  const edges: GraphEdge[] = transactions.map((t) => ({
    source: t.sender_id,
    target: t.receiver_id,
    amount: t.amount,
    transactionId: t.transaction_id,
    timestamp: t.timestamp,
  }));

  return { nodes: Array.from(nodeMap.values()), edges };
}
