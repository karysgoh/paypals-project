import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Notification from "../components/Notification";
import { useNotification } from "../hooks/useNotification";
import { 
  Plus, 
  Users,
  X,
  UserPlus,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

const Button = ({ children, variant = "default", size = "default", className = "", onClick, disabled, ...props }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    destructive: "bg-red-600 text-white hover:bg-red-700"
  };
  
  const sizes = {
    default: "h-10 px-6 py-2",
    sm: "h-8 px-3 text-xs",
    lg: "h-12 px-8 text-base",
    icon: "h-10 w-10",
    "icon-sm": "h-8 w-8"
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = "" }) => (
  <div className={`rounded-lg border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
    {children}
  </div>
);

export default function Circles() {
  const [user, setUser] = useState(null);
  const [circles, setCircles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [newCircleName, setNewCircleName] = useState("");
  const [newCircleType, setNewCircleType] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [processingInvitation, setProcessingInvitation] = useState(null);

  // Notification hook
  const { notification, showNotification, hideNotification } = useNotification();

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

      const circlesRes = await fetch('http://localhost:3000/api/circles/user', { credentials: 'include' });
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
      const allInvitations = result.data.invitations || [];
      
      // Set all invitations for display (including expired ones)
      setInvitations(allInvitations);
      
      // Check for recently expired invitations to show notifications
      const expiredInvitations = allInvitations.filter(invitation => 
        invitation.status === 'expired' && 
        new Date(invitation.expires_at) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
      );
      
      // Show notification for expired invitations
      if (expiredInvitations.length > 0) {
        const expiredNames = expiredInvitations.map(inv => inv.circle?.name).join(', ');
        showNotification(
          `${expiredInvitations.length} invitation${expiredInvitations.length > 1 ? 's' : ''} expired: ${expiredNames}`, 
          'warning'
        );
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  };

  const handleCreateCircle = async () => {
    try {
      const circleData = {
        name: newCircleName,
        type: newCircleType || undefined,
      };
      const res = await fetch('http://localhost:3000/api/circles', {
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
      setErrorMessage("");
      setProcessingInvitation(invitationId);
      
      const res = await fetch(`http://localhost:3000/api/invitations/${invitationId}/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to accept invitation');
      }
      
      const result = await res.json();
      
      // Remove the invitation from the list immediately
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      // Show success message
      setSuccessMessage(`Successfully joined ${result.data?.circle?.name || 'the circle'}!`);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccessMessage(""), 5000);
      
      // Reload circles to show the new one
      loadData();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setErrorMessage(error.message || 'Failed to accept invitation. Please try again.');
      setTimeout(() => setErrorMessage(""), 5000);
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    try {
      setErrorMessage("");
      setProcessingInvitation(invitationId);
      
      const res = await fetch(`http://localhost:3000/api/invitations/${invitationId}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to reject invitation');
      }
      
      // Remove the invitation from the list immediately
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      // Show success message
      setSuccessMessage("Invitation declined successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      setErrorMessage(error.message || 'Failed to reject invitation. Please try again.');
      setTimeout(() => setErrorMessage(""), 5000);
    } finally {
      setProcessingInvitation(null);
    }
  };

  const getCircleTypeIcon = (type) => {
    switch (type) {
      case 'friends': return '👥';
      case 'family': return '👨‍👩‍👧‍👦';
      case 'roommates': return '🏠';
      case 'travel': return '✈️';
      case 'project': return '💼';
      case 'colleagues': return '🏢';
      case 'couple': return '💑';
      default: return '👥';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-slate-200 rounded-lg w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Notification 
        message={notification.message} 
        type={notification.type} 
        onClose={hideNotification} 
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
          <div className="space-y-4">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors duration-200 group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
              Back to Dashboard
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">My Circles</h1>
              <p className="text-lg text-slate-600">
                Manage your friend groups and shared transactions
              </p>
            </div>
          </div>
          <Button 
            variant="primary" 
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
            size="md"
            data-tour="create-circle"
          >
            <Plus className="w-4 h-4" />
            Create Circle
          </Button>
        </div>

        {/* Create Circle Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md sm:max-w-lg relative">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewCircleName("");
                  setNewCircleType("");
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Create New Circle</h2>
              
              <div onSubmit={(e) => { e.preventDefault(); handleCreateCircle(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Circle Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter circle name"
                    value={newCircleName}
                    onChange={(e) => setNewCircleName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 text-slate-900"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Type <span className="text-slate-500 font-normal">(optional)</span>
                  </label>
                  <select
                    value={newCircleType}
                    onChange={(e) => setNewCircleType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 bg-white text-slate-900"
                  >
                    <option value="">Select type</option>
                    <option value="friends">Friends</option>
                    <option value="family">Family</option>
                    <option value="roommates">Roommates</option>
                    <option value="travel">Travel</option>
                    <option value="project">Project</option>
                    <option value="colleagues">Colleagues</option>
                    <option value="couple">Couple</option>
                  </select>
                </div>
                
                <div className="flex gap-3 pt-4">
                <button 
                  onClick={handleCreateCircle}
                  disabled={!newCircleName.trim()}
                  className="flex-1 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-6 py-2"
                >
                  Create Circle
                </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewCircleName("");
                      setNewCircleType("");
                    }}
                    className="flex-1 bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-6 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm">✓</span>
              </div>
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-sm">!</span>
              </div>
              <p className="text-red-800 font-medium">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-slate-900 mb-6">
              Invitations ({invitations.filter(inv => inv.status === 'pending').length} pending, {invitations.filter(inv => inv.status === 'expired').length} expired)
            </h2>
            <div className="space-y-4">
              {invitations.map(invite => (
                <Card key={invite.id}>
                  <div className={`flex items-center justify-between ${invite.status === 'expired' ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        invite.status === 'expired' ? 'bg-red-100' : 'bg-slate-100'
                      }`}>
                        <UserPlus className={`w-6 h-6 ${
                          invite.status === 'expired' ? 'text-red-600' : 'text-slate-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{invite.circle?.name || 'Circle'}</h3>
                          {invite.status === 'expired' && (
                            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                              Expired
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">
                          Invited by {invite.inviter?.username || invite.inviter_id}
                          {invite.status === 'expired' && (
                            <span className="text-red-600 ml-2">
                              • Expired {new Date(invite.expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {invite.status === 'pending' ? (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAcceptInvitation(invite.id)}
                            disabled={processingInvitation === invite.id}
                          >
                            {processingInvitation === invite.id ? 'Accepting...' : 'Accept'}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRejectInvitation(invite.id)}
                            disabled={processingInvitation === invite.id}
                          >
                            {processingInvitation === invite.id ? 'Declining...' : 'Decline'}
                          </Button>
                        </>
                      ) : (
                        <div className="text-sm text-red-600 font-medium">
                          This invitation has expired
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {circles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Circles</p>
                  <p className="text-2xl font-bold text-slate-900">{circles.length}</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Members</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {circles.reduce((sum, circle) => sum + (circle.memberCount || 0), 0)}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Active Circles</p>
                  <p className="text-2xl font-bold text-slate-900">{circles.length}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Circles Grid */}
        {circles.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 mb-3">
              No circles yet
            </h3>
            <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
              Create your first circle to start splitting transactions with friends, 
              or join an existing circle with an invite code.
            </p>
            <Button 
              variant="primary" 
              size="lg"
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Your First Circle
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {circles.map((circle) => (
              <Card key={circle.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-xl">
                      {getCircleTypeIcon(circle.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {circle.name}
                      </h3>
                      {circle.type && (
                        <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                          {circle.type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-slate-600 mb-6">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{circle.memberCount} members</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Active</span>
                  </div>
                </div>
                
                <button
                  onClick={() => window.location.href = `/circles/${circle.id}`}
                  className="w-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-6 py-2 gap-2"
                >
                  View Details
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}