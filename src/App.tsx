import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Clients from './pages/Clients';
import Services from './pages/Services';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import Banks from './pages/Banks';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="clients" element={<Clients />} />
            <Route path="services" element={<Services />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="payments" element={<Payments />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="banks" element={<Banks />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
