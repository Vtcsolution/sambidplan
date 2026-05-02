'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Phone, Mail, Clock, Shield, 
  Cloud, Users, Server, Building2,
  Twitter, Linkedin, Facebook, ArrowUp,
  ChevronDown
} from 'lucide-react';

export default function Footer() {
  const [openSections, setOpenSections] = useState({
    company: false,
    services: false,
    contact: false,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const services = [
    { icon: Shield, name: 'Cybersecurity' },
    { icon: Cloud, name: 'Cloud Solutions' },
    { icon: Users, name: 'IT Staffing' },
    { icon: Server, name: 'Hardware' },
    { icon: Building2, name: 'Managed IT' }
  ];

  const quickLinks = [
    { name: 'Home', href: '/' },
    { name: 'Services', href: '/services' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
    { name: 'Careers', href: '/careers' }
  ];

  const contactInfo = [
    { icon: MapPin, text: '123 Technology Drive, Suite 450 Arlington, VA 22203' },
    { icon: Phone, text: '+1 (555) 123-4567' },
    { icon: Mail, text: 'info@fedvantage.com' },
    { icon: Clock, text: 'Mon - Fri: 9:00 AM - 6:00 PM EST' }
  ];

  // Mobile Section Toggle Component
  const SectionToggle = ({ title, isOpen, onToggle, children }) => (
    <div className="lg:hidden border-b border-white/10 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full py-4 text-white transition-all duration-300 hover:bg-white/5 rounded-lg px-2"
      >
        <span className="font-semibold text-lg font-['Space_Grotesk']">{title}</span>
        <ChevronDown
          className={`w-5 h-5 transform transition-transform duration-300 ${
            isOpen ? 'rotate-180 text-cyan-400' : 'text-gray-400'
          }`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pb-4 px-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // Animated Link Component
  const AnimatedLink = ({ children, href = "#" }) => (
    <motion.a
      href={href}
      className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 relative group flex items-center gap-2 py-2"
      whileHover={{ x: 5 }}
    >
      <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      {children}
    </motion.a>
  );

  return (
    <footer className="bg-gradient-to-br from-slate-900 to-slate-950 text-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-white/5 bg-grid" />
      <div className="absolute top-0 left-0 w-72 h-72 bg-cyan-500/10 rounded-full filter blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full filter blur-3xl" />
      
      <div className="relative z-10 container mx-auto px-6 py-12 lg:py-16">
        
        {/* Mobile Dropdown Sections */}
        <div className="lg:hidden space-y-2 mb-8">
          {/* Company Info Section - Always Visible on Mobile */}
          <div className="pb-6 border-b border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold font-['Space_Grotesk']">
                FedVantage<span className="text-cyan-400">.</span>
              </span>
            </div>
            
            <p className="text-gray-300 mb-4 leading-relaxed">
              FedVantage Solutions delivers <strong className="text-cyan-400">secure, reliable, and scalable IT services</strong> to government and enterprise clients.
            </p>
            
            <motion.p
              className="text-cyan-300 font-semibold italic border-l-4 border-cyan-500 pl-3 py-1 text-sm font-['Space_Grotesk']"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              "Empowering Federal and Enterprise Success Through Smart IT Solutions"
            </motion.p>

            {/* Social Links */}
            <div className="flex gap-3 mt-4">
              {[
                { icon: Linkedin, href: '#', color: 'hover:bg-blue-600' },
                { icon: Twitter, href: '#', color: 'hover:bg-sky-500' },
                { icon: Facebook, href: '#', color: 'hover:bg-blue-500' }
              ].map((social, index) => (
                <motion.a
                  key={index}
                  href={social.href}
                  className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/10"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Quick Links Toggle */}
          <SectionToggle
            title="Quick Links"
            isOpen={openSections.company}
            onToggle={() => toggleSection('company')}
          >
            <ul className="space-y-1">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <AnimatedLink href={link.href}>
                    {link.name}
                  </AnimatedLink>
                </li>
              ))}
            </ul>
          </SectionToggle>

          {/* Services Toggle */}
          <SectionToggle
            title="Our Services"
            isOpen={openSections.services}
            onToggle={() => toggleSection('services')}
          >
            <ul className="space-y-1">
              {services.map((service, index) => (
                <li key={index}>
                  <motion.a
                    href={`/services#${service.name.toLowerCase()}`}
                    className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 flex items-center gap-3 group py-2"
                    whileHover={{ x: 5 }}
                  >
                    <service.icon className="w-4 h-4 text-cyan-500" />
                    {service.name}
                  </motion.a>
                </li>
              ))}
            </ul>
          </SectionToggle>

          {/* Contact Toggle */}
          <SectionToggle
            title="Contact Info"
            isOpen={openSections.contact}
            onToggle={() => toggleSection('contact')}
          >
            <div className="space-y-4">
              {contactInfo.map((item, index) => (
                <div key={index} className="flex items-center gap-3 text-gray-300 p-2 bg-white/5 rounded-lg">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </SectionToggle>
        </div>

        {/* Desktop Footer Content */}
        <div className="hidden lg:block">
          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8 mb-12">
            
            {/* Company Info & About Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold font-['Space_Grotesk']">
                  FedVantage<span className="text-cyan-400">.</span>
                </span>
              </div>
              
              {/* About Summary */}
              <p className="text-lg text-gray-300 mb-4 leading-relaxed max-w-2xl">
                FedVantage Solutions delivers <strong className="text-cyan-400">secure, reliable, and scalable IT services</strong> to government and enterprise clients. We specialize in managed IT, cybersecurity, cloud, staffing, and hardware solutions that drive mission success and digital transformation.
              </p>
              
              {/* Tagline */}
              <motion.p
                className="text-cyan-300 font-semibold text-lg mb-6 italic border-l-4 border-cyan-500 pl-4 py-2 font-['Space_Grotesk']"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                "Empowering Federal and Enterprise Success Through Smart IT Solutions"
              </motion.p>

              {/* Social Links */}
              <div className="flex gap-4">
                {[
                  { icon: Linkedin, href: '#', color: 'hover:bg-blue-600' },
                  { icon: Twitter, href: '#', color: 'hover:bg-sky-500' },
                  { icon: Facebook, href: '#', color: 'hover:bg-blue-500' }
                ].map((social, index) => (
                  <motion.a
                    key={index}
                    href={social.href}
                    className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/10"
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <social.icon className="w-5 h-5" />
                  </motion.a>
                ))}
              </div>
            </motion.div>

            {/* Quick Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-lg font-bold mb-6 font-['Space_Grotesk']">Quick Links</h3>
              <ul className="space-y-3">
                {quickLinks.map((link, index) => (
                  <li key={index}>
                    <AnimatedLink href={link.href}>
                      {link.name}
                    </AnimatedLink>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Services */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-lg font-bold mb-6 font-['Space_Grotesk']">Our Services</h3>
              <ul className="space-y-3">
                {services.map((service, index) => (
                  <li key={index}>
                    <motion.a
                      href={`/services#${service.name.toLowerCase()}`}
                      className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 flex items-center gap-3 group"
                      whileHover={{ x: 5 }}
                    >
                      <service.icon className="w-4 h-4 text-cyan-500" />
                      {service.name}
                    </motion.a>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Contact Info Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-4 gap-6 py-8 border-t border-b border-white/10 mb-8"
          >
            {contactInfo.map((item, index) => (
              <div key={index} className="flex items-center gap-3 text-gray-300">
                <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-white/10">
          <div className="text-gray-400 text-sm text-center md:text-left">
            <p>
              © {new Date().getFullYear()} FedVantage Solutions. All rights reserved. |{' '}
              <span className="text-cyan-400">Veteran-Owned • FedRAMP High • CMMC Level 3</span>
            </p>
          </div>
          
          <div className="flex gap-6 text-sm text-gray-400">
            <motion.a
              href="/privacy"
              className="hover:text-cyan-400 transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              Privacy Policy
            </motion.a>
            <motion.a
              href="/terms"
              className="hover:text-cyan-400 transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              Terms of Service
            </motion.a>
            <motion.a
              href="/compliance"
              className="hover:text-cyan-400 transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              Compliance
            </motion.a>
          </div>

          {/* Scroll to Top */}
        
        </div>
      </div>
    </footer>
  );
}