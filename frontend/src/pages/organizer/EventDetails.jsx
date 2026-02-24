import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const [analytics, setAnalytics] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const token = localStorage.getItem('token');

        // Fetch Event Details
        const eventResponse = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/organizer/events/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (eventResponse.ok) {
          const data = await eventResponse.json();
          setEvent(data);

          // Format dates for the form
          const formatDate = (dateString) => {
            if (!dateString) return '';
            const d = new Date(dateString);
            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
          };

          setFormData({
            ...data,
            startDate: formatDate(data.startDate),
            endDate: formatDate(data.endDate),
            registrationDeadline: formatDate(data.registrationDeadline)
          });
        } else {
          setError('Failed to fetch event details');
        }

        // Fetch Analytics & Participants
        const analyticsResponse = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/organizer/events/${id}/participants`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (analyticsResponse.ok) {
          const aData = await analyticsResponse.json();
          setAnalytics(aData.analytics);
          setParticipants(aData.participants || []);
        }

      } catch (err) {
        setError('Error connecting to server');
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomFieldChange = (index, field, value) => {
    setFormData(prev => {
      const updatedFields = [...prev.customFields];
      updatedFields[index] = { ...updatedFields[index], [field]: value };
      return { ...prev, customFields: updatedFields };
    });
  };

  const addCustomField = () => {
    setFormData(prev => ({
      ...prev,
      customFields: [...(prev.customFields || []), { label: '', type: 'text', required: false, options: '' }]
    }));
  };

  const removeCustomField = (index) => {
    setFormData(prev => {
      const updatedFields = [...prev.customFields];
      updatedFields.splice(index, 1);
      return { ...prev, customFields: updatedFields };
    });
  };

  const handleMerchChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      merchandiseDetails: {
        ...(prev.merchandiseDetails || {}),
        [name]: value
      }
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const token = localStorage.getItem('token');

      const payloadCustomFields = (formData.customFields || []).map(field => ({
        ...field,
        options: field.type === 'dropdown' ? (typeof field.options === 'string' ? field.options.split(',').map(o => o.trim()).filter(Boolean) : field.options) : []
      }));

      const payloadMerch = formData.merchandiseDetails ? {
        sizes: typeof formData.merchandiseDetails.sizes === 'string' ? formData.merchandiseDetails.sizes.split(',').map(s => s.trim()).filter(Boolean) : formData.merchandiseDetails.sizes,
        colors: typeof formData.merchandiseDetails.colors === 'string' ? formData.merchandiseDetails.colors.split(',').map(c => c.trim()).filter(Boolean) : formData.merchandiseDetails.colors,
        variants: typeof formData.merchandiseDetails.variants === 'string' ? formData.merchandiseDetails.variants.split(',').map(v => v.trim()).filter(Boolean) : formData.merchandiseDetails.variants,
        purchaseLimit: formData.merchandiseDetails.purchaseLimit
      } : undefined;

      const payload = {
        ...formData,
        customFields: payloadCustomFields,
        merchandiseDetails: payloadMerch
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/organizer/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Event updated successfully!');
        setEvent({ ...event, ...formData });
        setIsEditing(false);
      } else {
        setMessage(data.message || 'Failed to update event');
      }
    } catch (err) {
      setMessage('Error connecting to server');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/organizer/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setEvent(prev => ({ ...prev, status: newStatus }));
        setFormData(prev => ({ ...prev, status: newStatus }));
        setMessage(`Event status changed to ${newStatus}`);
      } else {
        const data = await response.json();
        setMessage(data.message || 'Failed to update status');
      }
    } catch (err) {
      setMessage('Error connecting to server');
    }
  };

  const handleExportCSV = () => {
    if (participants.length === 0) return;

    const headers = ['Name', 'Email', 'Ticket ID', 'Status', 'Date Registered', 'Team Name', 'Ticket Type', 'Purchased Qty'];

    // Add dynamic headers for custom answers/merch
    const allCustomKeys = new Set();
    participants.forEach(p => {
      if (p.answers) Object.keys(p.answers).forEach(k => allCustomKeys.add(`Custom: ${k}`));
      if (p.merchandiseSelections) {
        if (p.merchandiseSelections.size) allCustomKeys.add('Merch Size');
        if (p.merchandiseSelections.color) allCustomKeys.add('Merch Color');
        if (p.merchandiseSelections.variant) allCustomKeys.add('Merch Variant');
      }
    });

    const extendedHeaders = [...headers, ...Array.from(allCustomKeys)];

    const rows = participants.map(p => {
      const row = [
        p.participantName,
        p.participantEmail,
        p.ticketId,
        p.status,
        new Date(p.purchaseDate).toLocaleString(),
        p.teamName || 'N/A',
        p.type,
        p.type === 'merchandise' ? (p.merchandiseSelections?.quantity || 1) : 1
      ];

      Array.from(allCustomKeys).forEach(key => {
        if (key.startsWith('Custom: ')) {
          const actualKey = key.replace('Custom: ', '');
          row.push(p.answers?.[actualKey] || 'N/A');
        } else if (key === 'Merch Size') {
          row.push(p.merchandiseSelections?.size || 'N/A');
        } else if (key === 'Merch Color') {
          row.push(p.merchandiseSelections?.color || 'N/A');
        } else if (key === 'Merch Variant') {
          row.push(p.merchandiseSelections?.variant || 'N/A');
        }
      });

      return row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [extendedHeaders.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${event.name.replace(/\s+/g, '_')}_participants.csv`;
    link.click();
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!event) return <div>Event not found</div>;

  const isClosed = event.status === 'Closed' || event.status === 'Ongoing' || event.status === 'Completed' || event.status === 'Cancelled';
  const isPublished = event.status === 'Published';

  return (
    <div className="event-details-page" style={{ padding: '20px' }}>
      <nav>
        <ul style={{ display: 'flex', gap: '15px', listStyle: 'none', padding: 0 }}>
          <li><Link to="/organizer/dashboard">Dashboard</Link></li>
          <li><Link to="/organizer/create-event">Create Event</Link></li>
          <li><Link to="/organizer/profile">Profile</Link></li>
          <li><Link to="/organizer/ongoing-events">Ongoing Events</Link></li>
          <li><button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('refreshToken'); navigate('/'); }} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, color: 'blue', textDecoration: 'underline' }}>Logout</button></li>
        </ul>
      </nav>
      <Link to="/organizer/dashboard" style={{ display: 'inline-block', marginBottom: '20px' }}>&larr; Back to Dashboard</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{event.name}</h1>
        <div>
          <span style={{
            padding: '5px 10px',
            borderRadius: '4px',
            backgroundColor: event.status === 'Published' ? '#d4edda' : event.status === 'Draft' ? '#fff3cd' : '#f8d7da',
            color: event.status === 'Published' ? '#155724' : event.status === 'Draft' ? '#856404' : '#721c24',
            fontWeight: 'bold',
            marginRight: '15px'
          }}>
            {event.status || 'Draft'}
          </span>

          {!isClosed && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{ padding: '8px 15px', cursor: 'pointer' }}
            >
              {isEditing ? 'Cancel Edit' : 'Edit Event'}
            </button>
          )}
        </div>
      </div>

      {message && <p style={{ color: message.includes('successfully') || message.includes('changed') ? 'green' : 'red', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>{message}</p>}

      {!isEditing ? (
        <div className="event-info" style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
            <h3>Details</h3>
            <p><strong>Description:</strong> {event.description}</p>
            <p><strong>Type:</strong> {event.eventType}</p>
            <p><strong>Eligibility:</strong> {event.eligibility}</p>
            <p><strong>Tags:</strong> {event.tags}</p>
          </div>
          <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
            <h3>Dates & Registration</h3>
            <p><strong>Start Date:</strong> {new Date(event.startDate).toLocaleDateString()}</p>
            <p><strong>End Date:</strong> {new Date(event.endDate).toLocaleDateString()}</p>
            <p><strong>Registration Deadline:</strong> {new Date(event.registrationDeadline).toLocaleDateString()}</p>
            <p><strong>Registration Limit:</strong> {event.registrationLimit || 'Unlimited'}</p>
            <p><strong>Registration Fee:</strong> ${event.registrationFee || 0}</p>
          </div>

          {!isClosed && (
            <div style={{ gridColumn: '1 / -1', marginTop: '20px', padding: '20px', backgroundColor: '#e9ecef', borderRadius: '8px' }}>
              <h3>Actions</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                {event.status === 'Draft' && (
                  <button onClick={() => handleStatusChange('Published')} style={{ backgroundColor: '#28a745', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Publish Event
                  </button>
                )}
                {event.status === 'Published' && (
                  <>
                    <button onClick={() => handleStatusChange('Cancelled')} style={{ backgroundColor: '#dc3545', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Event Closed
                    </button>
                    <button onClick={() => handleStatusChange('Completed')} style={{ backgroundColor: '#17a2b8', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Concluded
                    </button>
                  </>
                )}
              </div>
              <p style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
                Note: Once an event is closed, it cannot be edited or reopened.
              </p>
            </div>
          )}

          {/* --- Analytics Block --- */}
          {analytics && (
            <div style={{ gridColumn: '1 / -1', marginTop: '20px', padding: '20px', backgroundColor: '#e9ecef', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 15px 0' }}>Event Analytics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 5px 0', color: '#666' }}>Sales/Registrations</h4>
                  <p style={{ fontSize: '1.5em', fontWeight: 'bold', margin: 0, color: '#17a2b8' }}>{analytics.totalSales}</p>
                </div>
                <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 5px 0', color: '#666' }}>Est. Attendance</h4>
                  <p style={{ fontSize: '1.5em', fontWeight: 'bold', margin: 0, color: '#ffc107' }}>{analytics.totalAttended}</p>
                </div>
                <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 5px 0', color: '#666' }}>Revenue</h4>
                  <p style={{ fontSize: '1.5em', fontWeight: 'bold', margin: 0, color: '#28a745' }}>₹{analytics.totalRevenue}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleUpdate} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '600px' }}>
          <div>
            <label>Event Name:</label>
            <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required disabled={isPublished} style={{ width: '100%', padding: '8px', backgroundColor: isPublished ? '#e9ecef' : 'white' }} />
          </div>
          <div>
            <label>Description:</label>
            <textarea name="description" value={formData.description || ''} onChange={handleChange} required style={{ width: '100%', padding: '8px', minHeight: '100px' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label>Event Type:</label>
              <select name="eventType" value={formData.eventType || 'normal'} onChange={handleChange} disabled={isPublished} style={{ width: '100%', padding: '8px', backgroundColor: isPublished ? '#e9ecef' : 'white' }}>
                <option value="normal">Normal</option>
                <option value="merchandise">Merchandise Event</option>
              </select>
            </div>
            <div>
              <label>Eligibility:</label>
              <input type="text" name="eligibility" value={formData.eligibility || ''} onChange={handleChange} disabled={isPublished} style={{ width: '100%', padding: '8px', backgroundColor: isPublished ? '#e9ecef' : 'white' }} />
            </div>
            <div>
              <label>Start Date (dd/mm/yyyy):</label>
              <input type="text" name="startDate" value={formData.startDate || ''} onChange={handleChange} required disabled={isPublished} style={{ width: '100%', padding: '8px', backgroundColor: isPublished ? '#e9ecef' : 'white' }} />
            </div>
            <div>
              <label>End Date (dd/mm/yyyy):</label>
              <input type="text" name="endDate" value={formData.endDate || ''} onChange={handleChange} required disabled={isPublished} style={{ width: '100%', padding: '8px', backgroundColor: isPublished ? '#e9ecef' : 'white' }} />
            </div>
            <div>
              <label>Registration Deadline (dd/mm/yyyy):</label>
              <input type="text" name="registrationDeadline" value={formData.registrationDeadline || ''} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
            </div>
            <div>
              <label>Registration Limit:</label>
              <input type="number" name="registrationLimit" value={formData.registrationLimit || ''} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div>
              <label>Registration Fee:</label>
              <input type="number" name="registrationFee" value={formData.registrationFee || ''} onChange={handleChange} disabled={isPublished} style={{ width: '100%', padding: '8px', backgroundColor: isPublished ? '#e9ecef' : 'white' }} />
            </div>
            <div>
              <label>Tags (comma separated):</label>
              <input type="text" name="tags" value={formData.tags || ''} onChange={handleChange} disabled={isPublished} style={{ width: '100%', padding: '8px', backgroundColor: isPublished ? '#e9ecef' : 'white' }} />
            </div>
          </div>

          {/* Dynamic Content based on Event Type */}
          {(formData.eventType === 'normal' || formData.eventType === 'hackathon') && (
            <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
              <h3>Custom Registration Form Builder</h3>
              {(formData.customFields || []).map((field, index) => (
                <div key={index} style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                    <input
                      type="text" placeholder="Field Label (e.g., T-Shirt Size)"
                      value={field.label} onChange={(e) => handleCustomFieldChange(index, 'label', e.target.value)}
                      required disabled={isPublished} style={{ flexGrow: 1, padding: '8px', backgroundColor: isPublished ? '#e9ecef' : 'white' }}
                    />
                    <select
                      value={field.type} onChange={(e) => handleCustomFieldChange(index, 'type', e.target.value)}
                      disabled={isPublished} style={{ padding: '8px', backgroundColor: isPublished ? '#e9ecef' : 'white' }}
                    >
                      <option value="text">Short Text</option>
                      <option value="textarea">Long Text</option>
                      <option value="dropdown">Dropdown (Select One)</option>
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input
                        type="checkbox" checked={field.required}
                        onChange={(e) => handleCustomFieldChange(index, 'required', e.target.checked)}
                        disabled={isPublished}
                      />
                      Required
                    </label>
                    <button type="button" onClick={() => removeCustomField(index)} disabled={isPublished} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}>
                      Remove
                    </button>
                  </div>
                  {field.type === 'dropdown' && (
                    <div>
                      <input
                        type="text" placeholder="Dropdown Options (comma separated, e.g., Small, Medium, Large)"
                        value={Array.isArray(field.options) ? field.options.join(', ') : field.options}
                        onChange={(e) => handleCustomFieldChange(index, 'options', e.target.value)}
                        required disabled={isPublished} style={{ width: '100%', padding: '8px', marginTop: '5px', backgroundColor: isPublished ? '#e9ecef' : 'white' }}
                      />
                    </div>
                  )}
                </div>
              ))}
              <button type="button" onClick={addCustomField} disabled={isPublished} style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: isPublished ? 'not-allowed' : 'pointer' }}>
                + Add Custom Field
              </button>
            </div>
          )}

          {formData.eventType === 'merchandise' && (
            <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
              <h3>Merchandise Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                <div>
                  <label>Allowed Sizes (comma separated, e.g., S, M, L, XL):</label>
                  <input
                    type="text" name="sizes"
                    value={formData.merchandiseDetails?.sizes ? (Array.isArray(formData.merchandiseDetails.sizes) ? formData.merchandiseDetails.sizes.join(', ') : formData.merchandiseDetails.sizes) : ''}
                    onChange={handleMerchChange} disabled={isPublished} style={{ width: '100%', padding: '8px', backgroundColor: isPublished ? '#e9ecef' : 'white' }}
                  />
                </div>
                <div>
                  <label>Allowed Colors (comma separated, e.g., Black, White, Red):</label>
                  <input
                    type="text" name="colors"
                    value={formData.merchandiseDetails?.colors ? (Array.isArray(formData.merchandiseDetails.colors) ? formData.merchandiseDetails.colors.join(', ') : formData.merchandiseDetails.colors) : ''}
                    onChange={handleMerchChange} disabled={isPublished} style={{ width: '100%', padding: '8px', backgroundColor: isPublished ? '#e9ecef' : 'white' }}
                  />
                </div>
                <div>
                  <label>Other Variants (comma separated, e.g., Mug, Keychain, File):</label>
                  <input
                    type="text" name="variants"
                    value={formData.merchandiseDetails?.variants ? (Array.isArray(formData.merchandiseDetails.variants) ? formData.merchandiseDetails.variants.join(', ') : formData.merchandiseDetails.variants) : ''}
                    onChange={handleMerchChange} disabled={isPublished} style={{ width: '100%', padding: '8px', backgroundColor: isPublished ? '#e9ecef' : 'white' }}
                  />
                </div>
                <div>
                  <label>Purchase Limit per User (quantity):</label>
                  <input
                    type="number" name="purchaseLimit" min="1"
                    value={formData.merchandiseDetails?.purchaseLimit || 1}
                    onChange={handleMerchChange} disabled={isPublished} style={{ width: '100%', padding: '8px', backgroundColor: isPublished ? '#e9ecef' : 'white' }}
                  />
                </div>
              </div>
            </div>
          )}

          <button type="submit" style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>
            Save Changes
          </button>
        </form>
      )}

      {/* --- Participants Block --- */}
      <div style={{ marginTop: '40px', borderTop: '1px solid #ccc', paddingTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0 }}>Participants List</h2>
          <button
            onClick={handleExportCSV}
            style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Export to CSV
          </button>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flexGrow: 1 }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="All">All Statuses</option>
            <option value="Registered">Registered</option>
            <option value="Completed">Completed (Attended)</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '12px' }}>Name</th>
                <th style={{ padding: '12px' }}>Email</th>
                <th style={{ padding: '12px' }}>Ticket ID</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Reg. Date</th>
              </tr>
            </thead>
            <tbody>
              {participants
                .filter(p => statusFilter === 'All' || p.status === statusFilter)
                .filter(p =>
                  p.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.participantEmail.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(p => (
                  <tr key={p._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{p.participantName}</td>
                    <td style={{ padding: '12px', color: '#666' }}>{p.participantEmail}</td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>{p.ticketId}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.85em',
                        backgroundColor: p.status === 'Completed' ? '#d4edda' : p.status === 'Cancelled' ? '#f8d7da' : '#e2e3e5',
                        color: p.status === 'Completed' ? '#155724' : p.status === 'Cancelled' ? '#721c24' : '#383d41'
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{new Date(p.purchaseDate).toLocaleDateString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {participants.length === 0 && <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No participants found.</p>}
        </div>
      </div>
    </div>
  );
}