import { View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ParentalGatePad } from '@/components/ParentalGatePad';
import { Screen } from '@/components/Screen';
import { useT } from '@/i18n';

export default function ParentalGate() {
  const t = useT();
  const { next } = useLocalSearchParams<{ next?: string }>();

  return (
    <Screen title={t('parental_gate_title')}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ParentalGatePad onSuccess={() => router.replace((next ?? '/home') as Href)} />
      </View>
    </Screen>
  );
}
