import { Outlet, Navigate } from 'react-router-dom';

export default function ParticipantLayout() {
  const token = localStorage.getItem('token');
  let isParticipant = false;

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      if (payload.exp && payload.exp < currentTime) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      } else if (payload.userType === 'participant' || payload.userType === 'iiit' || payload.userType === 'non-iiit') {
        isParticipant = true;
      }
    } catch (error) {
      console.error('Invalid token');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }

  if (!isParticipant) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="participant-layout">
      <Outlet />
    </div>
  );
}
