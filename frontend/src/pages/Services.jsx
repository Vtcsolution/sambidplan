'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Shield, Cloud, Code, Users, Cpu, CheckCircle, ArrowRight,
  Globe, Headphones, Zap, MapPin, Building2, ChevronRight, Sparkles,
  Award, FileCheck, Truck, Target, Eye, Star, Clock, Server,
  Network, Database, Lock, Key, Monitor, Smartphone, Laptop,
  Wrench, Settings, Heart, BookOpen, DollarSign, MessageSquare,
  ArrowUpRight, Circle, ChevronDown, Phone, Mail, Calendar
} from 'lucide-react';

export default function ServicesPage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeService, setActiveService] = useState(0);
  const [isHovered, setIsHovered] = useState({});
  const [scrollProgress, setScrollProgress] = useState(0);
  const { scrollYProgress } = useScroll();
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);
  
  const heroRef = useRef(null);

  // Bubble positions for background
  const [bubbles, setBubbles] = useState([]);

  useEffect(() => {
    const handleMouse = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  // Initialize bubbles
  useEffect(() => {
    const newBubbles = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 60 + 20,
      duration: Math.random() * 20 + 10,
      opacity: Math.random() * 0.1 + 0.05
    }));
    setBubbles(newBubbles);
  }, []);

  // Auto-rotate services with smooth transition
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveService((prev) => (prev + 1) % services.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentProgress = (window.scrollY / totalScroll) * 100;
      setScrollProgress(currentProgress);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const services = [
    { 
      icon: Settings, 
      title: "Managed IT Services", 
      color: "from-cyan-500 to-blue-600",
      bgColor: "bg-gradient-to-br from-cyan-50 to-blue-50",
      description: "We take full responsibility for your IT environment — from daily operations to strategic optimization.",
      capabilities: [
        "24/7 system monitoring & maintenance",
        "Helpdesk & technical support",
        "Patch management & security updates",
        "Network & performance optimization",
        "SLA-based service delivery"
      ],
      benefits: [
        "Reduced downtime",
        "Predictable costs",
        "Improved system reliability",
        "Proactive maintenance",
        "Expert support team"
      ],
      features: ["24/7 Monitoring", "Helpdesk", "Maintenance", "Optimization"],
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop",
      keywords: "managed IT services USA, IT support, government IT operations"
    },
    { 
      icon: Cloud, 
      title: "Cloud & Infrastructure", 
      color: "from-emerald-500 to-teal-600",
      bgColor: "bg-gradient-to-br from-emerald-50 to-teal-50",
      description: "Secure, scalable, and optimized infrastructure built for the modern enterprise.",
      capabilities: [
        "Cloud migration (AWS, Azure, GCP)",
        "Hybrid & on-premises environments",
        "Disaster recovery & backup solutions",
        "Infrastructure-as-Code & automation",
        "Cost optimization & governance"
      ],
      benefits: [
        "Scalability",
        "Resilience",
        "Cloud cost efficiency",
        "Flexible deployment",
        "Automated management"
      ],
      features: ["Cloud Migration", "Hybrid Cloud", "Disaster Recovery", "Automation"],
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop",
      keywords: "cloud migration, hybrid infrastructure, cloud solutions provider USA"
    },
    { 
      icon: Shield, 
      title: "Cybersecurity & Compliance", 
      color: "from-indigo-500 to-purple-600",
      bgColor: "bg-gradient-to-br from-indigo-50 to-purple-50",
      description: "Protecting your systems, data, and reputation with proactive security and compliance-first strategy.",
      capabilities: [
        "Risk & vulnerability assessment",
        "Network and endpoint protection",
        "Identity & access management",
        "Compliance audits (FISMA, NIST, HIPAA)",
        "Incident response & remediation"
      ],
      benefits: [
        "Regulatory compliance",
        "Risk reduction",
        "Operational continuity",
        "Data protection",
        "Threat prevention"
      ],
      features: ["Risk Assessment", "Endpoint Protection", "Compliance", "Incident Response"],
      image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=600&fit=crop",
      keywords: "cybersecurity services, federal IT compliance, NIST cybersecurity"
    },
    { 
      icon: Code, 
      title: "Software Development & Integration", 
      color: "from-orange-500 to-red-600",
      bgColor: "bg-gradient-to-br from-orange-50 to-red-50",
      description: "Modern, customized software that aligns with your goals and integrates seamlessly with existing systems.",
      capabilities: [
        "Custom web & mobile app development",
        "API & system integration",
        "Legacy modernization",
        "Automation & workflow optimization",
        "DevOps & continuous delivery"
      ],
      benefits: [
        "Custom solutions",
        "Seamless integration",
        "Modern technology",
        "Process automation",
        "Continuous improvement"
      ],
      features: ["Custom Development", "System Integration", "Legacy Modernization", "DevOps"],
      image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=600&fit=crop",
      keywords: "software integration, enterprise app development, API development"
    },
    { 
      icon: Users, 
      title: "IT Staffing & Resource Augmentation", 
      color: "from-pink-500 to-rose-600",
      bgColor: "bg-gradient-to-br from-pink-50 to-rose-50",
      description: "Flexible workforce solutions that help you access top-tier IT professionals for short- or long-term projects.",
      capabilities: [
        "IT staff augmentation (contract, contract-to-hire, permanent)",
        "Project-based staffing",
        "Federal and private contracting support",
        "Certified, cleared technical professionals"
      ],
      benefits: [
        "Cost efficiency",
        "Workforce flexibility",
        "Reduced hiring time",
        "Expert talent access",
        "Scalable teams"
      ],
      features: ["Staff Augmentation", "Project Staffing", "Federal Contracting", "Cleared Professionals"],
      image: "https://images.unsplash.com/photo-1551836026-d5c8c2d6f3d1?w=800&h=600&fit=crop",
      keywords: "IT staffing USA, federal IT contracting, tech resource augmentation"
    },
    { 
      icon: Server, 
      title: "IT Hardware & Networking Equipment", 
      color: "from-violet-500 to-purple-600",
      bgColor: "bg-gradient-to-br from-violet-50 to-purple-50",
      description: "We provide a complete range of high-quality hardware and networking solutions for secure, reliable infrastructure.",
      capabilities: [
        "Servers, storage devices, and data centers",
        "Routers, switches, and firewalls",
        "Network cabling and accessories",
        "End-user computing equipment (PCs, laptops, monitors)",
        "Printers, scanners, and peripherals"
      ],
      benefits: [
        "Reliable infrastructure",
        "Secure hardware supply",
        "Fast deployment",
        "Quality equipment",
        "Full lifecycle support"
      ],
      features: ["Servers & Storage", "Networking", "End-user Devices", "Infrastructure"],
      image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&h=600&fit=crop",
      keywords: "IT hardware supplier, networking equipment, routers and servers USA"
    }
  ];

  const stats = [
    { number: "40+", label: "Federal Agencies Served", icon: Building2 },
    { number: "150+", label: "Cleared IT Experts", icon: Users },
    { number: "99.999%", label: "Uptime SLA", icon: Clock },
    { number: "72 hrs", label: "Rapid Deployment", icon: Zap },
    { number: "24/7", label: "US-Based Support", icon: Headphones },
    { number: "50+", label: "States Served", icon: MapPin }
  ];

  const certifications = [
    { name: "FedRAMP High", icon: Shield, color: "text-blue-600" },
    { name: "CMMC Level 3", icon: FileCheck, color: "text-green-600" },
    { name: "GSA Schedule 70", icon: Award, color: "text-cyan-600" },
    { name: "NIST 800-53", icon: Target, color: "text-orange-600" },
    { name: "HIPAA Compliant", icon: Heart, color: "text-purple-600" },
    { name: "ISO 27001", icon: BookOpen, color: "text-red-600" }
  ];

  return (
    <>
      {/* Smooth Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 z-50 origin-left"
        style={{ scaleX: scrollProgress / 100 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: scrollProgress / 100 }}
        transition={{ type: "spring", stiffness: 100, damping: 30 }}
      />

      {/* HERO SECTION with Enhanced Animations */}
      <motion.section
        ref={heroRef}
        className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden"
        style={{ scale: heroScale, opacity: heroOpacity }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* Animated Bubble Background */}
        <div className="absolute inset-0 overflow-hidden">
          {bubbles.map((bubble) => (
            <motion.div
              key={bubble.id}
              className="absolute rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-600/10"
              style={{
                left: `${bubble.x}%`,
                top: `${bubble.y}%`,
                width: bubble.size,
                height: bubble.size,
                opacity: bubble.opacity
              }}
              animate={{
                y: [0, -100, 0],
                x: [0, Math.sin(bubble.id) * 20, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: bubble.duration,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
          
          {/* Animated Grid */}
          <motion.div 
            className="absolute inset-0 bg-grid-white/[0.02] bg-grid [background-size:50px_50px]"
            animate={{ backgroundPosition: ['0px 0px', '50px 50px'] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Gradient Overlay */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/50 to-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
          />
        </div>

        {/* Dynamic Gradient Orbs */}
        <motion.div
          className="absolute top-20 right-20 w-96 h-96 bg-cyan-500 rounded-full filter blur-3xl opacity-20"
          animate={{ 
            x: [0, 120, 0], 
            y: [0, -80, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 18, 
            repeat: Infinity, 
            ease: [0.25, 0.1, 0.25, 1]
          }}
        />
        <motion.div
          className="absolute bottom-20 left-20 w-96 h-96 bg-blue-600 rounded-full filter blur-3xl opacity-20"
          animate={{ 
            x: [0, -100, 0], 
            y: [0, 100, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 15, 
            repeat: Infinity, 
            ease: [0.25, 0.1, 0.25, 1]
          }}
        />

        {/* Mouse Parallax Effect */}
        <motion.div
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background: `radial-gradient(600px at ${mousePos.x}px ${mousePos.y}px, rgba(6, 182, 212, 0.15), transparent 70%)`
          }}
          animate={{
            backgroundSize: ['600px 600px', '800px 800px', '600px 600px']
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        <div className="relative z-10 container mx-auto px-6 py-32">
          <motion.div
            className="text-center max-w-6xl mx-auto"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.8,
              ease: "easeOut"
            }}
          >
            {/* Trust Badge with Stagger Animation */}
            <motion.div
              className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 px-6 py-3 rounded-full text-sm font-medium mb-8 backdrop-blur-md border border-cyan-500/30"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 20,
                delay: 0.2
              }}
              whileHover={{ 
                scale: 1.05,
                transition: { type: "spring", stiffness: 400 }
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-4 h-4" />
              </motion.div>
              Veteran-Owned • FedRAMP High • CMMC Level 3 • GSA Schedule 70
            </motion.div>

            <motion.h1
              className="text-5xl md:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight font-['Space_Grotesk']"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.8,
                delay: 0.3,
                ease: [0.22, 1, 0.36, 1]
              }}
            >
              <motion.span
                className="block"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                IT Services &
              </motion.span>
              <motion.span
                className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-[length:200%]"
                animate={{
                  backgroundPosition: ['0% 0%', '200% 0%']
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                Solutions
              </motion.span>
            </motion.h1>

            <motion.p
              className="text-xl text-gray-300 mb-10 max-w-4xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ 
                duration: 0.8,
                delay: 0.9,
                ease: "easeOut"
              }}
            >
              At FedVantage Solutions, we provide a <strong className="text-cyan-400">full suite of IT services and solutions</strong> tailored to meet the unique needs of 
              <strong className="text-emerald-400"> government agencies, small businesses, and enterprises nationwide</strong>.
            </motion.p>

            {/* CTA Buttons with Enhanced Hover */}
            <motion.div
              className="flex flex-col sm:flex-row gap-5 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.8,
                delay: 1.1,
                ease: "easeOut"
              }}
            >
              <motion.button
                className="group relative overflow-hidden bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-9 py-4 rounded-xl font-bold text-lg shadow-2xl shadow-cyan-500/30 flex items-center justify-center gap-3"
                whileHover={{ 
                  scale: 1.05, 
                  boxShadow: "0 20px 40px rgba(6, 182, 212, 0.4)",
                  transition: { type: "spring", stiffness: 400 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-700"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
                <span className="relative z-10">Request a Quote</span>
                <motion.div
                  className="relative z-10"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ChevronRight className="w-5 h-5" />
                </motion.div>
              </motion.button>

              <motion.button
                className="group bg-white/10 backdrop-blur-md text-white px-9 py-4 rounded-xl font-bold text-lg border border-white/20 flex items-center justify-center gap-3 overflow-hidden"
                whileHover={{ 
                  scale: 1.05, 
                  backgroundColor: "rgba(255,255,255,0.2)",
                  transition: { type: "spring", stiffness: 400 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                <span>Explore Industries We Serve</span>
                <motion.div
                  className="flex"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              </motion.button>
            </motion.div>
          </motion.div>
        </div>

        {/* Smooth Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
        >
          <div className="text-sm text-gray-400 mb-2">Scroll to explore</div>
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <motion.div
              className="w-1 h-3 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full mt-2"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </motion.section>

      {/* ENHANCED STATS SECTION with Smooth Animations */}
      <motion.section 
        className="py-20 bg-gradient-to-br from-white to-gray-50"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
            {stats.map((stat, i) => {
              const StatIcon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  className="text-center p-8 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ 
                    delay: i * 0.1,
                    duration: 0.5
                  }}
                  whileHover={{ 
                    scale: 1.05, 
                    y: -5,
                    transition: { type: "spring", stiffness: 400 }
                  }}
                >
                  <motion.div
                    className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-4 text-white"
                    whileHover={{ 
                      rotate: 360,
                      transition: { duration: 0.6 }
                    }}
                  >
                    <StatIcon className="w-full h-full" />
                  </motion.div>
                  <motion.div
                    className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-3 font-['Space_Grotesk']"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {stat.number}
                  </motion.div>
                  <div className="text-lg font-semibold text-slate-700">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* OVERVIEW SECTION with Smooth Animations */}
      <motion.section 
        className="py-24 bg-gradient-to-b from-gray-50 to-white"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h2
              className="text-4xl md:text-5xl font-bold text-slate-900 mb-8 font-['Space_Grotesk']"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Comprehensive IT Solutions
            </motion.h2>
            <motion.p
              className="text-xl text-gray-600 leading-relaxed mb-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ 
                delay: 0.2,
                duration: 0.6
              }}
            >
              At FedVantage Solutions, we provide a <strong>full suite of IT services and solutions</strong> tailored to meet the unique needs of 
              <strong> government agencies, small businesses, and enterprises nationwide</strong>. Our comprehensive approach ensures 
              your technology infrastructure is secure, scalable, and optimized for performance.
            </motion.p>
            
            <motion.div
              className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto rounded-full"
              initial={{ width: 0 }}
              whileInView={{ width: 96 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            />
          </div>
        </div>
      </motion.section>

      {/* INTERACTIVE SERVICES SECTION with Enhanced Animations */}
      <motion.section 
        className="py-24 bg-white"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.h2
              className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 font-['Space_Grotesk']"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">Services</span>
            </motion.h2>
            <motion.p
              className="text-xl text-gray-600 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              End-to-end IT solutions for government and enterprise needs
            </motion.p>
          </motion.div>

          {/* Service Navigation with Enhanced Hover */}
          <motion.div 
            className="flex flex-wrap justify-center gap-4 mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {services.map((service, index) => (
              <motion.button
                key={index}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                  activeService === index
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                whileHover={{ 
                  scale: 1.05,
                  transition: { type: "spring", stiffness: 400 }
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveService(index)}
                onMouseEnter={() => setIsHovered({ [index]: true })}
                onMouseLeave={() => setIsHovered({ [index]: false })}
              >
                <motion.span
                  animate={{ 
                    x: isHovered[index] ? 2 : 0
                  }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {service.title}
                </motion.span>
              </motion.button>
            ))}
          </motion.div>

          {/* Animated Service Display */}
          <div className="max-w-6xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeService}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ 
                  opacity: 0, 
                  y: -20,
                  transition: { duration: 0.3 }
                }}
                transition={{ 
                  duration: 0.4,
                  ease: "easeInOut"
                }}
                className={`rounded-2xl p-8 ${services[activeService].bgColor} border border-gray-200`}
              >
                <div className="grid lg:grid-cols-2 gap-8 items-start">
                  <div>
                    <motion.div
                      className="flex items-center gap-4 mb-6"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <motion.div
                        className={`w-16 h-16 rounded-xl bg-gradient-to-br ${services[activeService].color} p-3 shadow-lg`}
                        animate={{ 
                          rotate: [0, 10, 0],
                          scale: [1, 1.05, 1]
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        {(() => {
                          const ServiceIcon = services[activeService].icon;
                          return <ServiceIcon className="w-full h-full text-white" />;
                        })()}
                      </motion.div>
                      <h3 className="text-3xl font-bold text-slate-900 font-['Space_Grotesk']">
                        {services[activeService].title}
                      </h3>
                    </motion.div>
                    
                    <motion.p
                      className="text-lg text-gray-700 mb-6 leading-relaxed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {services[activeService].description}
                    </motion.p>

                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <motion.h4
                          className="font-bold text-cyan-700 mb-3 flex items-center gap-2"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          >
                            <CheckCircle className="w-5 h-5" />
                          </motion.div>
                          Capabilities
                        </motion.h4>
                        <ul className="space-y-2">
                          {services[activeService].capabilities.map((capability, idx) => (
                            <motion.li
                              key={idx}
                              className="flex items-start gap-3 text-gray-700"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                            >
                              <motion.div
                                className="w-1.5 h-1.5 bg-cyan-600 rounded-full mt-2 flex-shrink-0"
                                animate={{ 
                                  scale: [1, 1.5, 1],
                                  opacity: [1, 0.5, 1]
                                }}
                                transition={{ 
                                  duration: 2, 
                                  repeat: Infinity,
                                  delay: idx * 0.1
                                }}
                              />
                              <span>{capability}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <motion.h4
                          className="font-bold text-emerald-700 mb-3 flex items-center gap-2"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                        >
                          <motion.div
                            animate={{ rotate: [0, -360] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          >
                            <CheckCircle className="w-5 h-5" />
                          </motion.div>
                          Benefits
                        </motion.h4>
                        <ul className="space-y-2">
                          {services[activeService].benefits.map((benefit, idx) => (
                            <motion.li
                              key={idx}
                              className="flex items-start gap-3 text-gray-700"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                            >
                              <motion.div
                                className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-2 flex-shrink-0"
                                animate={{ 
                                  scale: [1, 1.5, 1],
                                  opacity: [1, 0.5, 1]
                                }}
                                transition={{ 
                                  duration: 2, 
                                  repeat: Infinity,
                                  delay: idx * 0.1 + 0.5
                                }}
                              />
                              <span>{benefit}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <motion.div 
                      className="flex flex-wrap gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {services[activeService].features.map((feature, idx) => (
                        <motion.span
                          key={idx}
                          className="px-3 py-1 bg-white/80 rounded-full text-sm font-medium text-gray-700 border border-gray-300"
                          whileHover={{ 
                            scale: 1.05,
                            backgroundColor: "#f0f9ff",
                            color: "#06b6d4",
                            transition: { type: "spring", stiffness: 400 }
                          }}
                        >
                          {feature}
                        </motion.span>
                      ))}
                    </motion.div>
                  </div>

                  <motion.div
                    className="relative h-64 lg:h-80 rounded-xl overflow-hidden shadow-lg"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ 
                      scale: 1.02,
                      transition: { type: "spring", stiffness: 400 }
                    }}
                  >
                    <img 
                      src={services[activeService].image}
                      alt={services[activeService].title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <motion.div 
                      className="absolute bottom-4 left-4 text-white"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <p className="text-sm opacity-90">Service Highlight</p>
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      {/* CERTIFICATION BADGES with Smooth Animations */}
      <motion.section 
        className="py-16 bg-slate-800"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto px-6">
          <motion.h3
            className="text-2xl font-bold text-center text-white mb-12 font-['Space_Grotesk']"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Certified & Compliant
          </motion.h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {certifications.map((cert, i) => {
              const CertIcon = cert.icon;
              return (
                <motion.div
                  key={cert.name}
                  className="text-center group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ 
                    delay: i * 0.1,
                    duration: 0.5
                  }}
                  whileHover={{ 
                    y: -5,
                    transition: { type: "spring", stiffness: 400 }
                  }}
                >
                  <motion.div
                    className={`w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/10 p-4 group-hover:bg-white/20 transition-colors ${cert.color}`}
                    whileHover={{ 
                      scale: 1.1,
                      rotate: 360,
                      transition: { duration: 0.6 }
                    }}
                  >
                    <CertIcon className="w-full h-full" />
                  </motion.div>
                  <div className="text-sm font-semibold text-white">{cert.name}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* COMPLIANCE MARQUEE with Smooth Animation */}
      <motion.section 
        className="py-20 bg-slate-900 text-white overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto px-6 text-center mb-12">
          <motion.h2
            className="text-4xl font-bold mb-4 font-['Space_Grotesk']"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Certified for <span className="text-cyan-400">Every Sector</span>
          </motion.h2>
          <motion.p
            className="text-gray-400 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            Meeting compliance requirements across government, healthcare, finance, and enterprise sectors
          </motion.p>
        </div>

        <div className="relative overflow-hidden">
          <motion.div
            className="flex gap-8"
            animate={{ x: [0, -2400] }}
            transition={{ 
              duration: 40, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          >
            {[...[
              "FedRAMP High", "CMMC Level 3", "HIPAA", "FERPA", "PCI DSS",
              "NIST 800-53", "FISMA", "SOX", "DFARS", "ITAR", "ISO 27001", "GSA Schedule 70"
            ], ...[
              "FedRAMP High", "CMMC Level 3", "HIPAA", "FERPA", "PCI DSS",
              "NIST 800-53", "FISMA", "SOX", "DFARS", "ITAR", "ISO 27001", "GSA Schedule 70"
            ]].map((cert, i) => (
              <motion.div
                key={i}
                className="flex-shrink-0 bg-white/10 backdrop-blur-md px-8 py-4 rounded-full font-semibold border border-white/20"
                whileHover={{ 
                  scale: 1.05,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  transition: { type: "spring", stiffness: 400 }
                }}
              >
                {cert}
              </motion.div>
            ))}
          </motion.div>
          
          {/* Gradient fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-900 to-transparent" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-900 to-transparent" />
        </div>
      </motion.section>

      {/* ENHANCED FINAL CTA with Smooth Animations */}
      <motion.section 
        className="py-24 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 relative overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
          <motion.div 
            className="absolute inset-0 bg-grid-white/10 bg-grid [background-size:50px_50px]"
            animate={{ backgroundPosition: ['0px 0px', '50px 50px'] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Floating Bubbles */}
          {bubbles.slice(0, 10).map((bubble) => (
            <motion.div
              key={`cta-${bubble.id}`}
              className="absolute rounded-full bg-white/5"
              style={{
                left: `${bubble.x}%`,
                top: `${bubble.y}%`,
                width: bubble.size,
                height: bubble.size
              }}
              animate={{
                y: [0, -100, 0],
                x: [0, Math.sin(bubble.id) * 50, 0],
                scale: [1, 1.5, 1]
              }}
              transition={{
                duration: bubble.duration * 1.2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10 container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ 
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1]
            }}
            className="max-w-4xl mx-auto"
          >
            <motion.h2
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 font-['Space_Grotesk']"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ 
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1]
              }}
            >
              Ready to Transform Your IT?
            </motion.h2>
            <motion.p
              className="text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ 
                delay: 0.2,
                duration: 0.6
              }}
            >
              Get a free IT assessment and custom solution roadmap tailored to your organization's needs.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-5 justify-center items-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ 
                delay: 0.4,
                duration: 0.6
              }}
            >
              <motion.button
                className="group relative bg-white text-slate-900 px-12 py-5 rounded-xl font-bold text-lg shadow-2xl overflow-hidden"
                whileHover={{ 
                  scale: 1.05, 
                  boxShadow: "0 20px 40px rgba(255,255,255,0.3)",
                  transition: { type: "spring", stiffness: 400 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
                <span className="relative z-10 flex items-center gap-3 font-['Space_Grotesk']">
                  Request a Quote
                  <motion.div
                    animate={{ x: [0, 6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-6 h-6" />
                  </motion.div>
                </span>
              </motion.button>

              <motion.button
                className="group bg-transparent text-white px-8 py-5 rounded-xl font-bold text-lg border-2 border-white/30 hover:border-white/60 flex items-center gap-3 overflow-hidden"
                whileHover={{ 
                  scale: 1.05, 
                  backgroundColor: "rgba(255,255,255,0.1)",
                  transition: { type: "spring", stiffness: 400 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  className="flex items-center justify-center"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Clock className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                </motion.div>
                <span>Schedule Consultation</span>
              </motion.button>
            </motion.div>

            <motion.div
              className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-white/80"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ 
                delay: 0.6,
                duration: 0.6
              }}
            >
              {[
                { value: "24/7", label: "Support Response" },
                { value: "99.999%", label: "Uptime SLA" },
                { value: "72h", label: "Rapid Deployment" },
                { value: "150+", label: "Experts" }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  className="text-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <div className="text-2xl font-bold mb-2">{item.value}</div>
                  <div className="text-sm">{item.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Floating Chat Button */}
      <motion.button
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-full shadow-2xl shadow-cyan-500/30 flex items-center justify-center z-40"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          delay: 1,
          type: "spring",
          stiffness: 200,
          damping: 20
        }}
        whileHover={{ 
          scale: 1.1, 
          rotate: 90,
          transition: { type: "spring", stiffness: 400 }
        }}
        whileTap={{ scale: 0.9 }}
      >
        <MessageSquare className="w-7 h-7" />
      </motion.button>
    </>
  );
}