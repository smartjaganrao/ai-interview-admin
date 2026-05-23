'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-800 bg-black/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600"></div>
            <span className="text-xl font-bold">AI Interview Helper</span>
          </div>

          <div className="hidden md:flex gap-8">
            <a href="#features" className="hover:text-blue-400 transition">Features</a>
            <a href="#pricing" className="hover:text-blue-400 transition">Pricing</a>
            <a href="#faq" className="hover:text-blue-400 transition">FAQ</a>
          </div>

          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-6 py-2 rounded-lg border border-gray-700 hover:border-gray-500 transition"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Master Your Interviews with{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                AI Coaching
              </span>
            </h1>

            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Practice coding, system design, and behavioral interviews with real-time AI feedback.
              Get insights, improve your skills, and land your dream job.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition font-semibold"
              >
                Start Free Trial
              </Link>
              <a
                href="#features"
                className="px-8 py-3 rounded-lg border border-gray-700 hover:border-gray-500 transition font-semibold"
              >
                Learn More
              </a>
            </div>

            <p className="text-sm text-gray-500 mt-6">
              No credit card required. Free plan includes basic features.
            </p>
          </div>

          {/* Hero Image */}
          <div className="mt-16 rounded-lg border border-gray-800 bg-gray-900 p-8 md:p-12">
            <div className="aspect-video bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4">🎯</div>
                <p className="text-gray-400">Dashboard Preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 border-t border-gray-800">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Powerful Features for Interview Success
          </h2>
          <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">
            Everything you need to prepare and practice for technical interviews
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '🎤',
                title: 'Voice Mode',
                description: 'Practice speaking while coding. Real-time transcription and AI feedback on communication.'
              },
              {
                icon: '🖥️',
                title: 'Screen Capture',
                description: 'Share your screen and get AI analysis of your coding approach and problem-solving.'
              },
              {
                icon: '📊',
                title: 'Real-time Analytics',
                description: 'Track your progress with detailed metrics on accuracy, speed, and communication.'
              },
              {
                icon: '🤖',
                title: 'AI-Powered Feedback',
                description: 'Get instant, detailed feedback on your solutions from advanced AI models.'
              },
              {
                icon: '📚',
                title: 'Interview Library',
                description: 'Access curated questions from top tech companies and prepare with confidence.'
              },
              {
                icon: '🚀',
                title: 'Progress Tracking',
                description: 'Monitor your improvement over time with comprehensive performance analytics.'
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-6 rounded-lg border border-gray-800 bg-gray-900/50 hover:border-gray-700 transition"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 border-t border-gray-800">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            How It Works
          </h2>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Sign Up', desc: 'Create your account in seconds' },
              { step: '2', title: 'Choose Mode', desc: 'Voice, Screen, or Text practice' },
              { step: '3', title: 'Practice', desc: 'Get real-time AI feedback' },
              { step: '4', title: 'Improve', desc: 'Track progress and master skills' },
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 border-t border-gray-800">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">
            Choose the plan that fits your interview preparation needs
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Free',
                price: '₹0',
                features: [
                  '10 AI answers/day',
                  '3 screenshots/day',
                  '20 min voice/day',
                  'Basic analytics',
                  'Community support',
                ],
                cta: 'Get Started',
              },
              {
                name: 'Pro',
                price: '₹499',
                period: '/month',
                features: [
                  'Unlimited AI answers',
                  'Unlimited screenshots',
                  'Unlimited voice',
                  'Advanced analytics',
                  'Priority support',
                  'Cloud history sync',
                ],
                cta: 'Start Free Trial',
                highlight: true,
              },
              {
                name: 'Power',
                price: '₹999',
                period: '/month',
                features: [
                  'Everything in Pro',
                  'Priority models (faster)',
                  'Team features',
                  'Custom questions',
                  'Dedicated support',
                  'API access',
                ],
                cta: 'Contact Sales',
              },
            ].map((plan, idx) => (
              <div
                key={idx}
                className={`p-8 rounded-lg border transition ${
                  plan.highlight
                    ? 'border-blue-600 bg-gradient-to-br from-blue-600/10 to-purple-600/10 ring-2 ring-blue-600/20'
                    : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                }`}
              >
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-gray-400">{plan.period}</span>}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-center gap-3 text-gray-300">
                      <span className="text-blue-400">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`w-full py-3 rounded-lg font-semibold transition text-center block ${
                    plan.highlight
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'border border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 border-t border-gray-800">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            {[
              {
                q: 'Do I need to know how to code?',
                a: 'No! Our platform is designed for all skill levels. We provide guidance and feedback to help you improve.',
              },
              {
                q: 'Can I use this for non-technical interviews?',
                a: 'While optimized for technical interviews, many users practice behavioral questions and communication skills.',
              },
              {
                q: 'Is my data secure?',
                a: 'Yes, we use enterprise-grade security with encrypted data transmission and GDPR compliance.',
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Absolutely. No lock-in contracts. Cancel your subscription anytime from account settings.',
              },
              {
                q: 'Do you offer team plans?',
                a: 'Yes! Power plan includes team features. Contact our sales team for custom pricing.',
              },
              {
                q: 'What companies use this?',
                a: 'Students and professionals preparing for interviews at Google, Microsoft, Amazon, Apple, Meta, and more.',
              },
            ].map((item, idx) => (
              <div key={idx} className="p-6 rounded-lg border border-gray-800 bg-gray-900/50">
                <h3 className="text-lg font-semibold mb-3">{item.q}</h3>
                <p className="text-gray-400">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-gray-800">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Master Your Interviews?
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Join thousands of candidates who have landed their dream jobs with AI Interview Helper.
          </p>

          <Link
            href="/login"
            className="inline-block px-10 py-4 rounded-lg bg-blue-600 hover:bg-blue-700 transition font-semibold text-lg"
          >
            Start Your Free Trial Today
          </Link>

          <p className="text-gray-500 text-sm mt-4">
            No credit card required. Free plan available forever.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-900/50 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-purple-600"></div>
                <span className="font-bold">AI Interview Helper</span>
              </div>
              <p className="text-gray-400 text-sm">
                Master interviews with AI-powered coaching and real-time feedback.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#faq" className="hover:text-white transition">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
            <p>&copy; 2026 AI Interview Helper. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
