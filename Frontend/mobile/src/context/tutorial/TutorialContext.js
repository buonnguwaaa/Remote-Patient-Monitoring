import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { tutorialSteps } from './tutorialSteps';
import { tutorialScenario } from './tutorialScenario';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../hooks/useAuth';

const TutorialContext = createContext(null);

export function TutorialProvider({ children }) {
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  const [tutorialMode, setTutorialMode] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  
  // Index of current step in tutorialSteps array
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Registry of target layouts: { [targetName]: { x, y, width, height, routeName } }
  const [targets, setTargets] = useState({});

  const startTutorial = useCallback(() => {
    setActive(true);
    setTutorialMode(true);
    setCurrentStepIndex(0);
    setTargets({});
  }, []);

  const completeTutorial = useCallback(async () => {
    setActive(false);
    setTutorialMode(false);
    setTargets({});
    setShowCompletion(true);
    if (user?.id) {
      await AsyncStorage.setItem(`rpm_tutorial_version_${user.id}`, '1');
    }
  }, [user]);

  const skipTutorial = useCallback(async () => {
    setActive(false);
    setTutorialMode(false);
    setTargets({});
    if (user?.id) {
      await AsyncStorage.setItem(`rpm_tutorial_version_${user.id}`, '1');
    }
  }, [user]);

  const closeCompletion = useCallback(() => {
    setShowCompletion(false);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < tutorialSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      completeTutorial();
    }
  }, [currentStepIndex, completeTutorial]);

  const registerTarget = useCallback((name, layout) => {
    setTargets((prev) => ({
      ...prev,
      [name]: layout,
    }));
  }, []);

  const unregisterTarget = useCallback((name) => {
    setTargets((prev) => {
      const newTargets = { ...prev };
      delete newTargets[name];
      return newTargets;
    });
  }, []);

  const currentStep = tutorialSteps[currentStepIndex];
  const currentTargetLayout = currentStep ? targets[currentStep.target] : null;

  const value = useMemo(() => ({
    active,
    tutorialMode,
    showCompletion,
    currentStep,
    currentTargetLayout,
    targets,
    scenario: tutorialScenario,
    startTutorial,
    nextStep,
    skipTutorial,
    completeTutorial,
    closeCompletion,
    registerTarget,
    unregisterTarget,
  }), [
    active, tutorialMode, showCompletion, currentStep, currentTargetLayout, targets,
    startTutorial, nextStep, skipTutorial, completeTutorial, closeCompletion,
    registerTarget, unregisterTarget
  ]);

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
