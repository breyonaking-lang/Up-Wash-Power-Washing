import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock,
  Send
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success("Message sent! We'll get back to you soon.");
    setFormData({ name: "", email: "", phone: "", message: "" });
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-wide">Get In Touch</span>
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mt-2 uppercase">
            Contact Us
          </h1>
          <p className="text-lg text-slate-500 mt-4 max-w-2xl mx-auto">
            Have questions? We're here to help. Reach out and we'll get back to you as soon as possible.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-10 h-full">
              <h2 className="text-2xl font-bold mb-8">Contact Information</h2>
              
              <div className="space-y-6">
                <a 
                  href="tel:8177503211" 
                  className="flex items-start gap-4 group"
                  data-testid="contact-phone"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500 transition-colors">
                    <Phone size={24} />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Phone</p>
                    <p className="text-xl font-bold">(817) 750-3211</p>
                  </div>
                </a>

                <a 
                  href="mailto:upwashpowerwashing@gmail.com" 
                  className="flex items-start gap-4 group"
                  data-testid="contact-email"
                >
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-green-400 transition-colors">
                    <Mail size={24} />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Email</p>
                    <p className="text-lg font-bold break-all">upwashpowerwashing@gmail.com</p>
                  </div>
                </a>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Service Area</p>
                    <p className="text-lg font-bold">Burleson, TX</p>
                    <p className="text-slate-400">15-mile radius (free travel)</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock size={24} />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Business Hours</p>
                    <p className="text-lg font-bold">Monday - Friday</p>
                    <p className="text-slate-400">9:00 AM - 6:00 PM</p>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-slate-700">
                <p className="text-slate-400 mb-2">Cash App</p>
                <p className="text-2xl font-bold text-green-400">$UpwashPW</p>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 md:p-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Send us a Message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Your name"
                    required
                    className="mt-1 rounded-xl"
                    data-testid="contact-name-input"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="your@email.com"
                    required
                    className="mt-1 rounded-xl"
                    data-testid="contact-email-input"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="(817) 555-1234"
                    className="mt-1 rounded-xl"
                    data-testid="contact-phone-input"
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="How can we help you?"
                    required
                    rows={5}
                    className="mt-1 rounded-xl"
                    data-testid="contact-message-input"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-full"
                  data-testid="contact-submit-btn"
                >
                  {submitting ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="mr-2" size={18} /> Send Message
                    </>
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
