import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import Notification from "../components/Notification";
import { useNotification } from "../hooks/useNotification";

import { 
  Plus, 
  Users, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Clock3,
  MoreHorizontal,
  UserPlus,
  UserMinus,
  X,
  MapPin,
  Calendar,
  CreditCard,
  CheckCircle,
  Navigation,
  Target,
  Search,
  Mail,
  Trash
} from "lucide-react";

const Button = ({ children, variant = "default", size = "default", className = "", onClick, ...props }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-white hover:bg-slate-100 hover:text-slate-900"
  };
  
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 px-3 text-sm",
    lg: "h-11 px-8"
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = "", ...props }) => (
  <div className={`bg-white border border-slate-200 rounded-lg ${className}`} {...props}>
    {children}
  </div>
);

const CardContent = ({ children, className = "", ...props }) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

const Badge = ({ children, variant = "default", className = "", ...props }) => {
  const variants = {
    default: "bg-slate-100 text-slate-700 border border-slate-200",
    green: "bg-green-50 text-green-700 border border-green-200",
    red: "bg-red-50 text-red-700 border border-red-200",
    blue: "bg-blue-50 text-blue-700 border border-blue-200"
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-sm font-medium ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};

const api = {
  baseURL: 'http://localhost:3000/api',

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    };
    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  },

  async getUserCircles() {
    return this.request('/circles/user');
  },

  async getCircleById(id) {
    return this.request(`/circles/${id}`);
  },

  async getUserTransactions() {
    return this.request(`/transactions/user`);
  },

  async getUserTransactionSummary() {
    return this.request(`/transactions/user/summary`);
  },
};

// Fallback for createPageUrl
const createPageUrl = (path) => `/${path.toLowerCase()}`;

export default function Dashboard() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [circles, setCircles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transactionSummary, setTransactionSummary] = useState(null);
  const [balances, setBalances] = useState({ owedTo: 0, owes: 0, net: 0, owedToDetails: [], owesDetails: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOwedToModal, setShowOwedToModal] = useState(false);
  const [showOwesModal, setShowOwesModal] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [processingInvitation, setProcessingInvitation] = useState(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Transaction form state (similar to CircleDetail)
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [txForm, setTxForm] = useState({
    name: '',
    description: '',
    category: 'other',
    total_amount: '',
    base_amount: '',
    gst_rate: '9',
    service_charge_rate: '10',
    gst_amount: '',
    service_charge_amount: '',
    circle_id: '',
    splitEven: true,
    participants: [],
    external_participants: [],
    place_id: '',
    location_lat: '',
    location_lng: '',
  });
  const [creating, setCreating] = useState(false);
  const [txError, setTxError] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [placeSearchResults, setPlaceSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [circleMembers, setCircleMembers] = useState([]);
  const [searchLat, setSearchLat] = useState('');
  const [searchLng, setSearchLng] = useState('');
  const [debounceRef] = useState({ current: null });

  // Bulk payment state
  const [showBulkPayment, setShowBulkPayment] = useState(false);
  const [bulkPaymentLoading, setBulkPaymentLoading] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState([]);

  // Notification hook
  const { notification, showNotification, hideNotification } = useNotification();

  const calculateBalancesFromTransactions = useCallback((allTransactions, currentUserId) => {
    if (!allTransactions || !currentUserId) {
      return { 
        owedTo: 0, 
        owes: 0, 
        net: 0, 
        totalTransactions: 0, 
        pendingCount: 0,
        owedToDetails: [],
        owesDetails: []
      };
    }

    let owedTo = 0;
    let owes = 0;
    const owedToDetails = [];
    const owesDetails = [];

    allTransactions.forEach((transaction) => {
      const isCreator = transaction.created_by === currentUserId;
      const members = transaction.members || [];

      if (isCreator) {
        // For transactions I created, calculate what others owe me
        members.forEach(member => {
          const isPending = member.payment_status === 'pending' || member.payment_status === 'unpaid' || !member.payment_status;
          if (member.user_id !== currentUserId && isPending) {
            const amount = parseFloat(member.amount_owed || 0);
            owedTo += amount;
            
            // Add to detailed breakdown
            const existingDetail = owedToDetails.find(detail => 
              detail.userId === member.user_id && 
              detail.transactionId === transaction.id
            );
            if (!existingDetail) {
              owedToDetails.push({
                userId: member.user_id,
                userName: member.external_name || member.user?.username || member.user?.email || 'Unknown User',
                transactionId: transaction.id,
                transactionName: transaction.name || 'Transaction',
                amount: amount,
                circleName: transaction.circle?.name || 'Circle',
                createdAt: transaction.created_at
              });
            }
          }
        });
      } else {
        // For transactions others created, find my debt using user_payment_status
        const userPaymentStatus = transaction.user_payment_status;
        const isPending = userPaymentStatus === 'pending' || userPaymentStatus === 'unpaid' || !userPaymentStatus;
        
        if (isPending && transaction.user_amount_owed) {
          const amount = parseFloat(transaction.user_amount_owed || 0);
          owes += amount;

          // Add to detailed breakdown
          owesDetails.push({
            creatorId: transaction.created_by,
            creatorName: transaction.creator?.username || transaction.creator?.email || 'Unknown User',
            transactionId: transaction.id,
            transactionName: transaction.name || 'Transaction',
            amount: amount,
            circleName: transaction.circle?.name || 'Circle',
            createdAt: transaction.created_at
          });
        }
      }
    });

    const totalTransactions = allTransactions.length;
    // Count unique transactions with pending status, not individual memberships
    const pendingTransactions = allTransactions.filter(transaction => 
      transaction.status === 'pending' || 
      (transaction.members && transaction.members.some(member => member.payment_status === 'pending'))
    );
    const pendingCount = pendingTransactions.length;

    // Group owedToDetails by user
    const groupedOwedTo = owedToDetails.reduce((acc, detail) => {
      const key = detail.userId;
      if (!acc[key]) {
        acc[key] = {
          userId: detail.userId,
          userName: detail.userName,
          totalAmount: 0,
          transactions: []
        };
      }
      acc[key].totalAmount += detail.amount;
      acc[key].transactions.push({
        transactionId: detail.transactionId,
        transactionName: detail.transactionName,
        amount: detail.amount,
        circleName: detail.circleName,
        createdAt: detail.createdAt
      });
      return acc;
    }, {});

    // Group owesDetails by creator
    const groupedOwes = owesDetails.reduce((acc, detail) => {
      const key = detail.creatorId;
      if (!acc[key]) {
        acc[key] = {
          creatorId: detail.creatorId,
          creatorName: detail.creatorName,
          totalAmount: 0,
          transactions: []
        };
      }
      acc[key].totalAmount += detail.amount;
      acc[key].transactions.push({
        transactionId: detail.transactionId,
        transactionName: detail.transactionName,
        amount: detail.amount,
        circleName: detail.circleName,
        createdAt: detail.createdAt
      });
      return acc;
    }, {});

    return { 
      owedTo, 
      owes, 
      net: owedTo - owes, 
      totalTransactions,
      pendingCount,
      owedToDetails: Object.values(groupedOwedTo),
      owesDetails: Object.values(groupedOwes)
    };
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Load circles
      const userCircles = await api.getUserCircles().catch(err => {
        console.warn('Failed to load circles:', err);
        return { data: [] };
      });
      setCircles(userCircles.data || []);

      // Load all user transactions with full details
      const transactionResponse = await api.getUserTransactions().catch(err => {
        console.warn('Failed to load transactions:', err);
        return { data: { transactions: [] } };
      });
      const allTransactions = transactionResponse.data?.transactions || [];
      
      // Sort and limit for recent activity display
      const recentTransactions = [...allTransactions]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
      setTransactions(recentTransactions);

      // Calculate balances from all transactions
      const calculatedBalances = calculateBalancesFromTransactions(allTransactions, currentUser?.user_id);
      setBalances(calculatedBalances);

      // Also load transaction summary for any additional data
      const summaryResponse = await api.getUserTransactionSummary().catch(err => {
        console.warn('Failed to load transaction summary:', err);
        return { data: { transactions: [], summary: {} } };
      });
      setTransactionSummary(summaryResponse.data);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, calculateBalancesFromTransactions]);

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadDashboardData();
    } else if (!authLoading && !currentUser) {
      navigate("/login");
      setIsLoading(false);
    }
  }, [currentUser, authLoading, loadDashboardData, navigate]);

  const loadInvitations = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/invitations/my`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Access invitations from the correct nested structure
        const allInvitations = data.data?.invitations || [];
        // Filter for pending invitations only
        const pendingInvitations = allInvitations.filter(invitation => 
          invitation.status === 'pending'
        );
        setInvitations(pendingInvitations);
      } else if (response.status === 401) {
        console.warn('Authentication required for invitations');
        // Don't show error to user, just fail silently for invitations
      } else {
        console.warn('Failed to load invitations:', response.status, response.statusText);
      }
    } catch (error) {
      // Check if error is due to HTML response (likely 404 or server error)
      if (error.message.includes('Unexpected token')) {
        console.warn('Invitations endpoint not found or returned HTML');
      } else {
        console.warn('Error loading invitations:', error);
      }
    }
  }, [currentUser]);

  const handleAcceptInvitation = async (invitationId) => {
    try {
      setProcessingInvitation(invitationId);
      setErrorMessage('');
      
      const response = await fetch(`http://localhost:3000/api/invitations/${invitationId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        // Remove the accepted invitation from the list
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        showNotification('Invitation accepted successfully! Welcome to the circle.', 'success');
        
        // Reload dashboard data to reflect new circle membership
        loadDashboardData();
      } else {
        const errorData = await response.json();
        showNotification(errorData.message || 'Failed to accept invitation', 'error');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      showNotification('An error occurred while accepting the invitation', 'error');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    try {
      setProcessingInvitation(invitationId);
      setErrorMessage('');
      
      const response = await fetch(`http://localhost:3000/api/invitations/${invitationId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        // Remove the rejected invitation from the list
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        showNotification('Invitation rejected', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.message || 'Failed to reject invitation', 'error');
      }
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      showNotification('An error occurred while rejecting the invitation', 'error');
    } finally {
      setProcessingInvitation(null);
    }
  };

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadInvitations();
    }
  }, [currentUser, authLoading, loadInvitations]);

  const handleRetry = () => {
    loadDashboardData();
  };

  const handleShowTransactionDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetails(true);
  };

  const handleCloseTransactionDetails = () => {
    setShowTransactionDetails(false);
    setSelectedTransaction(null);
  };

  const userName = currentUser?.name || currentUser?.username || currentUser?.email?.split('@')[0] || 'there';

  // Transaction form handlers (adapted from CircleDetail)
  const updateParticipantInclude = (user_id, include) => {
    if (currentUser && user_id === currentUser.user_id) return;
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

  const addExternalParticipant = () => {
    setTxForm(f => ({
      ...f,
      external_participants: [...f.external_participants, { 
        id: Date.now(),
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
    if (!txForm.circle_id) return setTxError('Please select a circle');
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

    setCreating(true);
    try {
      let participantsPayload = [];
      const totalParticipants = included.length + external.length;
      
      if (txForm.splitEven) {
        const share = parseFloat((total / totalParticipants).toFixed(2));
        let running = 0;
        
        included.forEach((p, idx) => {
          const amount = idx === totalParticipants - 1 && external.length === 0 
            ? parseFloat((total - running).toFixed(2)) 
            : share;
          running += amount;
          participantsPayload.push({ user_id: p.user_id, amount_owed: amount });
        });
        
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
        included.forEach(p => {
          participantsPayload.push({ user_id: p.user_id, amount_owed: p.amount_owed });
        });
        external.forEach(p => {
          participantsPayload.push({ 
            external_email: p.email, 
            external_name: p.name || p.email.split('@')[0], 
            amount_owed: p.amount_owed 
          });
        });
        
        const totalAmount = participantsPayload.reduce((s, p) => s + p.amount_owed, 0);
        if (Math.abs(totalAmount - total) > 0.01) {
          return setTxError(`Total amounts (${totalAmount.toFixed(2)}) must equal transaction total (${total.toFixed(2)})`);
        }
      }

      const payload = {
        name: txForm.name,
        description: txForm.description,
        category: txForm.category,
        total_amount: total,
        base_amount: txForm.base_amount ? parseFloat(txForm.base_amount) : undefined,
        gst_rate: txForm.gst_rate ? parseFloat(txForm.gst_rate) / 100 : undefined,
        service_charge_rate: txForm.service_charge_rate ? parseFloat(txForm.service_charge_rate) / 100 : undefined,
        gst_amount: txForm.gst_amount ? parseFloat(txForm.gst_amount) : undefined,
        service_charge_amount: txForm.service_charge_amount ? parseFloat(txForm.service_charge_amount) : undefined,
        participants: participantsPayload,
        place_id: selectedPlace?.place_id,
        location_lat: selectedPlace?.geometry?.location?.lat,
        location_lng: selectedPlace?.geometry?.location?.lng,
      };

      const response = await api.request(`/transactions/circles/${txForm.circle_id}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      showNotification('Transaction created successfully!', 'success');
      resetTransactionForm();
      loadUserData();
      
    } catch (error) {
      console.error('Error creating transaction:', error);
      const message = error?.message || 'Failed to create transaction';
      setTxError(message);
      showNotification(message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const resetTransactionForm = () => {
    setTxForm({
      name: '',
      description: '',
      category: 'other',
      total_amount: '',
      base_amount: '',
      gst_rate: '9',
      service_charge_rate: '10',
      gst_amount: '',
      service_charge_amount: '',
      circle_id: '',
      splitEven: true,
      participants: [],
      external_participants: [],
      place_id: '',
      location_lat: '',
      location_lng: '',
    });
    setSelectedPlace(null);
    setPlaceSearchResults([]);
    setSearchQuery('');
    setSearchLat('');
    setSearchLng('');
    setCircleMembers([]);
    setTxError(null);
    setShowTransactionForm(false);
  };

  // Load circle members when circle is selected
  const loadCircleMembers = async (circleId) => {
    if (!circleId) {
      setCircleMembers([]);
      setTxForm(f => ({ ...f, participants: [] }));
      return;
    }
    
    try {
      const response = await api.getCircleById(circleId);
      const circle = response.data?.circle || response.data;
      if (circle?.members) {
        // Match CircleDetail format exactly
        const defaultParticipants = (circle.members || []).map(m => ({
          user_id: m.user_id || m.id,
          username: m.user?.username || m.username || m.name || m.email || String(m.user_id || m.id),
          amount_owed: 0,
          include: true,
          user: m.user || { id: m.user_id, username: m.user?.username || 'Unknown' }
        }));
        setCircleMembers(circle.members);
        setTxForm(f => ({ ...f, participants: defaultParticipants }));
        console.log('Loaded participants:', defaultParticipants); // Debug log
      }
    } catch (error) {
      console.error('Error loading circle members:', error);
      setTxError('Failed to load circle members');
      setCircleMembers([]);
      setTxForm(f => ({ ...f, participants: [] }));
    }
  };

  // Handle circle selection change
  const handleCircleChange = (circleId) => {
    setTxForm(f => ({ ...f, circle_id: circleId }));
    loadCircleMembers(circleId);
  };

  // Handle GST and service charge calculations
  const handleFormChange = (field, value) => {
    setTxForm(f => ({ ...f, [field]: value }));
    
    // Auto-calculate amounts when base amount or rates change
    if (field === 'base_amount' || field === 'gst_rate' || field === 'service_charge_rate') {
      const newData = { ...txForm, [field]: value };
      const baseAmount = parseFloat(newData.base_amount) || 0;
      const gstRate = parseFloat(newData.gst_rate) || 0;
      const serviceChargeRate = parseFloat(newData.service_charge_rate) || 0;
      
      if (baseAmount > 0) {
        const gstAmount = baseAmount * (gstRate / 100);
        const serviceChargeAmount = baseAmount * (serviceChargeRate / 100);
        const totalAmount = baseAmount + gstAmount + serviceChargeAmount;
        
        setTxForm(f => ({
          ...f,
          [field]: value,
          gst_amount: gstAmount.toFixed(2),
          service_charge_amount: serviceChargeAmount.toFixed(2),
          total_amount: totalAmount.toFixed(2)
        }));
        return;
      }
    }
    
    // Auto-calculate base amount when total amount changes and rates are set
    if (field === 'total_amount') {
      const gstRate = parseFloat(txForm.gst_rate) || 0;
      const serviceChargeRate = parseFloat(txForm.service_charge_rate) || 0;
      const totalAmount = parseFloat(value) || 0;
      
      if (totalAmount > 0 && (gstRate > 0 || serviceChargeRate > 0)) {
        const baseAmount = totalAmount / (1 + (gstRate / 100) + (serviceChargeRate / 100));
        const gstAmount = baseAmount * (gstRate / 100);
        const serviceChargeAmount = baseAmount * (serviceChargeRate / 100);
        
        setTxForm(f => ({
          ...f,
          [field]: value,
          base_amount: baseAmount.toFixed(2),
          gst_amount: gstAmount.toFixed(2),
          service_charge_amount: serviceChargeAmount.toFixed(2)
        }));
        return;
      }
    }
  };

  // Location search functions
  const performSearch = async ({ query, lat, lng, radius = 1000 } = {}) => {
    setSearchingPlaces(true);
    setPlaceSearchResults([]);
    try {
      let url = '';
      if (query && query.trim().length > 0) {
        url = `${api.baseURL}/maps/search?query=${encodeURIComponent(query)}&radius=${radius}`;
      } else if (lat && lng) {
        url = `${api.baseURL}/maps/search?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radius=${radius}`;
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
    // Calculate centroid from selected circle members if available
    if (txForm.circle_id && circleMembers.length > 0) {
      const validCoords = circleMembers.filter(member => 
        member.location_lat && member.location_lng && 
        !isNaN(parseFloat(member.location_lat)) && !isNaN(parseFloat(member.location_lng))
      );
      
      if (validCoords.length > 0) {
        const avgLat = validCoords.reduce((sum, member) => sum + parseFloat(member.location_lat), 0) / validCoords.length;
        const avgLng = validCoords.reduce((sum, member) => sum + parseFloat(member.location_lng), 0) / validCoords.length;
        setSearchLat(String(avgLat));
        setSearchLng(String(avgLng));
        performSearch({ lat: avgLat, lng: avgLng });
      } else {
        setTxError('No location data available for circle members');
      }
    }
  };

  // Debounced search effect
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

  // Bulk payment functions
  const getPendingTransactions = () => {
    if (!transactionSummary?.transactions) return [];
    return transactionSummary.transactions.filter(t => 
      t.payment_status === 'unpaid' || t.payment_status === 'pending'
    );
  };

  const handleBulkPaymentOpen = () => {
    const pending = getPendingTransactions();
    setSelectedTransactions(pending.map(t => t.id));
    setShowBulkPayment(true);
  };

  const handleTransactionToggle = (transactionId) => {
    setSelectedTransactions(prev => 
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const handleBulkPayment = async () => {
    if (selectedTransactions.length === 0) {
      showNotification('Please select at least one transaction to pay.', 'error');
      return;
    }

    setBulkPaymentLoading(true);

    try {
      const response = await api.request('/transactions/bulk/status', {
        method: 'PATCH',
        body: JSON.stringify({
          transaction_ids: selectedTransactions,
          payment_status: 'paid',
          payment_method: 'bulk_payment'
        })
      });

      const { data } = response;
      const { summary } = data;

      // Show results based on the summary
      if (summary.successful > 0 && summary.failed === 0) {
        showNotification(`Successfully paid ${summary.successful} transaction${summary.successful > 1 ? 's' : ''}!`, 'success');
      } else if (summary.successful > 0 && summary.failed > 0) {
        showNotification(`Paid ${summary.successful} transaction${summary.successful > 1 ? 's' : ''}, ${summary.failed} failed.`, 'warning');
      } else {
        showNotification('Failed to process any payments. Please try again.', 'error');
      }

      // Refresh data and close modal if any succeeded
      if (summary.successful > 0) {
        loadUserData();
      }
      setShowBulkPayment(false);
      setSelectedTransactions([]);

    } catch (error) {
      console.error('Error processing bulk payment:', error);
      showNotification('Failed to process bulk payment. Please try again.', 'error');
    } finally {
      setBulkPaymentLoading(false);
    }
  };

  const getTotalSelectedAmount = () => {
    if (!transactionSummary?.transactions) return 0;
    return transactionSummary.transactions
      .filter(t => selectedTransactions.includes(t.id))
      .reduce((sum, t) => sum + parseFloat(t.amount_owed || 0), 0);
  };

  // PayNow bulk payment handlers
  const handleBulkPaymentSuccess = (result) => {
    showNotification('Bulk payments processed successfully with PayNow!', 'success');
    loadDashboardData();
    setShowBulkPayment(false);
    setSelectedTransactions([]);
  };

  const handleBulkPaymentError = (errorMessage) => {
    showNotification(`PayNow bulk payment failed: ${errorMessage}`, 'error');
  };

  // Handler for opening payment modal for a specific person (multiple transactions)
  const handlePersonPaymentOpen = (person) => {
    // Set selected transactions to all transactions for this person
    setSelectedTransactions(person.transactions.map(t => t.id));
    setShowBulkPayment(true);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-6 animate-pulse">
            <div className="h-10 bg-slate-200 rounded w-72"></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="h-28 bg-slate-100 rounded"></div>
              <div className="h-28 bg-slate-100 rounded"></div>
              <div className="h-28 bg-slate-100 rounded"></div>
            </div>
            <div className="h-80 sm:h-96 bg-slate-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-sm w-full p-6">
          <div className="text-center space-y-4">
            <Clock3 className="w-14 h-14 text-slate-400 mx-auto" />
            <div className="space-y-2">
              <h2 className="text-xl font-medium text-slate-900">Something went wrong</h2>
              <p className="text-base text-slate-600">{error}</p>
            </div>
            <Button onClick={handleRetry} variant="outline" className="w-full" disabled={isLoading}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Notification 
        message={notification.message} 
        type={notification.type} 
        onClose={hideNotification} 
      />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="px-4 sm:px-8 pt-10 sm:pt-12 pb-6 sm:pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
        <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-2">
                Welcome back, {userName}
              </h1>
        <p className="text-base sm:text-lg text-slate-600">
                Here's what's happening with your transactions
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button 
                variant="primary" 
                size="md" 
                className="w-full sm:w-auto"
                onClick={() => setShowTransactionForm(true)}
              >
                <Plus className="w-5 h-5 mr-1.5" />
                Add Transaction
              </Button>
              <Link to={createPageUrl("circles")} className="w-full sm:w-auto">
                <Button variant="secondary" size="md" className="w-full sm:w-auto">
                  <Users className="w-5 h-5 mr-1.5" />
                  Circles
                </Button>
              </Link>
            </div>
          </div>

          {/* Transaction Form Modal */}
          {showTransactionForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-900">Create Transaction</h3>
                  <button onClick={resetTransactionForm} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6">
                  <form onSubmit={handleCreateTransaction} className="space-y-6">
                    {txError && (
                      <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                        {txError}
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-slate-900">Transaction Details</h4>
                      
                      {/* Circle Selection */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Circle *</label>
                        <select
                          value={txForm.circle_id}
                          onChange={(e) => handleCircleChange(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                          required
                        >
                          <option value="">Select a circle</option>
                          {circles.map((circle) => (
                            <option key={circle.id} value={circle.id}>
                              {circle.name} ({circle.memberCount || 0} members)
                            </option>
                          ))}
                        </select>
                      </div>
                      
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
                      
                      {/* Location Section */}
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
                          {txForm.circle_id && circleMembers.length > 0 && (
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
                      
                      {/* GST and Service Charge Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Base Amount (before charges)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={txForm.base_amount}
                              onChange={e => handleFormChange('base_amount', e.target.value)}
                              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                              placeholder="0.00"
                            />
                          </div>
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
                              onChange={e => handleFormChange('total_amount', e.target.value)}
                              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                              placeholder="0.00"
                              required
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">GST Rate (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={txForm.gst_rate}
                            onChange={e => handleFormChange('gst_rate', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                            placeholder="9"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Service Charge Rate (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={txForm.service_charge_rate}
                            onChange={e => handleFormChange('service_charge_rate', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                            placeholder="10"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* GST/Service Charge Breakdown */}
                    {(txForm.gst_amount > 0 || txForm.service_charge_amount > 0) && (
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                        <h5 className="text-sm font-medium text-amber-900 mb-3">Amount Breakdown</h5>
                        <div className="space-y-2 text-sm">
                          {txForm.base_amount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-amber-700">Base Amount:</span>
                              <span className="text-amber-900 font-medium">
                                ${parseFloat(txForm.base_amount).toFixed(2)}
                              </span>
                            </div>
                          )}
                          {txForm.gst_amount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-amber-700">
                                GST ({txForm.gst_rate}%):
                              </span>
                              <span className="text-amber-900 font-medium">
                                ${parseFloat(txForm.gst_amount).toFixed(2)}
                              </span>
                            </div>
                          )}
                          {txForm.service_charge_amount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-amber-700">
                                Service Charge ({txForm.service_charge_rate}%):
                              </span>
                              <span className="text-amber-900 font-medium">
                                ${parseFloat(txForm.service_charge_amount).toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-amber-300">
                            <span className="text-amber-900 font-medium">Total Amount:</span>
                            <span className="text-amber-900 font-semibold">
                              ${parseFloat(txForm.total_amount || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
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
                    
                    {/* Participants Section */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Participants
                      </h4>
                      <div className="text-xs text-slate-600">The creator of the transaction must be included and cannot be removed.</div>
                      {txForm.participants.length > 0 ? (
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
                      ) : (
                        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                          <Users className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                          <p className="text-sm">No participants available</p>
                          <p className="text-xs">Select a circle to load participants</p>
                        </div>
                      )}
                      {!txForm.splitEven && txForm.participants.length > 0 && (
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
                      <div className="flex items-center justify-end gap-3">
                        <Button type="button" variant="outline" onClick={resetTransactionForm}>
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

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                </div>
                <p className="text-green-800 font-medium">{successMessage}</p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                </div>
                <p className="text-red-800 font-medium">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Balance Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-tour="balance-card">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <Badge variant="green">You're owed</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl sm:text-3xl font-semibold text-slate-900">
                    ${(balances.owedTo || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-500">From friends</p>
                  {balances.owedTo > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 p-1 h-auto text-xs mt-2"
                      onClick={() => setShowOwedToModal(true)}
                    >
                      View details
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <Badge variant="red">You owe</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl sm:text-3xl font-semibold text-slate-900">
                    ${(balances.owes || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-500">To friends</p>
                  {balances.owes > 0 && (
                    <div className="flex gap-1 mt-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-auto text-xs"
                        onClick={() => setShowOwesModal(true)}
                      >
                        View details
                      </Button>
                      {getPendingTransactions().length > 1 && (
                        <Button 
                          variant="primary" 
                          size="sm" 
                          className="bg-red-600 hover:bg-red-700 p-1 h-auto text-xs"
                          onClick={handleBulkPaymentOpen}
                        >
                          Pay All ({getPendingTransactions().length})
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <Badge variant="blue">Net balance</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl sm:text-3xl font-semibold text-slate-900">
                    ${Math.abs(balances.net || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {balances.net >= 0 ? 'In your favor' : 'You owe overall'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock3 className="w-5 h-5 text-orange-600" />
                  </div>
                  <Badge variant="default">Pending</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl sm:text-3xl font-semibold text-slate-900">
                    {balances.pendingCount || 0}
                  </p>
                  <p className="text-sm text-slate-500">Transactions</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Balance Breakdown */}
          {transactionSummary && transactionSummary.transactions && transactionSummary.transactions.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-medium text-slate-900 mb-4">Outstanding Balances</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* What You Owe */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900">You Owe</h3>
                    </div>
                    <div className="space-y-3">
                      {transactionSummary.transactions
                        .filter(t => t.payment_status === 'unpaid')
                        .slice(0, 5)
                        .map((transaction, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {transaction.transaction?.name || 'Transaction'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {transaction.transaction?.circle?.name || 'Circle'}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-red-600">
                            ${parseFloat(transaction.amount_owed || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {transactionSummary.transactions.filter(t => t.payment_status === 'unpaid').length > 5 && (
                        <p className="text-xs text-slate-500 text-center pt-2">
                          +{transactionSummary.transactions.filter(t => t.payment_status === 'unpaid').length - 5} more
                        </p>
                      )}
                      {transactionSummary.transactions.filter(t => t.payment_status === 'unpaid').length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-4">No outstanding debts</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* What You're Owed - This would need additional backend support */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900">You're Owed</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <DollarSign className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-500">
                          Detailed breakdown coming soon
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Check individual circles for detailed information
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-8 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-medium text-slate-900">Recent Activity</h2>
                    <p className="text-base text-slate-500">Your latest transactions</p>
                  </div>
                  <div className="text-right">
                    {balances.totalTransactions > transactions.length && (
                      <p className="text-sm text-slate-600">
                        Showing {transactions.length} of {balances.totalTransactions} transactions
                      </p>
                    )}
                    {balances.pendingCount > 0 && (
                      <p className="text-xs text-amber-600 mb-1">
                        {balances.pendingCount} pending transactions
                      </p>
                    )}
                    <Link 
                      to="/transactions" 
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      View all transactions →
                    </Link>
                  </div>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  {transactions.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <DollarSign className="w-7 h-7 text-slate-400" />
                      </div>
                      <p className="text-base text-slate-600 font-medium mb-1">No recent activity</p>
                      <p className="text-sm text-slate-500">Start by adding your first transaction</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {transactions.map((transaction) => {
                        const isPaid = transaction.user_payment_status === 'paid' || transaction.payment_status === 'paid';
                        const isCreator = transaction.created_by === currentUser?.user_id;
                        
                        return (
                        <div key={transaction.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isPaid ? 'bg-green-100' : 'bg-slate-100'
                            }`}>
                              <DollarSign className={`w-5 h-5 ${
                                isPaid ? 'text-green-600' : 'text-slate-600'
                              }`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-900 text-base">
                                  {transaction.description || transaction.name || 'Transaction'}
                                </p>
                                {isCreator && (
                                  <Badge variant="blue" className="text-xs">Creator</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-slate-500">
                                  {new Date(transaction.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })}
                                </p>
                                <Badge 
                                  variant={isPaid ? 'green' : 'red'} 
                                  className="text-xs"
                                >
                                  {isPaid ? 'Paid' : 'Pending'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className="text-base font-medium text-slate-900">
                                ${(parseFloat(transaction.total_amount || transaction.amount || '0') || 0).toFixed(2)}
                              </span>
                              {transaction.user_amount_owed && !isCreator && (
                                <p className="text-xs text-slate-500">
                                  You owe: ${parseFloat(transaction.user_amount_owed).toFixed(2)}
                                </p>
                              )}
                            </div>
                            <button 
                              className="p-1 hover:bg-slate-100 rounded" 
                              aria-label="View transaction details"
                              onClick={() => handleShowTransactionDetails(transaction)}
                            >
                              <MoreHorizontal className="w-4 h-4 text-slate-400" />
                            </button>
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* My Circles */}
            <div>
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-medium text-slate-900">My Circles</h2>
                    <p className="text-base text-slate-500">{circles.length} active</p>
                  </div>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  {circles.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Users className="w-7 h-7 text-slate-400" />
                      </div>
                      <p className="text-base text-slate-600 font-medium mb-1">No circles yet</p>
                      <p className="text-sm text-slate-500 mb-4">Create your first circle to get started</p>
                      <Link to={createPageUrl("Circles")}>
                        <Button variant="primary" size="sm">
                          <Plus className="w-5 h-5 mr-1.5" />
                          Create Circle
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {circles.slice(0, 5).map((circle) => (
                        <div key={circle.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                              <Users className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 text-base">{circle.name}</p>
                              <p className="text-sm text-slate-500">
                                {circle.memberCount} members
                              </p>
                            </div>
                          </div>
                          <Link to={createPageUrl(`Circles/${circle.id}`)}>
                            <Button variant="ghost" size="sm" className="text-white hover:text-slate-900">
                              View
                            </Button>
                          </Link>
                        </div>
                      ))}
                      {circles.length > 5 && (
                        <div className="p-4">
                          <Link to={createPageUrl("Circles")}>
                            <Button variant="outline" size="sm" className="w-full">
                              View all circles ({circles.length})
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <div className="mt-6">
                  <div className="mb-4">
                    <h2 className="text-xl font-medium text-slate-900">Pending Invitations</h2>
                    <p className="text-base text-slate-500">{invitations.length} invitation{invitations.length > 1 ? 's' : ''}</p>
                  </div>

                  <Card>
                    <CardContent className="p-0">
                      <div className="divide-y divide-slate-100">
                        {invitations.map((invitation) => (
                          <div key={invitation.id} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                                  <UserPlus className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-base font-medium text-slate-900">{invitation.circle?.name}</p>
                                  <p className="text-sm text-slate-500">
                                    Invited by {invitation.inviter?.name || invitation.inviter?.username}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRejectInvitation(invitation.id)}
                                  disabled={processingInvitation === invitation.id}
                                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                                >
                                  {processingInvitation === invitation.id ? '...' : 'Decline'}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleAcceptInvitation(invitation.id)}
                                  disabled={processingInvitation === invitation.id}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  {processingInvitation === invitation.id ? '...' : 'Accept'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Owed To Modal */}
      {showOwedToModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">People Who Owe You</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowOwedToModal(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </Button>
            </div>
            <div className="space-y-3">
              {balances.owedToDetails && balances.owedToDetails.length > 0 ? (
                balances.owedToDetails.map((person, index) => (
                  <div key={index} className="border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between p-3 bg-green-50">
                      <div>
                        <p className="font-medium text-slate-900">{person.userName}</p>
                        <p className="text-sm text-slate-500">{person.transactions.length} transaction{person.transactions.length > 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">${person.totalAmount.toFixed(2)}</p>
                        <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 text-xs">
                          Send reminder
                        </Button>
                      </div>
                    </div>
                    {person.transactions.length > 1 && (
                      <div className="px-3 pb-3">
                        <details className="mt-2">
                          <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
                            View breakdown
                          </summary>
                          <div className="mt-2 space-y-1">
                            {person.transactions.map((transaction, txIndex) => (
                              <div key={txIndex} className="flex justify-between text-xs text-slate-600 py-1 px-2 bg-white rounded">
                                <span>{transaction.transactionName} • {transaction.circleName}</span>
                                <span>${transaction.amount.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-4">No one owes you money right now</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Owes Modal */}
      {showOwesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">People You Owe</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowOwesModal(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </Button>
            </div>
            
            {getPendingTransactions().length > 1 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">Pay All Pending</p>
                    <p className="text-sm text-red-600">
                      {getPendingTransactions().length} transactions • ${getPendingTransactions().reduce((sum, t) => sum + parseFloat(t.amount_owed || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      setShowOwesModal(false);
                      handleBulkPaymentOpen();
                    }}
                  >
                    <CreditCard className="w-4 h-4 mr-1" />
                    Pay All
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {balances.owesDetails && balances.owesDetails.length > 0 ? (
                balances.owesDetails.map((person, index) => (
                  <div key={index} className="border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between p-3 bg-red-50">
                      <div>
                        <p className="font-medium text-slate-900">{person.creatorName}</p>
                        <p className="text-sm text-slate-500">{person.transactions.length} transaction{person.transactions.length > 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600">${person.totalAmount.toFixed(2)}</p>
                        {person.transactions.length === 1 ? (
                          // Single transaction - navigate to transaction details page
                          <Link 
                            to={`/transaction/${person.transactions[0].id}/pay`}
                            className="inline-flex items-center justify-center text-red-600 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          >
                            Pay now
                          </Link>
                        ) : (
                          // Multiple transactions - open bulk payment modal for this person
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700 text-xs"
                            onClick={() => handlePersonPaymentOpen(person)}
                          >
                            Pay now
                          </Button>
                        )}
                      </div>
                    </div>
                    {person.transactions.length > 1 && (
                      <div className="px-3 pb-3">
                        <details className="mt-2">
                          <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
                            View breakdown
                          </summary>
                          <div className="mt-2 space-y-1">
                            {person.transactions.map((transaction, txIndex) => (
                              <div key={txIndex} className="flex justify-between text-xs text-slate-600 py-1 px-2 bg-white rounded">
                                <span>{transaction.transactionName} • {transaction.circleName}</span>
                                <span>${transaction.amount.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-4">You don't owe anyone money right now</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {showTransactionDetails && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Transaction Details</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCloseTransactionDetails}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Transaction Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    selectedTransaction.user_payment_status === 'paid' || selectedTransaction.payment_status === 'paid' 
                      ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    <DollarSign className={`w-6 h-6 ${
                      selectedTransaction.user_payment_status === 'paid' || selectedTransaction.payment_status === 'paid' 
                        ? 'text-green-600' : 'text-slate-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-slate-900">
                      {selectedTransaction.description || selectedTransaction.name || 'Transaction'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {selectedTransaction.circle?.name || 'Unknown Circle'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-slate-900">
                    ${(parseFloat(selectedTransaction.total_amount || selectedTransaction.amount || '0') || 0).toFixed(2)}
                  </p>
                  <Badge 
                    variant={
                      selectedTransaction.user_payment_status === 'paid' || selectedTransaction.payment_status === 'paid' 
                        ? 'green' : 'red'
                    }
                    className="text-xs"
                  >
                    {selectedTransaction.user_payment_status === 'paid' || selectedTransaction.payment_status === 'paid' 
                      ? 'Paid' : 'Pending'}
                  </Badge>
                </div>
              </div>

              {/* GST and Service Charge Breakdown */}
              {(selectedTransaction.gst_amount > 0 || selectedTransaction.service_charge_amount > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-amber-900 mb-3">Amount Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    {selectedTransaction.base_amount && (
                      <div className="flex justify-between">
                        <span className="text-amber-700">Base Amount:</span>
                        <span className="text-amber-900 font-medium">
                          ${parseFloat(selectedTransaction.base_amount).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {selectedTransaction.gst_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-amber-700">
                          GST ({(selectedTransaction.gst_rate * 100).toFixed(2)}%):
                        </span>
                        <span className="text-amber-900 font-medium">
                          ${parseFloat(selectedTransaction.gst_amount).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {selectedTransaction.service_charge_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-amber-700">
                          Service Charge ({(selectedTransaction.service_charge_rate * 100).toFixed(2)}%):
                        </span>
                        <span className="text-amber-900 font-medium">
                          ${parseFloat(selectedTransaction.service_charge_amount).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-amber-300">
                      <span className="text-amber-900 font-medium">Total Amount:</span>
                      <span className="text-amber-900 font-semibold">
                        ${parseFloat(selectedTransaction.total_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">Created:</span>
                    <span className="text-slate-900">
                      {new Date(selectedTransaction.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">Created by:</span>
                    <span className="text-slate-900">
                      {selectedTransaction.created_by === currentUser?.user_id ? 'You' : 
                       selectedTransaction.creator?.username || selectedTransaction.creator?.email || 'Unknown User'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">Category:</span>
                    <span className="text-slate-900 capitalize">
                      {selectedTransaction.category || 'Not specified'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedTransaction.user_amount_owed && selectedTransaction.created_by !== currentUser?.user_id && (
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">Your share:</p>
                      <p className="text-lg font-semibold text-slate-900 mb-3">
                        ${parseFloat(selectedTransaction.user_amount_owed).toFixed(2)}
                      </p>
                      
                      {/* Pay Now Button */}
                      {(selectedTransaction.user_payment_status === 'unpaid' || selectedTransaction.user_payment_status === 'pending' || !selectedTransaction.user_payment_status) && (
                        <Link 
                          to={`/transaction/${selectedTransaction.id}/pay`}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <CreditCard className="w-4 h-4" />
                          Pay Now
                        </Link>
                      )}
                      
                      {selectedTransaction.user_payment_status === 'paid' && (
                        <div className="inline-flex items-center gap-2 text-green-700 text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Payment Complete
                        </div>
                      )}
                    </div>
                  )}

                  {(selectedTransaction.location_name || selectedTransaction.formatted_address) && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <span className="text-slate-600">Location:</span>
                        <p className="text-slate-900">
                          {selectedTransaction.location_name || selectedTransaction.formatted_address}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedTransaction.description && selectedTransaction.description !== selectedTransaction.name && (
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2">Description</h4>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                    {selectedTransaction.description}
                  </p>
                </div>
              )}

              {/* Members/Participants */}
              {selectedTransaction.members && selectedTransaction.members.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-3">Participants</h4>
                  <div className="space-y-2">
                    {selectedTransaction.members.map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-slate-600" />
                          </div>
                          <span className="text-sm text-slate-900">
                            {member.user_id === currentUser?.user_id ? 'You' : 
                             member.external_name || member.user?.username || member.user?.email || 'Unknown User'}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-slate-900">
                            ${parseFloat(member.amount_owed || 0).toFixed(2)}
                          </p>
                          <Badge 
                            variant={member.payment_status === 'paid' ? 'green' : 'red'}
                            className="text-xs"
                          >
                            {member.payment_status === 'paid' ? 'Paid' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Payment Modal */}
      {showBulkPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Pay Multiple Transactions</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowBulkPayment(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-3">
                Select the transactions you want to mark as paid:
              </p>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {getPendingTransactions().map((transaction) => (
                  <div key={transaction.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                    <input
                      type="checkbox"
                      id={`transaction-${transaction.id}`}
                      checked={selectedTransactions.includes(transaction.id)}
                      onChange={() => handleTransactionToggle(transaction.id)}
                      className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                    />
                    <label htmlFor={`transaction-${transaction.id}`} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">
                            {transaction.transaction?.name || transaction.name || 'Transaction'}
                          </p>
                          <p className="text-sm text-slate-500">
                            {transaction.transaction?.circle?.name || transaction.circle?.name || 'Circle'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">
                            ${parseFloat(transaction.amount_owed || 0).toFixed(2)}
                          </p>
                          <Badge variant="red" className="text-xs">
                            {transaction.payment_status || 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-600">
                    {selectedTransactions.length} transaction{selectedTransactions.length !== 1 ? 's' : ''} selected
                  </p>
                  <p className="font-semibold text-slate-900">
                    Total: ${getTotalSelectedAmount().toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowBulkPayment(false)}
                    disabled={bulkPaymentLoading}
                  >
                    Cancel
                  </Button>
                  
                  {/* Navigate to individual payment page for single transactions */}
                  {selectedTransactions.length === 1 && (
                    <Link
                      to={`/transaction/${selectedTransactions[0]}/pay`}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                      Go to Payment
                    </Link>
                  )}
                  
                  {/* Mark as Paid Button */}
                  <Button
                    variant="primary"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={handleBulkPayment}
                    disabled={bulkPaymentLoading || selectedTransactions.length === 0}
                  >
                    {bulkPaymentLoading ? (
                      <span className="flex items-center gap-2">
                        <Clock3 className="w-4 h-4 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Mark as Paid ({selectedTransactions.length})
                      </span>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>💡 Payment Options:</strong>
                  <br/>• <strong>Single transaction:</strong> Click "Go to Payment" for PayNow and other payment methods
                  <br/>• <strong>Multiple transactions:</strong> Use "Mark as Paid" if you've completed payments separately
                  <br/>• <strong>Manual payments:</strong> If paid by cash/other methods, use "Mark as Paid"
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}