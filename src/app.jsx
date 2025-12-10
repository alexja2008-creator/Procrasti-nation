import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import AITaskPlanner from './components/AITaskPlanner';
import MetricsDashboard from './components/MetricsDashboard';
import ResetStation from './components/ResetStation';
import FocusPods from './components/FocusPods';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/planner" element={<AITaskPlanner />} />
        <Route path="/dashboard" element={<MetricsDashboard />} />
        <Route path="/reset" element={<ResetStation />} />
        <Route path="/pods" element={<FocusPods />} />
      </Routes>
    </Router>
  );
}

export default App;
