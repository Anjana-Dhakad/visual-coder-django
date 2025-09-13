import React, { useState, useMemo, useCallback } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  Background,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Link } from 'react-router-dom';

// Custom Nodes ko waise hi import karein
import StartEndNode from '../customNodes/StartEndNode';
import InputOutputNode from '../customNodes/InputOutputNode';
import DecisionNode from '../customNodes/DecisionNode';

const CodeToFlowchartPage = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Naye state variables - ab 'parser' nahi, 'isLoading' hai
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [code, setCode] = useState(
`#include <stdio.h>

int main() {
    int num;
    printf("Enter a number: ");
    scanf("%d", &num);

    if (num % 2 == 0) {
        printf("The number is even.\\n");
    } else {
        printf("The number is odd.\\n");
    }

    return 0;
}`
  );

  const nodeTypes = useMemo(() => ({
    startEnd: StartEndNode,
    inputOutput: InputOutputNode,
    decision: DecisionNode,
  }), []);

  const defaultEdgeOptions = useMemo(() => ({
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#abb2bf' },
    style: { strokeWidth: 2, stroke: '#abb2bf' },
  }), []);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  // Yahan se saara purana "walkAST" aur "parser" wala logic hata diya gaya hai
  // Ab yeh function backend ko call karega
  const handleGenerateFlowchart = useCallback(async () => {
    setIsLoading(true); // Loading shuru
    setError(null);
    setNodes([]);
    setEdges([]);

    // --- YEH LINE UPDATE KI GAYI HAI ---
    // Apna Render backend URL yahan daalein
    const API_URL = "https://visual-coder-backend.onrender.com/api/generate-flowchart/";

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      } else {
        setError(data.message || "An error occurred.");
      }
    } catch (err) {
      setError("Failed to connect to the server. Is it running?");
      console.error("API call failed:", err);
    } finally {
      setIsLoading(false); // Loading khatm
    }
  }, [code, setNodes, setEdges]);

  return (
    <div className="app-container">
      <Link to="/" className="back-link">← Back to Home</Link>
      <div className="code-editor-panel">
        <h3>C Code Input</h3>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={isLoading}
        />
        {/* Dekhein, yahan button ka text ab 'isLoading' state par depend karta hai */}
        <button className="panel-button" onClick={handleGenerateFlowchart} disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Flowchart'}
        </button>
        {error && <div className="error-message">{error}</div>}
      </div>
      <ReactFlowProvider>
        <div className="reactflow-wrapper">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Controls />
            <Background variant="dots" gap={15} size={1} color="#4b5263" />
          </ReactFlow>
        </div>
      </ReactFlowProvider>
    </div>
  );
};

export default CodeToFlowchartPage;