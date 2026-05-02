'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Download, ArrowRight, Calendar, User, Clock,
  Building2, Shield, Cloud, Code, Users, Server,
  Search, Filter, BookOpen, BarChart3, PlayCircle,
  ChevronDown, ExternalLink, Eye, Share2, Bookmark,
  X, CheckCircle, Target, Zap, Award
} from 'lucide-react';

export default function CaseStudiesPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCaseStudy, setSelectedCaseStudy] = useState(null);

  const caseStudies = [
    {
      id: 1,
      title: "DoD Cloud Migration & Security Modernization",
      excerpt: "Successfully migrated 15+ critical applications to AWS GovCloud while achieving FedRAMP High authorization.",
      category: "government",
      client: "Department of Defense",
      duration: "12 months",
      challenge: "The Department of Defense needed to modernize their legacy infrastructure while maintaining the highest security standards and achieving FedRAMP High authorization for cloud operations.",
      solution: "We implemented a phased migration approach to AWS GovCloud, established Zero Trust architecture, and automated compliance monitoring.",
      results: [
        "99.99% application availability",
        "45% reduction in infrastructure costs",
        "CMMC Level 3 compliance achieved",
        "72-hour disaster recovery capability",
        "Zero security incidents post-migration"
      ],
      technologies: ["AWS GovCloud", "Zero Trust", "Terraform", "Splunk", "CrowdStrike"],
      image: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&h=500&fit=crop",
      readTime: "8 min read",
      date: "2024-01-15",
      featured: true
    },
    {
      id: 2,
      title: "Healthcare Provider HIPAA Compliance Overhaul",
      excerpt: "Implemented comprehensive security framework for regional hospital network serving 500,000+ patients.",
      category: "healthcare",
      client: "Regional Health System",
      duration: "8 months",
      challenge: "A regional healthcare provider needed to achieve full HIPAA compliance while maintaining operational efficiency and patient care quality.",
      solution: "We conducted a comprehensive risk assessment, implemented data encryption, and established incident response protocols.",
      results: [
        "100% HIPAA compliance score",
        "Zero security incidents post-implementation",
        "98% staff training completion",
        "2-hour incident response time",
        "Seamless EHR integration"
      ],
      technologies: ["HIPAA Compliance", "Data Encryption", "SIEM", "EHR Integration"],
      image: "https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&h=500&fit=crop",
      readTime: "6 min read",
      date: "2024-02-10",
      featured: true
    },
    {
      id: 3,
      title: "University Digital Transformation Initiative",
      excerpt: "Modernized campus infrastructure supporting 25,000 students and 2,000 faculty members.",
      category: "education",
      client: "State University System",
      duration: "18 months",
      challenge: "The university needed to modernize aging infrastructure while supporting remote learning and maintaining FERPA compliance.",
      solution: "We deployed campus-wide Wi-Fi, implemented cloud-based learning management, and established robust cybersecurity measures.",
      results: [
        "40% improvement in network performance",
        "99.9% Wi-Fi coverage across campus",
        "Unified learning management system",
        "FERPA compliance maintained",
        "75% reduction in IT support tickets"
      ],
      technologies: ["Cisco Networking", "Canvas LMS", "Azure AD", "Palo Alto Firewalls"],
      image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=500&fit=crop",
      readTime: "10 min read",
      date: "2024-01-28"
    },
    {
      id: 4,
      title: "Financial Institution PCI DSS Compliance",
      excerpt: "Secured banking infrastructure and transaction processing for regional financial institution.",
      category: "finance",
      client: "Community Bank & Trust",
      duration: "6 months",
      challenge: "A regional bank needed to achieve PCI DSS Level 1 certification while maintaining customer trust and operational continuity.",
      solution: "We implemented real-time fraud detection, encrypted transaction pipelines, and comprehensive access controls.",
      results: [
        "PCI DSS Level 1 certification",
        "Real-time fraud detection implemented",
        "99.99% transaction system availability",
        "30% reduction in false positives",
        "Enhanced customer trust scores"
      ],
      technologies: ["PCI DSS", "Fraud Detection AI", "Encryption", "MFA"],
      image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=500&fit=crop",
      readTime: "7 min read",
      date: "2024-03-05"
    }
  ];

  const insights = [
    {
      id: 1,
      title: "Zero Trust Architecture: Beyond the Buzzword",
      excerpt: "Practical implementation strategies for federal agencies adopting Zero Trust principles.",
      category: "cybersecurity",
      type: "article",
      author: "Sarah Patel",
      readTime: "12 min read",
      date: "2024-03-15",
      views: "2.4k",
      tags: ["Zero Trust", "Cybersecurity", "Federal"]
    },
    {
      id: 2,
      title: "Cloud Cost Optimization in Government",
      excerpt: "Strategies for managing and reducing cloud spending while maintaining performance.",
      category: "cloud",
      type: "guide",
      author: "Michael Chen",
      readTime: "15 min read",
      date: "2024-03-12",
      views: "1.8k",
      tags: ["Cloud", "Cost Optimization", "Government"]
    },
    {
      id: 3,
      title: "AI in Cybersecurity: Threat or Opportunity?",
      excerpt: "Exploring the dual role of AI in both enhancing security and creating new vulnerabilities.",
      category: "ai",
      type: "article",
      author: "James Rodriguez",
      readTime: "10 min read",
      date: "2024-03-08",
      views: "3.1k",
      tags: ["AI", "Machine Learning", "Security"]
    },
    {
      id: 4,
      title: "The Future of Remote Work Security",
      excerpt: "Best practices for securing distributed workforce in post-pandemic environment.",
      category: "security",
      type: "whitepaper",
      author: "Emily Watson",
      readTime: "20 min read",
      date: "2024-03-01",
      views: "2.9k",
      tags: ["Remote Work", "Security", "Best Practices"]
    }
  ];

  const resources = [
    {
      id: 1,
      title: "CMMC Level 3 Compliance Checklist",
      description: "Comprehensive checklist for achieving and maintaining CMMC Level 3 compliance.",
      type: "checklist",
      category: "compliance",
      format: "PDF",
      size: "2.4 MB",
      downloads: "1,247",
      icon: FileText,
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: 2,
      title: "Federal Cloud Migration Guide",
      description: "Step-by-step guide for migrating federal workloads to GovCloud environments.",
      type: "guide",
      category: "cloud",
      format: "PDF",
      size: "3.1 MB",
      downloads: "892",
      icon: Cloud,
      color: "from-purple-500 to-pink-500"
    },
    {
      id: 3,
      title: "HIPAA Security Risk Assessment Template",
      description: "Customizable template for conducting HIPAA security risk assessments.",
      type: "template",
      category: "healthcare",
      format: "DOCX",
      size: "1.8 MB",
      downloads: "1,543",
      icon: Shield,
      color: "from-green-500 to-emerald-500"
    },
    {
      id: 4,
      title: "Zero Trust Implementation Framework",
      description: "Comprehensive framework for implementing Zero Trust architecture.",
      type: "framework",
      category: "security",
      format: "PDF",
      size: "4.2 MB",
      downloads: "2,118",
      icon: BarChart3,
      color: "from-orange-500 to-red-500"
    },
    {
      id: 5,
      title: "IT Infrastructure Assessment Tool",
      description: "Interactive tool for assessing current IT infrastructure maturity.",
      type: "tool",
      category: "assessment",
      format: "XLSX",
      size: "5.7 MB",
      downloads: "756",
      icon: Server,
      color: "from-indigo-500 to-purple-500"
    },
    {
      id: 6,
      title: "Cybersecurity Incident Response Plan",
      description: "Ready-to-use incident response plan template for security teams.",
      type: "template",
      category: "security",
      format: "DOCX",
      size: "2.9 MB",
      downloads: "1,892",
      icon: Users,
      color: "from-cyan-500 to-blue-500"
    }
  ];

  const categories = [
    { id: 'all', name: 'All Content', count: caseStudies.length + insights.length + resources.length },
    { id: 'government', name: 'Government', count: caseStudies.filter(cs => cs.category === 'government').length },
    { id: 'healthcare', name: 'Healthcare', count: caseStudies.filter(cs => cs.category === 'healthcare').length },
    { id: 'education', name: 'Education', count: caseStudies.filter(cs => cs.category === 'education').length },
    { id: 'finance', name: 'Finance', count: caseStudies.filter(cs => cs.category === 'finance').length },
    { id: 'cybersecurity', name: 'Cybersecurity', count: insights.filter(i => i.category === 'cybersecurity').length },
    { id: 'cloud', name: 'Cloud', count: insights.filter(i => i.category === 'cloud').length + resources.filter(r => r.category === 'cloud').length }
  ];

  const filteredCaseStudies = caseStudies.filter(study => 
    (activeCategory === 'all' || study.category === activeCategory) &&
    study.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInsights = insights.filter(insight =>
    (activeCategory === 'all' || insight.category === activeCategory) &&
    insight.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredResources = resources.filter(resource =>
    (activeCategory === 'all' || resource.category === activeCategory) &&
    resource.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <section className="relative py-24 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)]" />
        <div className="relative z-10 container mx-auto px-6">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
              Case Studies & 
              <span className="block bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Resources
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Explore real-world results, expert insights, and practical resources from our work with government agencies, healthcare providers, and enterprise clients.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search case studies, insights, and resources..."
                className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 bg-white border-b border-gray-200 sticky top-0 z-40 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap gap-4 justify-center">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 ${
                  activeCategory === category.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
                <span className={`text-sm px-2 py-1 rounded-full ${
                  activeCategory === category.id
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {category.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Case Studies */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.div
            className="flex items-center justify-between mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                Featured <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">Case Studies</span>
              </h2>
              <p className="text-xl text-gray-600">Real-world results from our IT implementations</p>
            </div>
            <button className="hidden md:flex items-center gap-2 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-600 hover:text-white transition-all duration-300">
              View All Case Studies
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 mb-16">
            {filteredCaseStudies.filter(cs => cs.featured).map((study, index) => (
              <motion.div
                key={study.id}
                className="group bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-500"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10 }}
              >
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={study.image} 
                    alt={study.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold">
                      Case Study
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-xl font-bold mb-2">{study.title}</h3>
                    <div className="flex items-center gap-4 text-sm opacity-90">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {study.client}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {study.duration}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-gray-600 mb-4 leading-relaxed">{study.excerpt}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {study.results.slice(0, 2).map((result, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                        {result}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(study.date).toLocaleDateString()}
                      </span>
                      <span>{study.readTime}</span>
                    </div>
                    <button 
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      onClick={() => setSelectedCaseStudy(study)}
                    >
                      Read Case Study
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Insights & Blog */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Expert <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">Insights</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Stay informed with perspectives on technology, cybersecurity, and digital transformation
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredInsights.map((insight, index) => (
              <motion.article
                key={insight.id}
                className="group bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200 hover:shadow-xl transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    insight.type === 'article' ? 'bg-blue-100 text-blue-700' :
                    insight.type === 'guide' ? 'bg-green-100 text-green-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {insight.type}
                  </span>
                  <span className="flex items-center gap-1 text-gray-500 text-sm">
                    <Eye className="w-4 h-4" />
                    {insight.views}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {insight.title}
                </h3>

                <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-2">
                  {insight.excerpt}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {insight.author}
                  </span>
                  <span>{insight.readTime}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {insight.tags.slice(0, 2).map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Resources Section - Heading Removed */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredResources.map((resource, index) => (
              <motion.div
                key={resource.id}
                className="group bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-xl transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${resource.color} p-2 mb-4 text-white`}>
                  <resource.icon className="w-full h-full" />
                </div>

                <h3 className="font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {resource.title}
                </h3>

                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  {resource.description}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{resource.format} • {resource.size}</span>
                  <span className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    {resource.downloads}
                  </span>
                </div>

                <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" />
                  Download Resource
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to See What We Can Do?
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
              Let's discuss how our expertise can help solve your technology challenges.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <motion.button
                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors flex items-center gap-3"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Schedule Consultation
                <Calendar className="w-5 h-5" />
              </motion.button>
              <motion.button
                className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all duration-300 flex items-center gap-3"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Contact Sales
                <Users className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Case Study Detail Modal */}
      {selectedCaseStudy && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setSelectedCaseStudy(null)}
        >
          <motion.div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative h-80">
              <img 
                src={selectedCaseStudy.image} 
                alt={selectedCaseStudy.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button 
                className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                onClick={() => setSelectedCaseStudy(null)}
              >
                <X className="w-6 h-6" />
              </button>
              <div className="absolute bottom-6 left-6 text-white">
                <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold mb-2 inline-block">
                  Case Study
                </span>
                <h2 className="text-3xl font-bold mb-2">{selectedCaseStudy.title}</h2>
                <div className="flex items-center gap-4 text-sm opacity-90">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {selectedCaseStudy.client}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {selectedCaseStudy.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(selectedCaseStudy.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              {/* Challenge & Solution */}
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-4">
                    <Target className="w-5 h-5 text-red-500" />
                    The Challenge
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {selectedCaseStudy.challenge}
                  </p>
                </div>
                <div>
                  <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-4">
                    <Zap className="w-5 h-5 text-blue-500" />
                    Our Solution
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {selectedCaseStudy.solution}
                  </p>
                </div>
              </div>

              {/* Results */}
              <div className="mb-8">
                <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-4">
                  <Award className="w-5 h-5 text-green-500" />
                  Measurable Results
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedCaseStudy.results.map((result, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-gray-700">{result}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technologies */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Technologies Used</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCaseStudy.technologies.map((tech, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="border-t pt-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Ready to Achieve Similar Results?</h3>
                  <p className="text-gray-600 mb-6">Let's discuss how we can help transform your organization.</p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                      Schedule Consultation
                    </button>
                    <button className="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-600 hover:text-white transition-all duration-300">
                      Download Case Study PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}