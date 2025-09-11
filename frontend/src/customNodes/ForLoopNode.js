import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
// CSS import yahan se hata diya gaya hai

const ForLoopNode = ({ data }) => {
  return (
    // Class name wahi rahega, style App.css se aayega
    <div className="react-flow__node-for-loop">
      <Handle type="target" position={Position.Top} />
      <div>{data.label}</div>
      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '25%' }} />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '75%'}} />
    </div>
  );
};

export default memo(ForLoopNode);