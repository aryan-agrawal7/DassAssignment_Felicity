import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function CreateEvent() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    eventType: 'normal',
    eligibility: '',
    registrationDeadline: '',
    startDate: '',
    endDate: '',
    registrationLimit: '',
    registrationFee: '',
    tags: '',
    customFields: [],
    merchandiseDetails: {
      sizes: '',
      colors: '',
      variants: '',
      purchaseLimit: 1
    }
  });
  const [message, setMessage] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleMerchChange = (e) => {
    const { name, value } = e.target;
    if (name === 'purchaseLimit') {
      setFormData({
        ...formData,
        merchandiseDetails: { ...formData.merchandiseDetails, purchaseLimit: parseInt(value) }
      });
    } else {
      setFormData({
        ...formData,
        merchandiseDetails: { ...formData.merchandiseDetails, [name]: value }
      });
    }
  };

  const addCustomField = () => {
    setFormData({
      ...formData,
      customFields: [...formData.customFields, { label: '', type: 'text', required: false, options: '' }]
    });
  };

  const removeCustomField = (index) => {
    const updatedFields = formData.customFields.filter((_, i) => i !== index);
    setFormData({ ...formData, customFields: updatedFields });
  };

  const updateCustomField = (index, field, value) => {
    const updatedFields = [...formData.customFields];
    updatedFields[index][field] = value;
    setFormData({ ...formData, customFields: updatedFields });
  };

  const validateDates = () => {
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;

    if (!dateRegex.test(formData.startDate) ||
      !dateRegex.test(formData.endDate) ||
      !dateRegex.test(formData.registrationDeadline)) {
      return 'Dates must be in dd/mm/yyyy format';
    }

    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split('/');
      return new Date(year, month - 1, day);
    };

    const start = parseDate(formData.startDate);
    const end = parseDate(formData.endDate);
    const deadline = parseDate(formData.registrationDeadline);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (end < today || deadline < today) {
      return 'Dates must be in the present or future, not in the past.';
    }

    if (end < start) {
      return 'Event end date must be after the start date.';
    }

    return null; // No errors
  };

  const submitForm = async (action) => {
    setMessage('');

    const validationError = validateDates();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const payloadCustomFields = formData.customFields.map(field => ({
        ...field,
        options: field.type === 'dropdown' ? (typeof field.options === 'string' ? field.options.split(',').map(o => o.trim()).filter(Boolean) : field.options) : []
      }));

      const payloadMerch = {
        sizes: typeof formData.merchandiseDetails.sizes === 'string' ? formData.merchandiseDetails.sizes.split(',').map(s => s.trim()).filter(Boolean) : [],
        colors: typeof formData.merchandiseDetails.colors === 'string' ? formData.merchandiseDetails.colors.split(',').map(c => c.trim()).filter(Boolean) : [],
        variants: typeof formData.merchandiseDetails.variants === 'string' ? formData.merchandiseDetails.variants.split(',').map(v => v.trim()).filter(Boolean) : [],
        purchaseLimit: formData.merchandiseDetails.purchaseLimit
      };

      const payload = {
        name: formData.name,
        description: formData.description,
        eventType: formData.eventType,
        eligibility: formData.eligibility,
        registrationDeadline: formData.registrationDeadline,
        startDate: formData.startDate,
        endDate: formData.endDate,
        registrationLimit: formData.registrationLimit,
        registrationFee: formData.registrationFee,
        tags: formData.tags,
        action,
        customFields: payloadCustomFields,
        merchandiseDetails: payloadMerch
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/organizer/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        // Reset form
        setFormData({
          name: '', description: '', eventType: 'normal', eligibility: '',
          registrationDeadline: '', startDate: '', endDate: '',
          registrationLimit: '', registrationFee: '', tags: '',
          customFields: [], merchandiseDetails: { sizes: '', colors: '', variants: '', purchaseLimit: 1 }
        });
      } else {
        setMessage(data.message || 'Failed to create event');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Failed to connect to the server.');
    }
  };

  return (
    <div className="organizer-create-event-page">
      <h1>Create Event</h1>
      <nav>
        <ul>
          <li><Link to="/organizer/dashboard">Dashboard</Link></li>
          <li><Link to="/organizer/create-event">Create Event</Link></li>
          <li><Link to="/organizer/ongoing-events">Ongoing Events</Link></li>
          <li><Link to="/organizer/profile">Profile</Link></li>
          <li><button onClick={handleLogout}>Logout</button></li>
        </ul>
      </nav>

      <div style={{ marginTop: '20px' }}>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '600px' }}>
          <div>
            <label>Event Name:</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ width: '100%' }} />
          </div>
          <div>
            <label>Event Description:</label>
            <textarea name="description" value={formData.description} onChange={handleChange} required style={{ width: '100%' }} />
          </div>
          <div>
            <label>Event Type:</label>
            <select name="eventType" value={formData.eventType} onChange={handleChange} style={{ width: '100%' }}>
              <option value="normal">Normal</option>
              <option value="merchandise">Merchandise Event</option>
              <option value="hackathon">Hackathon Event</option>
            </select>
          </div>

          {/* Dynamic Content based on Event Type */}
          {(formData.eventType === 'normal' || formData.eventType === 'hackathon') && (
            <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
              <h3>Custom Registration Form Builder</h3>
              {formData.customFields.map((field, index) => (
                <div key={index} style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                    <input
                      type="text" placeholder="Field Label (e.g., T-Shirt Size)"
                      value={field.label} onChange={(e) => updateCustomField(index, 'label', e.target.value)}
                      style={{ flex: 1 }} required
                    />
                    <select value={field.type} onChange={(e) => updateCustomField(index, 'type', e.target.value)}>
                      <option value="text">Text Input</option>
                      <option value="dropdown">Dropdown</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input type="checkbox" checked={field.required} onChange={(e) => updateCustomField(index, 'required', e.target.checked)} />
                      Required
                    </label>
                    <button type="button" onClick={() => removeCustomField(index)} style={{ color: 'red' }}>Remove</button>
                  </div>
                  {field.type === 'dropdown' && (
                    <input
                      type="text" placeholder="Options (comma separated)"
                      value={field.options} onChange={(e) => updateCustomField(index, 'options', e.target.value)}
                      style={{ width: '100%' }} required
                    />
                  )}
                </div>
              ))}
              <button type="button" onClick={addCustomField}>+ Add Custom Field</button>
            </div>
          )}

          {formData.eventType === 'merchandise' && (
            <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
              <h3>Merchandise Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label>Sizes (comma separated):</label>
                  <input type="text" name="sizes" value={formData.merchandiseDetails.sizes} onChange={handleMerchChange} style={{ width: '100%' }} />
                </div>
                <div>
                  <label>Colors (comma separated):</label>
                  <input type="text" name="colors" value={formData.merchandiseDetails.colors} onChange={handleMerchChange} style={{ width: '100%' }} />
                </div>
                <div>
                  <label>Variants (comma separated):</label>
                  <input type="text" name="variants" value={formData.merchandiseDetails.variants} onChange={handleMerchChange} style={{ width: '100%' }} />
                </div>
                <div>
                  <label>Max Purchase Limit per Participant:</label>
                  <input type="number" name="purchaseLimit" value={formData.merchandiseDetails.purchaseLimit} onChange={handleMerchChange} min="1" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          )}

          <div>
            <label>Eligibility:</label>
            <input type="text" name="eligibility" value={formData.eligibility} onChange={handleChange} style={{ width: '100%' }} />
          </div>
          <div>
            <label>Registration Deadline (dd/mm/yyyy):</label>
            <input type="text" name="registrationDeadline" placeholder="dd/mm/yyyy" value={formData.registrationDeadline} onChange={handleChange} required style={{ width: '100%' }} />
          </div>
          <div>
            <label>Event Start Date (dd/mm/yyyy):</label>
            <input type="text" name="startDate" placeholder="dd/mm/yyyy" value={formData.startDate} onChange={handleChange} required style={{ width: '100%' }} />
          </div>
          <div>
            <label>Event End Date (dd/mm/yyyy):</label>
            <input type="text" name="endDate" placeholder="dd/mm/yyyy" value={formData.endDate} onChange={handleChange} required style={{ width: '100%' }} />
          </div>
          <div>
            <label>{formData.eventType === 'merchandise' ? 'Total Stock:' : 'Registration Limit:'}</label>
            <input type="number" name="registrationLimit" value={formData.registrationLimit} onChange={handleChange} style={{ width: '100%' }} />
          </div>
          <div>
            <label>Registration Fee:</label>
            <input type="number" name="registrationFee" value={formData.registrationFee} onChange={handleChange} style={{ width: '100%' }} />
          </div>
          <div>
            <label>Event Tags (comma separated):</label>
            <input type="text" name="tags" value={formData.tags} onChange={handleChange} style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={() => submitForm('draft')} style={{ flex: 1, backgroundColor: '#6c757d', color: 'white', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save to Draft</button>
            <button type="button" onClick={() => submitForm('publish')} style={{ flex: 1, backgroundColor: '#28a745', color: 'white', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Publish</button>
          </div>
        </form>
        {message && <p style={{ color: message.includes('successfully') ? 'green' : 'red' }}>{message}</p>}
      </div>
    </div>
  );
}
