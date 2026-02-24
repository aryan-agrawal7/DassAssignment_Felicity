import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';

export default function EventAttendance() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [scanMessage, setScanMessage] = useState('');
    const [scanStatus, setScanStatus] = useState(''); // 'success', 'error', 'duplicate'

    // Scanner state
    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef(null);

    // Manual Override state
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [overrideData, setOverrideData] = useState({ ticketId: '', ticketParticipant: '', reason: '', currentStatus: false });

    const fetchAttendance = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/organizer/events/${id}/attendance`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTickets(data);
            } else {
                setError('Failed to fetch attendance data');
            }
        } catch (err) {
            setError('Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
    }, [id]);

    // Clean up scanner on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current && isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, [isScanning]);

    const startScanner = async () => {
        setIsScanning(true);
        setScanMessage('Initializing camera...');
        setScanStatus('');

        try {
            scannerRef.current = new Html5Qrcode("reader");
            await scannerRef.current.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                handleScanSuccess,
                handleScanError
            );
            setScanMessage('Camera active. Point at a ticket QR code.');
        } catch (err) {
            setScanMessage('Failed to access camera. Please check permissions or try file upload.');
            setScanStatus('error');
            setIsScanning(false);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current && isScanning) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (err) {
                console.error("Failed to stop scanner", err);
            } finally {
                setIsScanning(false);
                setScanMessage('');

                // Aggressive DOM cleanup to fix white screen glitch
                setTimeout(() => {
                    const readerNode = document.getElementById('reader');
                    if (readerNode) {
                        readerNode.innerHTML = '';
                        // Force styles reset to prevent residual white boxes
                        readerNode.style.display = 'none';
                        readerNode.style.height = '0px';
                        readerNode.style.minHeight = '0px';
                    }
                }, 100);
            }
        }
    };

    const handleScanSuccess = async (decodedText, decodedResult) => {
        // Prevent rapid multiple scans
        if (scannerRef.current) {
            // Option to pause or let it run, we will just call API but rate limit ourselves visually
        }

        try {
            const parsedData = JSON.parse(decodedText);
            const ticketId = parsedData.ticketId || decodedText;
            processScan(ticketId);
        } catch (e) {
            // If not JSON, try raw string
            processScan(decodedText);
        }
    };

    const handleScanError = (errorMessage) => {
        // Html5Qrcode throws errors constantly when it doesn't see a QR code. Ignore them.
    };

    const processScan = async (ticketId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/organizer/events/${id}/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ticketId })
            });

            const data = await response.json();

            if (response.ok) {
                setScanMessage(`Success! Scaled ticket for ${data.ticket.participantId?.firstName || 'Participant'}.`);
                setScanStatus('success');
                fetchAttendance(); // refresh table
            } else {
                setScanMessage(data.message || 'Invalid scan');
                setScanStatus('error');
            }
        } catch (err) {
            setScanMessage('Server error processing scan');
            setScanStatus('error');
        }
    };

    // Manual File Upload Fallback
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const html5QrCode = new Html5Qrcode("reader-hidden");
            const decodedText = await html5QrCode.scanFile(file, true);

            try {
                const parsedData = JSON.parse(decodedText);
                processScan(parsedData.ticketId || decodedText);
            } catch (e) {
                processScan(decodedText);
            }
        } catch (err) {
            setScanMessage('Could not read QR code from image.');
            setScanStatus('error');
        }
    };

    const openOverrideModal = (ticket) => {
        setOverrideData({
            ticketId: ticket.ticketId,
            ticketParticipant: ticket.participantId?.firstName + ' ' + ticket.participantId?.lastName || ticket.participantId?.username,
            reason: '',
            currentStatus: ticket.attendanceMarked
        });
        setShowOverrideModal(true);
    };

    const handleManualOverride = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/organizer/events/${id}/manual-override`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ticketId: overrideData.ticketId,
                    overrideReason: overrideData.reason,
                    attendanceMarked: !overrideData.currentStatus // Toggle status
                })
            });

            const data = await response.json();

            if (response.ok) {
                setShowOverrideModal(false);
                fetchAttendance();
            } else {
                alert(data.message || 'Override failed');
            }
        } catch (err) {
            alert('Error connecting to server');
        }
    };

    const exportCSV = () => {
        const headers = ['Ticket ID', 'Participant Email', 'Name', 'Attendance Marked', 'Timestamp', 'Manual Override', 'Override Reason'];
        const rows = tickets.map(t => [
            t.ticketId,
            t.participantId?.username || '',
            `${t.participantId?.firstName || ''} ${t.participantId?.lastName || ''}`.trim(),
            t.attendanceMarked ? 'Yes' : 'No',
            t.attendanceTimestamp ? new Date(t.attendanceTimestamp).toLocaleString() : '',
            t.manualOverride ? 'Yes' : 'No',
            t.overrideReason || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(e => e.map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `attendance_event_${id}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalRegistered = tickets.length;
    const totalScanned = tickets.filter(t => t.attendanceMarked).length;
    const pending = totalRegistered - totalScanned;

    if (loading) return <div>Loading attendance ...</div>;

    return (
        <div className="attendance-page" style={{ padding: '20px', position: 'relative' }}>
            <h1>Live Attendance Tracker</h1>
            <nav>
                <ul style={{ display: 'flex', gap: '15px', listStyle: 'none', padding: 0 }}>
                    <li><Link to="/organizer/dashboard">Dashboard</Link></li>
                    <li><Link to="/organizer/create-event">Create Event</Link></li>
                    <li><Link to="/organizer/profile">Profile</Link></li>
                    <li><Link to="/organizer/ongoing-events">Ongoing Events</Link></li>
                    <li><button onClick={() => { localStorage.removeItem('token'); navigate('/'); }} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, color: 'blue', textDecoration: 'underline' }}>Logout</button></li>
                </ul>
            </nav>

            <Link to={`/organizer/events/${id}`} style={{ display: 'inline-block', marginBottom: '20px' }}>&larr; Back to Event</Link>

            {/* Metrics Dash */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <div style={{ flex: 1, padding: '20px', backgroundColor: '#e9ecef', borderRadius: '8px', textAlign: 'center' }}>
                    <h3>Total Registered</h3>
                    <p style={{ fontSize: '2em', margin: 0 }}>{totalRegistered}</p>
                </div>
                <div style={{ flex: 1, padding: '20px', backgroundColor: '#d4edda', borderRadius: '8px', textAlign: 'center' }}>
                    <h3>Scanned Present</h3>
                    <p style={{ fontSize: '2em', margin: 0, color: '#155724' }}>{totalScanned}</p>
                </div>
                <div style={{ flex: 1, padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px', textAlign: 'center' }}>
                    <h3>Pending</h3>
                    <p style={{ fontSize: '2em', margin: 0, color: '#856404' }}>{pending}</p>
                </div>
            </div>

            {/* Scanner Control Block */}
            <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
                <h2>Ticket Scanner</h2>

                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                    {!isScanning ? (
                        <button onClick={startScanner} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Start Camera Scanner</button>
                    ) : (
                        <button onClick={stopScanner} style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Stop Scanner</button>
                    )}

                    <div style={{ borderLeft: '1px solid #ccc', margin: '0 10px' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.9em', marginBottom: '5px' }}>Or upload QR Image:</label>
                        <input type="file" accept="image/*" onChange={handleFileUpload} />
                    </div>
                </div>

                {scanMessage && (
                    <div style={{ padding: '15px', backgroundColor: scanStatus === 'success' ? '#d4edda' : scanStatus === 'error' ? '#f8d7da' : '#e2e3e5', color: scanStatus === 'success' ? '#155724' : scanStatus === 'error' ? '#721c24' : '#383d41', borderRadius: '4px', marginBottom: '15px' }}>
                        <strong>{scanMessage}</strong>
                    </div>
                )}

                {/* The scanner viewport */}
                <div id="reader" style={{ width: '100%', maxWidth: '600px', margin: '0 auto', display: isScanning ? 'block' : 'none' }}></div>
                <div id="reader-hidden" style={{ display: 'none' }}></div>
            </div>

            {/* Roster & Audit */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2>Attendance Roster</h2>
                    <button onClick={exportCSV} style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Export CSV</button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f1f1f1' }}>
                                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Participant</th>
                                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Ticket ID</th>
                                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Present</th>
                                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Time</th>
                                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.length === 0 ? (
                                <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>No tickets found for this event.</td></tr>
                            ) : (
                                tickets.map(t => (
                                    <tr key={t._id} style={{ backgroundColor: t.attendanceMarked ? '#f8fff8' : 'white' }}>
                                        <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                                            {t.participantId?.firstName} {t.participantId?.lastName} <br />
                                            <small style={{ color: '#666' }}>{t.participantId?.username}</small>
                                        </td>
                                        <td style={{ padding: '12px', border: '1px solid #ddd' }}><small>{t.ticketId}</small></td>
                                        <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                                            {t.attendanceMarked ? '✅' : '❌'}
                                        </td>
                                        <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                                            {t.attendanceTimestamp ? new Date(t.attendanceTimestamp).toLocaleTimeString() : '-'}
                                            {t.manualOverride && <div style={{ fontSize: '0.8em', color: 'orange' }} title={t.overrideReason}>(Overridden)</div>}
                                        </td>
                                        <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                                            <button onClick={() => openOverrideModal(t)} style={{ padding: '4px 8px', fontSize: '0.9em', cursor: 'pointer' }}>
                                                Override
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manual Override Modal */}
            {showOverrideModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
                        <h3>Manual Attendance Override</h3>
                        <p>Participant: <strong>{overrideData.ticketParticipant}</strong></p>
                        <p>Current Status: <strong>{overrideData.currentStatus ? 'Present' : 'Absent'}</strong></p>
                        <p>New Status will be: <strong>{!overrideData.currentStatus ? 'Present' : 'Absent'}</strong></p>

                        <form onSubmit={handleManualOverride} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                            <div>
                                <label>Reason for override (Required for audit):</label>
                                <textarea
                                    value={overrideData.reason}
                                    onChange={(e) => setOverrideData({ ...overrideData, reason: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '10px', marginTop: '5px', minHeight: '80px' }}
                                    placeholder="E.g., QR Code smudged, scanned at gate B manually..."
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setShowOverrideModal(false)} style={{ padding: '8px 15px', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Apply Override</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
