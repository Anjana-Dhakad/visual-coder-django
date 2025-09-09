import React from 'react';

const CodePanel = ({ code, onGenerate }) => {
  return (
    <div className="code-output-panel">
      <h3>Generated Code</h3>
      <div className="code-display">
        {code}
      </div>
      {/* THIS IS THE FIX: Added correct classNames to the button */}
      <button className="panel-button generate-button-bottom" onClick={onGenerate}>
        Generate Code
      </button>
    </div>
  );
};

export default CodePanel;