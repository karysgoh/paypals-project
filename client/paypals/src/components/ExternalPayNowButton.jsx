import React, { useState } from 'react';
import { CheckCircle, QrCode, Loader2, Download, AlertCircle } from 'lucide-react';

const ExternalPayNowButton = ({ 
  token, 
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
   * Generate PayNow QR code for external transaction
   */
  const generatePayNowQR = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[ExternalPayNowButton] Generating QR for token: ${token}`);
      console.log(`[ExternalPayNowButton] API URL: ${apiBase}/paynow/external/${token}/qr`);

      const response = await fetch(`${apiBase}/paynow/external/${token}/qr`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`[ExternalPayNowButton] Response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[ExternalPayNowButton] Error response:`, errorData);
        throw new Error(errorData.message || 'Failed to generate PayNow QR');
      }

      const data = await response.json();
      console.log(`[ExternalPayNowButton] Success response:`, data);
      setQrData(data.data);
      setShowQR(true);

    } catch (err) {
      console.error('External PayNow QR generation error:', err);
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
   */
  const confirmPayment = async () => {
    try {
      setConfirming(true);
      setError(null);

      const response = await fetch(`${apiBase}/paynow/external/${token}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentReference: qrData?.paymentInfo?.reference || `PayPals-${Date.now()}`
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
          paymentMethod: 'paynow',
          paymentReference: qrData?.paymentInfo?.reference
        });
      }

      // Reset component state
      setShowQR(false);
      setQrData(null);

    } catch (err) {
      console.error('External payment confirmation error:', err);
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

  /**
   * Download QR code image as PNG file
   */
  const downloadQRCode = () => {
    if (!qrData?.qrCodeDataURL) return;

    try {
      const link = document.createElement('a');
      link.href = qrData.qrCodeDataURL;
      link.download = `PayNow-QR-${qrData.paymentInfo.recipient}-${qrData.paymentInfo.amount}SGD.png`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      setError('Failed to download QR code');
    }
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
            <p className="font-medium">PayNow Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* PayNow QR Modal */}
      {showQR && qrData && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 min-h-screen">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <QrCode className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">PayNow Payment</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {qrData.paymentInfo.description}
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 relative">
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
                {/* Download QR Code Button */}
                <button
                  onClick={downloadQRCode}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download QR Code</span>
                </button>

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

export default ExternalPayNowButton;