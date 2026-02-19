import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Shield, Zap, FileText, BarChart3, Network, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUpload from "@/components/FileUpload";
import DashboardStats from "@/components/DashboardStats";
import TransactionGraph from "@/components/TransactionGraph";
import FraudRingTable from "@/components/FraudRingTable";
import SuspiciousAccountsTable from "@/components/SuspiciousAccountsTable";
import { parseCSV } from "@/lib/csvParser";
import { analyzeTransactions, buildGraphData } from "@/lib/graphAnalysis";
import { generateSampleCSV } from "@/lib/sampleData";
import { Transaction, AnalysisResult, GraphNode, GraphEdge } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const processTransactions = useCallback((txs: Transaction[]) => {
    const analysisResult = analyzeTransactions(txs);
    const graphData = buildGraphData(txs, analysisResult);
    setTransactions(txs);
    setResult(analysisResult);
    setGraphNodes(graphData.nodes);
    setGraphEdges(graphData.edges);
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      try {
        const txs = await parseCSV(file);
        processTransactions(txs);
        toast({
          title: "Analysis Complete",
          description: `Processed ${txs.length} transactions successfully.`,
        });
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Failed to parse CSV",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [processTransactions, toast]
  );

  const handleLoadSample = useCallback(() => {
    setIsProcessing(true);
    setTimeout(() => {
      const csv = generateSampleCSV();
      const blob = new Blob([csv], { type: "text/csv" });
      const file = new File([blob], "sample.csv");
      parseCSV(file).then((txs) => {
        processTransactions(txs);
        setIsProcessing(false);
        toast({
          title: "Demo Data Loaded",
          description: `Loaded ${txs.length} sample transactions with embedded fraud patterns.`,
        });
      });
    }, 500);
  }, [processTransactions, toast]);

  const handleDownloadJSON = useCallback(() => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forensics_report.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground tracking-tight">ForensicsEngine</h1>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Financial Fraud Detection</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {result && (
              <Button size="sm" variant="outline" onClick={handleDownloadJSON} className="gap-2 text-xs">
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Hero Section */}
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center max-w-2xl mx-auto space-y-4 py-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto glow-primary"
                >
                  <Network className="w-8 h-8 text-primary" />
                </motion.div>
                <h2 className="text-3xl font-bold text-foreground">
                  Financial Forensics Engine
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Detect money muling networks through advanced graph analysis. Upload transaction data
                  to uncover circular fund routing, smurfing patterns, and layered shell networks.
                </p>
              </div>

              <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessing} />

              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadSample}
                  disabled={isProcessing}
                  className="gap-2 text-xs text-muted-foreground hover:text-primary"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Load demo dataset with fraud patterns
                </Button>
              </div>

              {/* Features Grid */}
              <div className="grid md:grid-cols-3 gap-4 pt-4">
                {[
                  {
                    icon: BarChart3,
                    title: "Cycle Detection",
                    desc: "Identifies circular fund routing patterns of length 3-5 hops between accounts.",
                  },
                  {
                    icon: FileText,
                    title: "Smurfing Analysis",
                    desc: "Detects fan-in/fan-out patterns within 72-hour windows for structuring behavior.",
                  },
                  {
                    icon: BookOpen,
                    title: "Shell Networks",
                    desc: "Discovers layered chains with low-activity intermediary accounts.",
                  },
                ].map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors"
                  >
                    <feature.icon className="w-5 h-5 text-primary mb-3" />
                    <h3 className="text-sm font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* CSV Format Reference */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-card border border-border rounded-lg p-5"
              >
                <h3 className="text-sm font-semibold text-foreground mb-3">Expected CSV Format</h3>
                <div className="bg-muted/30 rounded-md p-3 font-mono text-xs text-muted-foreground overflow-x-auto">
                  <div className="text-primary">transaction_id,sender_id,receiver_id,amount,timestamp</div>
                  <div>TXN_00001,ACC_00123,ACC_00456,2500.00,2024-06-01 08:30:00</div>
                  <div>TXN_00002,ACC_00456,ACC_00789,1200.50,2024-06-01 09:15:00</div>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Top bar */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Analysis Results</h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    {transactions.length} transactions • {result.summary.total_accounts_analyzed} accounts
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setResult(null);
                      setTransactions([]);
                      setGraphNodes([]);
                      setGraphEdges([]);
                    }}
                    className="text-xs"
                  >
                    New Analysis
                  </Button>
                  <Button size="sm" onClick={handleDownloadJSON} className="gap-2 text-xs">
                    <Download className="w-3.5 h-3.5" />
                    Export Report
                  </Button>
                </div>
              </div>

              <DashboardStats summary={result.summary} />

              <Tabs defaultValue="graph" className="w-full">
                <TabsList className="bg-card border border-border">
                  <TabsTrigger value="graph" className="text-xs gap-1.5">
                    <Network className="w-3.5 h-3.5" />
                    Network Graph
                  </TabsTrigger>
                  <TabsTrigger value="rings" className="text-xs gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Fraud Rings
                  </TabsTrigger>
                  <TabsTrigger value="accounts" className="text-xs gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Suspicious Accounts
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="graph" className="mt-4">
                  <TransactionGraph nodes={graphNodes} edges={graphEdges} rings={result.fraud_rings} />
                </TabsContent>

                <TabsContent value="rings" className="mt-4">
                  <FraudRingTable rings={result.fraud_rings} />
                </TabsContent>

                <TabsContent value="accounts" className="mt-4">
                  <SuspiciousAccountsTable accounts={result.suspicious_accounts} />
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-6">
        <div className="container mx-auto px-6 text-center text-xs text-muted-foreground">
          <p>ForensicsEngine • Graph-based money muling detection • Built with cycle detection, smurfing analysis & shell network identification</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
