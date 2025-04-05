import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ChatPage from './components/pages/ChatPage';
import MoodboardPage from './components/pages/MoodboardPage';
import CareGuidePage from './components/pages/CareGuidePage';
import PlanRoomPage from './components/pages/PlanRoomPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />}>
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="room-analyzer" element={<MoodboardPage />} />
          <Route path="care-guide" element={<CareGuidePage />} />
          <Route path="plan-room" element={<PlanRoomPage />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
