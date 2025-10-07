import React, { useState, useEffect } from 'react';
import { CheckCircle, QrCode, Phone, CreditCard, AlertCircle, Loader2 } from 'lucide-react';

const PayNowButton = ({ 
  transactionId, 
  onPaymentSuccess, 
  onPaymentError, 
  disabled = false,
  className = "" 
}) => {
  // Component state
  const [qrData, setQrData] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  /**
   * Generate PayNow QR code for the transaction
   * 
   * This calls our backend API which:
   * 1. Validates the transaction and user permissions
   * 2. Checks recipient has PayNow enabled
   * 3. Generates EMV-compliant QR data
   * 4. Returns QR code image and payment details
   */
  const generatePayNowQR = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiBase}/paynow/${transactionId}/qr`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'  // Use cookie-based authentication
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate PayNow QR');
      }

      const data = await response.json();
      setQrData(data.data);
      setShowQR(true);

    } catch (err) {
      console.error('PayNow QR generation error:', err);
      setError(err.message);
      if (onPaymentError) {
        onPaymentError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Confirm that payment has been made
   * 
   * Called when user clicks "I've Made the Payment"
   * This updates the transaction status in our database
   */
  const confirmPayment = async () => {
    try {
      setConfirming(true);
      setError(null);

      const response = await fetch(`${apiBase}/paynow/${transactionId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',  // Use cookie-based authentication
        body: JSON.stringify({
          paymentReference: qrData?.paymentInfo?.reference || `PayPals-${transactionId}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to confirm payment');
      }

      const result = await response.json();
      
      // Call success callback
      if (onPaymentSuccess) {
        onPaymentSuccess({
          transactionId,
          paymentMethod: 'paynow',
          paymentReference: qrData?.paymentInfo?.reference
        });
      }

      // Reset component state
      setShowQR(false);
      setQrData(null);

    } catch (err) {
      console.error('Payment confirmation error:', err);
      setError(err.message);
      if (onPaymentError) {
        onPaymentError(err);
      }
    } finally {
      setConfirming(false);
    }
  };

  const closeQR = () => {
    setShowQR(false);
    setQrData(null);
    setError(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* PayNow Payment Button */}
      <button
        onClick={generatePayNowQR}
        disabled={disabled || loading}
        className="w-full bg-red-600 text-white py-3 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating QR...</span>
          </>
        ) : (
          <>
            <QrCode className="w-5 h-5" />
            <span>Pay with PayNow</span>
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-red-800">Payment Error</h4>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && qrData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-red-600 text-white p-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">PayNow Payment</h3>
                <button
                  onClick={closeQR}
                  className="text-white hover:bg-red-700 rounded p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Payment Info */}
              <div className="text-center space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">
                  Pay {qrData.paymentInfo.recipient}
                </h4>
                <div className="text-3xl font-bold text-red-600">
                  ${parseFloat(qrData.paymentInfo.amount || 0).toFixed(2)}
                </div>
                <p className="text-sm text-gray-600">
                  {qrData.paymentInfo.description}
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <img 
                    src={qrData.qrCodeDataURL} 
                    alt="PayNow QR Code" 
                    className="w-48 h-48"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900">How to Pay:</h5>
                <ol className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start space-x-3">
                    <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0">1</span>
                    <span>Open your Singapore banking app (DBS, OCBC, UOB, etc.)</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0">2</span>
                    <span>Scan this QR code using your banking app</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0">3</span>
                    <span>Verify the amount and recipient, then confirm payment</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0">4</span>
                    <span>Click "I've Made the Payment" below after completing</span>
                  </li>
                </ol>
              </div>

              {/* Payment Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h6 className="font-medium text-gray-900">Payment Details</h6>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between text-gray-600">
                    <span>Recipient:</span>
                    <span className="font-medium">{qrData.paymentInfo.recipient}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Amount:</span>
                    <span className="font-medium">${parseFloat(qrData.paymentInfo.amount || 0).toFixed(2)} {qrData.paymentInfo.currency}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Reference:</span>
                    <span className="font-medium text-xs">{qrData.paymentInfo.reference}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={confirmPayment}
                  disabled={confirming}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>I've Made the Payment</span>
                    </>
                  )}
                </button>

                <button
                  onClick={closeQR}
                  className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayNowButton;