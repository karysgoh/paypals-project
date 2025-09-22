import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Users, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Plus,
  User,
  UserPlus,
  Settings,
  Receipt,
  TrendingUp,
  TrendingDown
} from "lucide-react";

const Button = ({ children, variant = "default", size = "default", className = "", onClick, ...props }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200",
    outline: "border border-slate-300 bg-transparent text-slate-900 hover:bg-slate-50",
    ghost: "text-slate-900 hover:bg-slate-100",
    destructive: "bg-red-600 text-white hover:bg-red-500"
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-8 px-3 text-sm",
    lg: "h-12 px-8",
    icon: "h-10 w-10",
    "icon-sm": "h-8 w-8"
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

const Card = ({ children, className = "" }) => (
  <div className={`rounded-lg border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
    {children}
  </div>
);

const SampleCircle = () => {
  const navigate = useNavigate();
  const [showAddTransaction, setShowAddTransaction] = useState(false);

  // Sample data for demonstration
  const circleData = {
    id: 'sample',
    name: 'Sample Circle',
    description: 'This is a demo circle to show how PayPals works',
    memberCount: 4,
    totalTransactions: 12,
    totalAmount: 1250.75
  };

  const members = [
    { id: 1, name: 'You (Demo User)', email: 'demo@example.com', balance: 45.50, avatar: null },
    { id: 2, name: 'Alice Johnson', email: 'alice@example.com', balance: -23.25, avatar: null },
    { id: 3, name: 'Bob Smith', email: 'bob@example.com', balance: -15.75, avatar: null },
    { id: 4, name: 'Charlie Brown', email: 'charlie@example.com', balance: -6.50, avatar: null }
  ];

  const sampleTransactions = [
    {
      id: 1,
      description: 'Dinner at Italian Restaurant',
      amount: 89.50,
      date: '2024-01-15',
      paidBy: 'You (Demo User)',
      splitBetween: ['You', 'Alice', 'Bob'],
      location: 'Downtown Restaurant District'
    },
    {
      id: 2,
      description: 'Grocery Shopping',
      amount: 156.25,
      date: '2024-01-14',
      paidBy: 'Alice Johnson',
      splitBetween: ['Alice', 'Bob', 'Charlie'],
      location: 'Local Supermarket'
    },
    {
      id: 3,
      description: 'Movie Tickets',
      amount: 48.00,
      date: '2024-01-12',
      paidBy: 'Bob Smith',
      splitBetween: ['You', 'Bob', 'Charlie', 'Alice'],
      location: 'Cinema Complex'
    }
  ];

  const handleAddTransaction = () => {
    setShowAddTransaction(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/circles')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">{circleData.name}</h1>
                <p className="text-sm text-slate-600">{circleData.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Members
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Demo Notice */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Receipt className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                <strong>Tutorial Demo:</strong> This is a sample circle with demo data to show you how PayPals works. 
                In your real circles, you'll see actual transactions and balances.
              </p>
            </div>
          </div>
        </div>

        {/* Circle Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Members</p>
                <p className="text-2xl font-bold text-slate-900">{circleData.memberCount}</p>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center">
              <Receipt className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Transactions</p>
                <p className="text-2xl font-bold text-slate-900">{circleData.totalTransactions}</p>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Amount</p>
                <p className="text-2xl font-bold text-slate-900">${circleData.totalAmount}</p>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center justify-center">
              <Button 
                className="w-full" 
                onClick={handleAddTransaction}
                data-tour="create-transaction"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Members Section */}
          <div className="lg:col-span-1">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Members</h2>
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              </div>
              <div className="space-y-4">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                        <User className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        member.balance > 0 ? 'text-green-600' : 
                        member.balance < 0 ? 'text-red-600' : 'text-slate-600'
                      }`}>
                        {member.balance > 0 && '+'}${Math.abs(member.balance).toFixed(2)}
                      </p>
                      <div className="flex items-center justify-end">
                        {member.balance > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : member.balance < 0 ? (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Recent Transactions */}
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
              <div className="space-y-4">
                {sampleTransactions.map((transaction) => (
                  <div key={transaction.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-medium text-slate-900">{transaction.description}</h3>
                          <span className="text-lg font-semibold text-slate-900">${transaction.amount}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-slate-500">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(transaction.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            Paid by {transaction.paidBy}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {transaction.location}
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-slate-500">
                            Split between: {transaction.splitBetween.join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal Placeholder */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Add Transaction</h3>
              <Button 
                variant="ghost" 
                size="icon-sm"
                onClick={() => setShowAddTransaction(false)}
              >
                ×
              </Button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Demo Mode:</strong> This would normally open the transaction form. 
                  In your real circles, you can add actual transactions here.
                </p>
              </div>
              <Button 
                className="w-full" 
                onClick={() => setShowAddTransaction(false)}
              >
                Got it!
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SampleCircle;
