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
import {
    isNode,
    isEdge,
} from 'reactflow';

import Sidebar from '../Sidebar';
import CodePanel from '../CodePanel';
import StartEndNode from '../customNodes/StartEndNode';
import InputOutputNode from '../customNodes/InputOutputNode';
import DecisionNode from '../customNodes/DecisionNode';
// We will create this new node in the next step
// import LoopNode from '../customNodes/LoopNode';

const nodeTypes = {
  startEnd: StartEndNode,
  inputOutput: InputOutputNode,
  decision: DecisionNode,
  // loop: LoopNode, // We will enable this in the next step
};

let id = 0;
const getId = () => `dndnode_${id++}`;

const formatStatement = (label) => {
  const trimmedLabel = label.trim();
  if (!trimmedLabel) return '';
  if (trimmedLabel.endsWith(';') || trimmedLabel.endsWith('{') || trimmedLabel.endsWith('}')) {
    return `  ${trimmedLabel}\n`;
  }
  return `  ${trimmedLabel};\n`;
};


const FlowchartToCodePageContent = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [generatedCode, setGeneratedCode] = useState('// Create a flowchart and click "Generate Code"');

  const onConnect = useCallback(
    (params) => {
      const sourceNode = nodes.find(node => node.id === params.source);
      let edgeLabel = '';
      if (sourceNode && sourceNode.type === 'decision') {
        edgeLabel = window.prompt("Enter 'true' or 'false' for this path:");
      }
      const newEdge = { 
        ...params, 
        label: edgeLabel, 
        type: 'smoothstep', 
        markerEnd: { type: MarkerType.ArrowClosed } 
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, nodes]
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
        // Add case for loop when we create it
        // case 'loop':
        //   label = 'i=0; i<5; i++';
        //   break;
        default:
          label = 'Node';
      }
      const newNode = { id: getId(), type, position, data: { label } };
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, nodes]
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

  // --- NEW: Advanced Code Generation Logic ---
  const handleGenerateCode = () => {
    const startNode = nodes.find(n => n.data.label.toLowerCase() === 'start');
    if (!startNode) {
      setGeneratedCode('// Error: "Start" node not found!');
      return;
    }

    const elements = [...nodes, ...edges];
    const adjacencyList = new Map();
    
    elements.forEach(el => {
        if (isNode(el)) {
            adjacencyList.set(el.id, []);
        } else if (isEdge(el)) {
            if (!adjacencyList.has(el.source)) {
                adjacencyList.set(el.source, []);
            }
            adjacencyList.get(el.source).push({ target: el.target, label: el.label });
        }
    });

    const getNode = (id) => nodes.find(n => n.id === id);

    let code = '#include <stdio.h>\n\nint main() {\n';
    const visited = new Set();

    const traverse = (nodeId) => {
        if (!nodeId || visited.has(nodeId)) return;
        visited.add(nodeId);

        const node = getNode(nodeId);
        if (!node || node.data.label.toLowerCase() === 'end') return;

        const neighbors = adjacencyList.get(nodeId) || [];

        if (node.type === 'inputOutput') {
            code += formatStatement(node.data.label);
            const nextNode = neighbors[0];
            if (nextNode) traverse(nextNode.target);
        } 
        else if (node.type === 'decision') {
            code += `  if (${node.data.label}) {\n`;
            const trueEdge = neighbors.find(e => e.label === 'true');
            if (trueEdge) {
                // Find all nodes in the true branch until they merge
                // This is a simplified version. A full solution needs to find the merge point.
                traverse(trueEdge.target);
            }
            code += '  }\n';

            const falseEdge = neighbors.find(e => e.label === 'false');
            if (falseEdge) {
                code += '  else {\n';
                traverse(falseEdge.target);
                code += '  }\n';
            }
            
            // This is tricky: we need to find where the if/else branches merge.
            // For now, we assume the false branch continues the main flow.
            if (falseEdge) {
                // A proper implementation would find the merge node and traverse from there.
            } else {
                const nextNode = neighbors.find(e => !e.label);
                if (nextNode) traverse(nextNode.target);
            }
        }
        else { // For 'startEnd'
             const nextNode = neighbors[0];
             if (nextNode) traverse(nextNode.target);
        }
    };

    traverse(startNode.id);

    code += '}';
    setGeneratedCode(code);
  };

  return (
    <div className="app-container">
      <Link to="/" className="back-link">← Back to Home</Link>
      <Sidebar />
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