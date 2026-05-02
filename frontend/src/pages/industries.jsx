'use client';

import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Building2, Shield, Stethoscope, GraduationCap, DollarSign,
  Users, Award, CheckCircle, ArrowRight, ChevronRight, Sparkles,
  Globe, Zap, Headphones, MapPin, Clock, FileCheck, Target,
  Lock, Heart, BookOpen, Server, Cloud, Code, Cpu, Network,
  Map, BarChart3, TrendingUp, Users2, ShieldCheck, Database
} from 'lucide-react';

export default function IndustriesPage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const { scrollYProgress } = useScroll();
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);

  useEffect(() => {
    const handleMouse = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  const industries = [
    {
      id: 'government',
      icon: Building2,
      title: "Federal & Local Government",
      color: "from-blue-500 to-cyan-500",
      description: "Delivering secure, compliant, and mission-ready IT infrastructure aligned with federal standards such as NIST, FISMA, and DFARS.",
      highlights: [
        "FedRAMP High Authorization",
        "CMMC Level 3 Compliance",
        "Zero Trust Architecture",
        "24/7 US-Based NOC"
      ],
      solutions: [
        "Secure Cloud Migration",
        "Compliance Audits",
        "Disaster Recovery",
        "Mission Support"
      ],
      stats: { clients: "40+", uptime: "99.999%", response: "24/7" },
      image: "https://images.unsplash.com/photo-1581093450021-4a7360e9a6b5?w=800&h=600&fit=crop",
      caseStudy: "DoD Cloud Modernization"
    },
    {
      id: 'veterans',
      icon: Award,
      title: "Veterans & Small Business",
      color: "from-green-500 to-emerald-500",
      description: "Helping veteran-owned and small enterprises modernize their IT capabilities and compete in today's digital marketplace.",
      highlights: [
        "SDVOSB Certified Partner",
        "Affordable Solutions",
        "Rapid 72-hr Deployment",
        "Flexible Financing"
      ],
      solutions: [
        "Managed IT Services",
        "Cybersecurity Packages",
        "Cloud Solutions",
        "Hardware Procurement"
      ],
      stats: { clients: "200+", deployment: "72hr", growth: "45%" },
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop",
      caseStudy: "Veteran-Owned Manufacturing"
    },
    {
      id: 'healthcare',
      icon: Stethoscope,
      title: "Healthcare",
      color: "from-purple-500 to-indigo-500",
      description: "Ensuring patient data protection, HIPAA compliance, and reliable IT infrastructure for healthcare organizations.",
      highlights: [
        "HIPAA Compliant Solutions",
        "PHI Encryption",
        "EHR Integration",
        "Telemedicine Platforms"
      ],
      solutions: [
        "Patient Data Security",
        "Medical Device Protection",
        "Compliance Audits",
        "Telehealth Infrastructure"
      ],
      stats: { providers: "50+", uptime: "99.999%", compliance: "100%" },
      image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop",
      caseStudy: "Regional Hospital Network"
    },
    {
      id: 'education',
      icon: GraduationCap,
      title: "Education",
      color: "from-orange-500 to-red-500",
      description: "Building smart, secure IT environments that enhance digital learning, research, and collaboration.",
      highlights: [
        "FERPA Compliant",
        "Campus-Wide Wi-Fi",
        "LMS Integration",
        "Student Data Protection"
      ],
      solutions: [
        "Digital Classroom Solutions",
        "Campus Network Security",
        "Research Computing",
        "Student Privacy"
      ],
      stats: { institutions: "30+", devices: "10k+", uptime: "99.9%" },
      image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=600&fit=crop",
      caseStudy: "University Digital Transformation"
    },
    {
      id: 'finance',
      icon: DollarSign,
      title: "Finance",
      color: "from-pink-500 to-rose-500",
      description: "Implementing high-performance, secure systems that protect data and support complex financial operations.",
      highlights: [
        "PCI DSS Compliant",
        "Real-time Fraud Detection",
        "High-Frequency Trading",
        "Regulatory Compliance"
      ],
      solutions: [
        "Secure Transaction Systems",
        "Fraud Prevention",
        "Regulatory Reporting",
        "Mobile Banking"
      ],
      stats: { institutions: "25+", availability: "99.99%", transactions: "1M+/day" },
      image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop",
      caseStudy: "Regional Bank Modernization"
    }
  ];

  const industryStats = [
    { icon: Building2, number: "40+", label: "Government Agencies" },
    { icon: Users, number: "200+", label: "SMB Clients" },
    { icon: Stethoscope, number: "50+", label: "Healthcare Providers" },
    { icon: GraduationCap, number: "30+", label: "Education Institutions" },
    { icon: DollarSign, number: "25+", label: "Financial Institutions" },
    { icon: ShieldCheck, number: "99.999%", label: "Uptime SLA" }
  ];

  const complianceStandards = [
    { standard: "FedRAMP High", industries: ["Government"], icon: Shield },
    { standard: "CMMC Level 3", industries: ["Government", "Defense"], icon: FileCheck },
    { standard: "HIPAA", industries: ["Healthcare"], icon: Heart },
    { standard: "FERPA", industries: ["Education"], icon: BookOpen },
    { standard: "PCI DSS", industries: ["Finance"], icon: DollarSign },
    { standard: "NIST 800-53", industries: ["Government", "Healthcare", "Finance"], icon: Target }
  ];

  return (
    <>
      

      {/* HERO - Different Layout */}
      <motion.section
        className="relative min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 overflow-hidden"
        style={{ scale: heroScale, opacity: heroOpacity }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:40px_40px]" />
        </div>

        {/* Animated Elements */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.2, 0.4] }}
          transition={{ duration: 10, repeat: Infinity }}
        />

        <div className="relative z-10 container mx-auto px-6 py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-full text-sm font-medium mb-8 border border-white/20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
              >
                <Sparkles className="w-4 h-4" />
                Trusted Across Multiple Industries
              </motion.div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                Industry-Specific
                <span className="block bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  IT Solutions
                </span>
              </h1>

              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Tailored technology solutions that understand your industry's unique challenges, 
                compliance requirements, and operational needs.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  className="group bg-white text-slate-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all duration-300 flex items-center gap-3"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Explore Industries
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
                <motion.button
                  className="group border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all duration-300 flex items-center gap-3"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  View Case Studies
                  <BarChart3 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </motion.button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-4">
                {industries.slice(0, 4).map((industry, index) => (
                  <motion.div
                    key={industry.id}
                    className={`p-6 rounded-2xl bg-gradient-to-br ${industry.color} text-white backdrop-blur-md border border-white/20 cursor-pointer hover:scale-105 transition-transform duration-300`}
                    whileHover={{ y: -5 }}
                    onClick={() => setSelectedIndustry(industry)}
                  >
                    <industry.icon className="w-8 h-8 mb-3" />
                    <h3 className="font-bold text-sm">{industry.title.split(' ')[0]}</h3>
                    <p className="text-xs opacity-90 mt-1">{industry.stats.clients} Clients</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* INDUSTRY STATS - Cards Layout */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <motion.h2
            className="text-4xl md:text-5xl font-bold text-center text-slate-900 mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Trusted by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">Industry Leaders</span>
          </motion.h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-6xl mx-auto">
            {industryStats.map((stat, index) => (
              <motion.div
                key={index}
                className="text-center p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 hover:shadow-lg transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <stat.icon className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                <div className="text-2xl font-bold text-slate-900 mb-1">{stat.number}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* INDUSTRY GRID - Interactive Cards */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Explore Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">Industry Expertise</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Deep understanding of industry-specific challenges and compliance requirements
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {industries.map((industry, index) => (
              <motion.div
                key={industry.id}
                className="group relative bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10 }}
                onClick={() => setSelectedIndustry(industry)}
              >
                {/* Industry Image */}
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={industry.image} 
                    alt={industry.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-4 right-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${industry.color} p-2 text-white shadow-lg`}>
                      <industry.icon className="w-full h-full" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {industry.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2">
                    {industry.description}
                  </p>

                  {/* Stats */}
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-slate-900">{Object.values(industry.stats)[0]}</div>
                      <div className="text-xs text-gray-500">Clients</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-slate-900">{Object.values(industry.stats)[1]}</div>
                      <div className="text-xs text-gray-500">Uptime</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-slate-900">{Object.values(industry.stats)[2]}</div>
                      <div className="text-xs text-gray-500">Support</div>
                    </div>
                  </div>

                  {/* Solutions Tags */}
                  <div className="flex flex-wrap gap-2">
                    {industry.solutions.slice(0, 2).map((solution, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {solution}
                      </span>
                    ))}
                    {industry.solutions.length > 2 && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        +{industry.solutions.length - 2} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500 rounded-2xl transition-all duration-300 pointer-events-none" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPLIANCE STANDARDS - Table Layout */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Industry <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">Compliance Standards</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Meeting the highest regulatory and security standards across all industries
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-1 divide-y divide-gray-200">
              {complianceStandards.map((standard, index) => (
                <motion.div
                  key={standard.standard}
                  className="p-6 hover:bg-white transition-colors duration-300"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <standard.icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{standard.standard}</h3>
                        <p className="text-sm text-gray-600">
                          Applies to: {standard.industries.join(', ')}
                        </p>
                      </div>
                    </div>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CASE STUDIES PREVIEW */}
      <section className="py-24 bg-gradient-to-br from-slate-900 to-blue-900 text-white">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Success <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Stories</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Real-world implementations delivering measurable results
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {industries.slice(0, 3).map((industry, index) => (
              <motion.div
                key={industry.id}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                whileHover={{ y: -5 }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${industry.color} p-2 mb-4`}>
                  <industry.icon className="w-full h-full text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{industry.caseStudy}</h3>
                <p className="text-gray-300 text-sm mb-4">
                  {industry.description.substring(0, 120)}...
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 text-sm font-semibold">Read Case Study</span>
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA - Different Design */}
      <section className="py-24 bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.2)_1px,transparent_0)] bg-[length:50px_50px]" />
        </div>

        <div className="relative z-10 container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Ready to Transform Your Industry?
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
              Let's discuss how our industry-specific solutions can drive your organization forward.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
              <motion.button
                className="bg-white text-blue-600 px-12 py-5 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors duration-300 flex items-center gap-3"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Start Conversation
                <TrendingUp className="w-5 h-5" />
              </motion.button>
              <motion.button
                className="border-2 border-white text-white px-8 py-5 rounded-xl font-bold text-lg hover:bg-white/10 transition-all duration-300 flex items-center gap-3"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Download Brochure
                <BookOpen className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Industry Detail Modal */}
      {selectedIndustry && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setSelectedIndustry(null)}
        >
          <motion.div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-64">
              <img 
                src={selectedIndustry.image} 
                alt={selectedIndustry.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button 
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                onClick={() => setSelectedIndustry(null)}
              >
                ×
              </button>
              <div className="absolute bottom-6 left-6 text-white">
                <h2 className="text-3xl font-bold">{selectedIndustry.title}</h2>
                <p className="text-blue-200">{selectedIndustry.caseStudy}</p>
              </div>
            </div>

            <div className="p-8">
              <p className="text-gray-700 text-lg mb-6">{selectedIndustry.description}</p>
              
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    Key Highlights
                  </h3>
                  <ul className="space-y-2">
                    {selectedIndustry.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-500" />
                    Solutions Offered
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedIndustry.solutions.map((solution, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {solution}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-bold text-slate-900 mb-4">Performance Metrics</h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(selectedIndustry.stats).map(([key, value]) => (
                    <div key={key} className="text-center p-4 bg-gray-50 rounded-xl">
                      <div className="text-2xl font-bold text-blue-600">{value}</div>
                      <div className="text-sm text-gray-600 capitalize">{key}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}