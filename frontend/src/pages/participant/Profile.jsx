import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    contactNumber: '',
    college: '',
    interested_topics: [],
    interested_clubs: [],
    username: '',
    userType: ''
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    email: '',
    oldPassword: '',
    newPassword: ''
  });
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/participant/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setProfile({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            contactNumber: data.contactNumber || '',
            college: data.college || (data.userType === 'iiit' ? 'IIIT Hyderabad' : ''),
            interested_topics: data.interested_topics || [],
            interested_clubs: data.interested_clubs || [],
            username: data.username || '',
            userType: data.userType || ''
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

  const handleArrayChange = (e, field) => {
    const value = e.target.value;
    const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
    setProfile(prev => ({ ...prev, [field]: arrayValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/participant/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          contactNumber: profile.contactNumber,
          college: profile.college,
          interested_topics: profile.interested_topics,
          interested_clubs: profile.interested_clubs
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

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/participant/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(passwordData)
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordMessage('Password changed successfully!');
        setPasswordData({ email: '', oldPassword: '', newPassword: '' });
        setShowPasswordForm(false);
      } else {
        setPasswordMessage(data.message || 'Failed to change password');
      }
    } catch (err) {
      setPasswordMessage('Error connecting to server');
    }
  };

  if (loading) return <div>Loading profile...</div>;

  return (
    <div className="participant-profile-page" style={{ padding: '20px' }}>
      <h1>Participant Profile</h1>
      <nav>
        <ul style={{ display: 'flex', gap: '15px', listStyle: 'none', padding: 0 }}>
          <li><Link to="/participant/dashboard">Dashboard</Link></li>
          <li><Link to="/participant/events">Browse Events</Link></li>
          <li><Link to="/participant/clubs">Clubs/Organisation</Link></li>
          <li><Link to="/participant/profile">Profile</Link></li>
          <li><Link to="/participant/teams">Teams</Link></li>
          <li><button onClick={handleLogout} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, color: 'blue', textDecoration: 'underline' }}>Logout</button></li>
        </ul>
      </nav>

      <div style={{ marginTop: '30px', maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Personal Details</h2>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} style={{ padding: '8px 15px', cursor: 'pointer' }}>
              Edit Profile
            </button>
          )}
        </div>

        {message && <p style={{ color: message.includes('successfully') ? 'green' : 'red', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>{message}</p>}

        {!isEditing ? (
          <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p><strong>Email Address (Non-editable):</strong> {profile.username}</p>
            <p><strong>Participant Type (Non-editable):</strong> {profile.userType === 'iiit' ? 'IIIT Student' : 'Non-IIIT'}</p>
            <p><strong>First Name:</strong> {profile.firstName || 'Not set'}</p>
            <p><strong>Last Name:</strong> {profile.lastName || 'Not set'}</p>
            <p><strong>Contact Number:</strong> {profile.contactNumber || 'Not set'}</p>
            <p><strong>College/Organisation:</strong> {profile.college || 'Not set'}</p>
            <p><strong>Selected Interests:</strong> {profile.interested_topics.length > 0 ? profile.interested_topics.join(', ') : 'None'}</p>
            <p><strong>Followed Clubs:</strong> {profile.interested_clubs.length > 0 ? profile.interested_clubs.join(', ') : 'None'}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
            <div>
              <label>Email Address (Non-editable):</label>
              <input type="email" value={profile.username} disabled style={{ width: '100%', padding: '8px', backgroundColor: '#e9ecef', cursor: 'not-allowed' }} />
            </div>
            <div>
              <label>Participant Type (Non-editable):</label>
              <input type="text" value={profile.userType === 'iiit' ? 'IIIT Student' : 'Non-IIIT'} disabled style={{ width: '100%', padding: '8px', backgroundColor: '#e9ecef', cursor: 'not-allowed' }} />
            </div>
            <div>
              <label>First Name:</label>
              <input type="text" name="firstName" value={profile.firstName} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div>
              <label>Last Name:</label>
              <input type="text" name="lastName" value={profile.lastName} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div>
              <label>Contact Number:</label>
              <input type="text" name="contactNumber" value={profile.contactNumber} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div>
              <label>College/Organisation:</label>
              <input type="text" name="college" value={profile.college} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div>
              <label>Selected Interests (comma separated):</label>
              <input type="text" value={profile.interested_topics.join(', ')} onChange={(e) => handleArrayChange(e, 'interested_topics')} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div>
              <label>Followed Clubs (comma separated):</label>
              <input type="text" value={profile.interested_clubs.join(', ')} onChange={(e) => handleArrayChange(e, 'interested_clubs')} style={{ width: '100%', padding: '8px' }} />
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

        <div style={{ marginTop: '40px' }}>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {showPasswordForm ? 'Cancel Password Change' : 'Change Password'}
          </button>

          {passwordMessage && <p style={{ color: passwordMessage.includes('successfully') ? 'green' : 'red', marginTop: '10px' }}>{passwordMessage}</p>}

          {showPasswordForm && (
            <form onSubmit={handlePasswordSubmit} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
              <div>
                <label>Email Address:</label>
                <input type="email" name="email" value={passwordData.email} onChange={handlePasswordChange} required style={{ width: '100%', padding: '8px' }} />
              </div>
              <div>
                <label>Old Password:</label>
                <input type="password" name="oldPassword" value={passwordData.oldPassword} onChange={handlePasswordChange} required style={{ width: '100%', padding: '8px' }} />
              </div>
              <div>
                <label>New Password:</label>
                <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} required style={{ width: '100%', padding: '8px' }} />
              </div>
              <button type="submit" style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>
                Update Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
