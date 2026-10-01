import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Image, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

type Props = {
  visible: boolean;
  title?: string;
  subtitle?: string;
};

const { width, height } = Dimensions.get('window');

const LoadingOverlay: React.FC<Props> = ({ visible, title = 'Loading', subtitle = 'Please wait…' }) => {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => {
      spinAnim.stopAnimation();
      loop.stop();
      spinAnim.setValue(0);
    };
  }, [visible, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.cardShadow} />
        <View style={styles.card}>
          <View style={styles.spinnerWrapper}>
            <LinearGradient colors={["#6bd1c5", "#356dc1"]} style={styles.spinnerBg}>
              <Animated.View style={[styles.logoWrapper, { transform: [{ rotate: spin }] }]}>
                <Image source={require('../assets/img/elaba_icon.png')} style={styles.logo} />
              </Animated.View>
            </LinearGradient>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cardShadow: {
    position: 'absolute',
    width: Math.min(width * 0.78, 340),
    height: 210,
    borderRadius: 24,
    backgroundColor: '#000',
    opacity: 0.08,
    transform: [{ translateY: 6 }],
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
  },
  card: {
    width: Math.min(width * 0.78, 340),
    minHeight: 210,
    backgroundColor: '#fff',
    borderRadius: 24,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 18,
  },
  spinnerWrapper: {
    marginTop: 4,
    marginBottom: 16,
  },
  spinnerBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  logo: {
    width: 42,
    height: 42,
    resizeMode: 'contain',
  },
  title: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
  },
});

export default LoadingOverlay;
