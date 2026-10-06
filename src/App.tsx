import { useState, useEffect } from 'react';
import { AppearanceMode, NavigationTab, AppStage, Person } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SplashScreen } from './components/screens/SplashScreen';
import { WelcomeScreen } from './components/screens/WelcomeScreen';
import { AuthScreen } from './components/screens/AuthScreen';
import { MainNavigation } from './components/navigation/MainNavigation';
import { ChatsView } from './components/views/ChatsView';
import { PeopleView } from './components/views/PeopleView';
import { YouView } from './components/views/YouView';
import { DesignSystemModal } from './components/modals/DesignSystemModal';
import { MobileShell } from './components/common/MobileShell';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { appearance, setAppearance } = useTheme();

  // App Stage state: 'splash' -> 'onboarding' -> 'auth' -> 'main'
  const [stage, setStage] = useState<AppStage>('splash');

  // Navigation tab state: 'chats' | 'people' | 'you'
  const [activeTab, setActiveTab] = useState<NavigationTab>('chats');

  // Design System Inspection Modal
  const [isDesignSystemOpen, setIsDesignSystemOpen] = useState(false);
  const [chatInitialPerson, setChatInitialPerson] = useState<Person | null>(null);

  // Auto-transition to 'main' if user is already authenticated with a saved session
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        setStage('main');
      } else {
        // If unauthenticated and currently trying to view main, redirect to auth
        setStage((current) => (current === 'main' ? 'auth' : current));
      }
    }
  }, [isAuthenticated, isLoading]);

  const handleStartChatWithPerson = (person: Person) => {
    setChatInitialPerson(person);
    setActiveTab('chats');
  };

  const handleStepInside = () => {
    if (isAuthenticated) {
      setStage('main');
    } else {
      setStage('auth');
    }
  };

  const handleEnterFromOnboarding = () => {
    if (isAuthenticated) {
      setStage('main');
    } else {
      setStage('auth');
    }
  };

  return (
    <MobileShell>
      <AnimatePresence mode="wait">
        {/* Step 1: Splash Screen */}
        {stage === 'splash' && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(4px)' }}
            transition={{ duration: 0.4 }}
            className="flex-1 flex flex-col"
          >
            <SplashScreen
              onComplete={handleStepInside}
              onViewPrinciples={() => setStage('onboarding')}
              onSkip={() => setStage(isAuthenticated ? 'main' : 'auth')}
            />
          </motion.div>
        )}

        {/* Step 2: Welcome / Onboarding Screen */}
        {stage === 'onboarding' && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="flex-1 flex flex-col"
          >
            <WelcomeScreen
              onEnter={handleEnterFromOnboarding}
              onBackToSplash={() => setStage('splash')}
            />
          </motion.div>
        )}

        {/* Step 3: Real Cryptographic Authentication (Register / Login) */}
        {stage === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            <AuthScreen
              onSuccess={() => setStage('main')}
              onBackToSplash={() => setStage('splash')}
            />
          </motion.div>
        )}

        {/* Step 4: Main App Shell with Navigation (Protected) */}
        {stage === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="flex-1 flex flex-col justify-between relative h-full w-full overflow-hidden"
          >
            <MainNavigation
              activeTab={activeTab}
              onChangeTab={setActiveTab}
              hasUnreadChats={false}
            >
              {/* Active View Container */}
              <main className="flex-1 min-h-0">
                <AnimatePresence mode="wait">
                  {activeTab === 'chats' && (
                    <motion.div
                      key="tab-chats"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChatsView
                        onOpenDesignSystem={() => setIsDesignSystemOpen(true)}
                        initialPerson={chatInitialPerson}
                        onClearInitialPerson={() => setChatInitialPerson(null)}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'people' && (
                    <motion.div
                      key="tab-people"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <PeopleView
                        onStartChatWithPerson={handleStartChatWithPerson}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'you' && (
                    <motion.div
                      key="tab-you"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <YouView
                        appearance={appearance}
                        onChangeAppearance={setAppearance}
                        onReplaySplash={() => setStage('splash')}
                        onReplayOnboarding={() => setStage('onboarding')}
                        onOpenDesignSystem={() => setIsDesignSystemOpen(true)}
                        onSignOut={() => setStage('auth')}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </main>
            </MainNavigation>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reusable Design System Showcase Modal */}
      <DesignSystemModal
        isOpen={isDesignSystemOpen}
        onClose={() => setIsDesignSystemOpen(false)}
      />
    </MobileShell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
