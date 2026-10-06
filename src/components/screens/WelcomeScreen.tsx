import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ONBOARDING_STEPS } from '../../data/placeholder';
import {
  IconChevronLeft,
  IconChevronRight,
  IconCloseness,
  IconFeather,
  IconLock,
} from '../common/Icons';
import { AmongLogo } from '../common/AmongLogo';
import { Button } from '../ui/Button';

interface WelcomeScreenProps {
  onEnter: () => void;
  onBackToSplash: () => void;
}

export function WelcomeScreen({ onEnter, onBackToSplash }: WelcomeScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const stepIcons = [
    <IconCloseness key="closeness" className="w-6 h-6 text-zinc-800 dark:text-zinc-200" />,
    <IconFeather key="serenity" className="w-6 h-6 text-zinc-800 dark:text-zinc-200" />,
    <IconLock key="sovereignty" className="w-6 h-6 text-zinc-800 dark:text-zinc-200" />,
  ];

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onEnter();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      onBackToSplash();
    }
  };

  const activeStep = ONBOARDING_STEPS[currentStep];

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between px-6 py-10 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none transition-colors duration-300">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between z-10">
        <button
          type="button"
          onClick={handlePrev}
          className="p-2 -ml-2 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Previous step"
        >
          <IconChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <AmongLogo variant="compact" showWordmark={true} />
          <span className="text-[10px] tracking-widest uppercase text-zinc-400">· Principles</span>
        </div>

        <button
          type="button"
          onClick={onEnter}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
        >
          Skip
        </button>
      </div>

      {/* Main Step Content */}
      <div className="my-auto w-full max-w-sm mx-auto z-10 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col"
          >
            {/* Minimalist Icon Badge */}
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-6 shadow-xs">
              {stepIcons[currentStep]}
            </div>

            {/* Tag */}
            <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400 mb-2">
              {activeStep.tag}
            </span>

            {/* Title */}
            <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-950 dark:text-zinc-50 leading-tight mb-2 tracking-tight">
              {activeStep.title}
            </h2>

            {/* Subtitle */}
            <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-4">
              {activeStep.subtitle}
            </h3>

            {/* Description */}
            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {activeStep.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Footer & Navigation */}
      <div className="w-full max-w-sm mx-auto flex flex-col gap-6 z-10">
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2">
          {ONBOARDING_STEPS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStep(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentStep
                  ? 'w-8 bg-zinc-950 dark:bg-zinc-50'
                  : 'w-2 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400'
              }`}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="md"
            onClick={handlePrev}
            className="text-zinc-500"
          >
            {currentStep === 0 ? 'Splash' : 'Back'}
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleNext}
            className="flex-1"
            icon={<IconChevronRight className="w-4 h-4" />}
          >
            {currentStep === ONBOARDING_STEPS.length - 1 ? 'Enter AMONG' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
