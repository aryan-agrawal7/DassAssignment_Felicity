import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registerMessage, setRegisterMessage] = useState('');
  const [teamName, setTeamName] = useState('');
  const [answers, setAnswers] = useState({});
  const [merchandiseSelections, setMerchandiseSelections] = useState({
    size: '',
    color: '',
    variant: '',
    quantity: 1
  });

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/participant/events/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setEvent(data);
          // Pre-fill answers state for validation purposes
          if (data.customFields) {
            const initialAnswers = {};
            data.customFields.forEach(field => {
              if (field.type === 'checkbox') initialAnswers[field.label] = false;
              else initialAnswers[field.label] = '';
            });
            setAnswers(initialAnswers);
          }
        } else {
          setError('Failed to fetch event details');
        }
      } catch (err) {
        setError('Error connecting to server');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/');
  };

  const handleMerchChange = (e) => {
    const { name, value } = e.target;
    setMerchandiseSelections(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) : value
    }));
  };

  const handleRegister = async () => {
    // Validate required custom fields
    if (event?.eventType === 'normal' && event?.customFields) {
      for (const field of event.customFields) {
        if (field.required && (answers[field.label] === '' || answers[field.label] === undefined)) {
          setRegisterMessage(`Please fill in required field: ${field.label}`);
          return;
        }
      }
    }

    setRegistering(true);
    setRegisterMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/participant/events/${id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ teamName, answers, merchandiseSelections })
      });

      const data = await response.json();
      if (response.ok) {
        setRegisterMessage(data.message || 'Successfully registered!');
      } else {
        setRegisterMessage(data.message || 'Registration failed');
      }
    } catch (err) {
      setRegisterMessage('Error connecting to server');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) return <div>Loading event details...</div>;
  if (error) return <div>{error}</div>;
  if (!event) return <div>Event not found</div>;

  return (
    <div className="event-details-page" style={{ padding: '20px' }}>
      <h1>Event Details</h1>
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

      <div style={{ marginTop: '30px', backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', maxWidth: '800px' }}>
        <h2 style={{ marginTop: 0 }}>{event.name}</h2>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <span style={{ backgroundColor: '#e9ecef', padding: '5px 10px', borderRadius: '4px' }}>{event.eventType.toUpperCase()}</span>
          <span style={{ backgroundColor: '#e9ecef', padding: '5px 10px', borderRadius: '4px' }}>{event.status}</span>
          <span style={{ backgroundColor: '#e9ecef', padding: '5px 10px', borderRadius: '4px' }}>Views: {event.views || 0}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div>
            <p><strong>Organizer:</strong> {event.organizerId?.name || 'Unknown'}</p>
            <p><strong>Contact:</strong> {event.organizerId?.contact || 'Not provided'}</p>
            <p><strong>Eligibility:</strong> {event.eligibility || 'Everyone'}</p>
          </div>
          <div>
            <p><strong>Start Date:</strong> {new Date(event.startDate).toLocaleDateString()}</p>
            <p><strong>End Date:</strong> {new Date(event.endDate).toLocaleDateString()}</p>
            <p><strong>Registration Deadline:</strong> {new Date(event.registrationDeadline).toLocaleDateString()}</p>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>Description</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{event.description}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <p><strong>Registration Limit:</strong> {event.registrationLimit || 'Unlimited'}</p>
            <p><strong>Registration Fee:</strong> {event.registrationFee ? `₹${event.registrationFee}` : 'Free'}</p>
          </div>
          <div>
            <p><strong>Tags:</strong> {event.tags || 'None'}</p>
          </div>
        </div>

        <div style={{ marginTop: '30px' }}>
          {event.eventType === 'normal' && event.customFields && event.customFields.length > 0 && (
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
              <h3 style={{ marginTop: 0 }}>Additional Information</h3>
              {event.customFields.map((field, index) => (
                <div key={index} style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
                  </label>

                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={answers[field.label] || ''}
                      onChange={(e) => setAnswers({ ...answers, [field.label]: e.target.value })}
                      required={field.required}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  )}

                  {field.type === 'dropdown' && (
                    <select
                      value={answers[field.label] || ''}
                      onChange={(e) => setAnswers({ ...answers, [field.label]: e.target.value })}
                      required={field.required}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                      <option value="">Select an option...</option>
                      {field.options && field.options.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {field.type === 'checkbox' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={answers[field.label] || false}
                        onChange={(e) => setAnswers({ ...answers, [field.label]: e.target.checked })}
                      />
                      Yes
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}

          {event.eventType === 'merchandise' && event.merchandiseDetails && (
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
              <h3 style={{ marginTop: 0 }}>Merchandise Selection</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                {event.merchandiseDetails.sizes && event.merchandiseDetails.sizes.length > 0 && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Size <span style={{ color: 'red' }}>*</span></label>
                    <select
                      name="size"
                      value={merchandiseSelections.size}
                      onChange={handleMerchChange}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                      required
                    >
                      <option value="">Select Size</option>
                      {event.merchandiseDetails.sizes.map((s, i) => <option key={i} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}

                {event.merchandiseDetails.colors && event.merchandiseDetails.colors.length > 0 && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Color <span style={{ color: 'red' }}>*</span></label>
                    <select
                      name="color"
                      value={merchandiseSelections.color}
                      onChange={handleMerchChange}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                      required
                    >
                      <option value="">Select Color</option>
                      {event.merchandiseDetails.colors.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}

                {event.merchandiseDetails.variants && event.merchandiseDetails.variants.length > 0 && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Variant</label>
                    <select
                      name="variant"
                      value={merchandiseSelections.variant}
                      onChange={handleMerchChange}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                      <option value="">Select Variant</option>
                      {event.merchandiseDetails.variants.map((v, i) => <option key={i} value={v}>{v}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Quantity <span style={{ color: 'red' }}>*</span> (Max: {event.merchandiseDetails.purchaseLimit || 1})</label>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    max={event.merchandiseDetails.purchaseLimit || 1}
                    value={merchandiseSelections.quantity}
                    onChange={handleMerchChange}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={registering || event.status === 'Closed'}
            style={{
              padding: '10px 20px',
              backgroundColor: event.status === 'Closed' ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: event.status === 'Closed' ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {registering ? 'Processing...' : (event.eventType === 'merchandise' ? 'Purchase Merchandise' : 'Register for Event')}
          </button>
          {registerMessage && (
            <p style={{ marginTop: '15px', padding: '10px', backgroundColor: registerMessage.includes('success') ? '#d4edda' : '#f8d7da', color: registerMessage.includes('success') ? '#155724' : '#721c24', borderRadius: '4px' }}>
              {registerMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
