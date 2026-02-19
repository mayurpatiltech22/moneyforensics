import { Transaction } from "./types";

// Generate sample transactions with embedded fraud patterns for demo
export function generateSampleCSV(): string {
  const rows: string[] = ["transaction_id,sender_id,receiver_id,amount,timestamp"];
  let txId = 1;
  const base = new Date("2024-06-01T08:00:00");

  // Normal transactions
  const normalAccounts = Array.from({ length: 30 }, (_, i) => `ACC_${String(i + 1).padStart(5, "0")}`);
  for (let i = 0; i < 80; i++) {
    const sender = normalAccounts[Math.floor(Math.random() * normalAccounts.length)];
    let receiver = normalAccounts[Math.floor(Math.random() * normalAccounts.length)];
    while (receiver === sender) receiver = normalAccounts[Math.floor(Math.random() * normalAccounts.length)];
    const amount = (Math.random() * 5000 + 100).toFixed(2);
    const ts = new Date(base.getTime() + Math.random() * 7 * 24 * 3600000);
    rows.push(`TXN_${String(txId++).padStart(5, "0")},${sender},${receiver},${amount},${ts.toISOString().replace("T", " ").slice(0, 19)}`);
  }

  // Cycle: ACC_00101 -> ACC_00102 -> ACC_00103 -> ACC_00101
  const cycleAccs = ["ACC_00101", "ACC_00102", "ACC_00103"];
  for (let i = 0; i < 3; i++) {
    const ts = new Date(base.getTime() + i * 3600000);
    rows.push(`TXN_${String(txId++).padStart(5, "0")},${cycleAccs[i]},${cycleAccs[(i + 1) % 3]},${(2000 + Math.random() * 500).toFixed(2)},${ts.toISOString().replace("T", " ").slice(0, 19)}`);
  }

  // Smurfing: fan-in to ACC_00200
  const smurfSources = ["ACC_00201", "ACC_00202", "ACC_00203", "ACC_00204", "ACC_00205"];
  for (const src of smurfSources) {
    const ts = new Date(base.getTime() + Math.random() * 48 * 3600000);
    rows.push(`TXN_${String(txId++).padStart(5, "0")},${src},ACC_00200,${(450 + Math.random() * 50).toFixed(2)},${ts.toISOString().replace("T", " ").slice(0, 19)}`);
  }
  // fan-out from ACC_00200
  const smurfTargets = ["ACC_00210", "ACC_00211", "ACC_00212"];
  for (const tgt of smurfTargets) {
    const ts = new Date(base.getTime() + 50 * 3600000 + Math.random() * 10 * 3600000);
    rows.push(`TXN_${String(txId++).padStart(5, "0")},ACC_00200,${tgt},${(700 + Math.random() * 100).toFixed(2)},${ts.toISOString().replace("T", " ").slice(0, 19)}`);
  }

  // Layered shell: ACC_00301 -> ACC_00302 -> ACC_00303 -> ACC_00304
  const shellAccs = ["ACC_00301", "ACC_00302", "ACC_00303", "ACC_00304"];
  for (let i = 0; i < shellAccs.length - 1; i++) {
    const ts = new Date(base.getTime() + (i + 1) * 7200000);
    rows.push(`TXN_${String(txId++).padStart(5, "0")},${shellAccs[i]},${shellAccs[i + 1]},${(3000 + Math.random() * 1000).toFixed(2)},${ts.toISOString().replace("T", " ").slice(0, 19)}`);
  }

  // NEW: High-velocity burst (ACC_00400 sends 5 txs in 20 minutes)
  for (let i = 0; i < 5; i++) {
    const ts = new Date(base.getTime() + 72 * 3600000 + i * 4 * 60000); // 4 min apart
    const target = `ACC_${String(410 + i).padStart(5, "0")}`;
    rows.push(`TXN_${String(txId++).padStart(5, "0")},ACC_00400,${target},${(800 + Math.random() * 200).toFixed(2)},${ts.toISOString().replace("T", " ").slice(0, 19)}`);
  }

  // NEW: Structuring (ACC_00500 sends amounts just below $10,000 threshold)
  for (let i = 0; i < 4; i++) {
    const ts = new Date(base.getTime() + (i + 1) * 24 * 3600000);
    const amount = (9500 + Math.random() * 400).toFixed(2); // $9,500 - $9,900
    rows.push(`TXN_${String(txId++).padStart(5, "0")},ACC_00500,ACC_00510,${amount},${ts.toISOString().replace("T", " ").slice(0, 19)}`);
  }

  // NEW: Round-trip flow (ACC_00600 <-> ACC_00601, similar amounts back and forth)
  for (let i = 0; i < 3; i++) {
    const amount = 5000 + Math.random() * 200;
    const ts1 = new Date(base.getTime() + i * 48 * 3600000);
    const ts2 = new Date(ts1.getTime() + 12 * 3600000); // 12 hours later
    rows.push(`TXN_${String(txId++).padStart(5, "0")},ACC_00600,ACC_00601,${amount.toFixed(2)},${ts1.toISOString().replace("T", " ").slice(0, 19)}`);
    rows.push(`TXN_${String(txId++).padStart(5, "0")},ACC_00601,ACC_00600,${(amount * (0.92 + Math.random() * 0.06)).toFixed(2)},${ts2.toISOString().replace("T", " ").slice(0, 19)}`);
  }

  return rows.join("\n");
}
