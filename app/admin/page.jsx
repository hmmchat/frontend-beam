'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalMatches: 0,
    activeCalls: 0
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/');
        return;
      }

      // Fetch users
      const usersResponse = await fetch('http://localhost:3002/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
        
        // Calculate stats
        setStats({
          totalUsers: usersData.users?.length || 0,
          activeUsers: usersData.users?.filter(u => u.status !== 'IDLE').length || 0,
          totalMatches: 0, // Would need matches endpoint
          activeCalls: usersData.users?.filter(u => u.status === 'IN_CALL').length || 0
        });
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-white text-2xl">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-white/70">Manage users and monitor platform activity</p>
          </div>
          <button
            onClick={() => router.push('/facecard')}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full transition-all"
          >
            Back to App
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <div className="text-white/60 text-sm mb-2">Total Users</div>
            <div className="text-4xl font-bold">{stats.totalUsers}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <div className="text-white/60 text-sm mb-2">Active Users</div>
            <div className="text-4xl font-bold text-green-400">{stats.activeUsers}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <div className="text-white/60 text-sm mb-2">Total Matches</div>
            <div className="text-4xl font-bold text-pink-400">{stats.totalMatches}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <div className="text-white/60 text-sm mb-2">Active Calls</div>
            <div className="text-4xl font-bold text-blue-400">{stats.activeCalls}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-full transition-all ${
              activeTab === 'overview'
                ? 'bg-white text-purple-900 font-semibold'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-full transition-all ${
              activeTab === 'users'
                ? 'bg-white text-purple-900 font-semibold'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-6 py-3 rounded-full transition-all ${
              activeTab === 'matches'
                ? 'bg-white text-purple-900 font-semibold'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Matches
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`px-6 py-3 rounded-full transition-all ${
              activeTab === 'calls'
                ? 'bg-white text-purple-900 font-semibold'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Active Calls
          </button>
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Platform Overview</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <span>Users Online</span>
                  <span className="text-green-400 font-semibold">{stats.activeUsers}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <span>Users Discovering</span>
                  <span className="text-blue-400 font-semibold">
                    {users.filter(u => u.status === 'DISCOVERING').length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <span>Users in Squad</span>
                  <span className="text-purple-400 font-semibold">
                    {users.filter(u => u.status === 'IN_SQUAD').length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <span>Users in Call</span>
                  <span className="text-pink-400 font-semibold">
                    {users.filter(u => u.status === 'IN_CALL').length}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">All Users</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left p-3">Username</th>
                      <th className="text-left p-3">Gender</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Location</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-white/10 hover:bg-white/5">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {user.displayPictureUrl ? (
                              <img
                                src={user.displayPictureUrl}
                                alt={user.username}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                                {user.username?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <span>{user.username || 'No username'}</span>
                          </div>
                        </td>
                        <td className="p-3">{user.gender || 'N/A'}</td>
                        <td className="p-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs ${
                              user.status === 'IDLE'
                                ? 'bg-gray-500/20 text-gray-300'
                                : user.status === 'DISCOVERING'
                                ? 'bg-blue-500/20 text-blue-300'
                                : user.status === 'IN_SQUAD'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-green-500/20 text-green-300'
                            }`}
                          >
                            {user.status || 'IDLE'}
                          </span>
                        </td>
                        <td className="p-3">
                          {user.latitude && user.longitude
                            ? `${user.latitude.toFixed(2)}, ${user.longitude.toFixed(2)}`
                            : 'N/A'}
                        </td>
                        <td className="p-3">
                          <button className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-all">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'matches' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Recent Matches</h2>
              <p className="text-white/60">Matches data will be displayed here</p>
            </div>
          )}

          {activeTab === 'calls' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Active Calls</h2>
              <p className="text-white/60">Active calls monitoring will be displayed here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
