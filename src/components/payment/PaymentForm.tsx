import { useState } from 'react';
import { CreditCard, Lock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentFormProps {
  amount: number;
  bookingId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PaymentForm({ amount, bookingId, onSuccess, onCancel }: PaymentFormProps) {
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      // In production, integrate with Stripe, PayPal, or other payment gateway
      // This is a placeholder for payment processing
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful payment
      toast.success('Payment processed successfully!');
      onSuccess();
    } catch (error) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Complete Payment</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-500"
          >
            ×
          </button>
        </div>

        {/* Amount Display */}
        <div className="bg-primary-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-primary-700">Total Amount</p>
          <p className="text-2xl font-bold text-primary-900">₱{amount.toFixed(2)}</p>
        </div>

        {/* Payment Method Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`p-3 border rounded-lg flex items-center justify-center ${
                paymentMethod === 'card'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300'
              }`}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Credit Card
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('paypal')}
              className={`p-3 border rounded-lg flex items-center justify-center ${
                paymentMethod === 'paypal'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300'
              }`}
            >
              PayPal
            </button>
          </div>
        </div>

        {paymentMethod === 'card' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Card Number
              </label>
              <input
                type="text"
                placeholder="1234 5678 9012 3456"
                value={cardDetails.number}
                onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cardholder Name
              </label>
              <input
                type="text"
                placeholder="John Doe"
                value={cardDetails.name}
                onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={cardDetails.expiry}
                  onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CVV
                </label>
                <input
                  type="text"
                  placeholder="123"
                  value={cardDetails.cvv}
                  onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>

            {/* Security Notice */}
            <div className="flex items-start space-x-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>Your payment information is encrypted and secure.</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={processing}
              className="w-full py-3 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5 mr-2" />
                  Pay ₱{amount.toFixed(2)}
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="text-center py-8">
            <div className="mb-6">
              <AlertCircle className="h-12 w-12 text-primary-500 mx-auto mb-4" />
              <p className="text-gray-600">
                You will be redirected to PayPal to complete your payment.
              </p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={processing}
              className="px-6 py-3 bg-[#0070ba] text-white rounded-md hover:bg-[#005ea6] disabled:opacity-50"
            >
              {processing ? 'Redirecting...' : 'Continue to PayPal'}
            </button>
          </div>
        )}

        {/* Test Mode Notice */}
        <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Test Mode:</strong> This is a demo payment form. In production, this would integrate with a real payment processor.
          </p>
        </div>
      </div>
    </div>
  );
}
