**MoneyForensics Graph-Based Financial Crime & Money Muling Detection Engine

🔗 Live Demo: https://moneyforensics.vercel.app

**Project Overview

MoneyForensics is a graph-based financial crime detection engine designed to identify money muling activities using transaction network analysis.

The system models financial transactions as a directed graph, where:

*Nodes → Bank Accounts

*Edges → Transactions

*Weights → Transaction Amount

*Timestamps → Temporal behavior

Using graph theory + behavioral heuristics, the engine detects:

*Layering chains (A → B → C within minutes)

*Circular transaction rings

*High-velocity burst transfers

*Suspicious central mule accounts

**Tech Stack Frontend

*React (Vite + TypeScript)

*Tailwind CSS

*Chart.js / Recharts (Data Visualization)

*React Flow (Graph Visualization)

Backend / Logic

*Node.js

*Graph-based algorithm engine

*Custom Suspicion Scoring model

Deployment

*Vercel (Frontend Hosting)

Data Processing

*CSV ingestion

*Graph adjacency list representation

*DFS & BFS traversal algorithms

**System Architecture

            ┌───────────────┐
            │   User Upload │
            │  CSV Dataset  │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │ Data Parser   │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │ Graph Builder │
            │ (Adj List)    │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │ Detection     │
            │ Algorithms    │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │ Suspicion     │
            │ Score Engine  │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │ Visualization │
            │ + Risk Output │
            └───────────────┘
**Algorithm Approach 1️⃣ Graph Construction

*Each account → Vertex (V)

*Each transaction → Directed Edge (E)

*Stored using Adjacency List

Time Complexity: O(V + E) Space Complexity: O(V + E)

**Layering Chain Detection

Detects rapid multi-hop transfers.

Algorithm:

*Perform DFS from suspicious nodes

*Track depth and timestamp proximity

Time Complexity: O(V + E) Worst Case: Traverses entire graph

**Circular Ring Detection

Detects money circulation loops.

Algorithm:

*Cycle detection using DFS recursion stack

Time Complexity: O(V + E)

**Burst Activity Detection

Detects abnormal transaction velocity.

Algorithm:

*Sliding time window aggregation

Time Complexity: O(E log E) (if sorted by timestamp)

**Suspicion Score Methodology

Each account gets a Suspicion Score (0–100).

Factors Used: Feature Weight Transaction Frequency 25% Rapid Multi-hop Chains 25% Circular Ring Presence 20% High Incoming/Outgoing Ratio 15% Time-based Burst Activity 15%

Formula: Suspicion Score = (Normalized_Frequency × 0.25) + (Chain_Score × 0.25) + (Cycle_Score × 0.20) + (Flow_Ratio × 0.15) + (Burst_Score × 0.15)

Classification:

*0–40 → Low Risk

*41–70 → Medium Risk

*71–100 → High Risk

**Installation & Setup

Clone the repository:

git clone https://github.com/your-username/moneyforensics.git cd moneyforensics

Install dependencies:

npm install

Run development server:

npm run dev

Build for production:

npm run build

**Usage Instructions

Open the deployed link 👉 https://moneyforensics.vercel.app

Upload transaction CSV file in format:

transaction_id,sender_id,receiver_id,amount,timestamp

Click "Analyze"

View:

*Suspicious Accounts

*Graph Visualization

*Risk Scores

*Detected Fraud Rings

**Known Limitations

Heuristic-based scoring (not ML trained yet)

Large graphs (>100k edges) may cause UI slowdown

No real-time streaming detection (batch only)

False positives possible in high-frequency legitimate accounts

**🔮 Future Enhancements

GNN (Graph Neural Networks)

Real-time transaction monitoring

Blockchain forensic integration

API-based banking integration

AI-based anomaly learning

**👨‍💻 Team Members

Varad Pande

Mayur Patil

Sujal Pawar

Shreyash Rampurkar

**🏆 Hackathon Ready

MoneyForensics demonstrates:

Graph Theory Application

Financial Crime Intelligence

Real-world Fraud Detection Simulation

Scalable Detection Architecture
