import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';

export default function Register() {
  const [userType, setUserType] = useState('iiit'); // 'iiit' or 'non-iiit'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    // check if passwords match
    if (password !== confirmPassword) {
      setMessage('Passwords do not match!');
      return;
    }
    // check email
    if (userType === 'iiit' && !email.endsWith('iiit.ac.in')) {
      setMessage('Please use a valid IIIT email address (iiit.ac.in)');
      return;
    }

    try {
      // Send POST request to backend
      const response = await fetch('${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, userType, turnstileToken }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(data.message);
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        navigate('/participant/onboarding');
      } else {
        setMessage(data.message || 'Registration failed');
      }
    }
    catch (error) {
      console.error('Error:', error);
      setMessage(`Failed due to error: ${error.message}`);
    }
  };



  return (
    <div className="register-page">
      <h1>Register</h1>

      {/* Back to Home Link */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#0056b3', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
          &larr; Back to Home
        </button>
      </div>

      {/* Switch Type Button */}
      <div>
        <button onClick={() => setUserType('iiit')}>
          IIIT Student
        </button>
        <button onClick={() => setUserType('non-iiit')}>
          Non-IIIT
        </button>
      </div>

      <p style={{ marginTop: '15px', color: '#666', fontSize: '0.9em', textAlign: 'center' }}>
        <em>Note: This registration is only for participants. Clubs/Organisers please contact the admin for making an account.</em>
      </p>

      {/* Form Outlet */}
      <div className="form-outlet">
        <form onSubmit={handleSubmit}>
          <div>
            <label>
              {userType === 'iiit' ? 'IIIT Email:' : 'Email:'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <div>
            <label>Confirm Password:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            Register
          </button>
        </form>
        {message && (
          <p>
            {message}
          </p>
        )}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p>Already have an account? <button onClick={() => navigate('/auth/login')} style={{ background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Login here</button></p>
        </div>
      </div>
    </div>
  );
}
