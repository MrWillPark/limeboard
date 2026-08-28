import { ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';

import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import { LEGAL } from '@/lib/config/legal';

export default function PrivacyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Privacy Policy', presentation: 'modal' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 48 }}
      >
        <Panel style={{ gap: spacing.md }}>
          <AppText variant="title">Privacy Policy</AppText>
          <AppText variant="caption">Last updated: March 26, 2026</AppText>
          <AppText>
            LimeBoard (“we”) provides OpenRouter usage analytics. This policy explains what
            data we collect and how it is used.
          </AppText>
          <Section title="Account data">
            When you sign in we store your authentication identifiers (email, OAuth subject
            IDs) via Supabase Auth so we can maintain your session and subscription
            entitlement.
          </Section>
          <Section title="OpenRouter API keys">
            API keys you paste into LimeBoard are stored only on your device (Secure Store /
            keychain). They are sent directly to OpenRouter to fetch your usage data and are
            not uploaded to LimeBoard servers.
          </Section>
          <Section title="Platform rankings">
            LimeBoard caches public OpenRouter ecosystem rankings on our servers so signed-in
            users can browse platform-wide stats without connecting a personal key.
          </Section>
          <Section title="Purchases">
            Subscriptions are processed by Apple or Google. We use RevenueCat to verify
            entitlements. We do not receive or store your full payment card details.
          </Section>
          <Section title="Data we do not collect">
            We do not sell personal information. We do not use third-party advertising or
            cross-app tracking SDKs.
          </Section>
          <Section title="Deletion">
            You can delete your LimeBoard account in Settings → Delete account. This removes
            your auth user from our systems. Manage or cancel App Store subscriptions
            separately in your Apple ID settings.
          </Section>
          <Section title="Contact">
            Questions: {LEGAL.supportEmail}
          </Section>
        </Panel>
      </ScrollView>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 4 }}>
      <AppText variant="label" color={colors.limeSoft}>
        {title}
      </AppText>
      <AppText>{children}</AppText>
    </View>
  );
}
