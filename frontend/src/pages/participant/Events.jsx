import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [eligibilityFilter, setEligibilityFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState({ start: '', end: '' });
  const [clubFilter, setClubFilter] = useState('all'); // 'all' or 'followed'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');

        // Fetch events
        const eventsRes = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/participant/events`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        // Fetch user profile for followed clubs
        const profileRes = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/participant/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (eventsRes.ok && profileRes.ok) {
          const eventsData = await eventsRes.json();
          const profileData = await profileRes.json();
          setEvents(eventsData);
          setUserProfile(profileData);
        } else {
          setError('Failed to fetch data');
        }
      } catch (err) {
        setError('Error connecting to server');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/');
  };

  // Filter logic
  let sourceEvents = events;

  // 1. Search (Fuzzy using Fuse.js)
  if (searchTerm.trim() !== '') {
    const fuse = new Fuse(events, {
      keys: ['name', 'organizerId.name', 'tags'],
      threshold: 0.4, // lower threshold means stricter match
      distance: 100
    });
    const results = fuse.search(searchTerm);
    // Unpack fuse results format back to the raw event objects
    sourceEvents = results.map(result => result.item);
  }

  const filteredEvents = sourceEvents.filter(event => {

    // 2. Event Type Filter
    const typeMatch = eventTypeFilter === 'all' || event.eventType === eventTypeFilter;

    // 3. Eligibility Filter
    const eligibilityMatch = eligibilityFilter === 'all' ||
      (event.eligibility && event.eligibility.toLowerCase().includes(eligibilityFilter.toLowerCase()));

    // 4. Date Range Filter
    let dateMatch = true;
    if (dateRangeFilter.start && dateRangeFilter.end) {
      const eventStart = new Date(event.startDate);
      const filterStart = new Date(dateRangeFilter.start);
      const filterEnd = new Date(dateRangeFilter.end);
      dateMatch = eventStart >= filterStart && eventStart <= filterEnd;
    } else if (dateRangeFilter.start) {
      const eventStart = new Date(event.startDate);
      const filterStart = new Date(dateRangeFilter.start);
      dateMatch = eventStart >= filterStart;
    } else if (dateRangeFilter.end) {
      const eventStart = new Date(event.startDate);
      const filterEnd = new Date(dateRangeFilter.end);
      dateMatch = eventStart <= filterEnd;
    }

    // 5. Followed Clubs Filter
    let clubMatch = true;
    if (clubFilter === 'followed' && userProfile) {
      const followedClubNames = userProfile.interested_clubs || [];
      // we check if the event's organizer name is in the followedClubNames array
      clubMatch = followedClubNames.includes(event.organizerId?.name);
    }

    return typeMatch && eligibilityMatch && dateMatch && clubMatch;
  });

  // Trending Logic (Top 5 in last 24h based on views)
  const getTrendingEvents = () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return [...events]
      .filter(e => new Date(e.createdAt) >= twentyFourHoursAgo)
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5);
  };

  const trendingEvents = getTrendingEvents();

  if (loading) return <div>Loading events...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="events-page" style={{ padding: '20px' }}>
      <h1>Browse Events</h1>
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

      {/* Trending Section */}
      {trendingEvents.length > 0 && (
        <div style={{ marginTop: '30px', backgroundColor: '#fff3cd', padding: '15px', borderRadius: '8px' }}>
          <h2>🔥 Trending (Top 5 in last 24h)</h2>
          <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
            {trendingEvents.map(event => (
              <div key={event._id} style={{ minWidth: '250px', border: '1px solid #ffeeba', padding: '15px', borderRadius: '8px', backgroundColor: 'white' }}>
                <h3 style={{ margin: '0 0 10px 0' }}>{event.name}</h3>
                <p style={{ margin: '5px 0' }}><strong>By:</strong> {event.organizerId?.name || 'Unknown'}</p>
                <p style={{ margin: '5px 0' }}><strong>Views:</strong> {event.views || 0}</p>
                <Link to={`/participant/events/${event._id}`} style={{ display: 'inline-block', marginTop: '10px', color: '#0056b3' }}>View Details</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div style={{ marginTop: '30px', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
        <h2>Search & Filters</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>

          {/* Search */}
          <div style={{ flex: '1 1 300px' }}>
            <input
              type="text"
              placeholder="Search events or organizers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          {/* Event Type */}
          <div>
            <select value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="all">All Types</option>
              <option value="normal">Normal</option>
              <option value="merchandise">Merchandise</option>
              <option value="hackathon">Hackathon</option>
            </select>
          </div>

          {/* Eligibility */}
          <div>
            <select value={eligibilityFilter} onChange={(e) => setEligibilityFilter(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="all">All Eligibility</option>
              <option value="ug1">UG1</option>
              <option value="ug2">UG2</option>
              <option value="ug3">UG3</option>
              <option value="ug4">UG4</option>
              <option value="pg">PG</option>
            </select>
          </div>

          {/* Date Range */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label>From:</label>
            <input
              type="date"
              value={dateRangeFilter.start}
              onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, start: e.target.value })}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <label>To:</label>
            <input
              type="date"
              value={dateRangeFilter.end}
              onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, end: e.target.value })}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          {/* Followed Clubs Toggle */}
          <div>
            <select value={clubFilter} onChange={(e) => setClubFilter(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="all">All Clubs</option>
              <option value="followed">Followed Clubs Only</option>
            </select>
          </div>

        </div>
      </div>

      {/* Events List */}
      <div style={{ marginTop: '30px' }}>
        <h2>All Events ({filteredEvents.length})</h2>
        {filteredEvents.length === 0 ? (
          <p>No events found matching your criteria.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {filteredEvents.map(event => (
              <div key={event._id} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: 'white' }}>
                <h3 style={{ margin: '0 0 10px 0' }}>{event.name}</h3>
                <p style={{ margin: '5px 0', color: '#666' }}>{event.eventType.toUpperCase()}</p>
                <p style={{ margin: '5px 0' }}><strong>Organizer:</strong> {event.organizerId?.name || 'Unknown'}</p>
                <p style={{ margin: '5px 0' }}><strong>Start Date:</strong> {new Date(event.startDate).toLocaleDateString()}</p>
                <p style={{ margin: '5px 0' }}><strong>Eligibility:</strong> {event.eligibility || 'Everyone'}</p>
                <Link to={`/participant/events/${event._id}`} style={{ display: 'inline-block', marginTop: '15px', padding: '8px 15px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
                  View Details
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
