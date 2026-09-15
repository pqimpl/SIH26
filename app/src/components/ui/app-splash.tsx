import { Image, StyleSheet, View } from 'react-native';

export function AppSplash() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/images/splash-brand.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A4145',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
