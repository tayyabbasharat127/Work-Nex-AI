'use client';

import { useState, useEffect } from 'react';

import { features, pricingPlans, stats } from './_landing/data';
import LandingNav from './_landing/components/LandingNav';
import HeroSection from './_landing/components/HeroSection';
import StatsStrip from './_landing/components/StatsStrip';
import FeaturesSection from './_landing/components/FeaturesSection';
import PricingSection from './_landing/components/PricingSection';
import ProblemSolutionSection from './_landing/components/ProblemSolutionSection';
import CTABanner from './_landing/components/CTABanner';
import ContactSection from './_landing/components/ContactSection';
import LandingFooter from './_landing/components/LandingFooter';
import DemoModal from './_landing/components/DemoModal';

const scrollTo = (id, closeMobileMenu) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.replaceState(null, '', window.location.pathname);
  if (closeMobileMenu) closeMobileMenu(false);
};

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', org: '', message: '' });
  const [contactSent, setContactSent] = useState(false);

  const nav = (id) => scrollTo(id, setMobileMenuOpen);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSent(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <LandingNav mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} nav={nav} />
      <HeroSection setDemoModalOpen={setDemoModalOpen} />
      <StatsStrip stats={stats} />
      <FeaturesSection features={features} />
      <PricingSection pricingPlans={pricingPlans} nav={nav} />
      <ProblemSolutionSection />
      <CTABanner nav={nav} />
      <ContactSection
        contactForm={contactForm}
        setContactForm={setContactForm}
        contactSent={contactSent}
        setContactSent={setContactSent}
        handleContactSubmit={handleContactSubmit}
      />
      <LandingFooter nav={nav} />
      <DemoModal open={demoModalOpen} onClose={() => setDemoModalOpen(false)} />
    </div>
  );
}
