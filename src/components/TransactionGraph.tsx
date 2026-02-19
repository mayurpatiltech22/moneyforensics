import React, { useMemo, useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GraphNode as GNode, GraphEdge, FraudRing } from "@/lib/types";
import NodeDetailPanel from "./NodeDetailPanel";

interface TransactionGraphProps {
  nodes: GNode[];
  edges: GraphEdge[];
  rings: FraudRing[];
}

// Ring color palette
const RING_COLORS = [
  "hsl(0, 72%, 55%)",    // red
  "hsl(38, 92%, 55%)",   // amber
  "hsl(270, 60%, 55%)",  // purple
  "hsl(185, 80%, 50%)",  // cyan
  "hsl(145, 65%, 45%)",  // green
  "hsl(330, 70%, 55%)",  // pink
];

function CustomNode({ data }: NodeProps) {
  const nodeData = data as any;
  const isSuspicious = nodeData.isSuspicious;
  const score = nodeData.suspicionScore || 0;

  const borderColor = isSuspicious
    ? score >= 60 ? "hsl(0, 72%, 55%)" : "hsl(38, 92%, 55%)"
    : "hsl(220, 15%, 25%)";

  const bgColor = isSuspicious
    ? score >= 60 ? "hsl(0, 72%, 55%, 0.15)" : "hsl(38, 92%, 55%, 0.1)"
    : "hsl(220, 18%, 12%)";

  const size = isSuspicious ? 48 : 36;

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-primary !border-0 !w-1.5 !h-1.5" />
      <div
        className="rounded-full flex items-center justify-center transition-all cursor-pointer"
        style={{
          width: size,
          height: size,
          border: `2px solid ${borderColor}`,
          backgroundColor: bgColor,
          boxShadow: isSuspicious ? `0 0 12px ${borderColor}40` : "none",
        }}
      >
        <span className="text-[8px] font-mono text-foreground leading-none select-none">
          {String(nodeData.label).replace("ACC_", "").slice(-4)}
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-primary !border-0 !w-1.5 !h-1.5" />
    </>
  );
}

const nodeTypes = { custom: CustomNode };

const TransactionGraph: React.FC<TransactionGraphProps> = ({ nodes, edges, rings }) => {
  const [selectedNode, setSelectedNode] = useState<GNode | null>(null);

  // Position nodes using force-directed-like layout
  const { flowNodes, flowEdges } = useMemo(() => {
    const ringMembership = new Map<string, number>();
    rings.forEach((ring, i) => {
      ring.member_accounts.forEach((acc) => {
        if (!ringMembership.has(acc)) ringMembership.set(acc, i);
      });
    });

    // Simple circular layout with ring clustering
    const suspicious = nodes.filter((n) => n.isSuspicious);
    const normal = nodes.filter((n) => !n.isSuspicious);

    const flowNodes: Node[] = [];
    const centerX = 400;
    const centerY = 300;

    // Place suspicious nodes in inner ring
    suspicious.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / Math.max(suspicious.length, 1);
      const radius = 150 + (ringMembership.get(n.id) || 0) * 30;
      flowNodes.push({
        id: n.id,
        type: "custom",
        position: {
          x: centerX + radius * Math.cos(angle) + (Math.random() - 0.5) * 40,
          y: centerY + radius * Math.sin(angle) + (Math.random() - 0.5) * 40,
        },
        data: { label: n.id, ...n },
      });
    });

    // Place normal nodes in outer ring
    normal.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / Math.max(normal.length, 1);
      const radius = 350 + (Math.random() - 0.5) * 60;
      flowNodes.push({
        id: n.id,
        type: "custom",
        position: {
          x: centerX + radius * Math.cos(angle) + (Math.random() - 0.5) * 30,
          y: centerY + radius * Math.sin(angle) + (Math.random() - 0.5) * 30,
        },
        data: { label: n.id, ...n },
      });
    });

    // Deduplicate edges (aggregate multiple transactions between same pair)
    const edgeMap = new Map<string, { amount: number; count: number }>();
    edges.forEach((e) => {
      const key = `${e.source}->${e.target}`;
      const existing = edgeMap.get(key);
      if (existing) {
        existing.amount += e.amount;
        existing.count++;
      } else {
        edgeMap.set(key, { amount: e.amount, count: 1 });
      }
    });

    const flowEdges: Edge[] = Array.from(edgeMap.entries()).map(([key, data]) => {
      const [source, target] = key.split("->");
      const isSuspiciousEdge =
        ringMembership.has(source) && ringMembership.has(target) &&
        ringMembership.get(source) === ringMembership.get(target);

      return {
        id: key,
        source,
        target,
        animated: isSuspiciousEdge,
        style: {
          stroke: isSuspiciousEdge
            ? RING_COLORS[ringMembership.get(source)! % RING_COLORS.length]
            : "hsl(220, 15%, 25%)",
          strokeWidth: isSuspiciousEdge ? 2 : 1,
          opacity: isSuspiciousEdge ? 0.8 : 0.3,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 12,
          height: 12,
          color: isSuspiciousEdge
            ? RING_COLORS[ringMembership.get(source)! % RING_COLORS.length]
            : "hsl(220, 15%, 25%)",
        },
        label: isSuspiciousEdge ? `$${data.amount.toFixed(0)}` : undefined,
        labelStyle: { fill: "hsl(200, 20%, 85%)", fontSize: 9, fontFamily: "JetBrains Mono" },
        labelBgStyle: { fill: "hsl(220, 18%, 10%)", fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
      };
    });

    return { flowNodes, flowEdges };
  }, [nodes, edges, rings]);

  const [rfNodes, , onNodesChange] = useNodesState(flowNodes);
  const [rfEdges, , onEdgesChange] = useEdgesState(flowEdges);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const graphNode = nodes.find((n) => n.id === node.id) || null;
      setSelectedNode(graphNode);
    },
    [nodes]
  );

  return (
    <div className="relative w-full h-[550px] bg-card border border-border rounded-lg overflow-hidden">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={() => setSelectedNode(null)}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.3}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(220, 15%, 15%)" gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(n: Node) => {
            const d = n.data as any;
            return d?.isSuspicious ? "hsl(0, 72%, 55%)" : "hsl(185, 80%, 50%)";
          }}
          maskColor="hsl(220, 20%, 7%, 0.7)"
        />
      </ReactFlow>
      <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/90 border border-border rounded-lg p-3 flex flex-col gap-1.5 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: "hsl(0, 72%, 55%)", backgroundColor: "hsl(0, 72%, 55%, 0.15)" }} />
          <span className="text-muted-foreground">High Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: "hsl(38, 92%, 55%)", backgroundColor: "hsl(38, 92%, 55%, 0.1)" }} />
          <span className="text-muted-foreground">Medium Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: "hsl(220, 15%, 25%)", backgroundColor: "hsl(220, 18%, 12%)" }} />
          <span className="text-muted-foreground">Normal</span>
        </div>
      </div>
    </div>
  );
};

export default TransactionGraph;
