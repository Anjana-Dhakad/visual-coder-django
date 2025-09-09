import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import FlowchartToCodePage from './pages/FlowchartToCodePage';
import CodeToFlowchartPage from './pages/CodeToFlowchartPage';
import './App.css';

// Home Page Component
const HomePage = () => (
  <div className="home-container">
    <h1>Visual Coder</h1>
    <p className="subtitle">Choose an option to get started</p>
    <div className="card-container">
      <Link to="/flowchart-to-code" className="option-card">
        <h3>Flowchart to Code</h3>
        <p>Create a flowchart by dragging and dropping nodes, and generate C code from it.</p>
      </Link>
      <Link to="/code-to-flowchart" className="option-card">
        <h3>Code to Flowchart</h3>
        <p>Write C code and automatically generate a visual flowchart from it.</p>
      </Link>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/flowchart-to-code" element={<FlowchartToCodePage />} />
        <Route path="/code-to-flowchart" element={<CodeToFlowchartPage />} />
      </Routes>
    </Router>
  );
}

export default App;