import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from "../components/AuthProvider";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Users, Clock, DollarSign, X, MapPin, Navigation, Target, Edit, Trash, UserMinus, UserPlus, Search, Mail, User, ArrowLeft } from "lucide-react";
import Notification from "../components/Notification";
import { useNotification } from "../hooks/useNotification";

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const Button = ({ children, variant = "default", size = "default", className = "", ...props }) => {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes = {
    sm: "h-8 px-3 text-sm",
    default: "h-9 px-4 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-6 text-base",
  };
  return (
    <button className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.default} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Card = ({ children, className = "", ...props }) => (
  <div className={`bg-white border border-slate-200 rounded-lg shadow-sm ${className}`} {...props}>{children}</div>
);

export default function CircleDetail() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [circles, setCircles] = useState([]);
  const [selectedCircleId, setSelectedCircleId] = useState(id);
  const [circle, setCircle] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMine, setFilterMine] = useState(false);
  const [error, setError] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [emailValidating, setEmailValidating] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  
  // Notification hook
  const { notification, showNotification, hideNotification } = useNotification();
  
  // New state for enhanced invitation
  const [inviteInput, setInviteInput] = useState('');
  const [inviteMode, setInviteMode] = useState('search'); // 'search' or 'email'
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [existingMemberResults, setExistingMemberResults] = useState([]);
  const [showCreateCircle, setShowCreateCircle] = useState(false);
  const [showUpdateCircle, setShowUpdateCircle] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showRemoveMember, setShowRemoveMember] = useState(null);
  const [showUpdateRole, setShowUpdateRole] = useState(null);
  const [circleForm, setCircleForm] = useState({ name: '', type: 'friends' });
  const [circleFormError, setCircleFormError] = useState(null);
  const [circleFormLoading, setCircleFormLoading] = useState(false);

  // Transaction modal state
  const [showCreate, setShowCreate] = useState(false);
  const [txForm, setTxForm] = useState({
    name: '',
    description: '',
    category: 'other',
    total_amount: '',
    splitEven: true,
    participants: [],
    external_participants: [],
    place_id: '',
    location_lat: '',
    location_lng: '',
  });
  const [creating, setCreating] = useState(false);
  const [txError, setTxError] = useState(null);
  const [placeSearchResults, setPlaceSearchResults] = useState([]);
  const [searchLat, setSearchLat] = useState('');
  const [searchLng, setSearchLng] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const debounceRef = useRef(null);

  // Define visibleTransactions
  const visibleTransactions = filterMine
    ? transactions.filter(t => t.is_user_participant || (t.members || []).some(m => m.user_id === currentUser?.id))
    : transactions;

  const fetchUserCircles = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/circles/user`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!res.ok) {
        if (res.status === 401) navigate('/login');
        throw new Error('Failed to load circles');
      }
      const json = await res.json();
      setCircles(json.data || []);
      // If no circle ID in URL and we have circles, redirect to first circle
      if (!id && (json.data || []).length > 0) {
        navigate(`/circles/${(json.data || [])[0].id}`, { replace: true });
      }
    } catch (e) {
      setError(e.message);
    }
  }, [id, navigate]);

  const fetchCircle = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [circleRes, txRes] = await Promise.all([
        fetch(`${apiBase}/circles/${id}`, {
          credentials: 'include',
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        }),
        fetch(`${apiBase}/transactions/circle/${id}`, {
          credentials: 'include',
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        }),
      ]);
      if (!circleRes.ok) {
        if (circleRes.status === 401) navigate('/login');
        if (circleRes.status === 404) {
          navigate('/circles');
          return;
        }
        throw new Error('Failed to load circle');
      }
      if (!txRes.ok) throw new Error('Failed to load transactions');
      const circleJson = await circleRes.json();
      const txJson = await txRes.json();
      setCircle(circleJson.data || circleJson);
      setTransactions(txJson.data?.transactions || txJson.data || []);
      
      // Fetch pending invitations for this circle
      fetchPendingInvitations(id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const createCircle = async (e) => {
    e.preventDefault();
    setCircleFormError(null);
    setCircleFormLoading(true);
    try {
      const res = await fetch(`${apiBase}/circles`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          name: circleForm.name,
          type: circleForm.type,
          created_by: currentUser.user_id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create circle');
      const newCircle = json.data || json;
      await fetchUserCircles();
      setShowCreateCircle(false);
      setCircleForm({ name: '', type: 'friends' });
      showNotification('Circle created successfully', 'success');
      // Navigate to the new circle
      if (newCircle && newCircle.id) {
        navigate(`/circles/${newCircle.id}`);
      }
    } catch (err) {
      setCircleFormError(err.message);
    } finally {
      setCircleFormLoading(false);
    }
  };

  const updateCircle = async (e) => {
    e.preventDefault();
    setCircleFormError(null);
    setCircleFormLoading(true);
    try {
      const res = await fetch(`${apiBase}/circles/${selectedCircleId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          name: circleForm.name,
          type: circleForm.type,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update circle');
      await fetchCircle(selectedCircleId);
      setShowUpdateCircle(false);
      setCircleForm({ name: '', type: 'friends' });
      showNotification('Circle updated successfully', 'success');
    } catch (err) {
      setCircleFormError(err.message);
    } finally {
      setCircleFormLoading(false);
    }
  };

  const deleteCircle = async () => {
    setError(null);
    setCircleFormLoading(true);
    try {
      const res = await fetch(`${apiBase}/circles/${selectedCircleId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete circle');
      await fetchUserCircles();
      setSelectedCircleId(null);
      setCircle(null);
      setTransactions([]);
      setShowDeleteConfirm(false);
      showNotification('Circle deleted successfully', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setCircleFormLoading(false);
    }
  };

  const leaveCircle = async () => {
    setError(null);
    setCircleFormLoading(true);
    
    // Frontend validation: Check if user is the only admin
    const adminMembers = circle?.members?.filter(m => m.role === 'admin') || [];
    const isCurrentUserOnlyAdmin = adminMembers.length === 1 && adminMembers[0].user.user_id === currentUser?.id;
    
    if (isCurrentUserOnlyAdmin) {
      showNotification('Cannot leave circle as the only admin. Please promote another member to admin first.', 'error');
      setCircleFormLoading(false);
      setShowLeaveConfirm(false);
      return;
    }
    
    try {
      const res = await fetch(`${apiBase}/circles/${selectedCircleId}/leave`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to leave circle');
      await fetchUserCircles();
      setSelectedCircleId(null);
      setCircle(null);
      setTransactions([]);
      setShowLeaveConfirm(false);
      showNotification('You have left the circle', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setCircleFormLoading(false);
    }
  };

  const removeMember = async (memberId) => {
    setError(null);
    setCircleFormLoading(true);
    try {
      const res = await fetch(`${apiBase}/circles/${selectedCircleId}/members/${memberId}/remove`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to remove member');
      await fetchCircle(selectedCircleId);
      setShowRemoveMember(null);
      showNotification('Member removed successfully', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setCircleFormLoading(false);
    }
  };

  const updateMemberRole = async (memberId, newRole) => {
    setError(null);
    setCircleFormLoading(true);
    try {
      const res = await fetch(`${apiBase}/circles/${selectedCircleId}/members/${memberId}/role`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update member role');
      await fetchCircle(selectedCircleId);
      setShowUpdateRole(null);
      showNotification('Member role updated successfully', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setCircleFormLoading(false);
    }
  };

  // Search users by username
  const searchUsers = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setExistingMemberResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`${apiBase}/users/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to search users');
      
      // Separate available users from existing members
      const currentMembers = circle?.members || [];
      
      const allResults = json.data?.users || [];
      const availableUsers = [];
      const existingMembers = [];
      
      allResults.forEach(user => {
        // Convert IDs to strings for comparison to handle type mismatches
        const userId = String(user.id);
        const currentUserId = String(currentUser?.user_id || '');
        
        // Skip current user entirely
        if (userId === currentUserId) {
          return;
        }
        
        // Check if user is already a member
        const isExistingMember = currentMembers.some(member => {
          const memberUserId = String(member.user_id || '');
          return memberUserId === userId;
        });
        
        if (isExistingMember) {
          existingMembers.push(user);
        } else {
          availableUsers.push(user);
        }
      });
      
      setSearchResults(availableUsers);
      setExistingMemberResults(existingMembers);
      setShowSearchResults(true);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setSearching(false);
    }
  }, [apiBase, currentUser?.user_id, circle?.members]);

  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check if email belongs to a registered user
  const checkUserByEmail = async (email) => {
    setEmailValidating(true);
    try {
      const res = await fetch(`${apiBase}/users/check-email`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        const json = await res.json();
        return json.data; // Returns user data if found, null if not found
      }
      return null;
    } catch (error) {
      console.error('Error checking user by email:', error);
      return null;
    } finally {
      setEmailValidating(false);
    }
  };

  // Handle invite submission
  const handleInviteSubmit = async () => {
    if (!inviteInput.trim()) {
      setInviteError('Please enter a username or email');
      return;
    }

    setInviteError('');
    setInviteSuccess('');
    setInviteLoading(true);

    try {
      let body = {};
      
      if (selectedUser) {
        // Invite by user ID
        body = { inviteeId: selectedUser.id };
      } else if (inviteInput.includes('@')) {
        // Validate email format first
        if (!isValidEmail(inviteInput)) {
          setInviteError('Please enter a valid email address');
          setInviteLoading(false);
          return;
        }

        // Check if email belongs to a registered user
        const existingUser = await checkUserByEmail(inviteInput);
        
        if (existingUser) {
          // Check if user is already a member of this circle
          const isAlreadyMember = circle?.members?.some(member => 
            member.user.email === inviteInput || member.user.user_id === existingUser.user_id
          );
          
          if (isAlreadyMember) {
            setInviteError('This user is already a member of the circle');
            setInviteLoading(false);
            return;
          }
          
          // User exists, invite by user ID for better tracking
          body = { inviteeId: existingUser.user_id };
          // Store user info for success message
          body.userInfo = existingUser;
        } else {
          // Email doesn't belong to a registered user
          setInviteError('No registered user found with this email address. Please ask them to sign up first.');
          setInviteLoading(false);
          return;
        }
      } else {
        setInviteError('Please select a user from search results or enter a valid email');
        setInviteLoading(false);
        return;
      }

      const res = await fetch(`${apiBase}/invitations/${selectedCircleId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(body),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send invitation');
      
      // Set appropriate success message
      if (selectedUser) {
        showNotification(`Invitation sent to @${selectedUser.username}!`, 'success');
      } else if (body.userInfo) {
        showNotification(`Invitation sent to ${body.userInfo.username || body.userInfo.email}!`, 'success');
      } else {
        showNotification('Invitation sent successfully!', 'success');
      }
      
      // Reset form
      setInviteInput('');
      setSelectedUser(null);
      setSearchResults([]);
      setShowSearchResults(false);
      
      // Refresh pending invitations
      fetchPendingInvitations();
      
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setInviteLoading(false);
    }
  };

  // Fetch pending invitations for the current circle
  const fetchPendingInvitations = useCallback(async (circleId = null) => {
    const targetCircleId = circleId || selectedCircleId;
    if (!targetCircleId) return;
    
    setLoadingInvitations(true);
    try {
      const res = await fetch(`${apiBase}/invitations/circle/${targetCircleId}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      
      if (res.ok) {
        const json = await res.json();
        setPendingInvitations(json.data || []);
      } else {
        console.warn('Failed to load pending invitations:', res.statusText);
        setPendingInvitations([]);
      }
    } catch (error) {
      console.error('Error loading pending invitations:', error);
      setPendingInvitations([]);
    } finally {
      setLoadingInvitations(false);
    }
  }, [selectedCircleId, apiBase]);

  // Cancel/delete a pending invitation
  const cancelInvitation = async (invitationId) => {
    try {
      const res = await fetch(`${apiBase}/invitations/${invitationId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      
      if (res.ok) {
        // Remove the cancelled invitation from the list
        setPendingInvitations(prev => prev.filter(inv => (inv.id || inv.invitation_id) !== invitationId));
        showNotification('Invitation cancelled successfully', 'success');
      } else {
        const json = await res.json();
        showNotification(json.message || 'Failed to cancel invitation', 'error');
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      showNotification('An error occurred while cancelling the invitation', 'error');
    }
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    fetchUserCircles();
  }, [currentUser, fetchUserCircles, navigate]);

  useEffect(() => {
    if (id) {
      setSelectedCircleId(id);
      fetchCircle(id);
    }
  }, [id, fetchCircle]);

  useEffect(() => {
    if (circle && circle.members) {
        const defaultParticipants = (circle.members || []).map(m => ({
            user_id: m.user_id || m.id,
            username: m.user?.username || m.username || m.name || m.email || String(m.user_id || m.id),
            amount_owed: 0,
            include: true,
            user: m.user || { id: m.user_id, username: m.user?.username || 'Unknown' }
        }));
        setTxForm(f => ({ ...f, participants: defaultParticipants }));
    }
    }, [circle]);

  const circleCentroid = useMemo(() => {
    if (!circle || !circle.members) return null;
    const pts = (circle.members || []).map(m => {
      const lat = parseFloat(m.location_lat || m.lat || m.latitude || 0);
      const lng = parseFloat(m.location_lng || m.lng || m.longitude || 0);
      return (!isNaN(lat) && !isNaN(lng)) ? { lat, lng } : null;
    }).filter(Boolean);
    if (pts.length === 0) return null;
    const avgLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const avgLng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
    return { lat: avgLat, lng: avgLng };
  }, [circle]);

  const updateParticipantInclude = (user_id, include) => {
    if (currentUser && user_id === currentUser.id) return;
    setTxForm(f => ({
      ...f,
      participants: f.participants.map(p => p.user_id === user_id ? { ...p, include } : p),
    }));
  };

  const updateParticipantAmount = (user_id, amount) => {
    setTxForm(f => ({
      ...f,
      participants: f.participants.map(p => p.user_id === user_id ? { ...p, amount_owed: parseFloat(amount) || 0 } : p),
    }));
  };

  // External participant helper functions
  const addExternalParticipant = () => {
    setTxForm(f => ({
      ...f,
      external_participants: [...f.external_participants, { 
        id: Date.now(), // temp ID for React key
        email: '', 
        name: '', 
        amount_owed: 0, 
        include: true 
      }]
    }));
  };

  const removeExternalParticipant = (id) => {
    setTxForm(f => ({
      ...f,
      external_participants: f.external_participants.filter(p => p.id !== id)
    }));
  };

  const updateExternalParticipant = (id, field, value) => {
    setTxForm(f => ({
      ...f,
      external_participants: f.external_participants.map(p => 
        p.id === id ? { ...p, [field]: value } : p
      )
    }));
  };

  const updateExternalParticipantInclude = (id, include) => {
    setTxForm(f => ({
      ...f,
      external_participants: f.external_participants.map(p => 
        p.id === id ? { ...p, include } : p
      )
    }));
  };

  const updateExternalParticipantAmount = (id, amount) => {
    setTxForm(f => ({
      ...f,
      external_participants: f.external_participants.map(p => 
        p.id === id ? { ...p, amount_owed: parseFloat(amount) || 0 } : p
      )
    }));
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    setTxError(null);
    if (!selectedCircleId) return setTxError('No circle selected');
    const total = parseFloat(txForm.total_amount);
    if (!txForm.name || !total || total <= 0) return setTxError('Please provide a name and a valid total amount');

    const included = txForm.participants.filter(p => p.include);
    const external = txForm.external_participants.filter(p => p.include);
    
    if (included.length === 0 && external.length === 0) {
      return setTxError('Select at least one participant');
    }

    if (currentUser) {
      const creatorIncluded = included.some(p => p.user_id === currentUser.user_id);
      if (!creatorIncluded) return setTxError('Transaction creator must be included as a participant');
    }

    let participantsPayload = [];
    const totalParticipants = included.length + external.length;
    
    if (txForm.splitEven) {
      const share = parseFloat((total / totalParticipants).toFixed(2));
      let running = 0;
      
      // Add circle member participants
      included.forEach((p, idx) => {
        const amount = idx === totalParticipants - 1 && external.length === 0 
          ? parseFloat((total - running).toFixed(2)) 
          : share;
        running += amount;
        participantsPayload.push({ user_id: p.user_id, amount_owed: amount });
      });
      
      // Add external participants
      external.forEach((p, idx) => {
        const isLast = idx === external.length - 1;
        const amount = isLast ? parseFloat((total - running).toFixed(2)) : share;
        running += amount;
        participantsPayload.push({ 
          external_email: p.email, 
          external_name: p.name || p.email.split('@')[0], 
          amount_owed: amount 
        });
      });
    } else {
      // Manual amounts - validate total
      const internalSum = included.reduce((s, p) => s + (p.amount_owed || 0), 0);
      const externalSum = external.reduce((s, p) => s + (p.amount_owed || 0), 0);
      const totalSum = internalSum + externalSum;
      
      if (Math.abs(totalSum - total) > 0.01) {
        return setTxError('Sum of participant amounts must equal total amount');
      }
      
      // Add circle member participants
      participantsPayload = included.map(p => ({ 
        user_id: p.user_id, 
        amount_owed: p.amount_owed 
      }));
      
      // Add external participants
      external.forEach(p => {
        participantsPayload.push({ 
          external_email: p.email, 
          external_name: p.name || p.email.split('@')[0], 
          amount_owed: p.amount_owed 
        });
      });
    }

    const payload = {
      name: txForm.name,
      description: txForm.description,
      category: txForm.category,
      total_amount: total,
      participants: participantsPayload,
    };
    if (selectedPlace && selectedPlace.place_id) payload.place_id = selectedPlace.place_id;
    else if (txForm.location_lat && txForm.location_lng) {
      payload.location_lat = txForm.location_lat;
      payload.location_lng = txForm.location_lng;
    }

    setCreating(true);
    try {
      const res = await fetch(`${apiBase}/transactions/${selectedCircleId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create transaction');
      await fetchCircle(selectedCircleId);
      setShowCreate(false);
      setTxForm({
        name: '',
        description: '',
        category: 'other',
        total_amount: '',
        splitEven: true,
        participants: txForm.participants.map(p => ({ ...p, amount_owed: 0, include: true })),
        external_participants: [],
        place_id: '',
        location_lat: '',
        location_lng: '',
      });
      setPlaceSearchResults([]);
      setSearchQuery('');
      setSearchLat('');
      setSearchLng('');
      setSelectedPlace(null);
      showNotification('Transaction created successfully', 'success');
    } catch (err) {
      setTxError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const performSearch = async ({ query, lat, lng, radius = 1000 } = {}) => {
    setSearchingPlaces(true);
    setPlaceSearchResults([]);
    try {
      let url = '';
      if (query && query.trim().length > 0) {
        url = `${apiBase}/maps/search?query=${encodeURIComponent(query)}&radius=${radius}`;
      } else if (lat && lng) {
        url = `${apiBase}/maps/search?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radius=${radius}`;
      } else return;
      const res = await fetch(url, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Search failed');
      setPlaceSearchResults(json.data || []);
    } catch (err) {
      setTxError(err.message || 'Place search failed');
    } finally {
      setSearchingPlaces(false);
    }
  };

  useEffect(() => {
    if ((!searchQuery || searchQuery.trim() === '') && !searchLat && !searchLng) {
      setPlaceSearchResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch({ query: searchQuery, lat: searchLat, lng: searchLng });
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, searchLat, searchLng]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return setTxError('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSearchLat(String(lat));
        setSearchLng(String(lng));
        performSearch({ lat, lng });
      },
      err => setTxError(err.message || 'Failed to get location')
    );
  };

  const useCircleCentroid = () => {
    if (circleCentroid) {
      setSearchLat(String(circleCentroid.lat));
      setSearchLng(String(circleCentroid.lng));
      performSearch({ lat: circleCentroid.lat, lng: circleCentroid.lng });
    }
  };

  const isAdmin = circle?.members?.find(m => m.user.user_id === currentUser?.id)?.role === 'admin';

  // Check if current user is the only admin
  const isOnlyAdmin = useMemo(() => {
    if (!circle?.members || !isAdmin) return false;
    const adminMembers = circle.members.filter(m => m.role === 'admin');
    return adminMembers.length === 1 && adminMembers[0].user.user_id === currentUser?.id;
  }, [circle?.members, isAdmin, currentUser?.id]);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <Notification 
        message={notification.message} 
        type={notification.type} 
        onClose={hideNotification} 
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-4">
            <Link 
              to="/circles" 
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors duration-200 group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
              Back to Circles
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Circles</h1>
              <p className="text-sm text-slate-600">Select a circle to view members and transactions</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select
              value={selectedCircleId || ''}
              onChange={(e) => {
                if (e.target.value) {
                  navigate(`/circles/${e.target.value}`);
                } else {
                  navigate('/circles');
                }
              }}
              className="w-full sm:w-64 px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
            >
              <option value="">Select circle</option>
              {circles.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.memberCount || 0})
                </option>
              ))}
            </select>
            <Button variant="primary" size="sm" onClick={() => setShowCreateCircle(true)}>
              Create Circle
            </Button>
          </div>
        </div>

        {successMessage && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading circle details...</p>
            </div>
          </div>
        ) : !circle ? (
          <div className="text-center py-12">
            <p className="text-slate-600 mb-4">Circle not found</p>
            <Link 
              to="/circles" 
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors duration-200 group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
              Back to Circles
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            {/* Circle Info */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{circle?.name}</h1>
                  <p className="text-sm text-slate-500 capitalize">{circle?.type} circle</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCircleForm({ name: circle?.name || '', type: circle?.type || 'friends' });
                        setShowUpdateCircle(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{(circle?.members || []).length} members</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Created {circle?.created_at ? new Date(circle.created_at).toLocaleDateString() : 'recently'}</span>
                </div>
              </div>
            </Card>

            {/* Members Section */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Members</h2>
                <span className="text-sm text-slate-500">{(circle?.members || []).length} total</span>
              </div>

              {/* Enhanced Invite Section */}
              {isAdmin && (
                <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Invite new member
                  </label>
                  
                  {/* Mode Toggle */}
                  <div className="flex gap-1 mb-3 bg-white rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setInviteMode('search');
                        setInviteInput('');
                        setSelectedUser(null);
                        setSearchResults([]);
                        setExistingMemberResults([]);
                        setShowSearchResults(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        inviteMode === 'search' 
                          ? 'bg-slate-900 text-white' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Search className="w-4 h-4" />
                      Search Username
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInviteMode('email');
                        setInviteInput('');
                        setSelectedUser(null);
                        setSearchResults([]);
                        setExistingMemberResults([]);
                        setShowSearchResults(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        inviteMode === 'email' 
                          ? 'bg-slate-900 text-white' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                      Email Invite
                    </button>
                  </div>

                  {/* Input Section */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={inviteMode === 'email' ? 'email' : 'text'}
                          placeholder={
                            inviteMode === 'search' 
                              ? 'Search by username...' 
                              : 'Enter email address'
                          }
                          value={inviteInput}
                          onChange={(e) => {
                            setInviteInput(e.target.value);
                            if (inviteMode === 'search') {
                              setSelectedUser(null);
                              searchUsers(e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                        />
                        
                        {/* Selected User Indicator */}
                        {selectedUser && (
                          <div className="absolute inset-0 flex items-center px-3 bg-green-50 border border-green-300 rounded-md">
                            <div className="flex items-center gap-2 text-green-800">
                              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                {selectedUser.username.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium">@{selectedUser.username}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUser(null);
                                  setInviteInput('');
                                  setShowSearchResults(false);
                                  setExistingMemberResults([]);
                                }}
                                className="ml-auto text-green-600 hover:text-green-800"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Loading Indicator */}
                        {searching && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={
                          inviteLoading || 
                          emailValidating ||
                          !inviteInput.trim() ||
                          (inviteMode === 'email' && !inviteInput.includes('@')) ||
                          (inviteMode === 'email' && inviteInput.includes('@') && !isValidEmail(inviteInput))
                        }
                        onClick={handleInviteSubmit}
                      >
                        {(inviteLoading || emailValidating) ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <UserPlus className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* Email Validation Feedback */}
                    {inviteMode === 'email' && inviteInput.includes('@') && (
                      <div className="mt-2">
                        {emailValidating ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                            <span>Checking email...</span>
                          </div>
                        ) : !isValidEmail(inviteInput) ? (
                          <div className="flex items-center gap-2 text-sm text-red-600">
                            <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                            <span>Please enter a valid email address</span>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Search Results Dropdown */}
                    {showSearchResults && (searchResults.length > 0 || existingMemberResults.length > 0) && !selectedUser && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                        {/* Available Users */}
                        {searchResults.length > 0 && (
                          <>
                            {searchResults.length > 0 && existingMemberResults.length > 0 && (
                              <div className="px-3 py-2 text-xs font-medium text-slate-500 bg-slate-50 border-b border-slate-100">
                                Available to invite
                              </div>
                            )}
                            {searchResults.map((user) => (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setInviteInput(`@${user.username}`);
                                  setShowSearchResults(false);
                                }}
                                className="w-full px-3 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 focus:outline-none focus:bg-slate-50"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                    {user.username.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-slate-900">@{user.username}</div>
                                    <div className="text-xs text-slate-500">{user.email}</div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </>
                        )}
                        
                        {/* Existing Members */}
                        {existingMemberResults.length > 0 && (
                          <>
                            <div className="px-3 py-2 text-xs font-medium text-slate-500 bg-amber-50 border-b border-amber-100">
                              Already in circle
                            </div>
                            {existingMemberResults.map((user) => (
                              <div
                                key={`existing-${user.id}`}
                                className="w-full px-3 py-3 bg-amber-50 border-b border-amber-100 last:border-b-0 cursor-not-allowed"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                    {user.username.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-amber-800">@{user.username}</div>
                                    <div className="text-xs text-amber-600">{user.email}</div>
                                  </div>
                                  <div className="text-xs text-amber-600 font-medium">Member</div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}

                    {/* No Results Message */}
                    {showSearchResults && searchResults.length === 0 && existingMemberResults.length === 0 && inviteInput.length >= 2 && !searching && inviteMode === 'search' && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-10 p-3 text-center text-slate-500 text-sm">
                        No users found. Try inviting by email instead!
                      </div>
                    )}
                    
                    {/* Only Existing Members Found Message */}
                    {showSearchResults && searchResults.length === 0 && existingMemberResults.length > 0 && inviteInput.length >= 2 && !searching && inviteMode === 'search' && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-10">
                        {/* Show existing members above */}
                        <div className="px-3 py-2 text-xs font-medium text-slate-500 bg-amber-50 border-b border-amber-100">
                          Already in circle
                        </div>
                        {existingMemberResults.map((user) => (
                          <div
                            key={`existing-${user.id}`}
                            className="w-full px-3 py-3 bg-amber-50 border-b border-amber-100 last:border-b-0 cursor-not-allowed"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-amber-800">@{user.username}</div>
                                <div className="text-xs text-amber-600">{user.email}</div>
                              </div>
                              <div className="text-xs text-amber-600 font-medium">Member</div>
                            </div>
                          </div>
                        ))}
                        <div className="p-3 text-center text-slate-500 text-sm border-t border-slate-200">
                          This user is already a member. Try searching for someone else or invite by email.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Messages */}
                  {inviteError && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <X className="w-4 h-4" />
                      {inviteError}
                    </p>
                  )}
                  {inviteSuccess && (
                    <p className="mt-2 text-sm text-green-600">
                      ✓ {inviteSuccess}
                    </p>
                  )}
                  
                  {/* Help Text */}
                  <p className="mt-2 text-xs text-slate-500">
                    {inviteMode === 'search' 
                      ? 'Search for existing users by username, or switch to email to invite new users.'
                      : 'Send an invitation email to someone who doesn\'t have an account yet.'
                    }
                  </p>
                </div>
              )}
              {/* Members List */}
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-slate-100 rounded animate-pulse mb-1"></div>
                        <div className="h-3 bg-slate-100 rounded animate-pulse w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (circle?.members || []).length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No members yet</p>
                  <p className="text-sm text-slate-400">Invite people to join this circle</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(circle.members || []).map(m => {
                    const isCurrentUser = m.user_id === currentUser?.user_id;
                    const displayName = m.user?.username || m.username || m.name || m.email;
                    const email = m.user?.email || m.email || '';
                    const initials = displayName.slice(0, 2).toUpperCase();
                    
                    return (
                      <div key={m.user_id || m.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-sm font-medium shadow-sm">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {displayName}
                                {isCurrentUser && <span className="text-slate-500">(You)</span>}
                              </p>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                m.role === 'admin' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {m.role}
                              </span>
                            </div>
                            {email && (
                              <p className="text-xs text-slate-500 truncate">{email}</p>
                            )}
                          </div>
                        </div>
                        
                        {isAdmin && !isCurrentUser && (
                          <div className="flex gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowUpdateRole({ memberId: m.user_id, currentRole: m.role })}
                              className="p-2"
                              title="Change role"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowRemoveMember(m.user_id)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Remove member"
                            >
                              <UserMinus className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Leave Circle Button */}
              <div className="pt-4 mt-6 border-t border-slate-200">
                {isOnlyAdmin ? (
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="w-full text-slate-400 border-slate-200 cursor-not-allowed"
                    >
                      <UserMinus className="w-4 h-4 mr-2" />
                      Leave Circle
                    </Button>
                    <p className="text-xs text-slate-500 text-center">
                      Cannot leave as the only admin. Promote another member to admin first.
                    </p>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowLeaveConfirm(true)}
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    Leave Circle
                  </Button>
                )}
              </div>
            </Card>

            {/* Pending Invitations Section */}
            {isAdmin && (
              <Card className="p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Pending Invitations</h2>
                  {loadingInvitations ? (
                    <div className="flex items-center gap-2 text-slate-500">
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-500">{(pendingInvitations || []).length} pending</span>
                  )}
                </div>

                {loadingInvitations ? (
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                        <div className="w-8 h-8 bg-slate-100 rounded-full animate-pulse"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-slate-100 rounded animate-pulse mb-1"></div>
                          <div className="h-3 bg-slate-100 rounded animate-pulse w-2/3"></div>
                        </div>
                        <div className="w-16 h-6 bg-slate-100 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ) : (pendingInvitations || []).length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No pending invitations</p>
                    <p className="text-sm text-slate-400">Invitations you send will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(pendingInvitations || []).map(invitation => {
                      // Handle different possible data structures
                      const inviteeDisplay = invitation.invitee 
                        ? `@${invitation.invitee.username}` 
                        : invitation.email || invitation.invitee_email || 'Unknown recipient';
                      const inviterDisplay = invitation.inviter?.username || invitation.inviter_username || 'Unknown';
                      const sentDate = new Date(invitation.created_at).toLocaleDateString('en-GB');
                      const inviteType = invitation.invitee ? 'username' : 'email';
                      
                      return (
                        <div key={invitation.id || invitation.invitation_id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                              inviteType === 'username' ? 'bg-blue-500' : 'bg-purple-500'
                            }`}>
                              {inviteType === 'username' ? (
                                <User className="w-4 h-4" />
                              ) : (
                                <Mail className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {inviteeDisplay}
                                </p>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                  inviteType === 'username' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {inviteType}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                By @{inviterDisplay} • {sentDate}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                              Pending
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cancelInvitation(invitation.id || invitation.invitation_id)}
                              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 p-1"
                              title="Cancel invitation"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {(pendingInvitations || []).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-500 text-center">
                      Admin view • Invitations will move to Members once accepted
                    </p>
                  </div>
                )}
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Transactions</h2>
                <div className="text-sm text-slate-600">Manage transactions for this circle</div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600 mr-2">Show only my transactions</label>
                <input type="checkbox" checked={filterMine} onChange={() => setFilterMine(f => !f)} />
                <Button variant="primary" className="ml-3" data-tour="create-transaction" onClick={() => setShowCreate(true)}>
                  Create Transaction
                </Button>
              </div>
            </div>

            <Card>
              <div className="p-4">
                {loading ? (
                  <div className="space-y-4">
                    <div className="h-12 bg-slate-100 rounded"></div>
                    <div className="h-12 bg-slate-100 rounded"></div>
                  </div>
                ) : visibleTransactions.length === 0 ? (
                  <div className="text-center p-8 text-slate-600">
                    <div className="mx-auto w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center mb-3">
                      <DollarSign className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="font-medium">No transactions</p>
                    <p className="text-sm">Create the first transaction for this circle</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {visibleTransactions.map(tx => (
                      <div key={tx.id} className="py-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{tx.description || tx.name || 'Transaction'}</div>
                            <div className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleString()}</div>
                            <div className="text-xs text-slate-500">Participants: {(tx.members || []).length}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-900">${(parseFloat(tx.total_amount || tx.amount || 0) || 0).toFixed(2)}</div>
                            {tx.is_user_participant && <div className="text-xs text-green-600">Involving you</div>}
                          </div>
                        </div>
                        {(tx.members || []).length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs text-slate-600 mb-2">Breakdown:</div>
                            <div className="flex flex-wrap gap-2">
                              {(tx.members || []).map((m, idx) => {
                                const memberName =
                                  m.external_name ||  // External participant name
                                  m.user?.username ||
                                  m.username ||
                                  m.name ||
                                  ((circle?.members || []).find(cm => (cm.user_id || cm.id) === (m.user_id || m.id)) || {}).username ||
                                  (m.user_id || m.id) ||
                                  `member-${idx}`;
                                const amt = parseFloat(m.amount_owed ?? m.amount_paid ?? m.amount ?? 0) || 0;
                                const key = `${tx.id}-${m.user_id || m.id || idx}`;
                                return (
                                  <div key={key} className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-700">
                                    <span className="font-medium">{memberName}</span>
                                    <span className="ml-2 text-slate-900">${amt.toFixed(2)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Create Circle Modal */}
            {showCreateCircle && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                  <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-slate-900">Create New Circle</h3>
                    <button onClick={() => setShowCreateCircle(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6">
                    <form onSubmit={createCircle} className="space-y-4">
                      {circleFormError && (
                        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                          {circleFormError}
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Circle Name *</label>
                        <input
                          value={circleForm.name}
                          onChange={e => setCircleForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                          placeholder="e.g. Friends Group"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Type *</label>
                        <select
                          value={circleForm.type}
                          onChange={e => setCircleForm(f => ({ ...f, type: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                        >
                          <option value="friends">Friends</option>
                          <option value="family">Family</option>
                          <option value="roommates">Roommates</option>
                          <option value="travel">Travel</option>
                          <option value="project">Project</option>
                          <option value="colleagues">Colleagues</option>
                          <option value="couple">Couple</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setShowCreateCircle(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={circleFormLoading}>
                          {circleFormLoading ? 'Creating...' : 'Create Circle'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Update Circle Modal */}
            {showUpdateCircle && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 sm:p-6">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                  <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-slate-900">Update Circle</h3>
                    <button 
                      onClick={() => setShowUpdateCircle(false)} 
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-6">
                    <form onSubmit={updateCircle} className="space-y-5">
                      {circleFormError && (
                        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm font-medium">
                          {circleFormError}
                        </div>
                      )}
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Circle Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            value={circleForm.name}
                            onChange={e => setCircleForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g. Friends Group"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={circleForm.type}
                            onChange={e => setCircleForm(f => ({ ...f, type: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="friends">Friends</option>
                        <option value="family">Family</option>
                        <option value="roommates">Roommates</option>
                        <option value="travel">Travel</option>
                        <option value="project">Project</option>
                        <option value="colleagues">Colleagues</option>
                        <option value="couple">Couple</option>
                          </select>
                        </div>
                      </div>
                      <div className="pt-2 flex justify-end gap-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowUpdateCircle(false)}
                          className="min-w-[100px]"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          variant="primary" 
                          disabled={circleFormLoading}
                          className="min-w-[120px]"
                        >
                          {circleFormLoading ? 'Updating...' : 'Update Circle'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Circle Confirmation */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h3 className="text-xl font-semibold text-slate-900">Delete Circle</h3>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-slate-600">
                      Are you sure you want to delete this circle? This action cannot be undone.
                    </p>
                    {error && (
                      <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                        {error}
                      </div>
                    )}
                    <div className="mt-4 flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={deleteCircle}
                        disabled={circleFormLoading}
                      >
                        {circleFormLoading ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Leave Circle Confirmation */}
            {showLeaveConfirm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h3 className="text-xl font-semibold text-slate-900">Leave Circle</h3>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-slate-600">
                      Are you sure you want to leave this circle? You will lose access to its transactions and members.
                    </p>
                    {isAdmin && !isOnlyAdmin && (
                      <div className="mt-4 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-sm">
                        <p className="font-medium">⚠️ Admin Warning</p>
                        <p>You are an admin of this circle. Consider promoting another member to admin before leaving to ensure proper circle management.</p>
                      </div>
                    )}
                    {error && (
                      <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                        {error}
                      </div>
                    )}
                    <div className="mt-4 flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setShowLeaveConfirm(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={leaveCircle}
                        disabled={circleFormLoading}
                      >
                        {circleFormLoading ? 'Leaving...' : 'Leave'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Remove Member Confirmation */}
            {showRemoveMember && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h3 className="text-xl font-semibold text-slate-900">Remove Member</h3>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-slate-600">
                      Are you sure you want to remove this member from the circle?
                    </p>
                    {error && (
                      <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                        {error}
                      </div>
                    )}
                    <div className="mt-4 flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setShowRemoveMember(null)}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => removeMember(showRemoveMember)}
                        disabled={circleFormLoading}
                      >
                        {circleFormLoading ? 'Removing...' : 'Remove'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Update Member Role Modal */}
            {showUpdateRole && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h3 className="text-xl font-semibold text-slate-900">Update Member Role</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600">Select a new role for the member:</p>
                      <select
                        value={showUpdateRole.currentRole}
                        onChange={e => setShowUpdateRole(r => ({ ...r, currentRole: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      {error && (
                        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                          {error}
                        </div>
                      )}
                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setShowUpdateRole(null)}>
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => updateMemberRole(showUpdateRole.memberId, showUpdateRole.currentRole)}
                          disabled={circleFormLoading}
                        >
                          {circleFormLoading ? 'Updating...' : 'Update Role'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Create Transaction Modal */}
            {showCreate && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-slate-900">Create Transaction</h3>
                    <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6">
                    <form onSubmit={handleCreateTransaction} className="space-y-6">
                      {successMessage && (
                        <div className="px-4 py-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm">
                          {successMessage}
                        </div>
                      )}
                      {txError && (
                        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                          {txError}
                        </div>
                      )}
                      <div className="space-y-4">
                        <h4 className="text-lg font-medium text-slate-900">Transaction Details</h4>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Transaction Name *</label>
                          <input
                            value={txForm.name}
                            onChange={e => setTxForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                            placeholder="e.g. Dinner at restaurant"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                          <input
                            value={txForm.description}
                            onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                            placeholder="Additional details (optional)"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                          <select
                            value={txForm.category}
                            onChange={e => setTxForm(f => ({ ...f, category: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                          >
                            <option value="food">Food & Dining</option>
                            <option value="travel">Travel</option>
                            <option value="entertainment">Entertainment</option>
                            <option value="shopping">Shopping</option>
                            <option value="transportation">Transportation</option>
                            <option value="utilities">Utilities</option>
                            <option value="rent">Rent</option>
                            <option value="groceries">Groceries</option>
                            <option value="healthcare">Healthcare</option>
                            <option value="education">Education</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Total Amount *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={txForm.total_amount}
                              onChange={e => setTxForm(f => ({ ...f, total_amount: e.target.value }))}
                              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                              placeholder="0.00"
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                          <MapPin className="w-5 h-5" />
                          Location (Optional)
                        </h4>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Search Places</label>
                          <input
                            placeholder="e.g. 'Starbucks', 'restaurant', 'mall'"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => performSearch({ query: searchQuery, lat: searchLat, lng: searchLng })}
                            disabled={searchingPlaces}
                            className="flex items-center gap-2"
                          >
                            <MapPin className="w-4 h-4" />
                            {searchingPlaces ? 'Searching...' : 'Search Places'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={useMyLocation}
                            className="flex items-center gap-2"
                          >
                            <Navigation className="w-4 h-4" />
                            Use My Location
                          </Button>
                          {circleCentroid && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={useCircleCentroid}
                              className="flex items-center gap-2"
                            >
                              <Target className="w-4 h-4" />
                              Circle Center
                            </Button>
                          )}
                        </div>
                        {placeSearchResults.length > 0 && (
                          <div className="border border-slate-200 rounded-md bg-white max-h-48 overflow-auto">
                            <div className="p-2">
                              <div className="text-sm font-medium text-slate-700 mb-2">Select a location:</div>
                              {placeSearchResults.map(p => {
                                const isSelected = selectedPlace && (selectedPlace.place_id === p.place_id || selectedPlace.placeId === p.place_id);
                                return (
                                  <div
                                    key={p.place_id}
                                    className={`p-3 cursor-pointer rounded-md transition-colors ${
                                      isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'
                                    }`}
                                    onClick={() => setSelectedPlace(p)}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-slate-900">{p.name}</div>
                                        <div className="text-xs text-slate-600">{p.vicinity || p.formatted_address}</div>
                                      </div>
                                      {isSelected && (
                                        <div className="text-xs text-blue-600 font-medium">Selected</div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {selectedPlace && (
                          <div className="p-4 border border-blue-200 rounded-md bg-blue-50">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-blue-600" />
                                  {selectedPlace.name}
                                </div>
                                <div className="text-xs text-slate-600 mt-1">{selectedPlace.vicinity || selectedPlace.formatted_address}</div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPlace(null);
                                  setPlaceSearchResults([]);
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="splitEven"
                            checked={txForm.splitEven}
                            onChange={e => setTxForm(f => ({ ...f, splitEven: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="splitEven" className="text-sm font-medium text-slate-700">
                            Split amount evenly among participants
                          </label>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          Participants
                        </h4>
                        <div className="text-xs text-slate-600">The creator of the transaction must be included and cannot be removed.</div>
                        <div className="space-y-3 max-h-60 overflow-auto border border-slate-200 rounded-md p-4 bg-slate-50">
                          {txForm.participants.map(p => {
                            const isCreator = currentUser && p.user_id === currentUser.user_id;
                            return (
                              <div key={p.user_id} className="flex items-center gap-4 p-3 bg-white rounded-md border border-slate-200">
                                <input
                                  type="checkbox"
                                  checked={p.include}
                                  onChange={e => updateParticipantInclude(p.user_id, e.target.checked)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                  disabled={isCreator}
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-slate-900">
                                    {p.username} {isCreator && <span className="text-xs text-slate-500">(creator)</span>}
                                  </div>
                                </div>
                                {!txForm.splitEven && p.include && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600">$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={p.amount_owed}
                                      onChange={e => updateParticipantAmount(p.user_id, e.target.value)}
                                      className="w-20 px-2 py-1 border border-slate-300 rounded text-sm bg-white text-slate-900"
                                      placeholder="0.00"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {!txForm.splitEven && (
                          <div className="text-xs text-slate-600 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                            <strong>Note:</strong> When not splitting evenly, the sum of all participant amounts must equal the total amount.
                          </div>
                        )}
                      </div>
                      
                      {/* External Participants Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                            <Mail className="w-5 h-5" />
                            External Participants
                          </h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addExternalParticipant}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Add External
                          </Button>
                        </div>
                        <div className="text-xs text-slate-600">
                          Add people who aren't in your circle. They'll receive email invites to view and pay their portion.
                        </div>
                        
                        {txForm.external_participants.length > 0 && (
                          <div className="space-y-3 max-h-60 overflow-auto border border-slate-200 rounded-md p-4 bg-slate-50">
                            {txForm.external_participants.map(p => (
                              <div key={p.id} className="flex items-center gap-4 p-3 bg-white rounded-md border border-slate-200">
                                <input
                                  type="checkbox"
                                  checked={p.include}
                                  onChange={e => updateExternalParticipantInclude(p.id, e.target.checked)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                  <input
                                    type="email"
                                    value={p.email}
                                    onChange={e => updateExternalParticipant(p.id, 'email', e.target.value)}
                                    placeholder="email@example.com"
                                    className="text-sm px-2 py-1 border border-slate-300 rounded"
                                    required={p.include}
                                  />
                                  <input
                                    type="text"
                                    value={p.name}
                                    onChange={e => updateExternalParticipant(p.id, 'name', e.target.value)}
                                    placeholder="Name (optional)"
                                    className="text-sm px-2 py-1 border border-slate-300 rounded"
                                  />
                                </div>
                                {!txForm.splitEven && p.include && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600">$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={p.amount_owed}
                                      onChange={e => updateExternalParticipantAmount(p.id, e.target.value)}
                                      className="w-20 text-sm px-2 py-1 border border-slate-300 rounded"
                                    />
                                  </div>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeExternalParticipant(p.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {txForm.external_participants.length === 0 && (
                          <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                            <Mail className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                            <p className="text-sm">No external participants added</p>
                            <p className="text-xs">Click "Add External" to include people outside your circle</p>
                          </div>
                        )}
                      </div>
                      <div className="sticky bottom-0 bg-white border-t border-slate-200 -mx-6 -mb-6 px-6 py-4">
                        {txError && (
                          <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm mb-4">
                            {txError}
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-3">
                          <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" variant="primary" disabled={creating}>
                            {creating ? 'Creating...' : 'Create Transaction'}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        )}
      </div>
    </div>
  );
}