import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Users
} from "lucide-react";

export default function Circles() {
  const [user, setUser] = useState(null);
  const [circles, setCircles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [newCircleName, setNewCircleName] = useState("");
  const [newCircleType, setNewCircleType] = useState("");

  useEffect(() => {
    loadData();
    loadInvitations();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userRes = await fetch('http://localhost:3000/api/me', { credentials: 'include' });
      if (!userRes.ok) throw new Error('Failed to fetch user');
      const currentUser = await userRes.json();
      setUser(currentUser);

      const circlesRes = await fetch('http://localhost:3000/api/circle/user', { credentials: 'include' });
      if (!circlesRes.ok) throw new Error('Failed to fetch circles');
      const userCircles = await circlesRes.json();
      setCircles(userCircles.data || []);
    } catch (error) {
      console.error("Error loading circles:", error);
    }
    setIsLoading(false);
  };

  const loadInvitations = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/invitations/my', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch invitations');
      const result = await res.json();
      setInvitations(result.data.invitations || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  };

  const handleCreateCircle = async () => {
    try {
      const circleData = {
        name: newCircleName,
        type: newCircleType || undefined, // Optional field, will be undefined if not selected
      };
      const res = await fetch('http://localhost:3000/api/circle', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(circleData)
      });
      if (!res.ok) throw new Error('Failed to create circle');
      const result = await res.json();
      setCircles([...circles, result.data]);
      setShowCreateForm(false);
      setNewCircleName("");
      setNewCircleType("");
    } catch (error) {
      console.error("Error creating circle:", error);
    }
  };

  const handleAcceptInvitation = async (invitationId) => {
    try {
      const res = await fetch(`http://localhost:3000/api/invitations/${invitationId}/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to accept invitation');
      await res.json();
      loadData();
      loadInvitations();
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    try {
      const res = await fetch(`http://localhost:3000/api/invitations/${invitationId}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to reject invitation');
      await res.json();
      loadInvitations();
    } catch (error) {
      console.error('Error rejecting invitation:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center px-4 font-sans">
      <div className="bg-white dark:bg-[#2e2e2e] shadow-md rounded-lg p-4 sm:p-8 max-w-7xl w-full">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Circles</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your friend groups and expenses
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowCreateForm(true)}
                style={{ display: 'flex', alignItems: 'center', background: '#4c1d95', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', transition: 'background 0.2s' }}
                onMouseOver={e => (e.currentTarget.style.background = '#381e72')}
                onMouseOut={e => (e.currentTarget.style.background = '#4c1d95')}
              >
                <Plus style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                Create Circle
              </button>
            </div>
          </div>

          {showCreateForm && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(30,41,59,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
              <div style={{ background: 'white', boxShadow: '0 8px 32px rgba(30,41,59,0.15)', padding: '1rem', borderRadius: '1rem', width: '95vw', maxWidth: '24rem', position: 'relative', border: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewCircleName("");
                    setNewCircleType("");
                  }}
                  style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', color: '#6b7280', cursor: 'pointer' }}
                  aria-label="Close"
                >
                  &times;
                </button>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '1.5rem', textAlign: 'center' }}>Create New Circle</h2>
                <form onSubmit={e => { e.preventDefault(); handleCreateCircle(); }}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Circle Name</label>
                    <input
                      type="text"
                      placeholder="Enter circle name"
                      value={newCircleName}
                      onChange={e => setNewCircleName(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem', background: '#f9fafb', marginBottom: 0, color: '#1f2937' }}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Type <span style={{ color: '#6b7280', fontWeight: '400' }}>(optional)</span></label>
                    <select
                      value={newCircleType}
                      onChange={e => setNewCircleType(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem', background: '#f9fafb', color: '#1f2937' }}
                    >
                      <option value="">Select type</option>
                      <option value="friends" style={{ color: '#1f2937' }}>Friends</option>
                      <option value="family" style={{ color: '#1f2937' }}>Family</option>
                      <option value="roommates" style={{ color: '#1f2937' }}>Roommates</option>
                      <option value="travel" style={{ color: '#1f2937' }}>Travel</option>
                      <option value="project" style={{ color: '#1f2937' }}>Project</option>
                      <option value="colleagues" style={{ color: '#1f2937' }}>Colleagues</option>
                      <option value="couple" style={{ color: '#1f2937' }}>Couple</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    <button
                      type="submit"
                      style={{ background: '#4c1d95', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: '700', border: 'none', fontSize: '1rem', transition: 'background 0.2s', boxShadow: '0 2px 8px rgba(30,41,59,0.08)' }}
                      onMouseOver={e => (e.currentTarget.style.background = '#381e72')}
                      onMouseOut={e => (e.currentTarget.style.background = '#4c1d95')}
                      disabled={!newCircleName.trim()}
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewCircleName("");
                        setNewCircleType("");
                      }}
                      style={{ background: '#e5e7eb', color: '#4b5563', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: '600', border: 'none', fontSize: '1rem', transition: 'background 0.2s' }}
                      onMouseOver={e => (e.currentTarget.style.background = '#d1d5db')}
                      onMouseOut={e => (e.currentTarget.style.background = '#e5e7eb')}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {invitations.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Pending Invitations</h2>
              <div className="space-y-4">
                {invitations.map(invite => (
                  <div key={invite.id} className="bg-white dark:bg-[#2e2e2e] border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-md">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{invite.circle?.name || 'Circle'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Invited by {invite.inviter?.username || invite.inviter_id}</p>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        style={{ background: '#4c1d95', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontWeight: '600', border: 'none', transition: 'background 0.2s' }}
                        onMouseOver={e => (e.currentTarget.style.background = '#381e72')}
                        onMouseOut={e => (e.currentTarget.style.background = '#4c1d95')}
                        onClick={() => handleAcceptInvitation(invite.id)}
                      >
                        Accept
                      </button>
                      <button
                        style={{ background: '#e5e7eb', color: '#4b5563', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontWeight: '500', border: 'none', transition: 'background 0.2s' }}
                        onMouseOver={e => (e.currentTarget.style.background = '#d1d5db')}
                        onMouseOut={e => (e.currentTarget.style.background = '#e5e7eb')}
                        onClick={() => handleRejectInvitation(invite.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {circles.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-gray-300 dark:text-gray-500 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No circles yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Create your first circle to start splitting expenses with friends, 
                or join an existing circle with an invite code.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowCreateForm(true)}
                  style={{ background: '#4c1d95', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', transition: 'background 0.2s' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#381e72')}
                  onMouseOut={e => (e.currentTarget.style.background = '#4c1d95')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Circle
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {circles.map((circle) => (
                <div key={circle.id} className="bg-white dark:bg-[#2e2e2e] border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-md">
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'white', marginBottom: '0.5rem' }}>
                    {circle.name} {circle.type && `(${circle.type})`}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'white', paddingBottom: '0.5rem' }}>
                    {circle.members?.length || circle.member_count || 0} members
                  </p>
                  <Link to={`/Circles/${circle.id}`}>
                    <button style={{ background: '#4c1d95', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontWeight: '600', border: 'none', transition: 'background 0.2s' }}>
                      View Details
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}