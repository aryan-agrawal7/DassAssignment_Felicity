import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Clubs() {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState([]);
  const [followedClubs, setFollowedClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/participant/clubs', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setClubs(data.clubs);
          setFollowedClubs(data.followedClubs);
        } else {
          setError('Failed to fetch clubs');
        }
      } catch (err) {
        setError('Error connecting to server');
      } finally {
        setLoading(false);
      }
    };

    fetchClubs();
  }, []);

  const handleToggleFollow = async (e, clubId, clubName) => {
    e.stopPropagation(); // Prevent navigating to club details
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/participant/clubs/${clubId}/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFollowedClubs(data.followedClubs);
      }
    } catch (err) {
      console.error('Error toggling follow status:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/');
  };

  if (loading) return <div>Loading clubs...</div>;

  return (
    <div className="participant-clubs-page" style={{ padding: '20px' }}>
      <h1>Clubs & Organisers</h1>
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

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {clubs.length === 0 ? (
          <p>No clubs found.</p>
        ) : (
          clubs.map(club => {
            const isFollowed = followedClubs.includes(club.name);
            return (
              <div
                key={club._id}
                onClick={() => navigate(`/participant/clubs/${club._id}`)}
                style={{
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  padding: '20px',
                  cursor: 'pointer',
                  backgroundColor: '#f9f9f9',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <h3 style={{ marginTop: 0 }}>{club.name || 'Unnamed Club'}</h3>
                  <p style={{ color: '#666', fontSize: '0.9em' }}><strong>Category:</strong> {club.category || 'N/A'}</p>
                  <p style={{ marginTop: '10px' }}>{club.description || 'No description available.'}</p>
                </div>
                <button
                  onClick={(e) => handleToggleFollow(e, club._id, club.name)}
                  style={{
                    marginTop: '15px',
                    padding: '8px 15px',
                    backgroundColor: isFollowed ? '#dc3545' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    alignSelf: 'flex-start'
                  }}
                >
                  {isFollowed ? 'Unfollow' : 'Follow'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
