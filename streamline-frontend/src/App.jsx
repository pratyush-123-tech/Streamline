import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import LandingPage from './pages/LandingPage'

import {Route,BrowserRouter as Router,Routes} from "react-router-dom"
import Authenticate from './pages/Authenticate'
import {AuthProvider}  from './contexts/AuthContext'
import VideoCall from './pages/VideoCall'


function App() {
   

  return (
    <>
      
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage/>}/>
            <Route path="/auth" element={<Authenticate/>}/>
            <Route path="/:url" element={<VideoCall/>}/>
          </Routes>
        </AuthProvider>
      </Router>
    </>
  )
}

export default App;
