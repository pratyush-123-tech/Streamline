import { Route, BrowserRouter as Router, Routes } from "react-router-dom"
import LandingPage from './pages/LandingPage'
import Authenticate from './pages/Authenticate'
import { AuthProvider } from './contexts/AuthContext'
import VideoCall from './pages/VideoCall'
import Home from './pages/Home'
import History from './pages/History'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<Authenticate />} />
          <Route path="/home" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/:url" element={<VideoCall />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
