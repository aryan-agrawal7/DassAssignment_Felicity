import { Outlet, Navigate } from 'react-router-dom';

export default function OrganizerLayout() {
  const token = localStorage.getItem('token');
  let isOrganizer = false;

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      if (payload.exp && payload.exp < currentTime) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      } else if (payload.userType === 'organizer') {
        isOrganizer = true;
      }
    } catch (error) {
      console.error('Invalid token');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }

  if (!isOrganizer) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="organizer-layout">
      <Outlet />
    </div>
  );
}
