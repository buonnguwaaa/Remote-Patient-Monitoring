import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_VERSION = 1;

function getKey(userId) {
  return `rpm_tutorial_version_${userId}`;
}

export function useOnboardingStatus(userId) {
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    if (!userId) {
      setCheckingOnboarding(false);
      return;
    }

    AsyncStorage.getItem(getKey(userId))
      .then((value) => {
        const completedVersion = parseInt(value, 10);
        setHasCompletedOnboarding(completedVersion >= ONBOARDING_VERSION);
      })
      .catch(() => {
        setHasCompletedOnboarding(false);
      })
      .finally(() => {
        setCheckingOnboarding(false);
      });
  }, [userId]);

  const markOnboardingComplete = async () => {
    if (!userId) return;
    try {
      await AsyncStorage.setItem(getKey(userId), String(ONBOARDING_VERSION));
      setHasCompletedOnboarding(true);
    } catch (e) {
      // Ignore storage errors — user proceeds anyway
      setHasCompletedOnboarding(true);
    }
  };

  // Dev utility: reset onboarding state (only call in dev/testing)
  const resetOnboardingDev = async () => {
    if (!userId) return;
    try {
      await AsyncStorage.removeItem(getKey(userId));
      setHasCompletedOnboarding(false);
    } catch (e) {}
  };

  return { checkingOnboarding, hasCompletedOnboarding, markOnboardingComplete, resetOnboardingDev };
}
