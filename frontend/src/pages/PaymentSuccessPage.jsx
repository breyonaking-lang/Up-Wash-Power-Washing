import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { CheckCircle, XCircle, Loader2, Home, Calendar } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState("loading"); // loading, success, failed
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [pollAttempts, setPollAttempts] = useState(0);
  const maxAttempts = 5;

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    } else {
      setStatus("failed");
    }
  }, [sessionId]);

  const pollPaymentStatus = async () => {
    if (pollAttempts >= maxAttempts) {
      setStatus("pending");
      return;
    }

    try {
      const response = await axios.get(`${API}/checkout/status/${sessionId}`);
      const data = response.data;

      if (data.payment_status === "paid") {
        setStatus("success");
        setPaymentInfo(data);
      } else if (data.status === "expired") {
        setStatus("failed");
      } else {
        // Keep polling
        setPollAttempts(prev => prev + 1);
        setTimeout(pollPaymentStatus, 2000);
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
      if (pollAttempts < maxAttempts - 1) {
        setPollAttempts(prev => prev + 1);
        setTimeout(pollPaymentStatus, 2000);
      } else {
        setStatus("pending");
      }
    }
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto max-w-lg px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center"
        >
          {status === "loading" && (
            <>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="text-blue-600 animate-spin" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Verifying Payment...
              </h1>
              <p className="text-slate-500">
                Please wait while we confirm your payment.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2" data-testid="payment-success-title">
                Payment Successful!
              </h1>
              <p className="text-slate-500 mb-6">
                Thank you for your booking. We'll see you at your scheduled appointment!
              </p>

              {paymentInfo && (
                <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-left">
                  <p className="text-sm text-slate-600">
                    <strong>Amount Paid:</strong> ${(paymentInfo.amount_total / 100).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm text-slate-500">
                  A confirmation email has been sent to your email address.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Link to="/">
                    <Button variant="outline" className="rounded-full" data-testid="go-home-btn">
                      <Home className="mr-2" size={18} /> Go Home
                    </Button>
                  </Link>
                  <Link to="/booking">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full" data-testid="book-another-btn">
                      <Calendar className="mr-2" size={18} /> Book Another
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}

          {status === "failed" && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="text-red-600" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2" data-testid="payment-failed-title">
                Payment Failed
              </h1>
              <p className="text-slate-500 mb-6">
                Your payment could not be processed. Please try again.
              </p>
              
              <Link to="/booking">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full" data-testid="try-again-btn">
                  Try Again
                </Button>
              </Link>
            </>
          )}

          {status === "pending" && (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="text-yellow-600" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Payment Processing
              </h1>
              <p className="text-slate-500 mb-6">
                Your payment is being processed. Please check your email for confirmation.
              </p>
              
              <Link to="/">
                <Button variant="outline" className="rounded-full">
                  <Home className="mr-2" size={18} /> Go Home
                </Button>
              </Link>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
