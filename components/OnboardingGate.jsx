'use client';

import { useProfile } from '../app/providers';
import OnboardingModal from './OnboardingModal';

export default function OnboardingGate() {
  const { showOnboarding, setShowOnboarding, setUserProfile, userProfile } = useProfile();

  if (!showOnboarding) return null;

  return (
    <OnboardingModal
      initialProfile={userProfile}
      onSave={(profile) => {
        setUserProfile(profile);
        setShowOnboarding(false);
      }}
      onSkip={() => setShowOnboarding(false)}
    />
  );
}
