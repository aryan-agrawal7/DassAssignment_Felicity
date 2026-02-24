import { Link, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/');
  };

  return (
    <div className="admin-dashboard-page">
      <h1>Admin Dashboard</h1>
      <nav>
        <ul>
          <li>
            <Link to="/admin/dashboard">Dashboard</Link>
          </li>
          <li>
            <Link to="/admin/manage-clubs">Manage clubs/organisers</Link>
          </li>
          <li>
            <Link to="/admin/password-resets">Password Reset Requests</Link>
          </li>
          <li>
            <button onClick={handleLogout}>Logout</button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
