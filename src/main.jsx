import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// Pages (to be created)
import Dashboard from './pages/Dashboard.jsx';
import FuelManagement from './pages/FuelManagement.jsx';
import ShiftSales from './pages/ShiftSales.jsx';
import CreditLedger from './pages/CreditLedger.jsx';
import CreditCustomers from './pages/CreditCustomers.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';

import { AuthProvider } from './context/AuthContext.jsx';
import { DataProvider } from './context/DataContext.jsx';
import Login from './pages/Login.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<App />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="fuel" element={<FuelManagement />} />
              <Route path="sales" element={<ShiftSales />} />
              <Route path="credit" element={<CreditCustomers />} />
              <Route path="credits" element={<CreditLedger />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  </React.StrictMode>,
);
