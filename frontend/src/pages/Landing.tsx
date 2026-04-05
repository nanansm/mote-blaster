import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { Check } from 'lucide-react';

const features = [
  {
    title: 'Bulk WhatsApp Messaging',
    description: 'Send personalized messages to hundreds of contacts instantly',
  },
  {
    title: 'Template Personalization',
    description: 'Use variables like {{name}} to customize each message',
  },
  {
    title: 'Google Sheets Integration',
    description: 'Import contacts directly from Google Sheets',
  },
  {
    title: 'Real-time Analytics',
    description: 'Track sent, failed, and pending messages in real-time',
  },
  {
    title: 'Multiple WhatsApp Instances',
    description: 'Connect up to 5 WhatsApp accounts (Pro plan)',
  },
  {
    title: 'Rate Limiting Protection',
    description: 'Automatic 10-second delays prevent account bans',
  },
];

const pricingPlans = [
  {
    name: 'Free',
    price: 'Rp 0',
    period: '/month',
    features: [
      '50 messages/day',
      '1 WhatsApp instance',
      '2 active campaigns',
      'CSV upload only',
      'Basic support',
    ],
    cta: 'Get Started',
    ctaVariant: 'outline' as const,
  },
  {
    name: 'Pro',
    price: 'Rp 99,000',
    period: '/month',
    features: [
      'Unlimited messages',
      '5 WhatsApp instances',
      'Unlimited campaigns',
      'Google Sheets integration',
      'Priority support',
      'Advanced analytics',
    ],
    cta: 'Upgrade Now',
    ctaVariant: 'default' as const,
    popular: true,
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleSignUp = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      setLoading(true);
      login();
    }
  };

  const handleLogin = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      setLoading(true);
      login();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="py-20 px-4 text-center">
        <h1 className="text-5xl font-bold text-primary mb-6">
          Mote Blaster
        </h1>
        <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10">
          The most powerful WhatsApp blasting platform. Send bulk messages,
          personalize templates, and track performance — all in one place.
        </p>
        <div className="flex justify-center gap-4 flex-col sm:flex-row">
          <Button
            size="lg"
            onClick={handleSignUp}
            disabled={loading}
          >
            {loading ? 'Redirecting...' : 'Sign Up'}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Redirecting...' : 'Login'}
          </Button>
          {isAuthenticated && (
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </Button>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-background-sidebar/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card p-6">
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-text-secondary">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Pricing</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={cn(
                  'card p-8 relative',
                  plan.popular && 'border-primary'
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                    POPULAR
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-text-muted">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <Check className="h-5 w-5 text-primary mr-3" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.ctaVariant}
                  onClick={() => {
                    if (plan.name === 'Free') {
                      handleSignUp();
                    } else {
                      if (isAuthenticated) {
                        navigate('/dashboard/billing');
                      } else {
                        handleSignUp();
                      }
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? 'Please wait...' : plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-text-muted text-sm border-t border-border">
        <p>&copy; 2024 Mote Blaster. All rights reserved.</p>
      </footer>
    </div>
  );
}
