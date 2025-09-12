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

const formatStatement = (label, indentation) => {
  const indent = '  '.repeat(indentation);
  const trimmedLabel = label.trim();
  if (!trimmedLabel) return '';
  if (trimmedLabel.endsWith(';') || trimmedLabel.endsWith('{') || trimmedLabel.endsWith('}')) {
    return `${indent}${trimmedLabel}\n`;
  }
  return `${indent}${trimmedLabel};\n`;
};

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

  const handleGenerateCode = () => {
    const startNode = nodes.find(n => n.data.label.toLowerCase() === 'start');
    if (!startNode) {
      setGeneratedCode('// Error: "Start" node not found!');
      return;
    }
    const adj = new Map();
    nodes.forEach(n => adj.set(n.id, []));
    edges.forEach(e => {
        if (adj.has(e.source)) {
            adj.get(e.source).push({ target: e.target, label: e.label });
        }
    });
    const getNode = (id) => nodes.find(n => n.id === id);

    // FIX 2 & 3: Lines 160 & 168 errors fixed by moving findMergeNode outside
    const findMergeNode = (decisionNodeId, localAdj, localEdges) => {
        const trueEdge = localAdj.get(decisionNodeId)?.find(e => e.label === 'true');
        const falseEdge = localAdj.get(decisionNodeId)?.find(e => e.label === 'false');
        if (!trueEdge) return falseEdge ? falseEdge.target : null;
        const truePath = new Set();
        let curr = trueEdge.target;
        while(curr) {
            truePath.add(curr);
            const nextEdges = localAdj.get(curr) || [];
            const incomingEdges = localEdges.filter(e => e.target === curr).length;
            if(nextEdges.length === 0 || incomingEdges > 1) break;
            curr = nextEdges[0].target;
        }
        curr = falseEdge ? falseEdge.target : null;
        while(curr) {
            if(truePath.has(curr)) return curr;
            const nextEdges = localAdj.get(curr) || [];
            const incomingEdges = localEdges.filter(e => e.target === curr).length;
            if(nextEdges.length === 0 || incomingEdges > 1) break;
            curr = nextEdges[0].target;
        }
        return null; 
    };

    const isWhileLoop = (decisionNodeId) => {
        const trueEdge = adj.get(decisionNodeId)?.find(e => e.label === 'true');
        if (!trueEdge) return false;
        let currentNodeId = trueEdge.target;
        const path = new Set(); 
        while (currentNodeId && !path.has(currentNodeId)) {
            path.add(currentNodeId);
            if (currentNodeId === decisionNodeId) return true;
            const neighbors = adj.get(currentNodeId) || [];
            if (neighbors.length !== 1) return false;
            currentNodeId = neighbors[0].target;
        }
        return false;
    };
    let code = '#include <stdio.h>\n\nint main() {\n';
    let currentNodeId = startNode.id;
    const visited = new Set(); 
    while(currentNodeId && !visited.has(currentNodeId)) {
        visited.add(currentNodeId);
        const node = getNode(currentNodeId);
        if(!node || node.data.label.toLowerCase() === 'end') {
            break;
        }
        const neighbors = adj.get(node.id) || [];
        if (node.type === 'startEnd' && node.data.label.toLowerCase() === 'start') {
            currentNodeId = neighbors[0]?.target;
        }
        else if (node.type === 'inputOutput') {
            code += formatStatement(node.data.label, 1);
            currentNodeId = neighbors[0]?.target;
        }
        else if (node.type === 'forLoop') {
            const indent = '  '.repeat(1);
            code += `${indent}for (${node.data.label}) {\n`;
            const trueEdge = neighbors.find(e => e.label === 'true');
            let bodyNodeId = trueEdge?.target;
            const falseEdge = neighbors.find(e => e.label === 'false');
            const loopExitId = falseEdge?.target;
            const loopBodyPath = new Set();
            while(bodyNodeId && bodyNodeId !== node.id && bodyNodeId !== loopExitId && !loopBodyPath.has(bodyNodeId)) {
                loopBodyPath.add(bodyNodeId);
                const bodyNode = getNode(bodyNodeId);
                if(bodyNode) {
                    code += formatStatement(bodyNode.data.label, 2);
                }
                const bodyNeighbors = adj.get(bodyNodeId) || [];
                bodyNodeId = bodyNeighbors[0]?.target;
            }
            code += `${indent}}\n`;
            currentNodeId = loopExitId;
        }
        else if (node.type === 'decision') {
            if (isWhileLoop(node.id)) {
                const indent = '  '.repeat(1);
                code += `${indent}while (${node.data.label}) {\n`;
                const trueEdge = neighbors.find(e => e.label === 'true');
                let bodyNodeId = trueEdge.target;
                while (bodyNodeId && bodyNodeId !== node.id) {
                    const bodyNode = getNode(bodyNodeId);
                    if (bodyNode) {
                        code += formatStatement(bodyNode.data.label, 2);
                    }
                    const bodyNeighbors = adj.get(bodyNodeId) || [];
                    bodyNodeId = bodyNeighbors[0]?.target;
                }
                code += `${indent}}\n`;
                const falseEdge = neighbors.find(e => e.label === 'false');
                currentNodeId = falseEdge?.target;
            } else { 
                const mergeNodeId = findMergeNode(node.id, adj, edges);
                const indent = '  '.repeat(1);
                code += `${indent}if (${node.data.label}) {\n`;
                const trueEdge = neighbors.find(e => e.label === 'true');
                if (trueEdge) {
                    let currentInTrueBranch = trueEdge.target;
                    while(currentInTrueBranch && currentInTrueBranch !== mergeNodeId) {
                        const branchNode = getNode(currentInTrueBranch);
                        if(branchNode) { code += formatStatement(branchNode.data.label, 2); }
                        const branchNeighbors = adj.get(currentInTrueBranch) || [];
                        currentInTrueBranch = branchNeighbors[0]?.target;
                    }
                }
                code += `${indent}}\n`;
                const falseEdge = neighbors.find(e => e.label === 'false');
                if (falseEdge) {
                    code += `${indent}else {\n`;
                    let currentInFalseBranch = falseEdge.target;
                     while(currentInFalseBranch && currentInFalseBranch !== mergeNodeId) {
                        const branchNode = getNode(currentInFalseBranch);
                        if(branchNode) { code += formatStatement(branchNode.data.label, 2); }
                        const branchNeighbors = adj.get(currentInFalseBranch) || [];
                        currentInFalseBranch = branchNeighbors[0]?.target;
                    }
                    code += `${indent}}\n`;
                }
                currentNodeId = mergeNodeId;
            }
        } else {
            break;
        }
    }
    code += '\n  return 0;\n}';
    setGeneratedCode(code);
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