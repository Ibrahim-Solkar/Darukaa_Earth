import React from 'react'
import { Outlet, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const Layout: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <nav className="bg-green-900 text-white shadow-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div
              className="flex cursor-pointer items-center"
              onClick={() => navigate('/dashboard')}
            >
              <span className="text-xl font-bold tracking-tight">Darukaa.Earth 🌍</span>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <>
                  {user.role === 'admin' && (
                    <Link
                      to="/projects"
                      className="hidden text-sm font-medium text-green-100 transition-colors hover:text-white sm:block"
                    >
                      Projects
                    </Link>
                  )}
                  <span className="hidden text-sm text-green-100 sm:block">
                    {user.name} ({user.role})
                  </span>
                  <button
                    onClick={logout}
                    className="rounded-md bg-green-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
