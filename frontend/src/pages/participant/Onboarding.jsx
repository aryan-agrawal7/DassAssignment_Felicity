import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Onboarding() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOnboardingData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/participant/onboarding-data', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories);
          setClubs(data.clubs);
        } else {
          setError('Failed to fetch onboarding data');
        }
      } catch (err) {
        setError('Error connecting to server');
      } finally {
        setLoading(false);
      }
    };

    fetchOnboardingData();
  }, []);

  const handleTopicToggle = (topic) => {
    setSelectedTopics(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const handleClubToggle = (club) => {
    setSelectedClubs(prev => 
      prev.includes(club) ? prev.filter(c => c !== club) : [...prev, club]
    );
  };

  const submitOnboarding = async (isSkip = false) => {
    try {
      const token = localStorage.getItem('token');
      const payload = isSkip ? { topics: [], clubs: [] } : { topics: selectedTopics, clubs: selectedClubs };
      
      const response = await fetch('http://localhost:5000/api/participant/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        navigate('/participant/dashboard');
      } else {
        setError('Failed to save onboarding data');
      }
    } catch (err) {
      setError('Error connecting to server');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="onboarding-page" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Welcome! Let's personalize your experience</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ marginTop: '30px' }}>
        <h2>Areas of Interest</h2>
        <p>Select the topics you are interested in:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
          {categories.length > 0 ? categories.map(category => (
            <button
              key={category}
              onClick={() => handleTopicToggle(category)}
              style={{
                padding: '10px 15px',
                borderRadius: '20px',
                border: '1px solid #007bff',
                backgroundColor: selectedTopics.includes(category) ? '#007bff' : 'white',
                color: selectedTopics.includes(category) ? 'white' : '#007bff',
                cursor: 'pointer'
              }}
            >
              {category}
            </button>
          )) : <p>No categories available.</p>}
        </div>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h2>Clubs to Follow</h2>
        <p>Select the clubs you want to follow:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
          {clubs.length > 0 ? clubs.map(club => (
            <button
              key={club}
              onClick={() => handleClubToggle(club)}
              style={{
                padding: '10px 15px',
                borderRadius: '20px',
                border: '1px solid #28a745',
                backgroundColor: selectedClubs.includes(club) ? '#28a745' : 'white',
                color: selectedClubs.includes(club) ? 'white' : '#28a745',
                cursor: 'pointer'
              }}
            >
              {club}
            </button>
          )) : <p>No clubs available.</p>}
        </div>
      </div>

      <div style={{ marginTop: '50px', display: 'flex', gap: '20px' }}>
        <button 
          onClick={() => submitOnboarding(false)}
          style={{ padding: '12px 24px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}
        >
          Submit
        </button>
        <button 
          onClick={() => submitOnboarding(true)}
          style={{ padding: '12px 24px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
