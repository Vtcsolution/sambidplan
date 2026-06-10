import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Twitter, Linkedin, Facebook, ChevronDown,
  MapPin, Phone, Mail, Clock
} from 'lucide-react';

export default function Footer() {
  const [openSection, setOpenSection] = useState(null);

  const toggle = (key) => setOpenSection(prev => prev === key ? null : key);

  const sections = [
    {
      key: 'platform',
      title: 'Platform',
      links: [
        { label: 'Dashboard',     to: '/dashboard' },
        { label: 'Opportunities', to: '/opportunities' },
        { label: 'Saved Contracts', to: '/saved' },
        { label: 'Smart Alerts',  to: '/alerts' },
        { label: 'Bid Pipeline',  to: '/pipeline' },
      ],
    },
    {
      key: 'ai',
      title: 'AI Tools',
      links: [
        { label: 'Capability Statement', to: '/capability-statement' },
        { label: 'RFP Analyzer',         to: '/rfp-analyzer' },
        { label: 'Go / No-Go',           to: '/go-no-go' },
        { label: 'Market Research',      to: '/market-research' },
        { label: 'Teaming Finder',       to: '/teaming-finder' },
      ],
    },
    {
      key: 'company',
      title: 'Company',
      links: [
        { label: 'About Us',     to: '/about' },
        { label: 'How It Works', to: '/how-it-works' },
        { label: 'Pricing',      to: '/pricing' },
        { label: 'Contact',      to: '/contact' },
        { label: 'Referrals',    to: '/referral' },
      ],
    },
  ];

  const contactItems = [
    { icon: MapPin, text: 'Arlington, VA 22203, USA' },
    { icon: Mail,   text: 'support@sambid.co' },
    { icon: Clock,  text: 'Mon – Fri: 9 AM – 6 PM EST' },
  ];

  const socials = [
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Twitter,  href: '#', label: 'Twitter' },
    { icon: Facebook, href: '#', label: 'Facebook' },
  ];

  return (
    <footer className="bg-gradient-to-br from-slate-900 to-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

        {/* ── Top grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10 mb-10 sm:mb-12">

          {/* Brand column */}
          <div className="sm:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4 sm:mb-5 w-fit">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-base">S</span>
              </div>
              <span className="text-xl font-bold text-white">Sambid Notify</span>
            </Link>

            <p className="text-gray-400 text-sm leading-relaxed mb-5 max-w-xs">
              AI-powered federal contract discovery platform. Helping contractors find, track, and win
              government opportunities worth billions.
            </p>

            <p className="text-indigo-300 text-sm font-medium italic border-l-2 border-indigo-500 pl-3 mb-5">
              "Never miss a federal contract again."
            </p>

            {/* Socials */}
            <div className="flex gap-3">
              {socials.map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 bg-white/10 hover:bg-indigo-600 rounded-lg flex items-center justify-center transition-colors duration-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="w-4 h-4" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Nav sections — desktop */}
          {sections.map(sec => (
            <div key={sec.key} className="hidden sm:block">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {sec.title}
              </h4>
              <ul className="space-y-2.5">
                {sec.links.map(lnk => (
                  <li key={lnk.to}>
                    <Link
                      to={lnk.to}
                      className="text-sm text-gray-400 hover:text-indigo-300 transition-colors duration-200"
                    >
                      {lnk.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Mobile accordion nav ── */}
        <div className="sm:hidden space-y-1 mb-8 border-t border-white/10 pt-6">
          {sections.map(sec => (
            <div key={sec.key} className="border-b border-white/10 last:border-b-0">
              <button
                onClick={() => toggle(sec.key)}
                className="flex items-center justify-between w-full py-3.5 text-sm font-medium text-white"
              >
                {sec.title}
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSection === sec.key ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {openSection === sec.key && (
                  <motion.ul
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden pb-3 pl-2 space-y-2.5"
                  >
                    {sec.links.map(lnk => (
                      <li key={lnk.to}>
                        <Link
                          to={lnk.to}
                          className="text-sm text-gray-400 hover:text-indigo-300 transition-colors"
                        >
                          {lnk.label}
                        </Link>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* ── Contact bar ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 py-6 sm:py-8 border-t border-b border-white/10 mb-8">
          {contactItems.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-gray-400">
              <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-xs sm:text-sm">{text}</span>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} Sambid Notify. All rights reserved.
          </p>
          <div className="flex gap-4 sm:gap-6">
            <Link to="/privacy" className="hover:text-indigo-300 transition-colors">Privacy Policy</Link>
            <Link to="/terms"   className="hover:text-indigo-300 transition-colors">Terms of Service</Link>
            <Link to="/contact" className="hover:text-indigo-300 transition-colors">Support</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
