import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { 
  Users, 
  Receipt,
  Calculator,
  Smartphone,
  CheckCircle,
  Target,
  DollarSign,
  BarChart3
} from 'lucide-react';

// Small shared UI primitives to match LandingPage styling
const Button = ({ children, variant = 'default', size = 'default', className = '', ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50';
  const variants = {
    default: 'bg-slate-900 text-white hover:bg-slate-800',
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    ghost: 'text-white hover:bg-slate-100 hover:text-slate-900'
  };
  const sizes = {
    default: 'h-10 px-6 py-2',
    sm: 'h-8 px-3 text-xs',
    lg: 'h-12 px-8 text-base'
  };

  return (
    <button className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Card = ({ children, className = '', ...props }) => (
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

const Tooltip = ({ rect, title, description, onNext, onPrev, onClose, stepIndex, total, isLastStep }) => {
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!rect) return;

    const updatePosition = () => {
      const padding = 16;
      const tooltipWidth = 400;
      const tooltipHeight = 200; // Approximate
      
      let top = rect.bottom + window.scrollY + 12;
      let left = Math.max(padding, Math.min(rect.left + window.scrollX, window.innerWidth - tooltipWidth - padding));
      
      // Check if tooltip would go below viewport
      if (top + tooltipHeight > window.innerHeight + window.scrollY) {
        top = rect.top + window.scrollY - tooltipHeight - 12;
      }
      
      setTooltipPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [rect]);

  const style = rect
    ? {
        position: 'absolute',
        top: tooltipPosition.top,
        left: tooltipPosition.left,
        zIndex: 10050,
        maxWidth: 380,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10050,
        maxWidth: 500,
      };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-30 z-10040 transition-opacity duration-300"
        onClick={onClose}
      />
      
      <div 
        style={style} 
        className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200/50 backdrop-blur-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
      >
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 bg-slate-200 rounded-full h-2">
            <div 
              className="bg-slate-900 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((stepIndex + 1) / total) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            {stepIndex + 1} of {total}
          </span>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center text-lg font-semibold">
            {stepIndex + 1}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 mb-2 leading-tight">{title}</h3>
            <p className="text-slate-600 leading-relaxed text-sm">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClose}
          >
            Skip tour
          </Button>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onPrev} 
              disabled={stepIndex === 0}
            >
              ← Back
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              onClick={onNext}
            >
              {isLastStep ? '✨ Finish' : 'Next →'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className="fixed inset-0 bg-black bg-opacity-25 z-10040 flex items-center justify-center transition-opacity duration-300">
    <div className="bg-white rounded-lg p-6 shadow-xl animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-slate-600">{message}</span>
      </div>
    </div>
  </div>
);

export default function Tutorial() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [elementFound, setElementFound] = useState(false);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [error, setError] = useState(null);
  
  const retryTimeoutRef = useRef(null);
  const highlightedElementRef = useRef(null);
  const observerRef = useRef(null);
  const setupTimeoutRef = useRef(null);
  const isLoadingRef = useRef(false);
  const currentStepRef = useRef(null);

  const { currentUser, loading: authLoading } = useAuth();

  const guestSteps = [
    {
      id: 'welcome',
      route: '/tutorial',
      title: 'Welcome to PayPals!',
      description: 'This quick tour will show you around the main features. You can skip this tour at any time.',
      showAsTooltip: true
    },
    {
      id: 'home-cta',
      route: '/',
      selector: 'button[aria-label="start-splitting"]',
      title: 'Start Your Journey',
      description: 'Click here to register and create your first circle for splitting transactions with friends.',
      fallback: 'Navigate to the homepage to get started with creating circles.'
    },
    {
      id: 'complete',
      route: '/',
      title: 'You\'re All Set!',
      description: 'Sign up to start creating circles and splitting transactions with friends. The app will guide you through the process once you\'re registered!'
    }
  ];

  const authSteps = [
    {
      id: 'welcome',
      route: '/tutorial',
      title: 'Welcome back!',
      description: 'You are signed in — this quick tour will point out the main features available to you.',
      showAsTooltip: true
    },
    {
      id: 'circles-create',
      route: '/circles',
      selector: '[data-tour="create-circle"]',
      title: 'Create Your First Circle',
      description: 'Click here to create a new circle and start splitting transactions with friends or family.',
      fallback: 'This is where you can create new circles to manage shared transactions.'
    },
    {
      id: 'transaction-management',
      route: '/circles/sample',
      selector: '[data-tour="create-transaction"]',
      title: 'Add & Manage Transactions',
      description: 'Once in a circle, you can add transactions, split them among members, and track who owes what. Click here to add your first transaction.',
      fallback: 'This is where you manage transactions within a circle - add new transactions, view transaction history, and see individual balances.'
    },
    {
      id: 'dashboard-balance',
      route: '/dashboard',
      selector: '[data-tour="balance-card"]',
      title: 'Your Financial Overview',
      description: 'See at a glance what you owe and what others owe you across all your circles.',
      fallback: 'Your dashboard shows a complete overview of your shared transactions and balances.'
    },
    {
      id: 'complete',
      route: '/dashboard',
      title: 'You\'re All Set!',
      description: 'That\'s the basics! You can now create circles, add transactions, and split transactions with ease.'
    }
  ];

  const steps = useMemo(() => {
    return currentUser ? authSteps : guestSteps;
  }, [currentUser]);
  
  const currentStep = steps[stepIndex];
  const total = steps.length;
  const isLastStep = stepIndex === total - 1;

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    let shouldActivate = false;

    if (stepIndex > 0) {
      shouldActivate = true;
    } else if (location.pathname === '/tutorial') {
      shouldActivate = true;
    } else {
      shouldActivate = false;
    }

    setIsTutorialActive(shouldActivate);
  }, [stepIndex, location.pathname]);

  const startTutorial = useCallback(() => {
    const firstInteractive = steps.length > 1 ? 1 : 0;
    setIsTutorialActive(true);
    setStepIndex(firstInteractive);

    try {
      const route = steps[firstInteractive]?.route || '/';
      navigate(route, { replace: false });
    } catch (e) {

    }
  }, [navigate, steps]);

  const findElement = useCallback((selector, retries = 10) => {
    if (!currentStepRef.current || currentStepRef.current.selector !== selector) {
      return false; 
    }

    const element = document.querySelector(selector);
    
    if (element) {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      const elementRect = element.getBoundingClientRect();
      setRect(elementRect);
      setElementFound(true);
      setIsLoading(false);
      isLoadingRef.current = false;
      setError(null);

      if (highlightedElementRef.current && highlightedElementRef.current !== element) {
        highlightedElementRef.current.classList.remove('tour-highlight');
      }

      element.classList.add('tour-highlight');
      highlightedElementRef.current = element;

      if (elementRect.bottom > window.innerHeight || elementRect.top < 0) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
        
        setTimeout(() => {
          if (currentStepRef.current?.selector === selector) {
            const newRect = element.getBoundingClientRect();
            setRect(newRect);
          }
        }, 300);
      }

  return true;
    } else if (retries > 0) {
      retryTimeoutRef.current = setTimeout(() => {
        findElement(selector, retries - 1);
      }, 800);
      return false;
    } else {
      setElementFound(false);
      setRect(null);
      setIsLoading(false);
      isLoadingRef.current = false;
      return false;
    }
  }, [setRect, setElementFound, setIsLoading, setError]);

  useEffect(() => {
    if (!isTutorialActive) return;
    if (!currentStep || authLoading) return;

    setIsLoading(true);
    isLoadingRef.current = true;
    setElementFound(false);
    setRect(null);
    setError(null);

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (setupTimeoutRef.current) {
      clearTimeout(setupTimeoutRef.current);
      setupTimeoutRef.current = null;
    }

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (currentStep.route !== window.location.pathname) {
      navigate(currentStep.route, { replace: false });
    }

    if (!currentStep.selector && currentStep.route === window.location.pathname) {
      setElementFound(true);
      setRect(null);
      setIsLoading(false);
      isLoadingRef.current = false;
      return;
    }

    setupTimeoutRef.current = setTimeout(() => {
      if (currentStep.selector && currentStepRef.current === currentStep) {
        const found = findElement(currentStep.selector);

        if (!found) {
          setIsLoading(false);
          isLoadingRef.current = false;
        }

        const observer = new MutationObserver(() => {
          const el = document.querySelector(currentStep.selector);
          if (el) {
            findElement(currentStep.selector);
            observer.disconnect();
          }
        });

        observer.observe(document.body, { 
          childList: true, 
          subtree: true
        });
        
        observerRef.current = observer;
      } else {
        setElementFound(true);
        setRect(null);
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    }, 500);

    const hardFallback = setTimeout(() => {
      if (isLoadingRef.current) {
        setIsLoading(false);
        isLoadingRef.current = false;
        setElementFound(false);
        setRect(null);
      }
    }, 3000);

    return () => {
      clearTimeout(hardFallback);
      if (setupTimeoutRef.current) {
        clearTimeout(setupTimeoutRef.current);
        setupTimeoutRef.current = null;
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [stepIndex, currentStep, navigate, authLoading, isTutorialActive]);

  useEffect(() => {
    console.log('[tutorial] isLoading changed to:', isLoading, 'for step', currentStep?.id);
  }, [isLoading, currentStep?.id]);

  useEffect(() => {
    console.log('[tutorial] stepIndex changed to:', stepIndex, 'currentStep:', currentStep?.id);
  }, [stepIndex, currentStep?.id]);

  useEffect(() => {
    if (!isLoading && observerRef.current) {
      console.log('[tutorial] loading stopped - disconnecting observer');
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, [isLoading]);

  useEffect(() => {
    return () => {
      document.querySelectorAll('.tour-highlight').forEach((el) => {
        el.classList.remove('tour-highlight');
      });
      [retryTimeoutRef, setupTimeoutRef].forEach(ref => {
        if (ref.current) clearTimeout(ref.current);
      });
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const next = useCallback(() => {
    console.log('[tutorial] next() called, current stepIndex:', stepIndex, 'total:', total);
    
    if (highlightedElementRef.current) {
      highlightedElementRef.current.classList.remove('tour-highlight');
      highlightedElementRef.current = null;
    }
    
    if (stepIndex < total - 1) {
      console.log('[tutorial] moving to next step, new stepIndex:', stepIndex + 1);
      setStepIndex(prev => prev + 1);
    } else {
      console.log('[tutorial] tour completed, navigating based on auth state');
      setStepIndex(0);
      setIsTutorialActive(false);
      if (currentUser) {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    }
  }, [stepIndex, total, navigate, currentUser]);

  const prev = useCallback(() => {
    if (highlightedElementRef.current) {
      highlightedElementRef.current.classList.remove('tour-highlight');
      highlightedElementRef.current = null;
    }
    
    if (stepIndex > 0) {
      setStepIndex(prev => prev - 1);
    }
  }, [stepIndex]);

  const close = useCallback(() => {
    if (highlightedElementRef.current) {
      highlightedElementRef.current.classList.remove('tour-highlight');
      highlightedElementRef.current = null;
    }
    
    setIsTutorialActive(false);
    setStepIndex(0);
    if (currentUser) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  }, [navigate, currentUser]);

  if (!isTutorialActive) {
    return null;
  }

  if (authLoading || isLoading) {
    console.log('[tutorial] showing loading state for step', currentStep?.id, 'index', stepIndex, 'authLoading:', authLoading);
    return (
      <LoadingSpinner 
        message={authLoading ? 'Loading...' : 'Loading tour step...'}
      />
    );
  }

  return (
    <>
      {currentStep?.route === '/tutorial' && stepIndex === 0 && (
        <div className="min-h-screen bg-white">
          <section className="pt-12 pb-12 sm:pt-20 sm:pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
              <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-4 sm:mb-6 leading-tight">
                Welcome to PayPals
              </h1>
              <p className="text-base sm:text-xl text-slate-600 mb-6 sm:mb-8 leading-relaxed max-w-2xl mx-auto">
                Let's take a quick tour of the features that make splitting transactions simple and fair.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 sm:mb-16">
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={startTutorial}
                >
                  Start Tour
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={close}
                >
                  Skip to {currentUser ? 'Dashboard' : 'Home'}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-8">
                <FeatureCard
                  icon={Users}
                  title="Create Circles"
                  description="Set up groups for different transaction categories - roommates, trip buddies, or dinner crews."
                />
                <FeatureCard
                  icon={Receipt}
                  title="Split Transactions"
                  description="Add transactions and divide costs fairly. Take photos of receipts for reference."
                />
                <FeatureCard
                  icon={BarChart3}
                  title="Track Balances"
                  description="See who owes what at a glance. Keep track of all your shared transactions."
                />
              </div>

              {error && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-2xl mx-auto">
                  <div className="text-sm text-amber-700">
                    <strong>Notice:</strong> Some tutorial elements may not be available in this demo environment.
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {!isLoading && stepIndex > 0 && currentStep && (
        <Tooltip
          rect={rect}
          title={currentStep.title}
          description={
            currentStep.selector && !elementFound ? 
            (currentStep.fallback || currentStep.description) : 
            currentStep.description
          }
          onNext={next}
          onPrev={prev}
          onClose={close}
          stepIndex={stepIndex}
          total={total}
          isLastStep={isLastStep}
        />
      )}

      <style>{`
        .tour-highlight {
          box-shadow: 
            0 0 0 3px rgba(59, 130, 246, 0.4), 
            0 0 0 1px rgba(59, 130, 246, 0.8), 
            0 0 25px rgba(59, 130, 246, 0.25),
            0 10px 25px rgba(0, 0, 0, 0.1) !important;
          position: relative !important;
          z-index: 10049 !important;
          border-radius: 12px !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          transform: scale(1.02) translateZ(0) !important;
        }
        
        .tour-highlight::before {
          content: '';
          position: absolute;
          inset: -8px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.05));
          z-index: -1;
          animation: tour-pulse 2s infinite ease-in-out;
          pointer-events: none;
        }
        
        @keyframes tour-pulse {
          0%, 100% { 
            opacity: 0.6; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.3; 
            transform: scale(1.03); 
          }
        }

        .animate-in {
          animation-fill-mode: both;
        }

        .fade-in-0 {
          animation-name: fadeIn;
        }

        .slide-in-from-bottom-2 {
          animation-name: slideInFromBottom;
        }

        .slide-in-from-bottom-4 {
          animation-name: slideInFromBottomLarge;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInFromBottom {
          from { 
            opacity: 0;
            transform: translateY(8px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInFromBottomLarge {
          from { 
            opacity: 0;
            transform: translateY(16px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        .duration-300 {
          animation-duration: 300ms;
        }

        .duration-500 {
          animation-duration: 500ms;
        }
      `}</style>
    </>
  );
}