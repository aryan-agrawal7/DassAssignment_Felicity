import { Outlet, Navigate } from 'react-router-dom';

export default function AdminLayout() {
  const token = localStorage.getItem('token');
  let isAdmin = false;

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      if (payload.exp && payload.exp < currentTime) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      } else if (payload.userType === 'admin') {
        isAdmin = true;
      }
    } catch (error) {
      console.error('Invalid token');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }

  if (!isAdmin) {
    return <Navigate to="/adminlogin" replace />;
  }

  return (
    <div className="admin-layout">
      <Outlet />
    </div>
  );
}
