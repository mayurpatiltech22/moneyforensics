import Papa from "papaparse";
import { Transaction } from "./types";

export function parseCSV(file: File): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const transactions: Transaction[] = results.data.map((row: any) => ({
            transaction_id: String(row.transaction_id || "").trim(),
            sender_id: String(row.sender_id || "").trim(),
            receiver_id: String(row.receiver_id || "").trim(),
            amount: parseFloat(row.amount) || 0,
            timestamp: new Date(row.timestamp),
          }));
          const valid = transactions.filter(
            (t) => t.transaction_id && t.sender_id && t.receiver_id && t.amount > 0 && !isNaN(t.timestamp.getTime())
          );
          if (valid.length === 0) {
            reject(new Error("No valid transactions found. Check CSV format."));
            return;
          }
          resolve(valid);
        } catch (e) {
          reject(e);
        }
      },
      error: (err) => reject(err),
    });
  });
}
