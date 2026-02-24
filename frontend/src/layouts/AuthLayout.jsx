import { Outlet, Navigate } from 'react-router-dom';

export default function AuthLayout() {
  const token = localStorage.getItem('token');
  
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      if (payload.exp && payload.exp < currentTime) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      } else {
        const role = payload.userType;
        
        if (role === 'participant' || role === 'iiit' || role === 'non-iiit') {
          if (payload.filled === false) {
            return <Navigate to="/participant/onboarding" replace />;
          } else {
            return <Navigate to="/participant/dashboard" replace />;
          }
        } else if (role === 'organizer') {
          return <Navigate to="/organizer/dashboard" replace />;
        } else if (role === 'admin') {
          return <Navigate to="/admin/dashboard" replace />;
        }
      }
    } catch (error) {
      console.error('Invalid token');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }

  return (
    <div className="auth-layout">
      <Outlet />
    </div>
  );
}
