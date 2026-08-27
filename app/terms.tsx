import { ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';

import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import { LEGAL } from '@/lib/config/legal';

export default function TermsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Terms of Use', presentation: 'modal' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 48 }}
      >
        <Panel style={{ gap: spacing.md }}>
          <AppText variant="title">Terms of Use</AppText>
          <AppText variant="caption">Last updated: March 26, 2026</AppText>
          <AppText>
            By using LimeBoard you agree to these terms. If you do not agree, do not use the
            app.
          </AppText>
          <Section title="Service">
            LimeBoard is an analytics client for OpenRouter usage. You must comply with
            OpenRouter’s terms when connecting an API key. LimeBoard does not provide model
            inference.
          </Section>
          <Section title="Accounts">
            You are responsible for activity under your LimeBoard account and for keeping
            your credentials secure.
          </Section>
          <Section title="Subscriptions">
            LimeBoard Pro is an auto-renewable subscription billed through Apple App Store or
            Google Play. Payment is charged to your store account at confirmation of purchase.
            Subscriptions renew unless cancelled at least 24 hours before the end of the
            current period. Manage or cancel in your store account settings. Any unused
            portion of a free trial is forfeited when you purchase a subscription.
          </Section>
          <Section title="Pricing">
            Prices are shown in the paywall and set by the stores for your region. We may
            change offerings prospectively; your current period is unaffected until renewal.
          </Section>
          <Section title="Acceptable use">
            Do not misuse the service, attempt unauthorized access, or violate applicable
            law.
          </Section>
          <Section title="Disclaimer">
            The app is provided “as is.” Analytics depend on OpenRouter APIs and may be
            incomplete or delayed. We are not liable for decisions made based on displayed
            metrics.
          </Section>
          <Section title="Contact">
            {LEGAL.supportEmail}
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
