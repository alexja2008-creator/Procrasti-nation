import * as AppleAuthentication from 'expo-apple-authentication';
import { StyleSheet } from 'react-native';

import { useTokens } from '@/theme/tokens';

/** Apple's own button on iOS (required by the App Store guidelines): black by day, white at night. */
export function AppleButton({ onPress }: { onPress: () => void }) {
  const t = useTokens();
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={
        t.scheme === 'night'
          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      cornerRadius={t.radii.lg}
      style={styles.button}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({ button: { width: '100%', height: 50 } });
