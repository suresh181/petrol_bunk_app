import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import { useAuth } from './context/AuthContext';

function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [user, navigate, location]);

  if (!user) return <Outlet />;

  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}

export default App;
