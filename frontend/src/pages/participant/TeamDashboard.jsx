import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function TeamDashboard() {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // For joining a team
    const [inviteCode, setInviteCode] = useState('');
    const [joinMessage, setJoinMessage] = useState('');

    // For creating a team
    const [events, setEvents] = useState([]);
    const [createData, setCreateData] = useState({ name: '', eventId: '', size: '' });
    const [createMessage, setCreateMessage] = useState('');

    const fetchTeams = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/');
                return;
            }

            const response = await fetch('http://localhost:5000/api/teams/my-teams', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setTeams(data);
            } else {
                setError('Failed to fetch teams');
            }
        } catch (err) {
            setError('Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    const fetchEvents = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/participant/events', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setEvents(data);
            }
        } catch (err) {
            console.error('Failed to fetch events');
        }
    };

    useEffect(() => {
        fetchTeams();
        fetchEvents();
    }, [navigate]);

    const handleCreateTeam = async (e) => {
        e.preventDefault();
        setCreateMessage('');

        if (!createData.name || !createData.eventId || !createData.size) {
            setCreateMessage('Please fill all fields');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/teams/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: createData.name,
                    eventId: createData.eventId,
                    size: Number(createData.size)
                })
            });

            const data = await response.json();
            if (response.ok) {
                setCreateMessage('Team successfully created!');
                setCreateData({ name: '', eventId: '', size: '' });
                fetchTeams(); // Refresh
            } else {
                setCreateMessage(data.message || 'Failed to create team');
            }
        } catch (err) {
            setCreateMessage('Error connecting to server');
        }
    };

    const handleJoinTeam = async (e) => {
        e.preventDefault();
        setJoinMessage('');
        if (!inviteCode) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/teams/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ inviteCode })
            });

            const data = await response.json();

            if (response.ok) {
                setJoinMessage('Successfully joined the team!');
                setInviteCode('');
                fetchTeams(); // Refresh
            } else {
                setJoinMessage(data.message || 'Failed to join team');
            }
        } catch (err) {
            setJoinMessage('Error joining team');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        navigate('/');
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading teams...</div>;

    return (
        <div className="participant-teams-page">
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

            <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto' }}>
                <h1>My Teams</h1>
                <p>Manage your hackathon teams or join a new one using an invite code.</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '20px', marginBottom: '30px' }}>
                    {/* Create Team Block */}
                    <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                        <h3>Create a New Team</h3>
                        <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                            <input
                                type="text"
                                placeholder="Team Name"
                                value={createData.name}
                                onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                            <select
                                value={createData.eventId}
                                onChange={(e) => setCreateData({ ...createData, eventId: e.target.value })}
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                            >
                                <option value="">-- Select Event --</option>
                                {events.map(ev => <option key={ev._id} value={ev._id}>{ev.name}</option>)}
                            </select>
                            <input
                                type="number"
                                placeholder="Team Size (min 1)"
                                value={createData.size}
                                onChange={(e) => setCreateData({ ...createData, size: e.target.value })}
                                min="1"
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                            <button type="submit" style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Create Team
                            </button>
                        </form>
                        {createMessage && <p style={{ marginTop: '10px', color: createMessage.includes('success') ? 'green' : 'red' }}>{createMessage}</p>}
                    </div>

                    {/* Join Team Block */}
                    <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                        <h3>Join a Team</h3>
                        <form onSubmit={handleJoinTeam} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <input
                                type="text"
                                placeholder="Enter 6-character invite code"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', flexGrow: 1, maxWidth: '300px' }}
                                maxLength={6}
                            />
                            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Join
                            </button>
                        </form>
                        {joinMessage && <p style={{ marginTop: '10px', color: joinMessage.includes('Success') ? 'green' : 'red' }}>{joinMessage}</p>}
                    </div>
                </div>

                {error && <p style={{ color: 'red' }}>{error}</p>}

                <h2>Your Active Teams</h2>
                {teams.length === 0 ? (
                    <p>You are not in any teams yet.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        {teams.map(team => (
                            <div key={team._id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', backgroundColor: 'white' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.5em', color: '#007bff' }}>{team.name}</h3>
                                        <p style={{ margin: '0 0 5px 0' }}><strong>Event:</strong> {team.eventId?.name || 'Unknown'}</p>
                                        <p style={{ margin: '0 0 5px 0' }}><strong>Status:</strong>
                                            <span style={{
                                                marginLeft: '10px', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85em',
                                                backgroundColor: team.isComplete ? '#d4edda' : '#fff3cd',
                                                color: team.isComplete ? '#155724' : '#856404'
                                            }}>
                                                {team.isComplete ? 'Complete (Tickets Generated)' : `Pending (${team.members.length}/${team.size} Members)`}
                                            </span>
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ margin: '0 0 5px 0', fontSize: '1.2em' }}><strong>Invite Code:</strong> <span style={{ fontFamily: 'monospace', backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '4px' }}>{team.inviteCode}</span></p>
                                        <p style={{ margin: 0, color: '#666', fontSize: '0.9em' }}>Share this code with your teammates</p>
                                        {team.isComplete && (
                                            <Link to={`/participant/teams/${team._id}/chat`} style={{ display: 'inline-block', marginTop: '10px', padding: '8px 15px', backgroundColor: '#17a2b8', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
                                                &#128172; Enter Team Chat
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                <div style={{ marginTop: '20px' }}>
                                    <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Team Members</h4>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        {team.members.map((member, idx) => (
                                            <li key={idx} style={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: idx !== team.members.length - 1 ? '1px solid #f8f9fa' : 'none' }}>
                                                <span>
                                                    {member.userId?.firstName} {member.userId?.lastName} ({member.userId?.username})
                                                    {team.leaderId?._id === member.userId?._id && <span style={{ marginLeft: '10px', fontSize: '0.8em', backgroundColor: '#007bff', color: 'white', padding: '2px 6px', borderRadius: '10px' }}>Leader</span>}
                                                </span>
                                                <span style={{ color: member.status === 'accepted' ? 'green' : 'orange' }}>{member.status}</span>
                                            </li>
                                        ))}
                                        {/* Add placeholder slots if not full */}
                                        {Array.from({ length: team.size - team.members.length }).map((_, idx) => (
                                            <li key={`empty-${idx}`} style={{ padding: '8px 0', color: '#999', fontStyle: 'italic' }}>
                                                Waiting for member...
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
