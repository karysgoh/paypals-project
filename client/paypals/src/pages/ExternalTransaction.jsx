import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Clock, AlertCircle, Users, DollarSign, QrCode, CreditCard } from 'lucide-react';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const Button = ({ children, variant = "default", size = "default", className = "", ...props }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    primary: "bg-green-600 text-white hover:bg-green-700",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    success: "bg-green-600 text-white hover:bg-green-700",
    NetsQR: "bg-blue-600 text-white hover:bg-blue-700"
  };
  
  const sizes = {
    default: "h-10 px-6 py-2",
    sm: "h-8 px-3 text-xs",
    lg: "h-12 px-8 text-base"
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
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

export default function ExternalTransaction() {
  const { token } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  useEffect(() => {
    fetchTransactionDetails();
  }, [token]);

  const fetchTransactionDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/transactions/external/${token}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('This link has expired or is invalid. Please contact the person who sent you this transaction.');
        } else {
          setError('Failed to load transaction details.');
        }
        return;
      }

      const data = await response.json();
      setTransaction(data.data.transaction);
      setParticipant(data.data.external_participant);
    } catch (err) {
      console.error('Error fetching transaction:', err);
      setError('Failed to load transaction details.');
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (status) => {
    try {
      setUpdating(true);
      setError('');
      setSuccess('');

      const response = await fetch(`${apiBase}/transactions/external/${token}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_status: status,
          payment_method: status === 'paid' ? 'NetsQR' : 'other'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to update payment status.');
        return;
      }

      const data = await response.json();
      setSuccess(data.message);
      
      // Update local state
      setParticipant(prev => ({
        ...prev,
        payment_status: status
      }));

    } catch (error) {
      console.error('Error updating payment status:', error);
      setError('Failed to update payment status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleNetsQRPayment = async () => {
    try {
      setPaymentProcessing(true);
      setError('');
      setSuccess('');

      // TODO: Implement NetsQR API integration
      setShowQRCode(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // TODO: Replace with actual NetsQR QR code generation
      // const NetsQRResponse = await fetch('/api/NetsQR/generate-qr', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     amount: participant.amount_owed,
      //     description: `${transaction.name} - ${participant.name}`,
      //     merchant_id: process.env.VITE_NetsQR_MERCHANT_ID,
      //     transaction_id: transaction.id,
      //     callback_url: `${window.location.origin}/external/payment-callback/${token}`
      //   })
      // });

      setSuccess('NetsQR QR code generated successfully! Scan to complete payment.');

    } catch (error) {
      console.error('NetsQR payment error:', error);
      setError('Failed to generate NetsQR QR code. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handlePaymentComplete = async () => {
    try {
      setUpdating(true);
      await updatePaymentStatus('paid');
      setShowQRCode(false);
      setSuccess('Payment completed successfully! Thank you.');
    } catch (error) {
      setError('Failed to update payment status.');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'paid': { text: 'Paid', color: 'bg-green-100 text-green-800' },
      'pending': { text: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      'unpaid': { text: 'Unpaid', color: 'bg-red-100 text-red-800' },
      'failed': { text: 'Failed', color: 'bg-red-100 text-red-800' }
    };
    return statusMap[status] || statusMap['unpaid'];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4 animate-spin" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Loading Transaction...</h1>
          <p className="text-slate-600 text-sm">Please wait while we fetch your transaction details.</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Unable to Load Transaction</h1>
          <p className="text-slate-600 text-sm">{error}</p>
        </Card>
      </div>
    );
  }

  if (!transaction || !participant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Transaction Not Found</h1>
          <p className="text-slate-600 text-sm">This transaction could not be found or has been removed.</p>
        </Card>
      </div>
    );
  }

  const statusInfo = getStatusText(participant.payment_status);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">PayPals Transaction</h1>
            <p className="text-slate-600 mt-1">You've been included in this transaction</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {success && (
          <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Transaction Details */}
        <Card className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{transaction.name}</h2>
              {transaction.description && (
                <p className="text-slate-600 mt-1">{transaction.description}</p>
              )}
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
              <div className="flex items-center gap-1">
                {getStatusIcon(participant.payment_status)}
                {statusInfo.text}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-slate-600">Your Amount</p>
                <p className="font-semibold text-slate-900">${parseFloat(participant.amount_owed).toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-slate-600">Total Amount</p>
                <p className="font-semibold text-slate-900">${parseFloat(transaction.total_amount).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <h3 className="font-medium text-slate-900 mb-2">Transaction Details</h3>
            <div className="space-y-1 text-sm text-slate-600">
              <p><span className="text-slate-600">Created by:</span> <span className="font-medium text-slate-900">{transaction.creator?.username}</span></p>
              <p><span className="text-slate-600">Circle:</span> <span className="font-medium">{transaction.circle?.circle_name}</span></p>
              <p><span className="text-slate-600">Category:</span> <span className="font-medium">{transaction.category || 'General'}</span></p>
              <p><span className="text-slate-600">Date:</span> <span className="font-medium">{new Date(transaction.created_at).toLocaleDateString()}</span></p>
              {transaction.location_name && (
                <p><span className="text-slate-600">Location:</span> <span className="font-medium">{transaction.location_name}</span></p>
              )}
            </div>
          </div>
        </Card>

        {/* Payment Actions */}
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4">Payment Options</h3>
          
          {participant.payment_status === 'paid' ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="text-green-700 font-medium">Thank you! Your payment has been completed.</p>
              <p className="text-slate-600 text-sm mt-1">
                If you need to change this status, use the buttons below.
              </p>
            </div>
          ) : showQRCode ? (
            <div className="text-center py-6">
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 bg-blue-50">
                <QrCode className="w-24 h-24 text-blue-600 mx-auto mb-4" />
                <p className="text-blue-700 font-medium mb-2">NetsQR QR Code</p>
                <p className="text-slate-600 text-sm mb-4">
                  Scan this QR code with your banking app to pay ${parseFloat(participant.amount_owed).toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  {/* TODO: Replace with actual QR code */}
                  QR Code will appear here when NetsQR integration is implemented
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handlePaymentComplete}
                    disabled={updating}
                  >
                    {updating ? 'Processing...' : '✅ Payment Completed'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQRCode(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4">
                <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-700 font-medium">Choose your payment method</p>
                <p className="text-slate-600 text-sm mt-1">
                  Pay ${parseFloat(participant.amount_owed).toFixed(2)} to {transaction.creator?.username}
                </p>
              </div>

              {/* PayNow Payment Option */}
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <QrCode className="w-6 h-6 text-red-600" />
                    <div>
                      <p className="font-medium text-slate-900">PayNow</p>
                      <p className="text-slate-600 text-sm">Singapore's instant payment system</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Button
                      variant="primary"
                      onClick={() => alert('PayNow integration needed for external transactions')}
                      disabled={paymentProcessing}
                      className="min-w-[120px] bg-red-600 hover:bg-red-700"
                    >
                      <span className="flex items-center gap-2">
                        <QrCode className="w-4 h-4" />
                        Pay with PayNow
                      </span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Manual Payment Status */}
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-600 mb-3">
                  Already paid through other means? Update your payment status:
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="success"
                    className="flex-1"
                    onClick={() => updatePaymentStatus('paid')}
                    disabled={updating}
                  >
                    {updating ? 'Updating...' : '✅ Mark as Paid'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => updatePaymentStatus('unpaid')}
                    disabled={updating}
                  >
                    {updating ? 'Updating...' : '❌ Mark as Unpaid'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-slate-700 text-sm">
              <strong>💡 About NetsQR:</strong> NetsQR is a secure QR code payment system. 
              Simply scan the code with your banking app to complete the payment instantly.
            </p>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500">
          <p>Powered by PayPals - Group expense management made simple</p>
        </div>
      </div>
    </div>
  );
}