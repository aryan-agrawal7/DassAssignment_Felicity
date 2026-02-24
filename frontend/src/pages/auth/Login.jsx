import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';

export default function Login() {
  const [userType, setUserType] = useState('participant'); // 'participant' or 'organizer'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [turnstileToken, setTurnstileToken] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      // Send POST request to backend
      const response = await fetch('${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, userType, turnstileToken }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Login successful!');
        // Store the token in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);

        // Decode the JWT token to get the user role
        // The token is a base64 encoded string with 3 parts separated by dots
        // The payload is the second part
        const tokenPayload = JSON.parse(atob(data.token.split('.')[1]));
        const role = tokenPayload.userType;

        // Redirect based on role from the token
        if (role === 'participant' || role === 'iiit' || role === 'non-iiit') {
          if (tokenPayload.filled === false) {
            navigate('/participant/onboarding');
          } else {
            navigate('/participant/dashboard');
          }
        } else if (role === 'organizer') {
          navigate('/organizer/dashboard');
        }
      } else {
        setMessage(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Failed to connect to the server. Is the backend running?');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!email) {
      setMessage('Please enter your email above first.');
      return;
    }

    try {
      const response = await fetch('${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reason: resetReason }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Password reset request submitted successfully!');
        setShowResetForm(false);
        setResetReason('');
      } else {
        setMessage(data.message || 'Failed to submit request');
      }
    } catch (error) {
      setMessage('Failed to connect to the server.');
    }
  };



  return (
    <div className="login-page">
      <h1>Login</h1>

      {/* Back to Home Link */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#0056b3', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
          &larr; Back to Home
        </button>
      </div>

      {/* Switch Type Button */}
      <div>
        <button onClick={() => setUserType('participant')}> Participant </button>
        <button onClick={() => setUserType('organizer')}>
          Organizer/Club
        </button>
      </div>

      {/* Form Outlet */}
      <div className="form-outlet">
        <form onSubmit={handleSubmit}>
          <div>
            <label>
              {userType === 'participant' ? 'Participant Email:' : 'Organizer Email:'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={userType === 'participant' ? 'user@example.com' : 'club@example.com'}
              required
            />
          </div>

          <div>
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>



          <div style={{ margin: '15px 0' }}>
            <Turnstile
              siteKey="0x4AAAAAAChbuXL_-5yK96tN"
              onSuccess={(token) => setTurnstileToken(token)}
              onError={() => setMessage('CAPTCHA Failed')}
            />
          </div>

          <button type="submit" disabled={!turnstileToken}>
            Login
          </button>
        </form>

        {userType === 'organizer' && !showResetForm && (
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <button
              onClick={() => setShowResetForm(true)}
              style={{ background: 'none', border: 'none', color: '#0056b3', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
            >
              Forgot/Reset Password Request
            </button>
          </div>
        )}

        {showResetForm && userType === 'organizer' && (
          <form onSubmit={handleResetSubmit} style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Request Password Reset</h4>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Reason for reset:</label>
              <textarea
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                placeholder="I forgot my password, etc."
                required
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Submit Request
              </button>
              <button type="button" onClick={() => setShowResetForm(false)} style={{ padding: '8px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
            <p style={{ fontSize: '0.8em', color: '#666', marginTop: '10px' }}>Make sure you fill out your email in the login form above first.</p>
          </form>
        )}

        {message && (
          <p>
            {message}
          </p>
        )}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p>Don't have an account? <button onClick={() => navigate('/auth/register')} style={{ background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Register here</button></p>
        </div>
      </div>
    </div>
  );
}
