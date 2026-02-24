import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/organizer/events', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setEvents(data);
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

  const completedEvents = events.filter(e => e.status === 'Completed');
  const totalRegistrations = completedEvents.reduce((acc, curr) => acc + (curr.registeredCount || 0), 0);
  const totalRevenue = completedEvents.reduce((acc, curr) => acc + ((curr.registeredCount || 0) * (curr.registrationFee || 0)), 0);
  // Attendance tracking is simplified here: assume all registered attended if completed, 
  // or use the same registeredCount for now if we don't have a distinct DB attendance counter per event.
  const totalAttendance = totalRegistrations;

  return (
    <div className="organizer-dashboard-page">
      <h1>Organizer Dashboard</h1>
      <nav>
        <ul>
          <li>
            <Link to="/organizer/dashboard">Dashboard</Link>
          </li>
          <li>
            <Link to="/organizer/create-event">Create Event</Link>
          </li>
          <li>
            <Link to="/organizer/ongoing-events">Ongoing Events</Link>
          </li>
          <li>
            <Link to="/organizer/profile">Profile</Link>
          </li>
          <li>
            <button onClick={handleLogout}>Logout</button>
          </li>
        </ul>
      </nav>

      {/* Analytics Section */}
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#e9ecef', borderRadius: '8px' }}>
        <h2>Analytics (Completed Events)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '15px' }}>
          <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Total Completed Events</h3>
            <p style={{ fontSize: '2em', fontWeight: 'bold', margin: 0, color: '#007bff' }}>{completedEvents.length}</p>
          </div>
          <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Total Revenue</h3>
            <p style={{ fontSize: '2em', fontWeight: 'bold', margin: 0, color: '#28a745' }}>₹{totalRevenue}</p>
          </div>
          <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Total Registrations</h3>
            <p style={{ fontSize: '2em', fontWeight: 'bold', margin: 0, color: '#17a2b8' }}>{totalRegistrations}</p>
          </div>
          <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Est. Attendance</h3>
            <p style={{ fontSize: '2em', fontWeight: 'bold', margin: 0, color: '#ffc107' }}>{totalAttendance}</p>
          </div>
        </div>
      </div>

      <div className="events-carousel" style={{ marginTop: '30px' }}>
        <h2>My Events</h2>
        {loading && <p>Loading events...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {!loading && !error && events.length === 0 && (
          <p>No events found. Create one!</p>
        )}

        <div style={{ display: 'flex', overflowX: 'auto', gap: '20px', padding: '10px 0' }}>
          {events.map(event => (
            <div
              key={event._id}
              className="event-card"
              style={{
                minWidth: '250px',
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '15px',
                cursor: 'pointer',
                backgroundColor: '#f9f9f9'
              }}
              onClick={() => navigate(`/organizer/events/${event._id}`)}
            >
              <h3>{event.name}</h3>
              <p><strong>Type:</strong> {event.eventType}</p>
              <p>
                <strong>Status:</strong>
                <span style={{
                  marginLeft: '5px',
                  color: event.status === 'Published' ? 'green' : event.status === 'Draft' ? 'orange' : 'red'
                }}>
                  {event.status || 'Draft'}
                </span>
              </p>
              <p style={{ fontSize: '0.9em', color: '#666' }}>
                {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
