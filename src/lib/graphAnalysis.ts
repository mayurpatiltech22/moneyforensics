import { Transaction, AnalysisResult, FraudRing, SuspiciousAccount, GraphNode, GraphEdge } from "./types";

// Build adjacency list from transactions
function buildAdjacencyList(transactions: Transaction[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const t of transactions) {
    if (!adj.has(t.sender_id)) adj.set(t.sender_id, []);
    if (!adj.get(t.sender_id)!.includes(t.receiver_id)) {
      adj.get(t.sender_id)!.push(t.receiver_id);
    }
  }
  return adj;
}

// Detect cycles of length 3-5 using DFS with early pruning
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
      const windowStart = txs[i].timestamp.getTime();
      const window = txs.filter(
        (t) => t.timestamp.getTime() >= windowStart &&
               t.timestamp.getTime() <= windowStart + WINDOW_MS
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
      const windowStart = txs[i].timestamp.getTime();
      const window = txs.filter(
        (t) => t.timestamp.getTime() >= windowStart &&
               t.timestamp.getTime() <= windowStart + WINDOW_MS
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

// NEW: Detect high-velocity transactions (rapid-fire sends/receives)
function detectHighVelocity(transactions: Transaction[]): Map<string, string[]> {
  const suspicious = new Map<string, string[]>();
  const RAPID_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
  const MIN_RAPID_TXS = 4;

  const sorted = [...transactions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Group by sender
  const senderTxs = new Map<string, Transaction[]>();
  for (const t of sorted) {
    if (!senderTxs.has(t.sender_id)) senderTxs.set(t.sender_id, []);
    senderTxs.get(t.sender_id)!.push(t);
  }

  for (const [sender, txs] of senderTxs) {
    for (let i = 0; i < txs.length; i++) {
      const windowStart = txs[i].timestamp.getTime();
      const rapid = txs.filter(
        (t) => t.timestamp.getTime() >= windowStart &&
               t.timestamp.getTime() <= windowStart + RAPID_WINDOW_MS
      );
      if (rapid.length >= MIN_RAPID_TXS) {
        const pats = suspicious.get(sender) || [];
        if (!pats.includes("high_velocity")) pats.push("high_velocity");
        suspicious.set(sender, pats);
        break;
      }
    }
  }

  return suspicious;
}

// NEW: Detect round-amount structuring (amounts just below reporting thresholds)
function detectStructuring(transactions: Transaction[]): Map<string, string[]> {
  const suspicious = new Map<string, string[]>();
  const THRESHOLDS = [10000, 5000, 3000]; // Common reporting thresholds
  const MARGIN = 500; // Within $500 below threshold

  const senderTxs = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (!senderTxs.has(t.sender_id)) senderTxs.set(t.sender_id, []);
    senderTxs.get(t.sender_id)!.push(t);
  }

  for (const [sender, txs] of senderTxs) {
    let structuringCount = 0;
    for (const t of txs) {
      for (const threshold of THRESHOLDS) {
        if (t.amount >= threshold - MARGIN && t.amount < threshold) {
          structuringCount++;
        }
      }
    }
    // If 3+ transactions are just below thresholds, flag
    if (structuringCount >= 3) {
      const pats = suspicious.get(sender) || [];
      if (!pats.includes("structuring")) pats.push("structuring");
      suspicious.set(sender, pats);
    }
  }

  return suspicious;
}

// NEW: Detect round-trip flows (A→B→A patterns with similar amounts)
function detectRoundTrips(transactions: Transaction[]): Map<string, string[]> {
  const suspicious = new Map<string, string[]>();
  const TOLERANCE = 0.15; // 15% amount tolerance
  const WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  // Build pair map
  const pairMap = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const key = `${t.sender_id}->${t.receiver_id}`;
    if (!pairMap.has(key)) pairMap.set(key, []);
    pairMap.get(key)!.push(t);
  }

  for (const [key, txs] of pairMap) {
    const [a, b] = key.split("->");
    const reverseKey = `${b}->${a}`;
    const reverseTxs = pairMap.get(reverseKey);
    if (!reverseTxs) continue;

    for (const t1 of txs) {
      for (const t2 of reverseTxs) {
        const timeDiff = Math.abs(t1.timestamp.getTime() - t2.timestamp.getTime());
        const amountRatio = Math.min(t1.amount, t2.amount) / Math.max(t1.amount, t2.amount);
        if (timeDiff <= WINDOW_MS && amountRatio >= 1 - TOLERANCE) {
          for (const acc of [a, b]) {
            const pats = suspicious.get(acc) || [];
            if (!pats.includes("round_trip")) pats.push("round_trip");
            suspicious.set(acc, pats);
          }
        }
      }
    }
  }

  return suspicious;
}

// NEW: Detect dormant account activation (accounts with sudden activity bursts)
function detectDormantActivation(transactions: Transaction[]): Map<string, string[]> {
  const suspicious = new Map<string, string[]>();
  const sorted = [...transactions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  if (sorted.length === 0) return suspicious;

  const totalSpan = sorted[sorted.length - 1].timestamp.getTime() - sorted[0].timestamp.getTime();
  if (totalSpan < 7 * 24 * 60 * 60 * 1000) return suspicious; // Need at least 7 days of data

  const accountTxs = new Map<string, Transaction[]>();
  for (const t of sorted) {
    for (const id of [t.sender_id, t.receiver_id]) {
      if (!accountTxs.has(id)) accountTxs.set(id, []);
      accountTxs.get(id)!.push(t);
    }
  }

  const BURST_WINDOW = 48 * 60 * 60 * 1000; // 48 hours

  for (const [acc, txs] of accountTxs) {
    if (txs.length < 4) continue;
    const accSorted = txs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const accSpan = accSorted[accSorted.length - 1].timestamp.getTime() - accSorted[0].timestamp.getTime();
    
    // Check if most transactions happen in a short burst relative to account's timeline
    for (let i = 0; i < accSorted.length; i++) {
      const burstTxs = accSorted.filter(
        (t) => t.timestamp.getTime() >= accSorted[i].timestamp.getTime() &&
               t.timestamp.getTime() <= accSorted[i].timestamp.getTime() + BURST_WINDOW
      );
      if (burstTxs.length >= Math.ceil(accSorted.length * 0.7) && accSpan > BURST_WINDOW * 3) {
        const pats = suspicious.get(acc) || [];
        if (!pats.includes("dormant_activation")) pats.push("dormant_activation");
        suspicious.set(acc, pats);
        break;
      }
    }
  }

  return suspicious;
}

// Calculate suspicion score for an account - ENHANCED
function calcSuspicionScore(
  accountId: string,
  patterns: string[],
  ringCount: number,
  txCount: number,
  totalSent: number,
  totalReceived: number
): number {
  let score = 0;
  
  // Pattern-based scoring (refined weights)
  if (patterns.includes("cycle_length_3")) score += 30;
  if (patterns.includes("cycle_length_4")) score += 25;
  if (patterns.includes("cycle_length_5")) score += 20;
  if (patterns.includes("fan_in")) score += 20;
  if (patterns.includes("fan_out")) score += 20;
  if (patterns.includes("smurfing_source")) score += 10;
  if (patterns.includes("layered_shell")) score += 25;
  if (patterns.includes("low_activity_intermediary")) score += 15;
  
  // New pattern scores
  if (patterns.includes("high_velocity")) score += 18;
  if (patterns.includes("structuring")) score += 22;
  if (patterns.includes("round_trip")) score += 20;
  if (patterns.includes("dormant_activation")) score += 15;

  // Multi-pattern bonus: accounts with diverse fraud signals are more suspicious
  const patternCount = patterns.length;
  if (patternCount >= 3) score += 10;
  if (patternCount >= 5) score += 10;

  // Multi-ring involvement
  score += Math.min(ringCount * 5, 15);

  // Flow asymmetry bonus (money mules receive and forward, creating imbalance)
  if (totalSent > 0 && totalReceived > 0) {
    const flowRatio = Math.min(totalSent, totalReceived) / Math.max(totalSent, totalReceived);
    // Pass-through accounts (receive and forward similar amounts) are suspicious
    if (flowRatio > 0.6 && flowRatio < 0.95 && txCount >= 3) {
      score += 8;
    }
  }

  // High-volume merchant filter (reduce score if high tx count with balanced flow)
  if (txCount > 20) {
    const ratio = Math.min(totalSent, totalReceived) / Math.max(totalSent, totalReceived, 1);
    if (ratio > 0.3) score = Math.max(score - 15, 0); // Likely merchant
  }

  // Payroll filter: consistent outbound-only with many receivers
  if (totalReceived === 0 && txCount > 10) {
    score = Math.max(score - 20, 0);
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

  // 4. NEW: High-velocity detection
  const velocityResults = detectHighVelocity(transactions);
  for (const [acc, pats] of velocityResults) {
    const existing = accountPatterns.get(acc) || [];
    for (const p of pats) {
      if (!existing.includes(p)) existing.push(p);
    }
    accountPatterns.set(acc, existing);
  }

  // 5. NEW: Structuring detection
  const structuringResults = detectStructuring(transactions);
  for (const [acc, pats] of structuringResults) {
    const existing = accountPatterns.get(acc) || [];
    for (const p of pats) {
      if (!existing.includes(p)) existing.push(p);
    }
    accountPatterns.set(acc, existing);
  }

  // 6. NEW: Round-trip detection
  const roundTripResults = detectRoundTrips(transactions);
  for (const [acc, pats] of roundTripResults) {
    const existing = accountPatterns.get(acc) || [];
    for (const p of pats) {
      if (!existing.includes(p)) existing.push(p);
    }
    accountPatterns.set(acc, existing);
    // Also track in rings
    if (!accountRings.has(acc)) accountRings.set(acc, []);
  }

  // 7. NEW: Dormant activation detection
  const dormantResults = detectDormantActivation(transactions);
  for (const [acc, pats] of dormantResults) {
    const existing = accountPatterns.get(acc) || [];
    for (const p of pats) {
      if (!existing.includes(p)) existing.push(p);
    }
    accountPatterns.set(acc, existing);
    if (!accountRings.has(acc)) accountRings.set(acc, []);
  }

  // Build suspicious accounts list
  const suspiciousAccounts: SuspiciousAccount[] = [];
  
  // Include accounts from rings AND accounts flagged by new detectors
  const allFlaggedAccounts = new Set([
    ...accountRings.keys(),
    ...accountPatterns.keys(),
  ]);

  for (const acc of allFlaggedAccounts) {
    const rings = accountRings.get(acc) || [];
    const patterns = accountPatterns.get(acc) || [];
    if (patterns.length === 0) continue;
    
    const score = calcSuspicionScore(
      acc,
      patterns,
      rings.length,
      txCounts.get(acc) || 0,
      sentAmounts.get(acc) || 0,
      recvAmounts.get(acc) || 0
    );
    if (score >= 15) {
      suspiciousAccounts.push({
        account_id: acc,
        suspicion_score: Math.round(score * 10) / 10,
        detected_patterns: patterns,
        ring_id: rings[0] || "STANDALONE",
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
