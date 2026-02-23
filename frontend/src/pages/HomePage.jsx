import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { 
  Trash2, 
  Warehouse, 
  Car, 
  Sparkles,
  CheckCircle,
  ArrowRight,
  Clock,
  MapPin,
  Phone,
  Star
} from "lucide-react";

const services = [
  {
    id: "recycling_bin",
    name: "Recycling Bin Cleaning",
    description: "Professional power washing for your recycling bins",
    price: "From $15",
    icon: Trash2,
    color: "bg-green-500"
  },
  {
    id: "patio",
    name: "Patio Cleaning",
    description: "Restore your outdoor living space",
    price: "$30",
    icon: Sparkles,
    color: "bg-blue-500"
  },
  {
    id: "driveway",
    name: "Driveway Cleaning",
    description: "Make your driveway look brand new",
    price: "$30",
    icon: Car,
    color: "bg-orange-500"
  },
  {
    id: "dumpster",
    name: "Dumpster Cleaning",
    description: "Commercial dumpster & area cleaning",
    price: "From $70",
    icon: Warehouse,
    color: "bg-purple-500"
  }
];

const features = [
  "Professional Grade Equipment",
  "Eco-Friendly Solutions",
  "Satisfaction Guaranteed",
  "Flexible Scheduling",
  "Competitive Pricing",
  "Monthly Plans Available"
];

const HomePage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-95" />
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1599427303058-f04cb7815b47?auto=format&fit=crop&q=80")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative container mx-auto max-w-7xl px-4 py-24 md:py-32">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <span className="inline-block bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
              Serving Burleson, TX & Surrounding Areas
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold text-white uppercase tracking-tight leading-none mb-6">
              Power Washing<br />
              <span className="text-cyan-300">Done Right</span>
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-xl">
              Professional cleaning services for recycling bins, patios, driveways, and commercial dumpsters. 
              Restore your property's curb appeal today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/booking">
                <Button 
                  data-testid="hero-book-now-btn"
                  className="bg-white text-blue-600 hover:bg-slate-100 font-bold py-6 px-8 rounded-full text-lg shadow-xl hover:shadow-2xl transition-all"
                >
                  Book Now <ArrowRight className="ml-2" size={20} />
                </Button>
              </Link>
              <Link to="/services">
                <Button 
                  data-testid="hero-view-services-btn"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white/10 font-bold py-6 px-8 rounded-full text-lg"
                >
                  View Services
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
        
        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#F5F5F7"/>
          </svg>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto max-w-7xl px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wide">Our Services</span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mt-2 uppercase">
              What We Clean
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="service-card group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm"
                data-testid={`service-card-${service.id}`}
              >
                <div className={`w-14 h-14 ${service.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <service.icon className="text-white" size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{service.name}</h3>
                <p className="text-slate-500 mb-4">{service.description}</p>
                <p className="text-2xl font-extrabold text-blue-600 price-tag">{service.price}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/services">
              <Button 
                data-testid="view-all-services-btn"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-full shadow-lg"
              >
                View All Services & Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-blue-400 font-semibold text-sm uppercase tracking-wide">Why Choose Us</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-8 uppercase">
                Professional<br />Power Washing
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="text-green-400 flex-shrink-0" size={20} />
                    <span className="text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link to="/booking">
                  <Button 
                    data-testid="features-get-started-btn"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-full"
                  >
                    Get Started Today
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="bg-slate-800 p-6 rounded-3xl">
                <Clock className="text-blue-400 mb-4" size={32} />
                <h4 className="text-3xl font-extrabold mb-1">Mon-Fri</h4>
                <p className="text-slate-400">9AM - 6PM</p>
              </div>
              <div className="bg-slate-800 p-6 rounded-3xl">
                <MapPin className="text-green-400 mb-4" size={32} />
                <h4 className="text-3xl font-extrabold mb-1">15 mi</h4>
                <p className="text-slate-400">Free Travel</p>
              </div>
              <div className="bg-slate-800 p-6 rounded-3xl col-span-2">
                <Phone className="text-orange-400 mb-4" size={32} />
                <h4 className="text-3xl font-extrabold mb-1">(817) 750-3211</h4>
                <p className="text-slate-400">Call for immediate service</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Monthly Plan CTA */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-3xl p-8 md:p-16 text-white text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-6">
                <Star className="text-yellow-300" size={18} />
                <span className="font-semibold">Save 10% with Monthly Plans</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-4 uppercase">
                Monthly Cleaning Service
              </h2>
              <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8">
                Schedule regular cleanings twice a week and save 10% on every service. 
                Perfect for restaurants, businesses, and HOA communities.
              </p>
              <Link to="/booking">
                <Button 
                  data-testid="monthly-plan-btn"
                  className="bg-white text-blue-600 hover:bg-slate-100 font-bold py-4 px-8 rounded-full text-lg shadow-xl"
                >
                  Start Monthly Plan
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Payment Methods */}
      <section className="py-16 border-t border-slate-200">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="text-center">
            <p className="text-slate-500 mb-4">We Accept</p>
            <div className="flex justify-center items-center gap-8 flex-wrap">
              <div className="flex items-center gap-2 text-slate-700">
                <div className="w-12 h-8 bg-slate-200 rounded flex items-center justify-center text-xs font-bold">
                  VISA
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <div className="w-12 h-8 bg-slate-200 rounded flex items-center justify-center text-xs font-bold">
                  MC
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <div className="w-16 h-8 bg-green-100 rounded flex items-center justify-center text-xs font-bold text-green-700">
                  Cash App
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
