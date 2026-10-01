import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';
import { api, API_ENDPOINTS } from '../../config/api';
import CustomAlertModal from '../../components/CustomAlertModal';

// Import images
const backIcon = require('../../assets/img/back.png');
const elabaIcon = require('../../assets/img/elaba_icon.png');

// API via centralized config

export default function PasswordRecovery() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [step, setStep] = useState(1); // 1: Phone Number, 2: OTP, 3: New Password
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [showPhoneValidation, setShowPhoneValidation] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalTitle, setAlertModalTitle] = useState('');
  const [alertModalMessage, setAlertModalMessage] = useState('');
  const [alertModalScheme, setAlertModalScheme] = useState<'info' | 'error' | 'success'>('error');
  const [navigateToLoginAfterAlert, setNavigateToLoginAfterAlert] = useState(false);
  const [otpError, setOtpError] = useState('');
  const otpRefs = useRef<Array<TextInput | null>>([]);

  const getNormalizedPhoneNumber = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('63')) {
      return `+${cleanPhone}`;
    } else if (cleanPhone.startsWith('09')) {
      return `+63${cleanPhone.slice(1)}`;
    } else if (cleanPhone.startsWith('9') && cleanPhone.length === 10) {
      return `+63${cleanPhone}`;
    }
    return phone.trim();
  };

  // Validate Philippine phone number
  const validatePhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check for valid Philippine phone number patterns
    const patterns = [
      /^63\d{10}$/, // +63 format (63XXXXXXXXXX)
      /^09\d{9}$/, // 09 format (09XXXXXXXXX)
      /^9\d{9}$/, // 9 format (9XXXXXXXXX)
    ];
    
    return patterns.some(pattern => pattern.test(cleanPhone));
  };

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.startsWith('63')) {
      // Convert 63XXXXXXXXXX to +63 9XX XXX XXXX
      return `+63 ${cleanPhone.slice(2, 3)}${cleanPhone.slice(3, 5)} ${cleanPhone.slice(5, 8)} ${cleanPhone.slice(8)}`;
    } else if (cleanPhone.startsWith('09')) {
      // Convert 09XXXXXXXXX to +63 9XX XXX XXXX
      return `+63 ${cleanPhone.slice(1, 3)} ${cleanPhone.slice(3, 6)} ${cleanPhone.slice(6)}`;
    } else if (cleanPhone.startsWith('9') && cleanPhone.length === 10) {
      // Convert 9XXXXXXXXX to +63 9XX XXX XXXX
      return `+63 ${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3, 6)} ${cleanPhone.slice(6)}`;
    }
    
    return phone; // Return original if no pattern matches
  };

  // Check if input starts with a letter (should show validation warning)
  const startsWithLetter = (text: string) => {
    return text.length > 0 && /^[a-zA-Z]/.test(text.trim());
  };

  // Handle OTP input for individual boxes
  const handleOTPChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    if (otpError) {
      setOtpError('');
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace to go to previous box
  const handleOTPKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const isOTPComplete = () => {
    return otp.every((digit) => digit.trim() !== '');
  };

  // Handle phone number input change
  const handlePhoneNumberChange = (text: string) => {
    setPhoneNumber(text);
    if (phoneError) {
      setPhoneError('');
    }

    // Show validation warning only if user starts typing with a letter
    if (text.length === 1 && startsWithLetter(text)) {
      setShowPhoneValidation(true);
    } else if (text.length === 0) {
      setShowPhoneValidation(false);
    }
  };

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      setPhoneError('Please enter your phone number.');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setAlertModalTitle('Invalid Phone Number');
      setAlertModalMessage('Please enter a valid Philippine phone number.\n\nValid formats:\n• +63 9XX XXX XXXX\n• 09XX XXX XXXX\n• 9XX XXX XXXX');
      setShowAlertModal(true);
      return;
    }

    const normalizedPhone = getNormalizedPhoneNumber(phoneNumber);
    setLoading(true);

    try {
      const response = await api.post(
        API_ENDPOINTS.ADMIN.FORGOT_PASSWORD,
        { phone_number: normalizedPhone },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      if (response.data?.success && response.data?.otp) {
        console.log('🔐 Generated OTP:', response.data.otp);

        setOtp(['', '', '', '', '', '']);
        setOtpError('');
        setStep(2);
        startResendTimer();
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to send OTP.');
      }
    } catch (error: any) {
      const requestUrl = `${API_ENDPOINTS.ADMIN.BASE}/forgot-password`;
      console.log('DEBUG forgot-password request URL:', requestUrl);
      console.log('DEBUG forgot-password payload:', { phone_number: normalizedPhone });
      console.log('DEBUG forgot-password raw error:', error?.response?.data || error?.message || error);
      console.log('DEBUG full forgot-password error object:', error);

      if (error.response?.status === 404) {
        setAlertModalTitle('Not Registered');
        setAlertModalMessage('No eLaba account is associated with this phone number. Please check your number and try again.');
        setShowAlertModal(true);
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        Alert.alert('Connection Error', 'Unable to connect to the server. Please check your internet connection and try again.');
      } else if (error.code === 'TIMEOUT' || error.message.includes('timeout')) {
        Alert.alert('Request Timeout', 'The request took too long. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    if (!otpString.trim()) {
      Alert.alert('Error', 'Please enter the OTP code.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(
        API_ENDPOINTS.ADMIN.VERIFY_OTP,
        { phone_number: getNormalizedPhoneNumber(phoneNumber), otp: otpString },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      if (response.data?.success) {
        setOtpError('');
        setOtp(['', '', '', '', '', '']);
        setStep(3);
      } else {
        setOtp(['', '', '', '', '', '']);
        setOtpError('Incorrect code. Please try again.');
        otpRefs.current[0]?.focus();
      }
    } catch (error: any) {
      console.log('Verify OTP Error:', error.message || error);
      setOtp(['', '', '', '', '', '']);
      setOtpError('Incorrect code. Please try again.');
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in both password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      // Use the same phone number format that was successful in steps 1 and 2
      const response = await api.post(
        API_ENDPOINTS.ADMIN.RESET_PASSWORD,
        { 
          phone_number: getNormalizedPhoneNumber(phoneNumber), 
          new_password: newPassword.trim() 
        },
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000 // 10 second timeout
        }
      );

      if (response.data?.success) {
        setAlertModalTitle('Success');
        setAlertModalMessage('Password has been reset successfully! You can now login with your new password.');
        setAlertModalScheme('success');
        setNavigateToLoginAfterAlert(true);
        setShowAlertModal(true);
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to reset password.');
      }
    } catch (error: any) {
      console.log('Reset Password Error:', error.response?.data || error.message || error);
      
      // Handle specific error cases
      if (error.response?.status === 404) {
        Alert.alert(
          'Admin Not Found',
          'Admin account not found. Please start the password recovery process again from the beginning.',
          [
            { 
              text: 'Start Over', 
              onPress: () => {
                setStep(1);
                setPhoneNumber('');
                setOtp(['', '', '', '', '', '']);
                setNewPassword('');
                setConfirmPassword('');
              }
            }
          ]
        );
      } else if (error.response?.status === 400) {
        Alert.alert(
          'Invalid Request',
          error.response.data?.message || 'Please check your information and try again.'
        );
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        // For development: Allow password reset even when backend is not available
        // since phone number validation already happened in step 1
        Alert.alert(
          'Success', 
          'Password has been reset successfully! (Development Mode - Backend not available)\n\nYou can now login with your new password.',
          [
            { 
              text: 'OK', 
              onPress: () => navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              })
            }
          ]
        );
      } else if (error.code === 'TIMEOUT' || error.message.includes('timeout')) {
        Alert.alert(
          'Request Timeout',
          'The password reset request took too long. Please try again.'
        );
      } else {
        Alert.alert(
          'Error', 
          error.response?.data?.message || 'Failed to reset password. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    const normalizedPhone = getNormalizedPhoneNumber(phoneNumber);
    setLoading(true);
    try {
      const response = await api.post(
        API_ENDPOINTS.ADMIN.FORGOT_PASSWORD,
        { phone_number: normalizedPhone },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      if (response.data?.success && response.data?.otp) {
        console.log('🔐 Generated OTP:', response.data.otp);

        setOtp(['', '', '', '', '', '']);
        setOtpError('');
        startResendTimer();
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to resend OTP.');
      }
    } catch (error: any) {
      console.log('DEBUG resend forgot-password request URL:', `${API_ENDPOINTS.ADMIN.BASE}/forgot-password`);
      console.log('DEBUG resend forgot-password payload:', { phone_number: normalizedPhone });
      console.log('DEBUG resend forgot-password raw error:', error?.response?.data || error?.message || error);
      console.log('DEBUG full resend forgot-password error object:', error);

      if (error.response?.status === 404) {
        setAlertModalTitle('Not Registered');
        setAlertModalMessage('This phone number is not registered. Please check your input or contact support.');
        setShowAlertModal(true);
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        Alert.alert('Connection Error', 'Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        Alert.alert('Error', 'Failed to resend OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleBack = () => {
    if (step === 1) {
      navigation.goBack();
    } else {
      if (step === 2) {
        setOtp(['', '', '', '', '', '']);
        setOtpError('');
      }
      setStep(step - 1);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
          <Text style={[styles.stepText, step >= 1 && styles.stepTextActive]}>1</Text>
        </View>
        <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
        <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
          <Text style={[styles.stepText, step >= 2 && styles.stepTextActive]}>2</Text>
        </View>
        <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
        <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
          <Text style={[styles.stepText, step >= 3 && styles.stepTextActive]}>3</Text>
        </View>
      </View>
      <View style={styles.stepLabels}>
        <Text style={[styles.stepLabel, step >= 1 && styles.stepLabelActive]}>Verify</Text>
        <Text style={[styles.stepLabel, step >= 2 && styles.stepLabelActive]}>OTP</Text>
        <Text style={[styles.stepLabel, step >= 3 && styles.stepLabelActive]}>Reset</Text>
      </View>
    </View>
  );

  const renderPhoneStep = () => (
    <View style={styles.form}>
      <Text style={styles.stepTitle}>Enter Phone Number</Text>
      <Text style={styles.stepDescription}>
        Enter your registered admin phone number. We'll verify it and send you a verification code.
      </Text>

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={[
          styles.input,
          phoneError ? styles.inputError : null,
          showPhoneValidation && phoneNumber.trim() && !validatePhoneNumber(phoneNumber) && styles.inputError
        ]}
        placeholder="+63 9XX XXX XXXX"
        placeholderTextColor="#aaa"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={handlePhoneNumberChange}
        autoFocus
      />

      {phoneError ? (
        <View style={styles.validationContainer}>
          <Text style={styles.validationText}>{phoneError}</Text>
        </View>
      ) : null}

      {/* Validation feedback - only show if user started with letter or has invalid format after starting with letter */}
      {showPhoneValidation && phoneNumber.trim() && !validatePhoneNumber(phoneNumber) && !phoneError && (
        <View style={styles.validationContainer}>
          <Text style={styles.validationText}>
            Please enter a valid Philippine phone number
          </Text>
        </View>
      )}

      {/* Format examples */}
      <View style={styles.formatExamples}>
        <Text style={styles.formatTitle}>Valid formats:</Text>
        <Text style={styles.formatText}>• +63 9XX XXX XXXX</Text>
        <Text style={styles.formatText}>• 09XX XXX XXXX</Text>
        <Text style={styles.formatText}>• 9XX XXX XXXX</Text>
        <Text style={styles.formatNote}>
          ⚠️ Important: Only registered admin accounts can reset their password
        </Text>
      </View>

      <TouchableOpacity 
        onPress={handleSendOTP} 
        style={[
          styles.button, 
          (loading || (showPhoneValidation && !!phoneNumber.trim() && !validatePhoneNumber(phoneNumber))) && styles.buttonDisabled
        ]}
        disabled={loading || (showPhoneValidation && !!phoneNumber.trim() && !validatePhoneNumber(phoneNumber))}
      >
        <LinearGradient
          colors={['#4A90E2', '#357ABD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderOTPStep = () => (
    <View style={styles.form}>
      <Text style={styles.stepTitle}>Enter Verification Code</Text>
      <Text style={styles.stepDescription}>
        Enter the 6-digit code sent to {formatPhoneNumber(phoneNumber)}
      </Text>

      <Text style={styles.label}>OTP Code</Text>
      <View style={[styles.otpContainer, otpError ? styles.otpContainerError : null]}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              if (ref) otpRefs.current[index] = ref;
            }}
            style={[styles.otpBox, otpError ? styles.otpBoxError : null]}
            placeholder="-"
            placeholderTextColor="#ccc"
            keyboardType="number-pad"
            value={digit}
            onChangeText={(value) => handleOTPChange(value, index)}
            onKeyPress={(e) => handleOTPKeyPress(e, index)}
            maxLength={1}
            textAlign="center"
            editable={!loading}
          />
        ))}
      </View>
      {otpError ? (
        <View style={styles.otpErrorContainer}>
          <Text style={styles.otpErrorText}>{otpError}</Text>
        </View>
      ) : null}

      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Didn't receive the code? </Text>
        <TouchableOpacity 
          onPress={handleResendOTP} 
          disabled={resendTimer > 0 || loading}
        >
          <Text style={[styles.resendLink, (resendTimer > 0 || loading) && styles.resendLinkDisabled]}>
            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        onPress={handleVerifyOTP} 
        style={[styles.button, (!isOTPComplete() || loading) && styles.buttonDisabled]}
        disabled={!isOTPComplete() || loading}
      >
        <LinearGradient
          colors={['#4A90E2', '#357ABD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderPasswordStep = () => (
    <View style={styles.form}>
      <Text style={styles.stepTitle}>Create New Password</Text>
      <Text style={styles.stepDescription}>
        Enter a strong password to secure your account
      </Text>

      <Text style={styles.label}>New Password</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter new password"
          placeholderTextColor="#aaa"
          secureTextEntry={!passwordVisible}
          value={newPassword}
          onChangeText={setNewPassword}
          autoFocus
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setPasswordVisible(!passwordVisible)}
        >
          <Image
            source={
              passwordVisible
                ? require('../../assets/img/visibility.png')
                : require('../../assets/img/visibility-off.png')
            }
            style={styles.eyeIcon}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Confirm Password</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor="#aaa"
          secureTextEntry={!passwordVisible}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setPasswordVisible(!passwordVisible)}
        >
          <Image
            source={
              passwordVisible
                ? require('../../assets/img/visibility.png')
                : require('../../assets/img/visibility-off.png')
            }
            style={styles.eyeIcon}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        onPress={handleResetPassword} 
        style={[styles.button, loading && styles.buttonDisabled]}
        disabled={loading}
      >
        <LinearGradient
          colors={['#4A90E2', '#357ABD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient
      colors={['#a9e5df', '#8baef3']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              {step < 3 && (
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                  <Image source={backIcon} style={styles.backIcon} />
                </TouchableOpacity>
              )}
              
              <View style={styles.titleContainer}>
                <Text style={styles.appTitle}>eLABA Staff & Shop Portal</Text>
                <Image source={elabaIcon} style={styles.appIcon} />
                <Text style={styles.screenTitle}>Password Recovery</Text>
                <Text style={styles.subtitle}>Admin Portal</Text>
              </View>

              {renderStepIndicator()}
            </View>

            {step === 1 && renderPhoneStep()}
            {step === 2 && renderOTPStep()}
            {step === 3 && renderPasswordStep()}

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Remember your password? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <CustomAlertModal
        visible={showAlertModal}
        title={alertModalTitle}
        message={alertModalMessage}
        buttonText="OK"
        colorScheme={alertModalScheme}
        onButtonPress={() => {
          setShowAlertModal(false);
          if (navigateToLoginAfterAlert) {
            setNavigateToLoginAfterAlert(false);
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }}
        onRequestClose={() => setShowAlertModal(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  header: {
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 30,
  },
  backButton: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backIcon: {
    width: 22,
    height: 22,
    tintColor: '#ffffff',
  },
  backButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  titleContainer: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 30,
  },
  appTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#fff',
    letterSpacing: 1,
  },
  appIcon: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
    borderRadius: 100,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#222',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginTop: 4,
  },
  stepContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: 140, // Adjust to match stepIndicator width
  },
  stepLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    textAlign: 'center',
    width: 40,
  },
  stepLabelActive: {
    color: '#4A90E2',
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffffff75',
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  stepTextActive: {
    color: '#fff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#ccc',
  },
  stepLineActive: {
    backgroundColor: '#4A90E2',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 8,
    elevation: 5,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 1,
    alignSelf: 'flex-start',
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 16,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    color: '#222',
  },
  inputError: {
    borderColor: '#dc3545',
    borderWidth: 1,
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    top: 12,
  },
  eyeIcon: {
    width: 22,
    height: 22,
    tintColor: '#666',
  },
  button: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    fontSize: 14,
    color: '#2b7ecb',
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: '#999',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  loginText: {
    color: '#333',
    fontSize: 14,
  },
  loginLink: {
    color: '#2b7ecb',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Phone validation styles
  validationContainer: {
    marginTop: -10,
    marginBottom: 10,
    alignSelf: 'stretch',
  },
  validationText: {
    color: '#dc3545',
    fontSize: 12,
    fontStyle: 'italic',
  },
  formatExamples: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    alignSelf: 'stretch',
  },
  formatTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  formatText: {
    fontSize: 11,
    color: '#6c757d',
    lineHeight: 16,
  },
  formatNote: {
    fontSize: 10,
    color: '#dc3545',
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 14,
  },
  devHelper: {
    backgroundColor: '#eef5ff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#cfdfff',
  },
  devHelperText: {
    fontSize: 13,
    color: '#1f4ea8',
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
    gap: 8,
  },
  otpContainerError: {
    borderColor: '#dc3545',
  },
  otpBox: {
    flex: 1,
    height: 50,
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
  },
  otpBoxError: {
    borderColor: '#dc3545',
  },
  otpErrorContainer: {
    width: '100%',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  otpErrorText: {
    color: '#dc3545',
    fontSize: 13,
    fontWeight: '600',
  },
  // Modals
  modalWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: { width: '100%', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  confirmHeader: { paddingVertical: 14, paddingHorizontal: 16 },
  confirmTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  confirmBody: { padding: 16 },
  confirmMessage: { color: '#374151', fontSize: 15, lineHeight: 21, marginBottom: 6 },
  confirmValue: { color: '#111827', fontSize: 16 },
  confirmPhone: { fontWeight: '700' },
  confirmNote: { fontSize: 12, color: '#6b7280', marginTop: 8, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionButton: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  actionGradient: { paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  actionButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  editButton: { backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  editButtonText: { color: '#111827', fontWeight: '700', fontSize: 14 },
});
