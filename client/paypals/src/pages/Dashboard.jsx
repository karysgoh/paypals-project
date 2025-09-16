import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { 
  Plus, 
  Users, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Clock3,
  MoreHorizontal,
  UserPlus
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

      // Debug logging
      console.log('Processing transaction:', {
        id: transaction.id,
        name: transaction.name,
        isCreator,
        currentUserId,
        created_by: transaction.created_by,
        members: members.map(m => ({
          user_id: m.user_id,
          payment_status: m.payment_status,
          amount_owed: m.amount_owed
        }))
      });

      if (isCreator) {
        // For transactions I created, calculate what others owe me
        members.forEach(member => {
          if (member.user_id !== currentUserId && member.payment_status === 'pending') {
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
                userName: member.user?.username || member.user?.email || 'Unknown User',
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
        // For transactions others created, find my debt
        const myMembership = members.find(member => member.user_id === currentUserId);
        if (myMembership && myMembership.payment_status === 'pending') {
          const amount = parseFloat(myMembership.amount_owed || 0);
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
    const pendingCount = owedToDetails.length + owesDetails.length;

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
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/invitations/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvitations(data.data || []);
      } else {
        console.warn('Failed to load invitations:', response.statusText);
      }
    } catch (error) {
      console.warn('Error loading invitations:', error);
    }
  }, [currentUser]);

  const handleAcceptInvitation = async (invitationId) => {
    try {
      setProcessingInvitation(invitationId);
      setErrorMessage('');
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/invitations/${invitationId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Remove the accepted invitation from the list
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        setSuccessMessage('Invitation accepted successfully! Welcome to the circle.');
        
        // Reload dashboard data to reflect new circle membership
        loadDashboardData();
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.message || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setErrorMessage('An error occurred while accepting the invitation');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    try {
      setProcessingInvitation(invitationId);
      setErrorMessage('');
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/invitations/${invitationId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Remove the rejected invitation from the list
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        setSuccessMessage('Invitation rejected');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.message || 'Failed to reject invitation');
      }
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      setErrorMessage('An error occurred while rejecting the invitation');
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

  const userName = currentUser?.name || currentUser?.username || currentUser?.email?.split('@')[0] || 'there';

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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="px-4 sm:px-8 pt-10 sm:pt-12 pb-6 sm:pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
        <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-2">
                Welcome back, {userName}
              </h1>
        <p className="text-base sm:text-lg text-slate-600">
                Here's what's happening with your expenses
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Link to={createPageUrl("expense")} className="w-full sm:w-auto">
                <Button variant="primary" size="md" className="w-full sm:w-auto">
                  <Plus className="w-5 h-5 mr-1.5" />
                  Add Expense
                </Button>
              </Link>
              <Link to={createPageUrl("circles")} className="w-full sm:w-auto">
                <Button variant="secondary" size="md" className="w-full sm:w-auto">
                  <Users className="w-5 h-5 mr-1.5" />
                  Circles
                </Button>
              </Link>
            </div>
          </div>

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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-auto text-xs mt-2"
                      onClick={() => setShowOwesModal(true)}
                    >
                      View & pay
                    </Button>
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
                <h2 className="text-xl font-medium text-slate-900">Recent Activity</h2>
                <p className="text-base text-slate-500">Your latest transactions</p>
              </div>

              <Card>
                <CardContent className="p-0">
                  {transactions.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <DollarSign className="w-7 h-7 text-slate-400" />
                      </div>
                      <p className="text-base text-slate-600 font-medium mb-1">No recent activity</p>
                      <p className="text-sm text-slate-500">Start by adding your first expense</p>
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
                            <button className="p-1 hover:bg-slate-100 rounded" aria-label="More transaction options">
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
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 text-xs">
                          Pay now
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
                <p className="text-slate-500 text-center py-4">You don't owe anyone money right now</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}