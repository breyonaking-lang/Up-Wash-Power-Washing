import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Plus, Minus, ShoppingCart, CreditCard, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const TAX_RATE = 0.0825;

const SCENTS = [
  { id: 'lavender', name: 'Lavender Bliss', color: '#9B59B6', description: 'Calming floral scent' },
  { id: 'citrus', name: 'Citrus Burst', color: '#F39C12', description: 'Fresh & energizing' },
  { id: 'ocean', name: 'Ocean Breeze', color: '#3498DB', description: 'Clean & refreshing' },
  { id: 'vanilla', name: 'Vanilla Dream', color: '#E8D4B8', description: 'Sweet & warm' },
  { id: 'mint', name: 'Cool Mint', color: '#1ABC9C', description: 'Crisp & invigorating' },
  { id: 'pine', name: 'Forest Pine', color: '#27AE60', description: 'Natural & earthy' },
];

const SCENT_BOMB_PRICE = 3.50;

export default function ScentBombPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({});
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const totalQuantity = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const subtotal = totalQuantity * SCENT_BOMB_PRICE;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const updateCart = (scentId, delta) => {
    setCart(prev => {
      const newQty = Math.max(0, (prev[scentId] || 0) + delta);
      if (newQty === 0) {
        const { [scentId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [scentId]: newQty };
    });
  };

  const handleCheckout = async () => {
    if (totalQuantity === 0) {
      toast.error('Please add at least one scent bomb to your cart');
      return;
    }

    if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      // Create services array for each scent bomb
      const services = Object.entries(cart).map(([scentId, quantity]) => ({
        service_id: 'scent_bomb',
        quantity: quantity,
        scent: scentId
      }));

      const response = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          customer_address: customerInfo.address,
          distance_miles: 0,
          services: services,
          booking_dates: [new Date().toISOString().split('T')[0]],
          is_monthly: false,
          is_scent_bomb_only: true,
          notes: `Scent Bomb Order: ${Object.entries(cart).map(([id, qty]) => `${SCENTS.find(s => s.id === id)?.name} x${qty}`).join(', ')}`
        })
      });

      if (!response.ok) throw new Error('Failed to create order');
      
      const booking = await response.json();
      
      // Navigate to payment with booking info
      navigate('/booking', { 
        state: { 
          bookingId: booking.id,
          isScentBombOnly: true,
          total: booking.total 
        } 
      });

    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <Droplets className="w-10 h-10 text-purple-400" />
            <h1 className="text-4xl md:text-5xl font-bold text-white">Scent Bombs</h1>
            <Sparkles className="w-10 h-10 text-purple-400" />
          </div>
          <p className="text-xl text-purple-200">
            Transform your bins with our premium deodorizing scent treatments
          </p>
          <p className="text-lg text-green-400 mt-2 font-semibold">
            No travel fee - Direct shipping!
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Scent Selection */}
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-6">Choose Your Scents</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {SCENTS.map((scent, index) => (
                <motion.div
                  key={scent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div 
                        className="w-12 h-12 rounded-full mb-3"
                        style={{ backgroundColor: scent.color }}
                      />
                      <h3 className="text-xl font-bold text-white">{scent.name}</h3>
                      <p className="text-purple-200 text-sm">{scent.description}</p>
                    </div>
                    <span className="text-2xl font-bold text-green-400">${SCENT_BOMB_PRICE.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => updateCart(scent.id, -1)}
                      className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition"
                      data-testid={`decrease-${scent.id}`}
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="text-2xl font-bold text-white" data-testid={`qty-${scent.id}`}>
                      {cart[scent.id] || 0}
                    </span>
                    <button
                      onClick={() => updateCart(scent.id, 1)}
                      className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white hover:bg-purple-600 transition"
                      data-testid={`increase-${scent.id}`}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Cart & Checkout */}
          <div className="md:col-span-1">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 sticky top-4">
              <div className="flex items-center gap-3 mb-6">
                <ShoppingCart className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-bold text-white">Your Order</h2>
              </div>

              {totalQuantity === 0 ? (
                <p className="text-purple-200 text-center py-8">Your cart is empty</p>
              ) : (
                <div className="space-y-3 mb-6">
                  {Object.entries(cart).map(([scentId, qty]) => {
                    const scent = SCENTS.find(s => s.id === scentId);
                    return (
                      <div key={scentId} className="flex justify-between text-white">
                        <span>{scent?.name} x{qty}</span>
                        <span>${(qty * SCENT_BOMB_PRICE).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-white/20 pt-4 space-y-2">
                <div className="flex justify-between text-purple-200">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-purple-200">
                  <span>Tax (8.25%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-purple-200">
                  <span>Travel Fee</span>
                  <span className="text-green-400">FREE</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-white pt-2">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {step === 1 && totalQuantity > 0 && (
                <button
                  onClick={() => setStep(2)}
                  className="w-full mt-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl transition"
                  data-testid="proceed-to-checkout"
                >
                  Proceed to Checkout
                </button>
              )}

              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 space-y-4"
                >
                  <input
                    type="text"
                    placeholder="Full Name *"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
                    data-testid="customer-name"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number *"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
                    data-testid="customer-phone"
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
                    data-testid="customer-email"
                  />
                  <input
                    type="text"
                    placeholder="Shipping Address *"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
                    data-testid="customer-address"
                  />
                  
                  <button
                    onClick={handleCheckout}
                    disabled={isLoading}
                    className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
                    data-testid="confirm-order-btn"
                  >
                    <CreditCard className="w-5 h-5" />
                    {isLoading ? 'Processing...' : 'Confirm Order'}
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
