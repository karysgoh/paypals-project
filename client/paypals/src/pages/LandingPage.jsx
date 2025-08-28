import React from "react";
import { 
  Users, 
  Split,
  Receipt,
  Smartphone,
  CheckCircle,
  ArrowRight,
  DollarSign,
  Calculator,
  Globe
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";

const Button = ({ children, variant = "default", size = "default", className = "", ...props }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  };
  
  const sizes = {
    default: "h-10 px-6 py-2",
    sm: "h-8 px-3 text-xs",
    lg: "h-12 px-8 text-base"
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = "", ...props }) => (
  <div className={`bg-white border border-slate-200 rounded-lg ${className}`} {...props}>
    {children}
  </div>
);

const FeatureCard = ({ icon: Icon, title, description }) => (
  <Card className="p-6 hover:shadow-sm transition-shadow">
    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-slate-600" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
  </Card>
);

const StepCard = ({ number, title, description }) => (
  <div className="text-center">
    <div className="w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center mx-auto mb-4 text-lg font-semibold">
      {number}
    </div>
    <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600 text-sm">{description}</p>
  </div>
);

function LandingPage() {
  const { handleLogin, handleRegister, loading, currentUser } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-white">
      <section className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Split expenses with friends,
            <br />
            <span className="text-slate-600">the smart way</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            Keep track of shared expenses and settle up with friends easily. 
            No more awkward money conversations or forgotten IOUs.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button variant="primary" size="lg" onClick={() => useNavigate('/register')}>
              Start Splitting
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" size="lg">
              See How It Works
            </Button>
          </div>
          
          <div className="mt-16 relative">
            <Card className="p-8 max-w-2xl mx-auto shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Dinner with Friends</h3>
                <span className="text-2xl font-bold text-slate-900">$120.00</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded">
                  <span className="text-sm text-slate-700">Alex</span>
                  <span className="text-sm font-medium text-slate-900">$30.00</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded">
                  <span className="text-sm text-slate-700">Sarah</span>
                  <span className="text-sm font-medium text-slate-900">$30.00</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-green-50 border border-green-200 rounded">
                  <span className="text-sm text-green-700">You</span>
                  <span className="text-sm font-medium text-green-700">$60.00 (paid)</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Everything you need to split expenses
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Simple tools that make sharing costs with friends, roommates, and groups effortless.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Users}
              title="Create Circles"
              description="Organize expenses by groups - roommates, trip buddies, dinner crews. Keep everything separate and organized."
            />
            <FeatureCard
              icon={Receipt}
              title="Track Expenses"
              description="Add expenses instantly and split them fairly. Take photos of receipts and let everyone know what they owe."
            />
            <FeatureCard
              icon={Calculator}
              title="Smart Calculations"
              description="Automatic calculations handle complex splits. Equal shares, custom amounts, or percentage-based - we've got you covered."
            />
            <FeatureCard
              icon={Smartphone}
              title="Mobile Friendly"
              description="Split expenses on the go. Our web app works perfectly on any device, anytime, anywhere."
            />
            <FeatureCard
              icon={Globe}
              title="Multiple Currencies"
              description="Traveling abroad? No problem. Handle multiple currencies and convert amounts automatically."
            />
            <FeatureCard
              icon={CheckCircle}
              title="Settlement Tracking"
              description="See who owes what at a glance. Mark payments as complete when friends pay you back."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              How PayPals works
            </h2>
            <p className="text-lg text-slate-600">
              Get started in minutes. It's as simple as 1, 2, 3.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <StepCard
              number="1"
              title="Create a Circle"
              description="Start by creating a circle for your group - add friends via email or phone number."
            />
            <StepCard
              number="2"
              title="Add Expenses"
              description="Add any shared expense and choose how to split it. Take a photo of the receipt for reference."
            />
            <StepCard
              number="3"
              title="Settle Up"
              description="See the balance summary and settle up with friends. Mark payments complete when done."
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-slate-900 mb-2">50K+</div>
              <div className="text-slate-600">Expenses Split</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900 mb-2">10K+</div>
              <div className="text-slate-600">Happy Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900 mb-2">$2M+</div>
              <div className="text-slate-600">Money Organized</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Ready to split smarter?
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Join thousands of people who've simplified their shared expenses. 
            Start tracking and splitting costs with your friends today.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button variant="primary" size="lg" onClick={() => useNavigate('/register')}>
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" size="lg">
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-slate-900">PayPals</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-600">
              <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Support</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Contact</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
            © 2024 PayPals. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage; 