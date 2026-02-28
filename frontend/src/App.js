import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import ServicesPage from "./pages/ServicesPage";
import BookingPage from "./pages/BookingPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import AdminPage from "./pages/AdminPage";
import ContactPage from "./pages/ContactPage";
import ScentBombPage from "./pages/ScentBombPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import ContractorLoginPage from "./pages/ContractorLoginPage";
import ContractorDashboard from "./pages/ContractorDashboard";
import ClientPortal, { ClientLogin, ClientRegister } from "./pages/ClientPortal";

function App() {
  return (
    <div className="App min-h-screen bg-[#F5F5F7]">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="booking" element={<BookingPage />} />
            <Route path="scent-bombs" element={<ScentBombPage />} />
            <Route path="payment/success" element={<PaymentSuccessPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
          {/* Admin Portal - Owner only */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard/*" element={<AdminDashboard />} />
          {/* Contractor Portal */}
          <Route path="/contractor/login" element={<ContractorLoginPage />} />
          <Route path="/contractor/dashboard/*" element={<ContractorDashboard />} />
          {/* Client Portal */}
          <Route path="/client/login" element={<ClientLogin />} />
          <Route path="/client/register" element={<ClientRegister />} />
          <Route path="/client/portal" element={<ClientPortal />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
