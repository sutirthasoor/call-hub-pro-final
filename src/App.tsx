import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FirebaseProvider } from './lib/FirebaseContext';
import MainLayout from './layouts/MainLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Calls from './pages/Calls';
import Agents from './pages/Agents';
import Leads from './pages/Leads';
import Messages from './pages/Messages';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Surveys from './pages/Surveys';
import Users from './pages/Users';
import MyCalls from './pages/MyCalls';
import MyLeads from './pages/MyLeads';

function App() {
  return (
    <FirebaseProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes with Layout */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="calls" element={<Calls />} />
            <Route path="my-calls" element={<MyCalls />} />
            <Route path="agents" element={<Agents />} />
            <Route path="leads" element={<Leads />} />
            <Route path="my-leads" element={<MyLeads />} />
            <Route path="messages" element={<Messages />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="surveys" element={<Surveys />} />
            <Route path="users" element={<Users />} />
          </Route>
          
          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </FirebaseProvider>
  );
}

export default App;