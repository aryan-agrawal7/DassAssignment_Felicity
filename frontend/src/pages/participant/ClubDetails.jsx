import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

export default function ClubDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchClubDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/participant/clubs/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setClub(data.club);
          setEvents(data.events);
        } else {
          setError('Failed to fetch club details');
        }
      } catch (err) {
        setError('Error connecting to server');
      } finally {
        setLoading(false);
      }
    };

    fetchClubDetails();
  }, [id]);

  if (loading) return <div>Loading club details...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!club) return <div>Club not found</div>;

  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.endDate) >= now);
  const pastEvents = events.filter(e => new Date(e.endDate) < now);

  return (
    <div className="participant-club-details-page" style={{ padding: '20px' }}>
      <nav>
        <ul style={{ display: 'flex', gap: '15px', listStyle: 'none', padding: 0 }}>
          <li><Link to="/participant/dashboard">Dashboard</Link></li>
          <li><Link to="/participant/events">Browse Events</Link></li>
          <li><Link to="/participant/clubs">Clubs/Organisation</Link></li>
          <li><Link to="/participant/profile">Profile</Link></li>
          <li><Link to="/participant/teams">Teams</Link></li>
          <li><button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('refreshToken'); navigate('/'); }} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, color: 'blue', textDecoration: 'underline' }}>Logout</button></li>
        </ul>
      </nav>
      <Link to="/participant/clubs" style={{ display: 'inline-block', marginBottom: '20px' }}>&larr; Back to Clubs</Link>

      <div style={{ backgroundColor: '#f9f9f9', padding: '30px', borderRadius: '8px', marginBottom: '30px' }}>
        <h1 style={{ marginTop: 0 }}>{club.name || 'Unnamed Club'}</h1>
        <p><strong>Category:</strong> {club.category || 'N/A'}</p>
        <p><strong>Contact:</strong> {club.contact || 'N/A'}</p>
        <div style={{ marginTop: '20px' }}>
          <h3>Description</h3>
          <p>{club.description || 'No description available.'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        <div>
          <h2>Upcoming Events</h2>
          {upcomingEvents.length === 0 ? (
            <p>No upcoming events.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {upcomingEvents.map(event => (
                <li key={event._id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '4px' }}>
                  <h4>{event.name}</h4>
                  <p style={{ fontSize: '0.9em', color: '#666' }}>
                    {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                  </p>
                  <p>{event.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2>Past Events</h2>
          {pastEvents.length === 0 ? (
            <p>No past events.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {pastEvents.map(event => (
                <li key={event._id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '4px', backgroundColor: '#f5f5f5' }}>
                  <h4>{event.name}</h4>
                  <p style={{ fontSize: '0.9em', color: '#666' }}>
                    {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
