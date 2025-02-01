import './App.css'
import Navigation from './components/Navigation'
import Home from './components/Home'
import WhyPage from './components/WhyPage'
import ComingSoon from './components/ComingSoon'
import AnimatedBackground from './components/AnimatedBackground'
import Documentation from './components/Documentation'
import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <div className="min-h-screen text-white relative">
      <AnimatedBackground />
      <Navigation />
      <div className="pt-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/why" element={<WhyPage />} />
          <Route path="/guide" element={<ComingSoon />} />
          <Route path="/docs" element={<Documentation />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
