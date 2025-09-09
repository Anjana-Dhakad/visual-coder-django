import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { Parser, Language } from 'web-tree-sitter';

// Custom Nodes
import StartEndNode from '../customNodes/StartEndNode';
import InputOutputNode from '../customNodes/InputOutputNode';
import DecisionNode from '../customNodes/DecisionNode';

let nodeIdCounter = 1;
const getUniqueNodeId = () => `node-${nodeIdCounter++}`;

const CodeToFlowchartPage = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [parser, setParser] = useState(null);
  const [code, setCode] = useState(
`#include <stdio.h>

int main() {
    int i;
    for (i = 0; i < 5; i++) {
        printf("Hello World!\\n");
        if (i == 2) {
            printf("i is two\\n");
        }
    }
    printf("Loop finished.\\n");
    return 0;
}`
  );

  useEffect(() => {
  const initParser = async () => {
    try {
      const parserInstance = new Parser();
      const lang = await Language.load('/tree-sitter-c.wasm');
      parserInstance.setLanguage(lang);
      setParser(parserInstance);
      console.log("Parser initialized successfully!");
    } catch (error) {
      console.error("Failed to initialize parser:", error);
    }
  };
  initParser();
}, []);

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

  // --- AST to Flowchart Logic ---
  const handleGenerateFlowchart = useCallback(() => {
    if (!parser) {
      alert("Parser is not initialized yet. Please wait a moment.");
      return;
    }

    const tree = parser.parse(code);
    const newNodes = [];
    const newEdges = [];
    nodeIdCounter = 1;
    let yPos = 50;

    const createNode = (type, label, x = 250, y = yPos, extraData = {}) => {
      const id = getUniqueNodeId();
      const node = { id, type, position: { x, y }, data: { label, ...extraData } };
      yPos += 120;
      return node;
    };

    const createEdge = (source, target, label = '') => {
      const id = `e-${source}-${target}-${label}-${Math.random()}`;
      return { id, source, target, label };
    };

    // Recursively walk the AST and build nodes/edges
    function walkAST(node, parentId, parentX = 250) {
      let currentParentId = parentId;

      for (const child of node.namedChildren) {
        let createdNode = null;
        let branchEndId = null;

        switch (child.type) {
          case 'declaration':
          case 'expression_statement':
            createdNode = createNode('inputOutput', child.text, parentX, yPos);
            break;

          case 'if_statement': {
            const condition = child.childForFieldName('condition')?.text || 'if';
            createdNode = createNode('decision', `if (${condition})`, parentX, yPos);
            newNodes.push(createdNode);
            newEdges.push(createEdge(currentParentId, createdNode.id, 'if'));

            // Consequence (if-true)
            const consequence = child.childForFieldName('consequence');
            let trueEndId = createdNode.id;
            if (consequence) {
              trueEndId = walkAST(consequence, createdNode.id, parentX - 100);
            }

            // Alternative (else)
            const alternative = child.childForFieldName('alternative');
            let falseEndId = createdNode.id;
            if (alternative) {
              falseEndId = walkAST(alternative, createdNode.id, parentX + 100);
            }

            // Merge point after if-else
            branchEndId = getUniqueNodeId();
            const mergeNode = createNode('inputOutput', 'Merge', parentX, yPos);
            newNodes.push(mergeNode);
            newEdges.push(createEdge(trueEndId, mergeNode.id, 'true'));
            if (falseEndId !== createdNode.id) {
              newEdges.push(createEdge(falseEndId, mergeNode.id, 'false'));
            }
            currentParentId = mergeNode.id;
            continue;
          }

          case 'for_statement':
          case 'while_statement':
          case 'do_statement': {
            let loopLabel = '';
            if (child.type === 'for_statement') {
              const init = child.childForFieldName('initializer')?.text || '';
              const cond = child.childForFieldName('condition')?.text || '';
              const update = child.childForFieldName('update')?.text || '';
              loopLabel = `for (${init}; ${cond}; ${update})`;
            } else if (child.type === 'while_statement') {
              const cond = child.childForFieldName('condition')?.text || '';
              loopLabel = `while (${cond})`;
            } else if (child.type === 'do_statement') {
              const cond = child.childForFieldName('condition')?.text || '';
              loopLabel = `do {...} while (${cond})`;
            }
            createdNode = createNode('inputOutput', loopLabel, parentX, yPos);
            newNodes.push(createdNode);
            newEdges.push(createEdge(currentParentId, createdNode.id, 'loop'));

            // Loop body
            const body = child.childForFieldName('body');
            let loopEndId = createdNode.id;
            if (body) {
              loopEndId = walkAST(body, createdNode.id, parentX - 100);
            }
            // Edge from loop body back to loop node (for next iteration)
            newEdges.push(createEdge(loopEndId, createdNode.id, 'repeat'));
            // Edge for loop exit
            branchEndId = getUniqueNodeId();
            const afterLoopNode = createNode('inputOutput', 'After Loop', parentX, yPos);
            newNodes.push(afterLoopNode);
            newEdges.push(createEdge(createdNode.id, afterLoopNode.id, 'exit'));
            currentParentId = afterLoopNode.id;
            continue;
          }

          case 'switch_statement': {
            const cond = child.childForFieldName('condition')?.text || '';
            createdNode = createNode('decision', `switch (${cond})`, parentX, yPos);
            newNodes.push(createdNode);
            newEdges.push(createEdge(currentParentId, createdNode.id, 'switch'));
            // Each case
            const body = child.childForFieldName('body');
            if (body) {
              for (const caseNode of body.namedChildren) {
                if (caseNode.type === 'case_statement' || caseNode.type === 'default_statement') {
                  let caseLabel = caseNode.type === 'case_statement'
                    ? `case ${caseNode.childForFieldName('value')?.text || ''}`
                    : 'default';
                  const caseBody = caseNode.childForFieldName('body') || caseNode;
                  const caseEndId = walkAST(caseBody, createdNode.id, parentX + 100);
                  // Edge from case to merge
                  branchEndId = getUniqueNodeId();
                  const mergeNode = createNode('inputOutput', 'Merge', parentX, yPos);
                  newNodes.push(mergeNode);
                  newEdges.push(createEdge(caseEndId, mergeNode.id, caseLabel));
                  currentParentId = mergeNode.id;
                }
              }
            }
            continue;
          }

          case 'return_statement':
            createdNode = createNode('inputOutput', `return ${child.text.replace('return', '').trim()}`, parentX, yPos);
            break;

          case 'call_expression':
            createdNode = createNode('inputOutput', `call ${child.text}`, parentX, yPos);
            break;

          case 'compound_statement':
            // Block: walk children
            currentParentId = walkAST(child, currentParentId, parentX);
            continue;

          case 'function_definition': {
            const funcName = child.childForFieldName('declarator')?.text || 'function';
            createdNode = createNode('inputOutput', `Function: ${funcName}`, parentX, yPos);
            newNodes.push(createdNode);
            newEdges.push(createEdge(currentParentId, createdNode.id, 'function'));
            // Walk function body
            const funcBody = child.childForFieldName('body');
            if (funcBody) {
              currentParentId = walkAST(funcBody, createdNode.id, parentX);
            }
            continue;
          }

          default:
            // For any other node, walk its children
            if (child.namedChildren && child.namedChildren.length > 0) {
              currentParentId = walkAST(child, currentParentId, parentX);
            }
            continue;
        }

        if (createdNode) {
          newNodes.push(createdNode);
          newEdges.push(createEdge(currentParentId, createdNode.id));
          currentParentId = createdNode.id;
        }
      }
      return currentParentId;
    }

    // Start node
    const startNode = createNode('startEnd', 'Start', 250, yPos);
    newNodes.push(startNode);
    let lastNodeId = startNode.id;

    // Find main function or global statements
    const mainFunction = tree.rootNode.descendantsOfType('function_definition').find(
      (fn) => fn.childForFieldName('declarator')?.text.includes('main')
    );
    if (mainFunction) {
      const mainBody = mainFunction.childForFieldName('body');
      if (mainBody) {
        lastNodeId = walkAST(mainBody, startNode.id);
      }
    } else {
      // No main, walk global
      lastNodeId = walkAST(tree.rootNode, startNode.id);
    }

    // End node
    const endNode = createNode('startEnd', 'End', 250, yPos);
    newNodes.push(endNode);
    newEdges.push(createEdge(lastNodeId, endNode.id));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [parser, code, setNodes, setEdges]);

  return (
    <div className="app-container">
      <Link to="/" className="back-link">← Back to Home</Link>
      <div className="code-editor-panel">
        <h3>C Code Input</h3>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button className="panel-button" onClick={handleGenerateFlowchart} disabled={!parser}>
          {parser ? 'Generate Flowchart' : 'Parser Loading...'}
        </button>
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