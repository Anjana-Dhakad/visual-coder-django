import React from 'react';

export default () => {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'startEnd')} draggable>
        Start / End Node
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'inputOutput')} draggable>
        Input / Output Node
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'decision')} draggable>
        Decision Node
      </div>
      <button className="panel-button clear-button" onClick={() => window.location.reload()}>Clear Canvas</button>
    </aside>
  );
};