import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';

export default function AdminLogin() {
  const token = localStorage.getItem('token');

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;

      if (payload.exp && payload.exp < currentTime) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      } else {
        const role = payload.userType;

        if (role === 'participant' || role === 'iiit' || role === 'non-iiit') {
          if (payload.filled === false) {
            return <Navigate to="/participant/onboarding" replace />;
          } else {
            return <Navigate to="/participant/dashboard" replace />;
          }
        } else if (role === 'organizer') {
          return <Navigate to="/organizer/dashboard" replace />;
        } else if (role === 'admin') {
          return <Navigate to="/admin/dashboard" replace />;
        }
      }
    } catch (error) {
      console.error('Invalid token');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/admin-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, turnstileToken }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        navigate('/admin/dashboard');
      } else {
        setMessage(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Failed to connect to the server.');
    }
  };

  return (
    <div>
      <h1>Admin Login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>User ID:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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

        <button type="submit" disabled={!turnstileToken}>Login</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}
