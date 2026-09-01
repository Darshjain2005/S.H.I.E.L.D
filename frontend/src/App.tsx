import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Incidents from './pages/Incidents';
import Assistant from './pages/Assistant';
import Simulation from './pages/Simulation';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/events" element={<Events />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/simulation" element={<Simulation />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
