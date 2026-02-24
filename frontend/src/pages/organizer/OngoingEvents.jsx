import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function OngoingEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/organizer/events`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          // Filter out completed/cancelled to just show active events
          const activeEvents = data.filter(e => e.status === 'Published' || e.status === 'Draft');
          setEvents(activeEvents);
        } else {
          setError('Failed to fetch events');
        }
      } catch (err) {
        setError('Error connecting to server');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/');
  };

  return (
    <div className="organizer-ongoing-events-page" style={{ padding: '20px' }}>
      <h1>Ongoing Events</h1>
      <nav>
        <ul style={{ display: 'flex', gap: '15px', listStyle: 'none', padding: 0 }}>
          <li><Link to="/organizer/dashboard">Dashboard</Link></li>
          <li><Link to="/organizer/create-event">Create Event</Link></li>
          <li><Link to="/organizer/profile">Profile</Link></li>
          <li><Link to="/organizer/ongoing-events">Ongoing Events</Link></li>
          <li><button onClick={handleLogout} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, color: 'blue', textDecoration: 'underline' }}>Logout</button></li>
        </ul>
      </nav>

      {loading ? (
        <p style={{ marginTop: '20px' }}>Loading ongoing events...</p>
      ) : error ? (
        <p style={{ marginTop: '20px', color: 'red' }}>{error}</p>
      ) : events.length === 0 ? (
        <p style={{ marginTop: '20px' }}>You currently have no active or published events.</p>
      ) : (
        <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {events.map((event) => (
            <div key={event._id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '20px', backgroundColor: '#f9f9f9', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '1.2em' }}>{event.name}</h2>
                <span style={{ fontSize: '0.8em', padding: '4px 8px', borderRadius: '4px', backgroundColor: event.status === 'Published' ? '#28a745' : '#ffc107', color: event.status === 'Published' ? 'white' : 'black' }}>
                  {event.status}
                </span>
              </div>

              <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#555' }}>
                <strong>Dates:</strong> {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
              </p>

              <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', gap: '10px' }}>
                <Link to={`/organizer/events/${event._id}`} style={{ flex: 1, textAlign: 'center', padding: '8px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
                  Edit Details
                </Link>
                {event.status === 'Published' && (
                  <Link to={`/organizer/events/${event._id}/attendance`} style={{ flex: 1, textAlign: 'center', padding: '8px', backgroundColor: '#17a2b8', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
                    Tracker & Scanner
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
