import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import MemberDashboard from './pages/MemberDashboard';
import TrainerDashboard from './pages/TrainerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ReceptionDashboard from './pages/ReceptionDashboard';
import CookieConsent from './components/common/CookieConsent';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/member" element={<MemberDashboard />} />
        <Route path="/trainer" element={<TrainerDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/reception" element={<ReceptionDashboard />} />
        {/* We will add other roles later: reception */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CookieConsent />
    </BrowserRouter>
  );
}

export default App;
