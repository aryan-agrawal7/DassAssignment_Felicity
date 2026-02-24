import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    email: '',
    name: '',
    category: '',
    description: '',
    contact: '',
    discordWebhook: ''
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/organizer/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setProfile({
            email: data.email || '',
            name: data.name || '',
            category: data.category || '',
            description: data.description || '',
            contact: data.contact || '',
            discordWebhook: data.discordWebhook || ''
          });
        } else {
          setMessage('Failed to fetch profile');
        }
      } catch (err) {
        setMessage('Error connecting to server');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/organizer/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profile.name,
          category: profile.category,
          description: profile.description,
          contact: profile.contact,
          discordWebhook: profile.discordWebhook
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Profile updated successfully!');
        setIsEditing(false);
      } else {
        setMessage(data.message || 'Failed to update profile');
      }
    } catch (err) {
      setMessage('Error connecting to server');
    }
  };

  if (loading) return <div>Loading profile...</div>;

  return (
    <div className="organizer-profile-page">
      <h1>Organizer Profile</h1>
      <nav>
        <ul>
          <li><Link to="/organizer/dashboard">Dashboard</Link></li>
          <li><Link to="/organizer/create-event">Create Event</Link></li>
          <li><Link to="/organizer/ongoing-events">Ongoing Events</Link></li>
          <li><Link to="/organizer/profile">Profile</Link></li>
          <li><button onClick={handleLogout}>Logout</button></li>
        </ul>
      </nav>

      <div style={{ marginTop: '30px', maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Club Details</h2>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} style={{ padding: '8px 15px', cursor: 'pointer' }}>
              Edit Profile
            </button>
          )}
        </div>

        {message && <p style={{ color: message.includes('successfully') ? 'green' : 'red', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>{message}</p>}

        {!isEditing ? (
          <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p><strong>Login Email:</strong> {profile.email}</p>
            <p><strong>Club Name:</strong> {profile.name || 'Not set'}</p>
            <p><strong>Category:</strong> {profile.category || 'Not set'}</p>
            <p><strong>Description:</strong> {profile.description || 'Not set'}</p>
            <p><strong>Contact Email/Number:</strong> {profile.contact || 'Not set'}</p>
            <p><strong>Discord Webhook:</strong> {profile.discordWebhook || 'Not set'}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
            <div>
              <label>Login Email (Non-editable):</label>
              <input type="email" value={profile.email} disabled style={{ width: '100%', padding: '8px', backgroundColor: '#e9ecef', cursor: 'not-allowed' }} />
            </div>
            <div>
              <label>Club Name:</label>
              <input type="text" name="name" value={profile.name} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div>
              <label>Category:</label>
              <input type="text" name="category" value={profile.category} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div>
              <label>Description:</label>
              <textarea name="description" value={profile.description} onChange={handleChange} style={{ width: '100%', padding: '8px', minHeight: '100px' }} />
            </div>
            <div>
              <label>Contact Email/Number:</label>
              <input type="text" name="contact" value={profile.contact} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div>
              <label>Discord Webhook URL:</label>
              <input type="url" name="discordWebhook" value={profile.discordWebhook} onChange={handleChange} placeholder="https://discord.com/api/webhooks/..." style={{ width: '100%', padding: '8px' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Save Changes
              </button>
              <button type="button" onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
