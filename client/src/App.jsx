import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { MetaverseProvider } from './contexts/MetaverseContext'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import Metaverse from './pages/Metaverse'
import MetaverseEdit from './pages/MetaverseEdit'
import WaitingRoom from './pages/WaitingRoom'
import SNSPage from './pages/SNSPage'
import ShopPage from './pages/ShopPage'
import PrivateRoute from './components/PrivateRoute'
import MainPage from './pages/MainPage'
import './App.css'

const App = () => {
  return (
    <AuthProvider>
      <MetaverseProvider>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/metaverse" element={<Navigate to="/" />} />
            <Route path="/metaverse/waiting-room" element={
              <PrivateRoute>
                <WaitingRoom />
              </PrivateRoute>
            } />
            <Route path="/metaverse/lobby" element={
              <PrivateRoute>
                <Metaverse />
              </PrivateRoute>
            } />
            <Route path="/metaverse/:mapId" element={
              <PrivateRoute>
                <Metaverse />
              </PrivateRoute>
            } />
            <Route path="/join/:link" element={<Metaverse />} />
            <Route path="/metaverse/edit/:mapId" element={
              <PrivateRoute>
                <MetaverseEdit />
              </PrivateRoute>
            } />
            <Route path="/sns" element={
              <PrivateRoute>
                <SNSPage />
              </PrivateRoute>
            } />
            <Route path="/shop" element={
              <PrivateRoute>
                <ShopPage />
              </PrivateRoute>
            } />
            <Route path="/" element={
              <PrivateRoute>
                <MainPage />
              </PrivateRoute>
            } />
          </Routes>
        </div>
      </MetaverseProvider>
    </AuthProvider>
  )
}

export default App 