import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export function InstructionBanner({ text }: { text: string }) {
  return (
    <View style={styles.banner}>
      <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    backgroundColor: Colors.mintSoft,
    borderRadius: Radius.medium,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.one,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: Colors.text,
    lineHeight: 18,
  },
});
