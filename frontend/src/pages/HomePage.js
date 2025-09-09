import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="homepage">
      <h1>Visual Coder</h1>
      <p>Choose an option to get started:</p>
      <div className="homepage-links">
        <Link to="/flowchart-to-code" className="homepage-link">
          <h2>Flowchart to Code</h2>
          <p>Create a flowchart by dragging and dropping nodes, and generate C code from it.</p>
        </Link>
        <Link to="/code-to-flowchart" className="homepage-link">
          <h2>Code to Flowchart</h2>
          <p>Write C code and automatically generate a visual flowchart from it.</p>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;