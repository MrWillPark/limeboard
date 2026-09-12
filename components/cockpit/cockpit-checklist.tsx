import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import {
  dismissChecklist,
  loadChecklistState,
  markChecklistStep,
  type ChecklistState,
  type ChecklistStepId,
} from '@/lib/onboarding/cockpit-checklist';

type Props = {
  isConnected: boolean;
  hasRunway: boolean;
};

const STEPS: {
  id: ChecklistStepId;
  label: string;
  doneLabel: string;
  action?: () => void;
}[] = [
  {
    id: 'connect',
    label: 'Connect OpenRouter key',
    doneLabel: 'Key connected',
    action: () => router.push('/connect'),
  },
  {
    id: 'runway',
    label: 'See burn + runway',
    doneLabel: 'Burn + runway unlocked',
  },
  {
    id: 'desk',
    label: 'Open Desk Monitor',
    doneLabel: 'Desk Monitor opened',
    action: () => router.push('/desk'),
  },
];

export function CockpitChecklist({ isConnected, hasRunway }: Props) {
  const [state, setState] = useState<ChecklistState | null>(null);

  useEffect(() => {
    void loadChecklistState().then(setState);
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    void markChecklistStep('connect').then(setState);
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected || !hasRunway) return;
    void markChecklistStep('runway').then(setState);
  }, [isConnected, hasRunway]);

  const onDismiss = useCallback(() => {
    void dismissChecklist().then(setState);
  }, []);

  const onStepPress = useCallback(async (step: ChecklistStepId) => {
    if (step === 'desk') {
      const next = await markChecklistStep('desk');
      setState(next);
      router.push('/desk');
      return;
    }
    const def = STEPS.find((s) => s.id === step);
    def?.action?.();
  }, []);

  if (!state || state.dismissed) return null;

  const allDone = STEPS.every((s) => state.completed[s.id]);
  if (allDone) return null;

  return (
    <Panel accent style={{ gap: spacing.md }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <AppText variant="label" color={colors.limeSoft}>
          Get your cockpit live
        </AppText>
        <Pressable onPress={onDismiss} hitSlop={8}>
          <AppText variant="caption" color={colors.textMuted}>
            Dismiss
          </AppText>
        </Pressable>
      </View>
      <AppText variant="caption" color={colors.textSecondary}>
        Connect a key, see burn + runway for free, then put it on a second screen.
      </AppText>
      <View style={{ gap: spacing.sm }}>
        {STEPS.map((step, index) => {
          const done = Boolean(state.completed[step.id]);
          const actionable = !done && (step.id !== 'runway' || isConnected);
          return (
            <Pressable
              key={step.id}
              disabled={!actionable}
              onPress={() => void onStepPress(step.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: spacing.sm,
                opacity: done ? 0.7 : 1,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: done ? colors.limeSoft : colors.borderStrong,
                  backgroundColor: done ? colors.limeDim : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText variant="caption" color={done ? colors.limeSoft : colors.textMuted}>
                  {done ? 'OK' : String(index + 1)}
                </AppText>
              </View>
              <AppText color={done ? colors.textSecondary : colors.text}>
                {done ? step.doneLabel : step.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </Panel>
  );
}
