import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

interface CustomAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttonText: string;
  onButtonPress: () => void;
  onRequestClose?: () => void;
  colorScheme?: 'info' | 'error' | 'success';
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  visible,
  title,
  message,
  buttonText,
  onButtonPress,
  onRequestClose,
  colorScheme = 'info',
}) => {
  // Color schemes
  const colors = {
    info: {
      cardBg: '#fff',
      title: '#357ABD',
      buttonBg: '#4A90E2',
      buttonText: '#fff',
    },
    success: {
      cardBg: '#fff',
      title: '#16a34a',
      buttonBg: '#16a34a',
      buttonText: '#fff',
    },
    error: {
      cardBg: '#fff',
      title: '#D7263D',
      buttonBg: '#D7263D',
      buttonText: '#fff',
    },
  };
  const scheme = colors[colorScheme];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: scheme.cardBg }] }>
          <Text style={[styles.title, { color: scheme.title }]}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: scheme.buttonBg }]} onPress={onButtonPress}>
            <Text style={[styles.buttonText, { color: scheme.buttonText }]}>{buttonText}</Text>
          </TouchableOpacity>
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
  },
  card: {
    width: SCREEN_WIDTH * 0.8,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#357ABD',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#222',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomAlertModal;
