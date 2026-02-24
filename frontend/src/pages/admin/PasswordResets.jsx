import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function PasswordResets() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/password-resets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setRequests(data);
      } else {
        setError(data.message || 'Failed to fetch requests');
      }
    } catch (err) {
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    setMessage('');

    let newPassword = '';
    if (action === 'Approve') {
      newPassword = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
    } else {
      if (!window.confirm("Are you sure you want to reject this request?")) {
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      console.log('Sending action:', action, 'with password length:', newPassword.length, 'to ID:', id);
      console.log('Token exists:', !!token);

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/password-resets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, newPassword })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      if (response.ok) {
        if (action === 'Approve') {
          setMessage(`Password reset approved! The new generated password is: ${newPassword}`);
        } else {
          setMessage(data.message);
        }
        fetchRequests(); // Refresh list
      } else {
        alert(data.message || 'Failed to process request');
      }
    } catch (err) {
      alert('Error connecting to server');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/adminlogin');
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="admin-password-resets-page" style={{ padding: '20px' }}>
      <h1>Password Reset Requests</h1>

      <nav style={{ marginBottom: '20px' }}>
        <ul style={{ display: 'flex', gap: '15px', listStyle: 'none', padding: 0 }}>
          <li><Link to="/admin/dashboard">Dashboard</Link></li>
          <li><Link to="/admin/manage-clubs">Manage clubs/organisers</Link></li>
          <li><Link to="/admin/password-resets">Password Reset Requests</Link></li>
          <li><button onClick={handleLogout} style={{ cursor: 'pointer' }}>Logout</button></li>
        </ul>
      </nav>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>{message}</p>}

      {requests.length === 0 ? (
        <p>No password reset requests found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
              <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Date</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Club Email</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Reason</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Status</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '12px' }}>{new Date(req.date).toLocaleString()}</td>
                <td style={{ padding: '12px' }}>{req.clubemail}</td>
                <td style={{ padding: '12px' }}>{req.reason}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: req.status === 'Pending' ? '#fff3cd' : req.status === 'Approved' ? '#d4edda' : '#f8d7da',
                    color: req.status === 'Pending' ? '#856404' : req.status === 'Approved' ? '#155724' : '#721c24'
                  }}>
                    {req.status}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  {req.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleAction(req._id, 'Approve')}
                        style={{ padding: '6px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(req._id, 'Reject')}
                        style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
