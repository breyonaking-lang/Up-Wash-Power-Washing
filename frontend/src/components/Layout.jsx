import { Outlet, Link, useLocation } from "react-router-dom";
import { Mail, MapPin, Menu, X, Droplets } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";

// Bible Verses Collection
const BIBLE_VERSES = [
  { verse: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13" },
  { verse: "Trust in the LORD with all your heart and lean not on your own understanding.", reference: "Proverbs 3:5" },
  { verse: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.", reference: "John 3:16" },
  { verse: "The LORD is my shepherd; I shall not want.", reference: "Psalm 23:1" },
  { verse: "Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.", reference: "Joshua 1:9" },
  { verse: "And we know that in all things God works for the good of those who love him.", reference: "Romans 8:28" },
  { verse: "The LORD is my light and my salvation—whom shall I fear?", reference: "Psalm 27:1" },
  { verse: "Come to me, all you who are weary and burdened, and I will give you rest.", reference: "Matthew 11:28" },
  { verse: "But those who hope in the LORD will renew their strength.", reference: "Isaiah 40:31" },
  { verse: "Delight yourself in the LORD, and he will give you the desires of your heart.", reference: "Psalm 37:4" },
  { verse: "The LORD bless you and keep you; the LORD make his face shine on you and be gracious to you.", reference: "Numbers 6:24-25" },
  { verse: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", reference: "Philippians 4:6" },
  { verse: "For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future.", reference: "Jeremiah 29:11" },
  { verse: "Cast all your anxiety on him because he cares for you.", reference: "1 Peter 5:7" },
  { verse: "Be still, and know that I am God.", reference: "Psalm 46:10" },
  { verse: "God is our refuge and strength, an ever-present help in trouble.", reference: "Psalm 46:1" },
  { verse: "I have told you these things, so that in me you may have peace.", reference: "John 16:33" },
  { verse: "The joy of the LORD is your strength.", reference: "Nehemiah 8:10" },
  { verse: "This is the day the LORD has made; let us rejoice and be glad in it.", reference: "Psalm 118:24" },
  { verse: "Give thanks to the LORD, for he is good; his love endures forever.", reference: "Psalm 107:1" }
];

// Cross Icon Component
const CrossIcon = ({ className, size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M10 2h4v6h6v4h-6v10h-4V12H4V8h6V2z"/>
  </svg>
);

const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentVerse, setCurrentVerse] = useState(BIBLE_VERSES[0]);
  const location = useLocation();

  // Rotate Bible verse every 15 minutes
  useEffect(() => {
    const getRandomVerse = () => {
      const randomIndex = Math.floor(Math.random() * BIBLE_VERSES.length);
      setCurrentVerse(BIBLE_VERSES[randomIndex]);
    };
    
    getRandomVerse(); // Initial random verse
    const interval = setInterval(getRandomVerse, 15 * 60 * 1000); // 15 minutes
    
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/services", label: "Services" },
    { path: "/booking", label: "Book Now" },
    { path: "/contact", label: "Contact" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Bible Verse Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-2 px-4">
        <div className="container mx-auto max-w-7xl flex items-center justify-center gap-3">
          <CrossIcon className="text-white/80 flex-shrink-0" size={16} />
          <p className="text-white text-center text-sm">
            <span className="italic">"{currentVerse.verse}"</span>
            <span className="text-white/80 ml-2">— {currentVerse.reference}</span>
          </p>
        </div>
      </div>

      {/* Top Bar */}
      <div className="bg-slate-900 text-white py-2 px-4">
        <div className="container mx-auto max-w-7xl flex flex-wrap justify-between items-center text-sm">
          <div className="flex items-center gap-6">
            <a href="mailto:upwashpowerwashing@gmail.com" className="flex items-center gap-2 hover:text-blue-400 transition-colors">
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
              <span>Mon-Fri: 9AM - 7PM</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
