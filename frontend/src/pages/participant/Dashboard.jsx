import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Normal'); // Normal, Merchandise, Completed, Cancelled/Rejected


  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/participant/my-events', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setTickets(data);
        } else {
          setError('Failed to fetch participation history');
        }
      } catch (err) {
        setError('Error connecting to server');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const handleCancelTicket = async (ticketId) => {
    if (!window.confirm("Are you sure you want to cancel your registration? This action cannot be undone and your spot will not be given to anyone else.")) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/participant/tickets/${ticketId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Event registration cancelled successfully.');
        // Update local state instead of doing a full refetch
        setTickets(tickets.map(t => t._id === ticketId ? { ...t, status: 'Cancelled' } : t));
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to cancel registration');
      }
    } catch (err) {
      alert('Error connecting to server');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/');
  };


  if (loading) return <div>Loading your events...</div>;
  if (error) return <div>{error}</div>;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Upcoming Events: Registered status and event start date is today or in the future
  const upcomingEvents = tickets.filter(ticket => {
    if (!ticket.eventId) return false;
    const eventDate = new Date(ticket.eventId.startDate);
    eventDate.setHours(0, 0, 0, 0);
    return ticket.status === 'Registered' && eventDate >= today;
  });

  // Participation History Tabs
  const getTabTickets = () => {
    return tickets.filter(ticket => {
      if (!ticket.eventId) return false;

      if (activeTab === 'Normal') {
        return ticket.eventId.eventType !== 'merchandise' && ticket.status === 'Registered';
      } else if (activeTab === 'Merchandise') {
        return ticket.eventId.eventType === 'merchandise' && ticket.status === 'Registered';
      } else if (activeTab === 'Completed') {
        return ticket.status === 'Completed';
      } else if (activeTab === 'Cancelled/Rejected') {
        return ticket.status === 'Cancelled' || ticket.status === 'Rejected';
      }
      return false;
    });
  };

  const tabTickets = getTabTickets();

  const renderTicketCard = (ticket) => (
    <div key={ticket._id} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <h3 style={{ margin: '0 0 10px 0' }}>{ticket.eventId?.name || 'Unknown Event'}</h3>
      <p style={{ margin: '5px 0', color: '#666' }}>{ticket.eventId?.eventType?.toUpperCase() || ticket.type.toUpperCase()}</p>
      <p style={{ margin: '5px 0' }}><strong>Organizer:</strong> {ticket.eventId?.organizerId?.name || 'Unknown'}</p>
      <p style={{ margin: '5px 0' }}><strong>Status:</strong> {ticket.status}</p>
      {ticket.teamName && <p style={{ margin: '5px 0' }}><strong>Team Name:</strong> {ticket.teamName}</p>}
      <p style={{ margin: '5px 0' }}>
        <strong>Ticket ID:</strong> <span style={{ cursor: 'pointer', color: '#0056b3', textDecoration: 'underline' }} onClick={() => alert(`Ticket ID: ${ticket.ticketId}`)}>{ticket.ticketId}</span>
      </p>
      <p style={{ margin: '5px 0' }}><strong>Purchased:</strong> {new Date(ticket.purchaseDate).toLocaleDateString()}</p>

      {ticket.status === 'Registered' && (
        <>
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <img src={ticket.qrCode} alt="Ticket QR Code" style={{ width: '150px', height: '150px' }} />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Scan for entry</p>
          </div>
          <button
            onClick={() => handleCancelTicket(ticket._id)}
            style={{ marginTop: '15px', padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Cancel Registration
          </button>
        </>
      )}



      <Link to={`/participant/events/${ticket.eventId?._id}`} style={{ display: 'inline-block', marginTop: '15px', color: '#0056b3' }}>
        View Event Details
      </Link>
    </div>
  );

  return (
    <div className="participant-dashboard-page" style={{ padding: '20px' }}>
      <h1>Participant Dashboard</h1>
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

      <div style={{ marginTop: '30px' }}>
        <h2>Upcoming Events</h2>
        {upcomingEvents.length === 0 ? (
          <p>No upcoming events.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {upcomingEvents.map(renderTicketCard)}
          </div>
        )}
      </div>

      <div style={{ marginTop: '40px' }}>
        <h2>Participation History</h2>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {['Normal', 'Merchandise', 'Completed', 'Cancelled/Rejected'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 20px',
                backgroundColor: activeTab === tab ? '#007bff' : '#f8f9fa',
                color: activeTab === tab ? 'white' : 'black',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {tabTickets.length === 0 ? (
          <p>No records found for {activeTab}.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {tabTickets.map(renderTicketCard)}
          </div>
        )}
      </div>


    </div>
  );
}
