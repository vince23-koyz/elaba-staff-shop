import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Image, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

type Props = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  autoCloseMs?: number;
};

const { width } = Dimensions.get('window');

const SuccessOverlay: React.FC<Props> = ({ visible, title = 'Login successful!', subtitle = 'Welcome back', autoCloseMs }) => {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 60 }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible, scale, opacity]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient colors={["#6bd1c5", "#356dc1"]} style={styles.circleBg}>
            <Animated.View style={[styles.iconWrapper, { transform: [{ scale }], opacity }]}>
              <Image source={require('../assets/img/check.png')} style={styles.icon} />
            </Animated.View>
          </LinearGradient>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
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
  card: {
    width: Math.min(width * 0.78, 340),
    minHeight: 210,
    backgroundColor: '#fff',
    borderRadius: 24,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 18,
  },
  circleBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 36, height: 36, tintColor: '#18a36d', resizeMode: 'contain' },
  title: { marginTop: 12, fontSize: 18, fontWeight: '700', color: '#1e293b', textAlign: 'center' },
  subtitle: { marginTop: 4, fontSize: 14, color: '#475569', textAlign: 'center' },
});

export default SuccessOverlay;
