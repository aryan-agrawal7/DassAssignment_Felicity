import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

export default function TeamChat() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [socket, setSocket] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [typingUsers, setTypingUsers] = useState(new Set());
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/');
            return;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setCurrentUser({
                userId: payload.userId,
                username: payload.username
            });
        } catch (e) {
            navigate('/');
            return;
        }

        // Fetch history
        const fetchHistory = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/teams/${id}/messages`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setMessages(data);
                    setTimeout(scrollToBottom, 100);
                }
            } catch (err) {
                console.error('Failed to load history');
            }
        };
        fetchHistory();

        // Setup Socket
        const newSocket = io('${import.meta.env.VITE_API_URL || "http://localhost:5000"}');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('join_team', id);
        });

        newSocket.on('receive_message', (msg) => {
            setMessages(prev => [...prev, msg]);
            setTimeout(scrollToBottom, 50);
        });

        // Handle typing events
        newSocket.on('user_typing', (data) => {
            setTypingUsers(prev => {
                const newSet = new Set(prev);
                newSet.add(data.senderName);
                return newSet;
            });
            // Remove typing indicator after 2 seconds
            setTimeout(() => {
                setTypingUsers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(data.senderName);
                    return newSet;
                });
            }, 2000);
        });

        return () => {
            newSocket.disconnect();
        };
    }, [id, navigate]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket || !currentUser) return;

        const msgData = {
            teamId: id,
            senderId: currentUser.userId,
            senderName: currentUser.username,
            text: newMessage
        };

        socket.emit('send_message', msgData);
        setNewMessage('');
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (socket && currentUser) {
            socket.emit('typing', { teamId: id, senderName: currentUser.username });
        }
    };

    return (
        <div className="participant-team-chat" style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa' }}>
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

            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                {messages.map((msg, idx) => {
                    const isMe = currentUser?.userId === msg.senderId;
                    return (
                        <div key={idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8em', color: '#666', marginBottom: '2px', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                                {isMe ? 'You' : msg.senderName}
                            </span>
                            <div style={{ padding: '10px 15px', borderRadius: '15px', backgroundColor: isMe ? '#007bff' : 'white', color: isMe ? 'white' : 'black', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                {msg.text}
                            </div>
                        </div>
                    );
                })}
                {typingUsers.size > 0 && (
                    <div style={{ alignSelf: 'flex-start', color: '#666', fontStyle: 'italic', fontSize: '0.85em' }}>
                        {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '20px', backgroundColor: 'white', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'center' }}>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '800px' }}>
                    <input
                        type="text"
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={handleTyping}
                        style={{ flex: 1, padding: '15px', borderRadius: '25px', border: '1px solid #ccc', outline: 'none' }}
                    />
                    <button type="submit" style={{ padding: '10px 25px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
