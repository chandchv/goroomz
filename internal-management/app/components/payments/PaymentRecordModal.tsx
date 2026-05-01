import { useState } from 'react';
import { recordPayment } from '../../services/paymentService';

interface PaymentRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  bookingDetails?: {
    guestName: string;
    roomNumber: string;
    totalAmount: number;
    paidAmount?: number;
  };
  onSuccess?: () => void;
}

export default function PaymentRecordModal({
  isOpen,
  onClose,
  bookingId,
  bookingDetails,
  onSuccess,
}: PaymentRecordModalProps) {
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'cash',
    transactionReference: '',
    paymentType: 'booking',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      await recordPayment({
        bookingId,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        transactionReference: formData.transactionReference || undefined,
        paymentType: formData.paymentType,
        notes: formData.notes || undefined,
      });

      // Reset form
      setFormData({
        amount: '',
        paymentMethod: 'cash',
        transactionReference: '',
        paymentType: 'booking',
        notes: '',
      });

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const remainingBalance = bookingDetails
    ? bookingDetails.totalAmount - (bookingDetails.paidAmount || 0)
    : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Record Payment</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
              disabled={loading}
            >
              ×
            </button>
          </div>

          {bookingDetails && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="font-semibold">Guest:</span> {bookingDetails.guestName}
                </p>
                <p>
                  <span className="font-semibold">Room:</span> {bookingDetails.roomNumber}
                </p>
                <p>
                  <span className="font-semibold">Total Amount:</span> ₹
                  {bookingDetails.totalAmount.toFixed(2)}
                </p>
                {bookingDetails.paidAmount !== undefined && (
                  <>
                    <p>
                      <span className="font-semibold">Paid:</span> ₹
                      {bookingDetails.paidAmount.toFixed(2)}
                    </p>
                    <p className="text-orange-600 font-semibold">
                      Remaining: ₹{remainingBalance.toFixed(2)}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="Enter amount"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
                disabled={loading}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Reference
              </label>
              <input
                type="text"
                name="transactionReference"
                value={formData.transactionReference}
                onChange={handleChange}
                placeholder="Transaction ID / Reference Number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Type
              </label>
              <select
                name="paymentType"
                value={formData.paymentType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                disabled={loading}
              >
                <option value="booking">Booking Payment</option>
                <option value="monthly_rent">Monthly Rent</option>
                <option value="security_deposit">Security Deposit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Additional notes (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                disabled={loading}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                disabled={loading}
              >
                {loading ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
