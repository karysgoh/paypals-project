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

  async sendPaymentReminder(userId, transactionId = null) {
    const body = transactionId ? { transactionId } : {};
    return this.request(`/transactions/reminder/${userId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
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
  }, [currentUser]); // Removed calculateBalancesFromTransactions dependency since it's stable with empty deps

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
  }, [currentUser, showNotification]);

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
  }, [currentUser, authLoading]); // Removed loadInvitations to prevent infinite loop

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

  // Send payment reminder function
  const handleSendReminder = async (userId, userName) => {
    try {
      showNotification(`Sending payment reminder to ${userName}...`, 'info');
      
      const response = await api.sendPaymentReminder(userId);
      
      if (response.status === 'success') {
        showNotification(`Payment reminder sent successfully to ${userName}!`, 'success');
      } else {
        showNotification(response.message || 'Failed to send payment reminder', 'error');
      }
    } catch (error) {
      console.error('Error sending payment reminder:', error);
      showNotification('Failed to send payment reminder. Please try again.', 'error');
    }
  };

  // Transaction form handlers (adapted from CircleDetail)
  const updateParticipantInclude = (user_id, include) => {
    if (currentUser && user_id === currentUser.user_id) return;
    setTxForm(f => ({
      ...f,
      participants: f.participants.map(p => p.user_id === user_id ? { ...p, include } : p),
    }));
  };

  const updateParticipantAmount = (user_id, amount) => {
    const newAmount = parseFloat(amount) || 0;
    const totalAmount = parseFloat(txForm.total_amount) || 0;
    
    setTxForm(f => {
      const updatedParticipants = f.participants.map(p => 
        p.user_id === user_id ? { ...p, amount_owed: newAmount } : p
      );
      
      // Auto-calculate remaining amount for the second participant if there are exactly 2 participants
      const includedParticipants = updatedParticipants.filter(p => p.include);
      
      if (includedParticipants.length === 2 && totalAmount > 0) {
        const updatedParticipant = includedParticipants.find(p => p.user_id === user_id);
        const otherParticipant = includedParticipants.find(p => p.user_id !== user_id);
        
        if (updatedParticipant && otherParticipant) {
          const remainingAmount = totalAmount - newAmount;
          if (remainingAmount >= 0) {
            // Update the other participant's amount
            const finalParticipants = updatedParticipants.map(p => 
              p.user_id === otherParticipant.user_id ? { ...p, amount_owed: remainingAmount } : p
            );
            return { ...f, participants: finalParticipants };
          }
        }
      }
      
      return { ...f, participants: updatedParticipants };
    });
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
    const newAmount = parseFloat(amount) || 0;
    const totalAmount = parseFloat(txForm.total_amount) || 0;
    
    setTxForm(f => {
      const updatedExternalParticipants = f.external_participants.map(p => 
        p.id === id ? { ...p, amount_owed: newAmount } : p
      );
      
      // Auto-calculate for 2 participants (considering both internal and external)
      const includedInternal = f.participants.filter(p => p.include);
      const includedExternal = updatedExternalParticipants.filter(p => p.include);
      const totalIncluded = includedInternal.length + includedExternal.length;
      
      if (totalIncluded === 2 && totalAmount > 0) {
        const updatedExternal = includedExternal.find(p => p.id === id);
        
        if (updatedExternal) {
          const remainingAmount = totalAmount - newAmount;
          
          if (remainingAmount >= 0) {
            // Find the other participant (could be internal or external)
            if (includedInternal.length === 1) {
              // Other participant is internal
              const otherInternal = includedInternal[0];
              const updatedInternalParticipants = f.participants.map(p => 
                p.user_id === otherInternal.user_id ? { ...p, amount_owed: remainingAmount } : p
              );
              return { ...f, participants: updatedInternalParticipants, external_participants: updatedExternalParticipants };
            } else if (includedExternal.length === 2) {
              // Other participant is external
              const otherExternal = includedExternal.find(p => p.id !== id);
              if (otherExternal) {
                const finalExternalParticipants = updatedExternalParticipants.map(p => 
                  p.id === otherExternal.id ? { ...p, amount_owed: remainingAmount } : p
                );
                return { ...f, external_participants: finalExternalParticipants };
              }
            }
          }
        }
      }
      
      return { ...f, external_participants: updatedExternalParticipants };
    });
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
              <Link
                to="/settings/payment"
                className="flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto"
              >
                <svg className="w-4 h-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Payment Settings
              </Link>
              <Button 
                variant="primary" 
                size="md" 
                className="w-full sm:w-auto text-slate-900"
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
                      
                      {!txForm.splitEven && (
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                          💡 <strong>Smart Calculation:</strong> When entering amounts manually for 2 participants, 
                          the second participant's amount will be automatically calculated as the remaining balance.
                        </div>
                      )}
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

          {/* Hero Section - Consolidated Balance Overview */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-slate-900 to-slate-700 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold mb-2">Welcome back, {userName}! 👋</h1>
                  <p className="text-slate-300">Here's your financial overview: </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">You're owed</span>
                  </div>
                  <p className="text-2xl font-bold">${(balances.owedTo || 0).toFixed(2)}</p>
                  <p className="text-sm text-slate-300">
                    {balances.owedToDetails?.length || 0} people owe you
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    </div>
                    <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full">You owe</span>
                  </div>
                  <p className="text-2xl font-bold">${(balances.owes || 0).toFixed(2)}</p>
                  <p className="text-sm text-slate-300">
                    {balances.owesDetails?.length || 0} pending payments
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">Net balance</span>
                  </div>
                  <p className="text-2xl font-bold">${Math.abs(balances.net || 0).toFixed(2)}</p>
                  <p className="text-sm text-slate-300">
                    {balances.net >= 0 ? 'In your favor' : 'You owe overall'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* No Transactions State */}
          {(!transactions || transactions.length === 0) && (
            <div className="mb-8">
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                    <DollarSign className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No transactions yet</h3>
                  <p className="text-base text-slate-600 mb-6">
                    Start splitting expenses with your friends by creating your first transaction
                  </p>
                  <div className="space-y-3 sm:space-y-0 sm:space-x-3 sm:flex sm:justify-center">
                    <Button 
                      variant="primary" 
                      size="md"
                      onClick={() => setShowTransactionForm(true)}
                      className="w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Transaction
                    </Button>
                    <Link 
                      to="/circles"
                      className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Manage Circles
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Smart Activity Feed - Combines Outstanding Balances + Recent Activity */}
          {transactions && transactions.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Main Activity Feed */}
              <div className="lg:col-span-2">
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-medium text-slate-900">Activity & Actions</h2>
                      <p className="text-base text-slate-500">Pending payments and recent transactions</p>
                    </div>
                    <Link 
                      to="/transactions" 
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      View all →
                    </Link>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-0">
                    {/* Priority Section: Outstanding Payments (What you owe) */}
                    {balances.owes > 0 && (
                      <div className="border-b border-slate-200">
                        <div className="p-4 bg-red-50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                                <TrendingDown className="w-3 h-3 text-red-600" />
                              </div>
                              <h3 className="font-medium text-red-900">Action Required: You Owe</h3>
                            </div>
                            {getPendingTransactions().length > 1 && (
                              <Button 
                                variant="primary" 
                                size="sm" 
                                className="bg-red-600 hover:bg-red-700 text-xs"
                                onClick={handleBulkPaymentOpen}
                              >
                                Pay All ({getPendingTransactions().length})
                              </Button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {transactions
                              .filter(t => (t.user_payment_status === 'unpaid' || t.user_payment_status === 'pending') && parseFloat(t.user_amount_owed || 0) > 0)
                              .slice(0, 3)
                              .map((transaction, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-900 truncate">
                                    {transaction.name || 'Transaction'}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {transaction.circle?.name || 'Circle'} • Created {new Date(transaction.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-red-600">
                                    ${parseFloat(transaction.user_amount_owed || 0).toFixed(2)}
                                  </span>
                                  <button 
                                    className="p-1 hover:bg-slate-100 rounded" 
                                    onClick={() => handleShowTransactionDetails(transaction)}
                                  >
                                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recent Activity */}
                    <div className="p-4">
                      <h3 className="font-medium text-slate-900 mb-3">Recent Transactions</h3>
                      <div className="space-y-2">
                        {transactions.slice(0, 5).map((transaction) => {
                          const isPaid = transaction.user_payment_status === 'paid' || transaction.payment_status === 'paid';
                          const isCreator = transaction.created_by === currentUser?.user_id;
                          
                          return (
                          <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isPaid ? 'bg-green-100' : 'bg-slate-100'
                              }`}>
                                <DollarSign className={`w-4 h-4 ${
                                  isPaid ? 'text-green-600' : 'text-slate-600'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-slate-900 text-sm truncate">
                                    {transaction.description || transaction.name || 'Transaction'}
                                  </p>
                                  {isCreator && (
                                    <Badge variant="blue" className="text-xs flex-shrink-0">You</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 truncate">
                                  {new Date(transaction.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })} • {transaction.circle?.name || 'Circle'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-right">
                                <div className="text-sm font-medium text-slate-900">
                                  ${(parseFloat(transaction.total_amount || transaction.amount || '0') || 0).toFixed(2)}
                                </div>
                                <Badge 
                                  variant={isPaid ? 'green' : 'amber'} 
                                  className="text-xs"
                                >
                                  {isPaid ? 'Paid' : 'Pending'}
                                </Badge>
                              </div>
                              <button 
                                className="p-1 hover:bg-slate-100 rounded flex-shrink-0" 
                                onClick={() => handleShowTransactionDetails(transaction)}
                              >
                                <MoreHorizontal className="w-4 h-4 text-slate-400" />
                              </button>
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar: What You're Owed + Quick Actions */}
              <div className="space-y-6">
                {/* You're Owed Section */}
                {balances.owedTo > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-3 h-3 text-green-600" />
                        </div>
                        <h3 className="font-medium text-slate-900">You're Owed</h3>
                      </div>
                      <p className="text-2xl font-bold text-green-600 mb-3">${balances.owedTo.toFixed(2)}</p>
                      <div className="space-y-2">
                        {balances.owedToDetails && balances.owedToDetails.slice(0, 3).map((detail, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {detail.userName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {detail.transactions.length} transaction{detail.transactions.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-green-600">
                                ${parseFloat(detail.totalAmount || 0).toFixed(2)}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-green-600 hover:text-green-700 text-xs p-1 h-auto"
                                onClick={() => handleSendReminder(detail.userId, detail.userName)}
                              >
                                Remind
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-slate-900 mb-3">Quick Actions</h3>
                    <div className="space-y-4">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start py-4" 
                        onClick={() => setShowTransactionForm(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Transaction
                      </Button>
                      <Link to="/circles" className="w-full">
                        <Button variant="outline" className="w-full justify-start py-4">
                          <Users className="w-4 h-4 mr-2" />
                          Manage Circles
                        </Button>
                      </Link>
                      <Link to="/transactions" className="w-full">
                        <Button variant="outline" className="w-full justify-start py-4">
                          <Clock3 className="w-4 h-4 mr-2" />
                          All Transactions
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

        <div className="px-4 sm:px-8 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Circle Management - Unified Section */}
            <div className="lg:col-span-3">
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-medium text-slate-900">Circle Management</h2>
                    <p className="text-base text-slate-500">
                      {circles.length} circles • {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Link to="/circles">
                    <Button variant="outline">
                      <Users className="w-4 h-4 mr-2" />
                      Manage All
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Circles */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-slate-900">My Circles</h3>
                      <Link to="/circles">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                          View all ({circles.length})
                        </Button>
                      </Link>
                    </div>
                    
                    {circles.length === 0 ? (
                      <div className="text-center py-6">
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <Users className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-600 mb-3">No circles yet</p>
                        <Link to="/circles">
                          <Button variant="primary" size="sm">
                            <Plus className="w-4 h-4 mr-1" />
                            Create First Circle
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {circles.slice(0, 3).map((circle) => (
                          <div key={circle.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                <Users className="w-4 h-4 text-slate-600" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 text-sm">{circle.name}</p>
                                <p className="text-xs text-slate-500">{circle.memberCount} members</p>
                              </div>
                            </div>
                            <Link to={createPageUrl(`circles/${circle.id}`)}>
                              <Button variant="ghost" size="sm" className="text-xs">
                                View
                              </Button>
                            </Link>
                          </div>
                        ))}
                        {circles.length > 3 && (
                          <div className="text-center pt-2">
                            <Link to="/circles">
                              <Button variant="outline" size="sm" className="text-xs">
                                +{circles.length - 3} more circles
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pending Invitations */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-slate-900">Pending Invitations</h3>
                      {invitations.length > 0 && (
                        <Badge variant="amber" className="text-xs">
                          {invitations.length} pending
                        </Badge>
                      )}
                    </div>
                    
                    {invitations.length === 0 ? (
                      <div className="text-center py-6">
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <Mail className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-600">No pending invitations</p>
                        <p className="text-xs text-slate-500 mt-1">All caught up!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {invitations.slice(0, 3).map((invitation) => (
                          <div key={invitation.id} className="border border-amber-200 rounded-lg p-3 bg-amber-50">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                                  <UserPlus className="w-3 h-3" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-900">{invitation.circle?.name}</p>
                                  <p className="text-xs text-slate-500">
                                    From {invitation.inviter?.name || invitation.inviter?.username}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRejectInvitation(invitation.id)}
                                disabled={processingInvitation === invitation.id}
                                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 text-xs flex-1"
                              >
                                {processingInvitation === invitation.id ? '...' : 'Decline'}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleAcceptInvitation(invitation.id)}
                                disabled={processingInvitation === invitation.id}
                                className="text-xs flex-1"
                              >
                                {processingInvitation === invitation.id ? '...' : 'Accept'}
                              </Button>
                            </div>
                          </div>
                        ))}
                        {invitations.length > 3 && (
                          <p className="text-xs text-slate-500 text-center">
                            +{invitations.length - 3} more invitations
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
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
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-green-600 hover:text-green-700 text-xs"
                          onClick={() => handleSendReminder(person.userId, person.userName)}
                        >
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
    </div>
    </div>
    </div>
  );
}