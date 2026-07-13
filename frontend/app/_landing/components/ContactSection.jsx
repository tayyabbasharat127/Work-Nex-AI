'use client';

import { Check } from 'lucide-react';

export default function ContactSection({ contactForm, setContactForm, contactSent, setContactSent, handleContactSubmit }) {
  return (
    <section id="contact" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Get in Touch</h2>
          <p className="text-muted-foreground text-sm sm:text-lg">Have questions about Enterprise pricing or custom integrations? We&rsquo;d love to hear from you.</p>
        </div>

        {contactSent ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Check size={32} className="text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Message Sent!</h3>
            <p className="text-muted-foreground text-sm">We&rsquo;ll get back to you within 24 hours.</p>
            <button onClick={() => { setContactSent(false); setContactForm({ name: '', email: '', org: '', message: '' }); }} className="text-primary text-sm hover:underline">Send another message</button>
          </div>
        ) : (
          <form onSubmit={handleContactSubmit} className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Your Name</label>
                <input
                  required
                  value={contactForm.name}
                  onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary outline-none transition text-sm"
                  placeholder="Ali Hassan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Work Email</label>
                <input
                  required
                  type="email"
                  value={contactForm.email}
                  onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary outline-none transition text-sm"
                  placeholder="ali@company.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Organization</label>
              <input
                value={contactForm.org}
                onChange={e => setContactForm(p => ({ ...p, org: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary outline-none transition text-sm"
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Message</label>
              <textarea
                required
                rows={4}
                value={contactForm.message}
                onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary outline-none transition text-sm resize-none"
                placeholder="Tell us about your team size and what you're looking for..."
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:opacity-90 transition text-sm shadow-lg shadow-primary/20"
            >
              Send Message
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
