import React from 'react';

// Sidebar ko ab 'onClear' function prop ke roop mein milega
const Sidebar = ({ onClear }) => {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">Nodes</div>
      <div className="nodes-container">
        
        <div className="dnd-node" onDragStart={(event) => onDragStart(event, 'startEnd')} draggable>
          <div className="node-shape shape-start-end">Start</div>
          <div className="node-label">Start / End</div>
        </div>

        <div className="dnd-node" onDragStart={(event) => onDragStart(event, 'inputOutput')} draggable>
          <div className="node-shape shape-input-output">I/O</div>
          <div className="node-label">Input / Output</div>
        </div>

        <div className="dnd-node" onDragStart={(event) => onDragStart(event, 'decision')} draggable>
          <div className="node-shape shape-decision"><span>If</span></div>
          <div className="node-label">Decision</div>
        </div>

        <div className="dnd-node" onDragStart={(event) => onDragStart(event, 'forLoop')} draggable>
          <div className="node-shape shape-for-loop">For</div>
          <div className="node-label">For Loop</div>
        </div>

      </div>
      
      {/* Clear Canvas Button */}
      <div className="clear-btn-wrapper">
        <button onClick={onClear} className="clear-btn">
          Clear Canvas
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;