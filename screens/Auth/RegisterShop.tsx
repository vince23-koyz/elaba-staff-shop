// screens/RegisterShop.tsx
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, 
  TouchableOpacity, ScrollView, Alert, Image, Modal, PermissionsAndroid, Platform
} from 'react-native';
import CustomAlertModal from '../../components/CustomAlertModal';
import { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import { launchCamera, launchImageLibrary, ImagePickerResponse, ImageLibraryOptions, CameraOptions } from 'react-native-image-picker';
import { pick, types } from '@react-native-documents/picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';
import { api, API_ENDPOINTS, API_CONFIG } from '../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useNotificationContext } from '../../context/NotificationContext';

const RegisterShopScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const { admin_id } = route.params;
  const { initializeForUser } = useNotificationContext();

  const [step, setStep] = useState<'details' | 'business' | 'review'>('details');
  const [shopName, setShopName] = useState('');
  const [ownerFullName, setOwnerFullName] = useState('');
  const [street, setStreet] = useState('');
  const [zone, setZone] = useState('');
  const [barangay, setBarangay] = useState('');
  const [city, setCity] = useState('');
  const [website, setWebsite] = useState('');
  const [openingTime, setOpeningTime] = useState<Date | null>(null);
  const [closingTime, setClosingTime] = useState<Date | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showDocumentPickerModal, setShowDocumentPickerModal] = useState(false);
  const [documentPickerKind, setDocumentPickerKind] = useState<'permit' | 'registration' | null>(null);
  const [validationMessage, setValidationMessage] = useState('');
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);
  const [showTimeErrors, setShowTimeErrors] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [businessPermit, setBusinessPermit] = useState<any>(null);
  const [businessRegistration, setBusinessRegistration] = useState<any>(null);
  const [includeSupportingDocument, setIncludeSupportingDocument] = useState(false);
  const [businessRegistrationType, setBusinessRegistrationType] = useState<'dti_registration' | 'sec_registration'>('dti_registration');
  const [submitting, setSubmitting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const openTimePicker = (picker: 'opening' | 'closing') => {
    const selectedTime = picker === 'opening' ? openingTime : closingTime;
    const defaultHour = picker === 'opening' ? 9 : 5;
    const defaultPeriodHour = picker === 'opening' ? defaultHour : defaultHour + 12;
    const pickerValue = selectedTime || new Date(2000, 0, 1, defaultPeriodHour, 0, 0, 0);

    DateTimePickerAndroid.open({
      value: pickerValue,
      mode: 'time',
      is24Hour: false,
      display: 'default',
      onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (event.type !== 'set' || !selectedDate) return;

        const normalizedTime = new Date(2000, 0, 1);
        normalizedTime.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);

        if (picker === 'opening') {
          setOpeningTime(normalizedTime);
        } else {
          setClosingTime(normalizedTime);
        }
      },
    });
  };

  const selectImage = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      includeBase64: true, // help with Android content:// URIs if needed
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets && response.assets[0]) {
        setSelectedImage(response.assets[0]);
      }
    });
  };

  const normalizeSelectedDocument = (document: any, fallbackKind: 'permit' | 'registration') => {
    const documentName = String(document?.name || document?.fileName || `verification-${fallbackKind}-${Date.now()}.jpg`);
    const documentType = String(document?.type || 'image/jpeg');
    const normalizedDocument = {
      ...document,
      name: documentName,
      type: documentType,
    };

    const lowerName = documentName.toLowerCase();
    const lowerType = documentType.toLowerCase();
    const allowedDocument = lowerType === 'application/pdf'
      || lowerType === 'image/jpeg'
      || lowerType === 'image/png'
      || /\.(pdf|jpe?g|png)$/.test(lowerName);

    if (!allowedDocument || /\.webp$/i.test(lowerName) || lowerType === 'image/webp') {
      setValidationMessage('Only PDF, JPG, and PNG verification documents are accepted.');
      setShowValidationModal(true);
      return null;
    }

    return normalizedDocument;
  };

  const openDocumentPicker = (documentKind: 'permit' | 'registration') => {
    setDocumentPickerKind(documentKind);
    setShowDocumentPickerModal(true);
  };

  const selectDocument = async (documentKind: 'permit' | 'registration', source: 'library' | 'camera' = 'library') => {
    try {
      if (source === 'camera') {
        if (Platform.OS === 'android') {
          const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
          if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Camera permission required', 'Allow camera access in your device settings to take a photo.');
            return;
          }
        }

        const options: CameraOptions = {
          mediaType: 'photo',
          quality: 0.8,
          maxWidth: 2000,
          maxHeight: 2000,
          includeBase64: false,
        };

        const response = await launchCamera(options);
        if (response.didCancel) return;
        if (response.errorCode || response.errorMessage) {
          Alert.alert('Unable to open camera', response.errorMessage || 'Please check your camera permission and try again.');
          return;
        }

        const asset = response.assets && response.assets[0];
        const normalizedDocument = normalizeSelectedDocument({
          ...asset,
          name: asset?.fileName || `${documentKind}-${Date.now()}.jpg`,
          type: asset?.type || 'image/jpeg',
          size: asset?.fileSize,
        }, documentKind);

        if (!normalizedDocument) return;

        if (documentKind === 'permit') {
          setBusinessPermit(normalizedDocument);
        } else {
          setBusinessRegistration(normalizedDocument);
        }
        return;
      }

      const [document] = await pick({
        type: [types.pdf, 'image/jpeg', 'image/png'],
        allowMultiSelection: false,
      });

      if (!document) return;
      const normalizedDocument = normalizeSelectedDocument(document, documentKind);
      if (!normalizedDocument) return;

      if (documentKind === 'permit') {
        setBusinessPermit(normalizedDocument);
      } else {
        setBusinessRegistration(normalizedDocument);
      }
    } catch (error: any) {
      if (error?.code !== 'OPERATION_CANCELED') {
        console.error('Document picker error:', error);
        setValidationMessage('Unable to select this document. Please try again.');
        setShowValidationModal(true);
      }
    }
  };

  const formatDisplayTime = (time: Date | null) => {
    if (!time) return 'Select time';
    const hour = time.getHours() % 12 || 12;
    const minutes = String(time.getMinutes()).padStart(2, '0');
    const period = time.getHours() >= 12 ? 'PM' : 'AM';
    return `${String(hour).padStart(2, '0')}:${minutes} ${period}`;
  };

  const getTimeInMinutes = (time: Date) => time.getHours() * 60 + time.getMinutes();
  const operatingHours = `${formatDisplayTime(openingTime)} - ${formatDisplayTime(closingTime)}`;

  const handleGoToDashboard = async () => {
    try {
      setFinalizing(true);
      // Step 1: Get admin data to fetch admin name
      const adminResponse = await api.get(API_ENDPOINTS.ADMIN.BY_ID(admin_id));
      const adminName = adminResponse.data?.first_name || 'Admin';

      // Step 2: Get shop by admin_id (same logic as login)
      const shopResponse = await api.get(API_ENDPOINTS.SHOP.BY_ADMIN(admin_id));
      const shop = shopResponse.data.shop;

      if (shop) {
        // Store complete user data
        const userData = {
          admin_id: admin_id,
          adminId: admin_id,
          shop_id: shop.shop_id,
          shopId: shop.shop_id,
          shop_name: shop.name,
          shop_address: shop.address
        };
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        console.log('✅ Complete user data saved:', userData);

        // Also store individual admin_id for backward compatibility
        await AsyncStorage.setItem('admin_id', String(admin_id));
        await AsyncStorage.setItem('adminId', String(admin_id));
        await AsyncStorage.setItem('adminName', adminName);
        await AsyncStorage.setItem('isLoggedIn', 'true');

        // Step 2: Get FCM token
        const fcmToken = await messaging().getToken();
        console.log('📲 FCM Token:', fcmToken);

        // Step 3: Save token to backend
        try {
          await api.post(API_ENDPOINTS.NOTIFICATIONS.UPDATE_DEVICE_TOKEN, {
            accountId: admin_id,
            accountType: 'admin',
            shopId: shop.shop_id,
            token: fcmToken,
          });
          console.log('✅ Device token saved to backend');
        } catch (tokenError: any) {
          console.error('❌ Failed to save token:', tokenError.response?.data || tokenError.message);
        }

        // Inform the owner about the current shop approval state.
        const normalizedShopStatus = String(shop.status || '').toLowerCase();
        if (normalizedShopStatus === 'rejected') {
          Alert.alert('Shop request rejected', 'Your shop request was rejected. Please check your notifications for more details.');
        }

        navigation.replace('Home');

        // Initialize notifications for the logged-in user
        initializeForUser();
        
        setShowSuccessModal(false);
      } else {
        Alert.alert('Error', 'No shop found for this admin. Please contact support.');
      }
    } catch (error: any) {
      console.log('Dashboard fetch error:', error.response?.data || error.message || error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setFinalizing(false);
    }
  };

  const handleNext = async () => {
    if (step === 'details') {
      const hasMissingDetails = !shopName.trim() || !ownerFullName.trim() || !street.trim() || !zone.trim() || !barangay.trim() || !city.trim();
      if (hasMissingDetails) {
        setShowRequiredErrors(true);
        setValidationMessage('Please complete all shop and address fields before continuing.');
        setShowValidationModal(true);
        return;
      }
      setShowRequiredErrors(false);
      setStep('business');
      return;
    }

    if (step === 'business') {
      if (!openingTime || !closingTime) {
        setShowTimeErrors(true);
        setValidationMessage('Please select both an opening time and a closing time before continuing.');
        setShowValidationModal(true);
        return;
      }

      setShowTimeErrors(false);

      if (getTimeInMinutes(closingTime) <= getTimeInMinutes(openingTime)) {
        setValidationMessage('Closing time must be later than opening time. Overnight schedules are not supported.');
        setShowValidationModal(true);
        return;
      }
      if (!businessPermit) {
        setValidationMessage('Please upload the Business/Mayor’s Permit before continuing.');
        setShowValidationModal(true);
        return;
      }
      setStep('review');
      return;
    }

    let createdShopId: string | number | null = null;

    try {
      setSubmitting(true);
  const formData = new FormData();
      formData.append('name', shopName.trim());
      formData.append('address', `${street.trim()}, ${zone.trim()}, ${barangay.trim()}, ${city.trim()}`);
      formData.append('website', (website || '').trim());
      formData.append('owner_name', ownerFullName.trim());
      formData.append('operation_hours', operatingHours);
      formData.append('admin_id', String(admin_id));

      // Add image if selected
      if (selectedImage?.uri) {
        formData.append('shopImage', {
          uri: selectedImage.uri,
          type: selectedImage.type || 'image/jpeg',
          name: selectedImage.fileName || `shop-image-${Date.now()}.jpg`,
        } as any);
      }

      // Prefer fetch for multipart in RN; do not set Content-Type manually
      const res = await fetch(`${API_CONFIG.BASE_URL}/shop`, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });

      let responseData: any = null;
      try {
        responseData = await res.json();
      } catch (parseErr) {
        console.log('Shop Register Parse Error:', parseErr);
      }

      if (!res.ok) {
        const msg = responseData?.error || responseData?.message || `Request failed (${res.status})`;
        Alert.alert('Error', msg);
        return;
      }

      // Success shape from backend: { success: true, shop_id, message, logo, status: 'pending' }
      if (responseData?.success || responseData?.shop_id) {
        const shopId = responseData.shop_id || responseData.data?.shop_id;
        if (shopId) {
          createdShopId = shopId;
          await AsyncStorage.setItem('shop_id', String(shopId));
          await AsyncStorage.setItem('showShopPendingApprovalModal', 'true');

          const documentsFormData = new FormData();
          documentsFormData.append('business_permit', {
            uri: businessPermit.uri,
            type: businessPermit.type || 'application/pdf',
            name: businessPermit.name || `business-permit-${Date.now()}`,
          } as any);
          if (includeSupportingDocument && businessRegistration) {
            documentsFormData.append(businessRegistrationType, {
              uri: businessRegistration.uri,
              type: businessRegistration.type || 'application/pdf',
              name: businessRegistration.name || `${businessRegistrationType}-${Date.now()}`,
            } as any);
          }

          const documentsResponse = await fetch(`${API_CONFIG.BASE_URL}/shop/${shopId}/documents`, {
            method: 'POST',
            body: documentsFormData,
            headers: { Accept: 'application/json' },
          });

          if (!documentsResponse.ok) {
            const documentsError = await documentsResponse.json().catch(() => null);
            throw new Error(
              documentsError?.message ||
              `Verification documents could not be uploaded (${documentsResponse.status}).`
            );
          }
        }
        setShowSuccessModal(true);
      } else {
        const msg = responseData?.message || responseData?.error || 'Failed to register shop';
        Alert.alert('Error', msg);
      }
    } catch (error: any) {
      console.log('Shop Register Error:', error?.response?.data || error?.message || String(error));
      const msg = error?.response?.data?.message
        || error?.response?.data?.error
        || error?.message
        || 'Failed to register shop';
      if (createdShopId) {
        try {
          await api.delete(`/shop/${createdShopId}`);
        } catch (cleanupError: any) {
          console.error('Failed to clean up incomplete shop registration:', cleanupError?.message || cleanupError);
        }
      }
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (submitting || finalizing) return;
    setStep(step === 'review' ? 'business' : 'details');
  };

  return (
    <LinearGradient colors={['#a9e5df', '#8baef3']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerText}>eLABA Staff Portal</Text>
          <View style={styles.titleContainer}>
            <Image source={require('../../assets/img/elaba_icon.png')} style={styles.icon} />
            <Text style={styles.title}>Register Your Shop</Text>
            <Text style={styles.subtitle}>Set up your laundry business profile</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.stepIndicator}>
            {(['details', 'business', 'review'] as const).map((stepName, index) => (
              <View
                key={stepName}
                style={[styles.stepLine, index <= ['details', 'business', 'review'].indexOf(step) && styles.stepLineActive]}
              />
            ))}
          </View>

          {step === 'details' && <>
          {/* Shop Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SHOP INFORMATION</Text>
            <View style={styles.inputGroup}>
              <TextInput 
                style={[styles.input, showRequiredErrors && !shopName.trim() && styles.inputError]} 
                placeholder="Shop Name" 
                value={shopName} 
                onChangeText={setShopName} 
                placeholderTextColor="#aaa" 
              />
              <TextInput 
                style={[styles.input, showRequiredErrors && !ownerFullName.trim() && styles.inputError]} 
                placeholder="Owner Full Name" 
                value={ownerFullName} 
                onChangeText={setOwnerFullName} 
                placeholderTextColor="#aaa" 
              />
            </View>
          </View>

          {/* Address Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ADDRESS</Text>
            <View style={styles.inputGroup}>
              <View style={styles.row}>
                <TextInput 
                  style={[styles.input, styles.halfInput, showRequiredErrors && !street.trim() && styles.inputError]} 
                  placeholder="Street" 
                  value={street} 
                  onChangeText={setStreet} 
                  placeholderTextColor="#aaa" 
                />
                <TextInput 
                  style={[styles.input, styles.halfInput, { marginLeft: 12 }, showRequiredErrors && !zone.trim() && styles.inputError]} 
                  placeholder="Zone#" 
                  value={zone} 
                  onChangeText={setZone} 
                  placeholderTextColor="#aaa" 
                />
              </View>
              <TextInput 
                style={[styles.input, showRequiredErrors && !barangay.trim() && styles.inputError]} 
                placeholder="Barangay" 
                value={barangay} 
                onChangeText={setBarangay} 
                placeholderTextColor="#aaa" 
              />
              <TextInput 
                style={[styles.input, showRequiredErrors && !city.trim() && styles.inputError]} 
                placeholder="City" 
                value={city} 
                onChangeText={setCity} 
                placeholderTextColor="#aaa" 
              />
            </View>
          </View>
          </>}

          {/* Business Details Section */}
          {step === 'business' && <>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BUSINESS DETAILS</Text>
            <View style={styles.inputGroup}>
              {/* Shop Logo/Banner Upload */}
              <Text style={styles.inputLabel}>Shop Logo/Banner (Optional)</Text>
              <TouchableOpacity style={styles.imageUploadButton} onPress={selectImage}>
                {selectedImage ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                    <Text style={styles.changeImageText}>Tap to change image</Text>
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setSelectedImage(null)}
                      accessibilityRole="button"
                      accessibilityLabel="Remove selected shop image"
                    >
                      <Text style={styles.removeImageButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Text style={styles.uploadIcon}>📷</Text>
                    <Text style={styles.uploadText}>Select Shop Image</Text>
                    <Text style={styles.uploadSubText}>JPG, PNG up to 5MB</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput 
                style={styles.input} 
                placeholder="Website / Facebook Page" 
                value={website} 
                onChangeText={setWebsite} 
                placeholderTextColor="#aaa" 
              />
              <Text style={styles.inputLabel}>Operating Hours</Text>
              <View style={styles.timePickerRow}>
                <View style={styles.timePickerField}>
                  <TouchableOpacity style={[styles.timePickerButton, showTimeErrors && !openingTime && styles.timePickerError]} onPress={() => openTimePicker('opening')}>
                    <Text style={[styles.timePickerValue, !openingTime && styles.timePickerPlaceholder]}>
                      {formatDisplayTime(openingTime)}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.timePickerLabel}>Opening Time</Text>
                </View>
                <Text style={styles.timeSeparator}>to</Text>
                <View style={styles.timePickerField}>
                  <TouchableOpacity style={[styles.timePickerButton, showTimeErrors && !closingTime && styles.timePickerError]} onPress={() => openTimePicker('closing')}>
                    <Text style={[styles.timePickerValue, !closingTime && styles.timePickerPlaceholder]}>
                      {formatDisplayTime(closingTime)}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.timePickerLabel}>Closing Time</Text>
                </View>
              </View>
              <View style={styles.documentDivider} />
              <Text style={styles.inputLabel}>Verification Documents</Text>
              <Text style={styles.documentHint}>PDF, JPG, or PNG</Text>
              <TouchableOpacity style={styles.documentUploadButton} onPress={() => openDocumentPicker('permit')}>
                <Text style={styles.documentUploadTitle}>Business/Mayor’s Permit</Text>
                <Text style={styles.documentUploadValue}>{businessPermit?.name || 'Tap to select file'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.supportingDocumentToggle}
                onPress={() => {
                  const nextValue = !includeSupportingDocument;
                  setIncludeSupportingDocument(nextValue);
                  if (!nextValue) setBusinessRegistration(null);
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: includeSupportingDocument }}
              >
                <View style={[styles.checkbox, includeSupportingDocument && styles.checkboxChecked]}>
                  {includeSupportingDocument && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <Text style={styles.supportingDocumentLabel}>Add DTI or SEC registration (Optional)</Text>
              </TouchableOpacity>

              {includeSupportingDocument && (
                <>
                  <View style={styles.registrationTypeRow}>
                    <TouchableOpacity
                      style={[styles.registrationTypeButton, businessRegistrationType === 'dti_registration' && styles.registrationTypeButtonActive]}
                      onPress={() => setBusinessRegistrationType('dti_registration')}
                    >
                      <Text style={[styles.registrationTypeText, businessRegistrationType === 'dti_registration' && styles.registrationTypeTextActive]}>DTI</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.registrationTypeButton, businessRegistrationType === 'sec_registration' && styles.registrationTypeButtonActive]}
                      onPress={() => setBusinessRegistrationType('sec_registration')}
                    >
                      <Text style={[styles.registrationTypeText, businessRegistrationType === 'sec_registration' && styles.registrationTypeTextActive]}>SEC</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.documentUploadButton} onPress={() => openDocumentPicker('registration')}>
                    <Text style={styles.documentUploadTitle}>{businessRegistrationType === 'dti_registration' ? 'DTI Business Name Registration' : 'SEC Registration'}</Text>
                    <Text style={styles.documentUploadValue}>{businessRegistration?.name || 'Tap to select file'}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
          </>}

          {step === 'review' && (
            <View style={styles.reviewSection}>
              <Text style={styles.sectionLabel}>REVIEW YOUR SHOP DETAILS</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Shop Name</Text>
                <Text style={styles.reviewValue}>{shopName}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Owner</Text>
                <Text style={styles.reviewValue}>{ownerFullName}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Address</Text>
                <Text style={styles.reviewValue}>{`${street}, ${zone}, ${barangay}, ${city}`}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Hours</Text>
                <Text style={styles.reviewValue}>{operatingHours}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Website</Text>
                <Text style={styles.reviewValue}>{website || 'Not provided'}</Text>
              </View>
              <Text style={styles.reviewNote}>Please review your details before submitting your shop registration.</Text>
            </View>
          )}

          <TouchableOpacity style={styles.nextButton} onPress={handleNext} disabled={submitting || finalizing}>
            <LinearGradient colors={['#4A90E2', '#357ABD']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.nextGradient}>
              <Text style={styles.nextText}>
                {submitting ? 'Submitting…' : step === 'details' ? 'Continue' : step === 'business' ? 'Continue' : 'Submit Registration'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          {step !== 'details' && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={submitting || finalizing}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
                <Text style={styles.successTitle}>Shop registration submitted</Text>
                <Text style={{ textAlign: 'center', color: '#666', marginBottom: 16 }}>
                  Your shop registration has been submitted successfully.
                </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.laterButton]} 
                onPress={() => {
                  setShowSuccessModal(false);
                  navigation.replace('Login');
                }}
              >
                <Text style={styles.laterButtonText}>Later</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.dashboardButton]} 
                onPress={handleGoToDashboard}
              >
                <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showDocumentPickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDocumentPickerModal(false)}
      >
        <View style={styles.documentModalOverlay}>
          <View style={styles.documentModalContent}>
            <Text style={styles.documentModalTitle}>Upload Verification Document</Text>
            <Text style={styles.documentModalSubtitle}>Choose how to add your PDF or image file</Text>
            <View style={styles.documentModalOptions}>
              <TouchableOpacity
                style={styles.documentModalItem}
                onPress={() => {
                  const selectedKind = documentPickerKind;
                  setShowDocumentPickerModal(false);
                  if (selectedKind) {
                    setTimeout(() => {
                      selectDocument(selectedKind, 'camera');
                    }, 300);
                  }
                }}
              >
                <Text style={styles.documentModalText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.documentModalItem}
                onPress={() => {
                  setShowDocumentPickerModal(false);
                  if (documentPickerKind) selectDocument(documentPickerKind, 'library');
                }}
              >
                <Text style={styles.documentModalText}>Select PDF or Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.documentModalItem, styles.documentModalCancel]}
                onPress={() => setShowDocumentPickerModal(false)}
              >
                <Text style={[styles.documentModalText, styles.documentModalCancelText]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Loading overlays */}
      <LoadingOverlay
        visible={submitting}
        title="Creating your shop"
        subtitle={selectedImage ? 'Uploading image and saving details…' : 'Saving shop details…'}
      />
      <LoadingOverlay
        visible={finalizing}
        title="Finalizing setup"
        subtitle="Preparing your dashboard and notifications…"
      />
      <CustomAlertModal
        visible={showValidationModal}
        title="Incomplete Information"
        message={validationMessage}
        buttonText="OK"
        colorScheme="error"
        onButtonPress={() => setShowValidationModal(false)}
        onRequestClose={() => setShowValidationModal(false)}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { paddingBottom: 50, paddingHorizontal: 20 },
  
  // Header styles
  header: { alignItems: 'center', marginTop: 40, marginBottom: 20 },
  headerText: { fontSize: 16, fontWeight: '600', color: '#fff', letterSpacing: 1, marginBottom: 15 },
  titleContainer: { alignItems: 'center' },
  icon: { width: 80, height: 80, marginBottom: 12, borderRadius: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#222', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 8 },
  
  // Form card
  formCard: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 24, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowOffset: { width: 0, height: 8 }, 
    shadowRadius: 12, 
    elevation: 8 
  },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  stepLine: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#d1d5db' },
  stepLineActive: { backgroundColor: '#357ABD' },
  
  // Section styles
  section: { marginBottom: 24 },
  sectionLabel: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#555', 
    marginBottom: 12, 
    letterSpacing: 1 
  },
  inputGroup: { gap: 8 },
  reviewSection: { marginBottom: 8 },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  reviewLabel: { width: 88, color: '#6b7280', fontWeight: '700', fontSize: 13 },
  reviewValue: { flex: 1, color: '#222', fontSize: 14, lineHeight: 20 },
  reviewNote: { color: '#6b7280', fontSize: 13, lineHeight: 19, marginTop: 8 },
  
  // Input styles
  row: { flexDirection: 'row', marginBottom: 8 },
  input: { 
    backgroundColor: '#f7f9fc', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    marginBottom: 12, 
    fontSize: 14, 
    borderColor: '#e0e0e0', 
    borderWidth: 1, 
    color: '#222' 
  },
  inputError: {
    borderColor: '#dc2626',
    backgroundColor: '#fff7f7',
  },
  halfInput: { flex: 1, minWidth: 0 },
  
  // Button styles
  nextButton: { 
    marginTop: 24, 
    borderRadius: 12, 
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#4A90E2',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  nextGradient: { 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  nextText: { 
    fontSize: 18, 
    color: '#fff', 
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  backButton: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  backButtonText: { color: '#357ABD', fontSize: 15, fontWeight: '600' },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 30,
    width: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  laterButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  laterButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  dashboardButton: {
    backgroundColor: '#4A90E2',
  },
  dashboardButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Image upload styles
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    marginBottom: 8,
    marginTop: 12,
  },
  documentHint: { color: '#777', fontSize: 12, marginBottom: 8 },
  supportingDocumentLabel: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  supportingDocumentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#b8c2d1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#357ABD',
    borderColor: '#357ABD',
  },
  checkboxMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  documentDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  documentUploadButton: {
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    borderColor: '#d5dce8',
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  documentUploadTitle: { color: '#27364b', fontSize: 14, fontWeight: '700', marginBottom: 5 },
  documentUploadValue: { color: '#357ABD', fontSize: 13 },
  documentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 30,
    width: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
  documentModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  documentModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  documentModalOptions: {
    width: '100%',
  },
  documentModalItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#f5f7fb',
    marginBottom: 8,
  },
  documentModalText: {
    color: '#27364b',
    fontSize: 15,
    fontWeight: '600',
  },
  documentModalCancel: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dfe7f2',
  },
  documentModalCancelText: {
    color: '#666',
  },
  registrationTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  registrationTypeButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d5dce8',
    paddingVertical: 10,
    alignItems: 'center',
  },
  registrationTypeButtonActive: { backgroundColor: '#e7f0ff', borderColor: '#357ABD' },
  registrationTypeText: { color: '#6b7280', fontWeight: '700' },
  registrationTypeTextActive: { color: '#357ABD' },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  timePickerField: {
    flex: 1,
  },
  timePickerButton: {
    minHeight: 52,
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  timePickerError: {
    borderColor: '#dc2626',
    backgroundColor: '#fff7f7',
  },
  timePickerValue: {
    color: '#222',
    fontSize: 15,
    fontWeight: '600',
  },
  timePickerPlaceholder: {
    color: '#aaa',
    fontWeight: '400',
  },
  timePickerLabel: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  timeSeparator: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 17,
  },
  imageUploadButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    borderStyle: 'dashed',
    marginBottom: 12,
    overflow: 'hidden',
  },
  imagePreviewContainer: {
    alignItems: 'center',
    padding: 16,
    position: 'relative',
  },
  imagePreview: {
    width: 120,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  changeImageText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  removeImageButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  removeImageButtonText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 21,
  },
  uploadPlaceholder: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  uploadSubText: {
    fontSize: 12,
    color: '#999',
  },
});

export default RegisterShopScreen;
