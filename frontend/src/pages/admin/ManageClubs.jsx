import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function ManageClubs() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [organizers, setOrganizers] = useState([]);

  const fetchOrganizers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/organizers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrganizers(data);
      }
    } catch (error) {
      console.error('Error fetching organizers:', error);
    }
  };

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const generatedPassword = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/organizers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email, password: generatedPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Organizer added successfully! The generated password is: ${generatedPassword}`);
        setEmail('');
        fetchOrganizers(); // Refresh the list
      } else {
        setMessage(data.message || 'Failed to add organizer');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Failed to connect to the server.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this organizer?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/organizers/${id}`, {
        method: `DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setMessage('Organizer deleted successfully!');
        fetchOrganizers(); // Refresh the list
      } else {
        const data = await response.json();
        setMessage(data.message || 'Failed to delete organizer');
      }
    } catch (error) {
      console.error('Error deleting organizer:', error);
      setMessage('Failed to connect to the server.');
    }
  };

  const handleArchive = async (id, currentStatus) => {
    const newStatus = currentStatus === 'archived' ? 'active' : 'archived';
    if (!window.confirm(`Are you sure you want to ${currentStatus === 'archived' ? 'unarchive' : 'archive'} this organizer?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/organizers/${id}/archive`, {
        method: `PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setMessage(`Organizer ${newStatus} successfully!`);
        fetchOrganizers(); // Refresh the list
      } else {
        const data = await response.json();
        setMessage(data.message || 'Failed to update organizer status');
      }
    } catch (error) {
      console.error('Error updating organizer status:', error);
      setMessage('Failed to connect to the server.');
    }
  };

  return (
    <div className="admin-manage-clubs-page">
      <h1>Manage Clubs/Organisers</h1>
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

      <div>
        <h2>Add New Organizer</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
          <div>
            <label>Login Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>
          <button type="submit">Add Organizer</button>
        </form>
        {message && <p>{message}</p>}
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2>Existing Organizers</h2>
        {organizers.length === 0 ? (
          <p>No organizers found.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ccc' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Login Email</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Category</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {organizers.map((org) => (
                <tr key={org._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{org.name || 'N/A'}</td>
                  <td style={{ padding: '8px' }}>{org.email}</td>
                  <td style={{ padding: '8px' }}>{org.category || 'N/A'}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.85em',
                      backgroundColor: org.status === 'archived' ? '#f8d7da' : '#d4edda',
                      color: org.status === 'archived' ? '#721c24' : '#155724'
                    }}>
                      {org.status || 'active'}
                    </span>
                  </td>
                  <td style={{ padding: '8px', display: 'flex', gap: '5px' }}>
                    <button onClick={() => handleArchive(org._id, org.status || 'active')} style={{ backgroundColor: org.status === 'archived' ? '#28a745' : '#ffc107', color: 'black', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                      {org.status === 'archived' ? 'Unarchive' : 'Archive'}
                    </button>
                    <button onClick={() => handleDelete(org._id)} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
