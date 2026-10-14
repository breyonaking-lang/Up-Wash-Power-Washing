import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, Truck, CheckCircle, AlertTriangle, 
  ArrowLeft, CreditCard, Lock
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Bible Verses
const BIBLE_VERSES = [
  { verse: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13" },
  { verse: "Trust in the LORD with all your heart.", reference: "Proverbs 3:5" },
  { verse: "The LORD is my shepherd; I shall not want.", reference: "Psalm 23:1" },
  { verse: "Be strong and courageous. Do not be afraid.", reference: "Joshua 1:9" },
  { verse: "The joy of the LORD is your strength.", reference: "Nehemiah 8:10" }
];

function ContractorPaymentPage() {
  const { paymentToken } = useParams();
  const navigate = useNavigate();
  const [purchaseDetails, setPurchaseDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [verse] = useState(() => BIBLE_VERSES[Math.floor(Math.random() * BIBLE_VERSES.length)]);

  useEffect(() => {
    const sid = new URLSearchParams(window.location.search).get('session_id');
    if (sid) {
      confirmPayment(sid);
    } else {
      fetchPurchaseDetails();
    }
  }, [paymentToken]);

  const fetchPurchaseDetails = async () => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/route-purchase/${paymentToken}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to load purchase details');
      }
      const data = await res.json();
      if (data.already_paid) {
        setPurchaseDetails({ num_routes: data.num_routes, truck_rental: data.truck_rental });
        setPaymentComplete(true);
      } else {
        setPurchaseDetails(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (sid, attempt = 0) => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/route-purchase/${paymentToken}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sid })
      });
      const data = await res.json();
      if (res.ok && data.paid) {
        setPurchaseDetails({ num_routes: data.num_routes, truck_rental: data.truck_rental });
        setPaymentComplete(true);
        setLoading(false);
      } else if (attempt < 5) {
        setTimeout(() => confirmPayment(sid, attempt + 1), 3000);
      } else {
        setError('Payment has not been confirmed yet. If you completed payment, please wait a moment and refresh this page.');
        setLoading(false);
      }
    } catch (err) {
      if (attempt < 5) {
        setTimeout(() => confirmPayment(sid, attempt + 1), 3000);
      } else {
        setError('Could not verify payment. Please contact the admin.');
        setLoading(false);
      }
    }
  };

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/contractor/route-purchase/${paymentToken}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Payment failed');
      // Redirect to Square's secure hosted checkout
      window.location.href = data.url;
    } catch (err) {
      toast.error(err.message);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading payment details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur rounded-2xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Payment Error</h1>
          <p className="text-white/60 mb-6">{error}</p>
          <button
            onClick={() => navigate('/contractor/login')}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
          >
            Go to Contractor Login
          </button>
        </div>
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
          <p className="text-white/60 mb-6">
            Your {purchaseDetails?.num_routes} route(s) have been added to your My Routes.
          </p>
          
          {purchaseDetails?.truck_rental && (
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4 mb-6">
              <Truck className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-purple-400 font-semibold">Truck Rental Confirmed!</p>
              <p className="text-white/60 text-sm">The truck will be available for pick up at 8:00 AM and should be returned by 9:00 PM.</p>
            </div>
          )}

          {/* No Refunds Notice */}
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6">
            <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-red-400 font-bold text-sm">NO REFUNDS</p>
            <p className="text-white/60 text-xs">All sales are final.</p>
          </div>

          <button
            onClick={() => navigate('/contractor/dashboard/routes')}
            className="w-full py-4 bg-green-500 text-white rounded-xl hover:bg-green-600 font-bold"
          >
            View My Routes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/contractor/dashboard/request-routes')}
            className="text-white/60 hover:text-white flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm">Secure Checkout</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Up-Wash</h1>
          <p className="text-white/60">
            {purchaseDetails?.truck_rental && !purchaseDetails?.num_routes ? 'Complete Your Truck Rental Payment' : 'Complete Your Route Purchase'}
          </p>
        </div>

        {/* Purchase Summary Card */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <ShoppingCart className="text-yellow-400" />
            Purchase Summary
          </h2>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/60">Contractor</span>
              <span className="text-white font-semibold">{purchaseDetails?.contractor_name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/60">Zip Codes</span>
              <span className="text-blue-400">{purchaseDetails?.zip_codes?.join(', ') || 'Any'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/60">Routes ({purchaseDetails?.num_routes} × $400)</span>
              <span className="text-white">${purchaseDetails?.route_cost?.toFixed(2)}</span>
            </div>
            {purchaseDetails?.truck_rental && (
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/60 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-purple-400" /> Truck Rental
                </span>
                <span className="text-purple-400">${purchaseDetails?.truck_cost?.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl p-4 border border-yellow-500/30">
            <div className="flex justify-between items-center">
              <span className="text-yellow-400 font-bold text-xl">Total Due</span>
              <span className="text-yellow-400 font-bold text-3xl">${purchaseDetails?.total_price?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* No Refunds Warning */}
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-4">
          <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-400 font-bold">NO REFUNDS - All Sales Final</p>
            <p className="text-white/60 text-sm">By completing this purchase, you acknowledge that all route purchases are non-refundable.</p>
          </div>
        </div>

        {/* Truck Pickup Notice */}
        {purchaseDetails?.truck_rental && (
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4 mb-6 flex items-center gap-4">
            <Truck className="w-8 h-8 text-purple-400 flex-shrink-0" />
            <div>
              <p className="text-purple-400 font-bold">Truck Pickup Details</p>
              <p className="text-white/60 text-sm">The truck will be available for pick up at 8:00 AM and should be returned by 9:00 PM. You'll receive a notification with pickup details.</p>
            </div>
          </div>
        )}

        {/* Payment Button */}
        <button
          onClick={handlePayment}
          disabled={processing}
          className="w-full py-4 bg-green-500 text-white rounded-xl hover:bg-green-600 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          data-testid="complete-purchase-btn"
        >
          {processing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-6 h-6" />
              Complete Purchase - ${purchaseDetails?.total_price?.toFixed(2)}
            </>
          )}
        </button>

        <p className="text-white/40 text-xs text-center mt-4">
          Payments processed securely via Square
        </p>

        {/* Bible Verse */}
        <div className="mt-8 text-center">
          <p className="text-white/40 text-sm italic">"{verse.verse}"</p>
          <p className="text-white/30 text-xs mt-1">— {verse.reference}</p>
        </div>
      </div>
    </div>
  );
}

export default ContractorPaymentPage;
