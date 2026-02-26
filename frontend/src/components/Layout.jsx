import { Outlet, Link, useLocation } from "react-router-dom";
import { Phone, Mail, MapPin, Menu, X, Droplets } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/services", label: "Services" },
    { path: "/booking", label: "Book Now" },
    { path: "/contact", label: "Contact" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <div className="bg-slate-900 text-white py-2 px-4">
        <div className="container mx-auto max-w-7xl flex flex-wrap justify-between items-center text-sm">
          <div className="flex items-center gap-6">
            <a href="tel:8177503211" className="flex items-center gap-2 hover:text-blue-400 transition-colors">
              <Phone size={14} />
              <span>(817) 750-3211</span>
            </a>
            <a href="mailto:upwashpowerwashing@gmail.com" className="hidden sm:flex items-center gap-2 hover:text-blue-400 transition-colors">
              <Mail size={14} />
              <span>upwashpowerwashing@gmail.com</span>
            </a>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} />
            <span>Burleson, TX</span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-white/20 shadow-sm">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Droplets className="text-white" size={24} />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-lg text-slate-900 leading-tight">UPWASH</h1>
                <p className="text-xs text-slate-500 -mt-1">Power Washing</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  data-testid={`nav-${link.label.toLowerCase().replace(' ', '-')}`}
                  className={`font-medium transition-colors ${
                    isActive(link.path)
                      ? "text-blue-600"
                      : "text-slate-600 hover:text-blue-600"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* CTA Button */}
            <div className="hidden md:block">
              <Link to="/booking">
                <Button 
                  data-testid="nav-book-now-btn"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 rounded-full shadow-lg hover:shadow-blue-500/30 transition-all"
                >
                  Get Quote
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-100">
              <div className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`font-medium py-2 ${
                      isActive(link.path)
                        ? "text-blue-600"
                        : "text-slate-600"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link to="/booking" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full">
                    Get Quote
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Droplets className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-xl">UPWASH</h3>
                  <p className="text-slate-400 text-sm">Power Washing Cleaning Services</p>
                </div>
              </div>
              <p className="text-slate-400 max-w-md">
                Professional power washing services in Burleson, TX and surrounding areas. 
                We restore your property's curb appeal with precision and care.
              </p>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-bold text-lg mb-4">Services</h4>
              <ul className="space-y-2 text-slate-400">
                <li>Recycling Bin Cleaning</li>
                <li>Patio Cleaning</li>
                <li>Driveway Cleaning</li>
                <li>Dumpster Cleaning</li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-lg mb-4">Contact Us</h4>
              <ul className="space-y-3 text-slate-400">
                <li className="flex items-center gap-2">
                  <Phone size={16} />
                  <a href="tel:8177503211" className="hover:text-white">(817) 750-3211</a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={16} />
                  <a href="mailto:upwashpowerwashing@gmail.com" className="hover:text-white text-sm">
                    upwashpowerwashing@gmail.com
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin size={16} />
                  <span>Burleson, TX (15-mile radius)</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} Upwash Power Washing. All rights reserved.
            </p>
            <div className="flex gap-4 text-slate-500 text-sm">
              <span>Mon-Fri: 9AM - 6PM</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
