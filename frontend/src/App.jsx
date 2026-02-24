import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import ParticipantLayout from './layouts/ParticipantLayout';
import OrganizerLayout from './layouts/OrganizerLayout';
import AdminLayout from './layouts/AdminLayout';

// Pages
import Home from './pages/Home';
import Login from './pages/auth/Login';
import AdminLogin from './pages/auth/AdminLogin';
import Register from './pages/auth/Register';
import Events from './pages/participant/Events';
import Calendar from './pages/participant/Calendar';
import Onboarding from './pages/participant/Onboarding';
import ParticipantDashboard from './pages/participant/Dashboard';
import Clubs from './pages/participant/Clubs';
import ClubDetails from './pages/participant/ClubDetails';
import ParticipantEventDetails from './pages/participant/EventDetails';
import ParticipantProfile from './pages/participant/Profile';
import TeamDashboard from './pages/participant/TeamDashboard';
import TeamChat from './pages/participant/TeamChat';
import OrganizerDashboard from './pages/organizer/Dashboard';
import CreateEvent from './pages/organizer/CreateEvent';
import EventDetails from './pages/organizer/EventDetails';
import Profile from './pages/organizer/Profile';
import OngoingEvents from './pages/organizer/OngoingEvents';
import EventAttendance from './pages/organizer/EventAttendance';
import AdminDashboard from './pages/admin/Dashboard';
import ManageClubs from './pages/admin/ManageClubs';
import PasswordResets from './pages/admin/PasswordResets';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Home />} />
        <Route path="/adminlogin" element={<AdminLogin />} />

        {/* Auth Routes */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>

        {/* Participant Routes */}
        <Route path="/participant" element={<ParticipantLayout />}>
          <Route path="dashboard" element={<ParticipantDashboard />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="events" element={<Events />} />
          <Route path="events/:id" element={<ParticipantEventDetails />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="clubs" element={<Clubs />} />
          <Route path="clubs/:id" element={<ClubDetails />} />
          <Route path="profile" element={<ParticipantProfile />} />
          <Route path="teams" element={<TeamDashboard />} />
          <Route path="teams/:id/chat" element={<TeamChat />} />
        </Route>

        {/* Organizer Routes */}
        <Route path="/organizer" element={<OrganizerLayout />}>
          <Route path="dashboard" element={<OrganizerDashboard />} />
          <Route path="create-event" element={<CreateEvent />} />
          <Route path="events/:id" element={<EventDetails />} />
          <Route path="events/:id/attendance" element={<EventAttendance />} />
          <Route path="ongoing-events" element={<OngoingEvents />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="manage-clubs" element={<ManageClubs />} />
          <Route path="password-resets" element={<PasswordResets />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
