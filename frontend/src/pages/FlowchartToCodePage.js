import React, { useState, useRef, useCallback } from 'react';
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

import Sidebar from '../Sidebar';
import CodePanel from '../CodePanel';
import StartEndNode from '../customNodes/StartEndNode';
import InputOutputNode from '../customNodes/InputOutputNode';
import DecisionNode from '../customNodes/DecisionNode';
import ForLoopNode from '../customNodes/ForLoopNode';

const nodeTypes = {
  startEnd: StartEndNode,
  inputOutput: InputOutputNode,
  decision: DecisionNode,
  forLoop: ForLoopNode,
};

let id = 0;
const getId = () => `dndnode_${id++}`;

const initialCode = '// Create a flowchart and click "Generate Code"';

const FlowchartToCodePageContent = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [generatedCode, setGeneratedCode] = useState(initialCode);

  const handleClearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setGeneratedCode(initialCode);
  };

  const onConnect = useCallback(
    (params) => {
      const sourceNode = nodes.find(node => node.id === params.source);
      let edgeLabel = '';
      if (sourceNode && (sourceNode.type === 'decision' || sourceNode.type === 'forLoop')) {
        const existingEdges = edges.filter(e => e.source === params.source);
        if (existingEdges.some(e => e.label === 'true')) {
            edgeLabel = 'false';
        } else if (existingEdges.some(e => e.label === 'false')) {
            edgeLabel = 'true';
        } else {
            edgeLabel = window.prompt("Is this the 'true' (loop body) or 'false' (exit loop) path?");
        }
      }
      const newEdge = { 
        ...params, 
        label: edgeLabel, 
        type: 'smoothstep', 
        markerEnd: { type: MarkerType.ArrowClosed } 
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, nodes, edges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      let label;
      switch (type) {
        case 'startEnd':
          label = nodes.some(n => n.data.label.toLowerCase() === 'start') ? 'End' : 'Start';
          break;
        case 'inputOutput':
          label = 'variable = value';
          break;
        case 'decision':
          label = 'condition';
          break;
        case 'forLoop':
          label = 'i = 0; i < 5; i++';
          break;
        default:
          label = 'Node';
      }
      const newNode = { id: getId(), type, position, data: { label } };
      setNodes((nds) => nds.concat(newNode));
    },
    // FIX 1: Line 119 error fixed by adding 'setNodes'
    [reactFlowInstance, nodes, setNodes]
  );
  
  const onNodeDoubleClick = useCallback((event, node) => {
    const newLabel = window.prompt("Enter new label for the node:", node.data.label);
    if (newLabel !== null && newLabel.trim() !== '') {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === node.id) {
            n.data = { ...n.data, label: newLabel };
          }
          return n;
        })
      );
    }
  }, [setNodes]);

  const handleGenerateCode = async () => {
    const startNode = nodes.find(n => n.data.label.toLowerCase() === 'start');
    if (!startNode) {
      setGeneratedCode('// Error: "Start" node not found!');
      return;
    }

    try {
      // Send flowchart data to backend API
      const response = await fetch('/api/generate-code-from-flowchart/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodes: nodes,
          edges: edges
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setGeneratedCode(data.code || '// Error: No code generated');
      } else {
        setGeneratedCode(`// Error: ${data.message || 'Failed to generate code'}`);
      }
    } catch (error) {
      console.error('Error calling API:', error);
      setGeneratedCode('// Error: Failed to connect to server');
    }
  };

  return (
    <div className="app-container">
      <Link to="/" className="back-link">← Back to Home</Link>
      
      <Sidebar onClear={handleClearCanvas} />

      <div className="reactflow-wrapper" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Controls />
          <Background variant="dots" gap={15} size={1} color="#4b5263" />
        </ReactFlow>
      </div>
      <CodePanel code={generatedCode} onGenerate={handleGenerateCode} />
    </div>
  );
};

const FlowchartToCodePage = () => (
  <ReactFlowProvider>
    <FlowchartToCodePageContent />
  </ReactFlowProvider>
);

export default FlowchartToCodePage;