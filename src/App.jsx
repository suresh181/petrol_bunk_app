import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import { useAuth } from './context/AuthContext';

import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [user, navigate, location]);

  if (!user) return (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  );

  return (
    <ErrorBoundary>
      <MainLayout>
        <Outlet />
      </MainLayout>
    </ErrorBoundary>
  );
}

export default App;
