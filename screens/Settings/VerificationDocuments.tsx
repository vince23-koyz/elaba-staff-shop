import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { pick, types } from '@react-native-documents/picker';
import { launchCamera, CameraOptions } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../navigation/Navigator';
import { API_CONFIG } from '../../config/api';
import CustomAlertModal from '../../components/CustomAlertModal';

export default function VerificationDocuments() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopStatus, setShopStatus] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [businessPermit, setBusinessPermit] = useState<any>(null);
  const [businessRegistration, setBusinessRegistration] = useState<any>(null);
  const [includeSupportingDocument, setIncludeSupportingDocument] = useState(false);
  const [businessRegistrationType, setBusinessRegistrationType] = useState<'dti_registration' | 'sec_registration'>('dti_registration');
  const [documents, setDocuments] = useState<any[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showDocumentPickerModal, setShowDocumentPickerModal] = useState(false);
  const [documentPickerKind, setDocumentPickerKind] = useState<'permit' | 'registration' | null>(null);
  const isActiveShop = shopStatus === 'active';

  const documentTypeLabels: Record<string, string> = {
    business_permit: 'Business / Mayor’s Permit',
    dti_registration: 'DTI Registration',
    sec_registration: 'SEC Registration',
  };

  const approvedDocumentTypes = Array.from(
    new Set(
      documents
        .map((doc) => String(doc?.document_type || ''))
        .filter((type) => Boolean(type) && type in documentTypeLabels)
    )
  );
  const rejectedDocuments = documents.filter(
    (doc) => String(doc?.status || '').toLowerCase() === 'rejected'
  );
  const rejectedDocumentTypes = Array.from(
    new Set(
      rejectedDocuments
        .map((doc) => String(doc?.document_type || ''))
        .filter((type) => Boolean(type) && type in documentTypeLabels)
    )
  );
  const validPendingOrApprovedDocuments = documents.filter(
    (doc) => ['approved', 'pending'].includes(String(doc?.status || '').toLowerCase())
  );
  const hasRejectedDocuments = rejectedDocuments.length > 0 && !approvedDocumentTypes.length;
  const rejectedDocumentReason = rejectedDocuments[0]?.rejection_reason || '';
  const summaryDocumentTypes = Array.from(
    new Set([...approvedDocumentTypes, ...rejectedDocumentTypes])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadShopData();
    });

    loadShopData();

    return unsubscribe;
  }, [navigation]);

  const loadShopData = async () => {
    try {
      setLoading(true);
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        Alert.alert('Error', 'User session not found');
        return;
      }

      const userData = JSON.parse(userDataStr);
      const resolvedShopId = String(userData.shop_id || userData.shopId || '');
      const adminId = userData.admin_id || userData.adminId;

      if (!resolvedShopId && !adminId) {
        Alert.alert('Error', 'Shop information is missing.');
        return;
      }

      let currentShopId = resolvedShopId;
      if (!currentShopId && adminId) {
        const adminShopRes = await fetch(`${API_CONFIG.BASE_URL}/shop/admin/${adminId}`);
        const adminShopData = await adminShopRes.json();
        currentShopId = String(adminShopData?.shop?.shop_id || '');
      }

      if (!currentShopId) {
        Alert.alert('Error', 'Unable to load your shop details.');
        return;
      }

      setShopId(currentShopId);

      const shopRes = await fetch(`${API_CONFIG.BASE_URL}/shop/${currentShopId}`);
      const shopData = await shopRes.json();
      setShopStatus(String(shopData?.status || '').toLowerCase());
      setRejectionReason(String(shopData?.rejection_reason || ''));

      const documentsRes = await fetch(`${API_CONFIG.BASE_URL}/shop/${currentShopId}/documents`);
      const existingDocs = await documentsRes.json();
      const normalizedDocs = Array.isArray(existingDocs) ? existingDocs : [];
      setDocuments(normalizedDocs);
      setIncludeSupportingDocument(
        normalizedDocs.some((doc) => doc.document_type === 'dti_registration' || doc.document_type === 'sec_registration')
      );
      setShowUploadForm(!normalizedDocs.length);
    } catch (error: any) {
      console.error('Failed to load verification docs:', error);
      Alert.alert('Error', error?.message || 'Unable to load verification documents.');
    } finally {
      setLoading(false);
    }
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
    const allowedDocument =
      lowerType === 'application/pdf' ||
      lowerType === 'image/jpeg' ||
      lowerType === 'image/png' ||
      /\.(pdf|jpe?g|png)$/.test(lowerName);

    if (!allowedDocument || /\.webp$/i.test(lowerName) || lowerType === 'image/webp') {
      Alert.alert('Invalid file', 'Only PDF, JPG, and PNG verification documents are accepted.');
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
        Alert.alert('Unable to select file', 'Please try again.');
      }
    }
  };

  const previewSelectedDocument = async (documentFile: any) => {
    if (!documentFile?.uri) {
      return;
    }

    const fileName = String(documentFile.name || '').toLowerCase();
    const mimeType = String(documentFile.type || '').toLowerCase();
    const isImage = mimeType.startsWith('image/') || /\.(png|jpe?g)$/i.test(fileName);

    if (isImage) {
      return;
    }

    try {
      const supported = await Linking.canOpenURL(documentFile.uri);
      if (supported) {
        await Linking.openURL(documentFile.uri);
      } else {
        Alert.alert('Preview unavailable', 'This file type cannot be opened on this device.');
      }
    } catch (error) {
      console.error('Preview file error:', error);
      Alert.alert('Preview unavailable', 'Unable to open the selected file.');
    }
  };

  const clearSelectedDocument = (documentType: 'permit' | 'registration') => {
    if (documentType === 'permit') {
      setBusinessPermit(null);
    } else {
      setBusinessRegistration(null);
    }
  };

  const handleSubmit = async () => {
    if (!shopId) {
      Alert.alert('Error', 'Shop not found.');
      return;
    }

    if (!businessPermit) {
      Alert.alert('Missing document', 'Please upload the Business/Mayor’s Permit.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();

      formData.append('business_permit', {
        uri: businessPermit.uri,
        type: businessPermit.type || 'application/pdf',
        name: businessPermit.name || `business-permit-${Date.now()}`,
      } as any);

      if (includeSupportingDocument && businessRegistration) {
        formData.append(businessRegistrationType, {
          uri: businessRegistration.uri,
          type: businessRegistration.type || 'application/pdf',
          name: businessRegistration.name || `${businessRegistrationType}-${Date.now()}`,
        } as any);
      }

      const documentsResponse = await fetch(`${API_CONFIG.BASE_URL}/shop/${shopId}/documents`, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });

      const data = await documentsResponse.json().catch(() => null);
      if (!documentsResponse.ok) {
        throw new Error(data?.message || 'Verification documents could not be uploaded.');
      }

      setBusinessPermit(null);
      setBusinessRegistration(null);
      setIncludeSupportingDocument(false);
      setShowUploadForm(false);
      await loadShopData();
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Verification docs upload error:', error);
      Alert.alert('Upload failed', error?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#71c5b4', '#6fa8dc']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading verification documents...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#71c5b4', '#6fa8dc']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image source={require('../../assets/img/back.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification Documents</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isActiveShop ? (
          <View style={styles.card}>
            <View style={styles.verifiedStateCard}>
              <View style={styles.verifiedIconContainer}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
              <Text style={styles.verifiedStateTitle}>Verified Shop</Text>
              <Text style={styles.verifiedStateText}>
                This shop is active and verification is locked.
              </Text>

              {approvedDocumentTypes.length > 0 && (
                <View style={styles.docSummaryBox}>
                  <Text style={styles.docSummaryLabel}>Documents on file</Text>
                  {approvedDocumentTypes.map((type) => (
                    <Text key={type} style={styles.docSummaryItem}>{documentTypeLabels[type]}</Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Submit required documents</Text>
            <Text style={styles.sectionSubtitle}>
              Upload the same verification files used during shop registration.
            </Text>

            {shopStatus === 'rejected' && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>Shop status: rejected</Text>
              </View>
            )}

            {shopStatus === 'rejected' && (
              <>
                <Text style={styles.rejectionHint}>
                  Please review the superadmin feedback and update your shop details.
                </Text>
                {rejectionReason ? (
                  <Text style={styles.rejectionReasonBox}>Superadmin feedback: {rejectionReason}</Text>
                ) : null}
              </>
            )}

            {hasRejectedDocuments && (
              <View style={styles.documentRejectionBox}>
                <Text style={styles.documentRejectionTitle}>Verification document rejected</Text>
                <Text style={styles.documentRejectionText}>
                  One or more uploaded documents were rejected by the superadmin. Please review the reason and re-upload the correct file.
                </Text>
                {rejectedDocumentReason ? (
                  <Text style={styles.documentRejectionReason}>Reason: {rejectedDocumentReason}</Text>
                ) : null}
              </View>
            )}

            {!showUploadForm && summaryDocumentTypes.length > 0 ? (
              <View style={styles.uploadedDocsBox}>
                <Text style={styles.uploadedDocsTitle}>Uploaded documents</Text>
                {summaryDocumentTypes.map((type) => {
                  const docStatus = documents.find((doc) => doc.document_type === type)?.status || 'pending';
                  const isRejected = String(docStatus).toLowerCase() === 'rejected';

                  return (
                    <View key={type} style={styles.uploadedDocRow}>
                      <Text style={styles.uploadedDocName}>{documentTypeLabels[type]}</Text>
                      <Text style={[styles.uploadedDocStatus, isRejected && styles.rejectedDocStatus]}>
                        {isRejected ? 'Rejected' : 'Uploaded'}
                      </Text>
                    </View>
                  );
                })}

                <TouchableOpacity style={styles.resubmitButton} onPress={() => setShowUploadForm(true)}>
                  <Text style={styles.resubmitButtonText}>Resubmit documents</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.uploadGroup}>
                  <Text style={styles.label}>Business / Mayor’s Permit *</Text>
                  <TouchableOpacity style={styles.uploadBox} onPress={() => openDocumentPicker('permit')}>
                    {!businessPermit && <Text style={styles.uploadTitle}>Business/Mayor’s Permit</Text>}
                    <Text style={styles.uploadValue}>{businessPermit?.name || 'Tap to select PDF or image'}</Text>
                  </TouchableOpacity>

                  {businessPermit && (
                    <View style={styles.previewContainer}>
                      {businessPermit.type?.startsWith('image/') || /\.(png|jpe?g)$/i.test(String(businessPermit.name || '')) ? (
                        <Image source={{ uri: businessPermit.uri }} style={styles.previewImage} />
                      ) : (
                        <TouchableOpacity onPress={() => previewSelectedDocument(businessPermit)} style={styles.previewButton}>
                          <Text style={styles.previewButtonText}>Preview PDF</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity style={styles.removeAttachmentRow} onPress={() => clearSelectedDocument('permit')}>
                        <Text style={styles.removeAttachmentIcon}>×</Text>
                        <Text style={styles.removeAttachmentLabel}>Remove attachment</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.supportingSection}>
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setIncludeSupportingDocument((prev) => !prev)}
                  >
                    <View style={[styles.checkbox, includeSupportingDocument && styles.checkboxActive]}>
                      {includeSupportingDocument && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>Add DTI or SEC registration (optional)</Text>
                  </TouchableOpacity>

                  {includeSupportingDocument && (
                    <>
                      <View style={styles.typeRow}>
                        <TouchableOpacity
                          style={[styles.typeButton, businessRegistrationType === 'dti_registration' && styles.typeButtonActive]}
                          onPress={() => setBusinessRegistrationType('dti_registration')}
                        >
                          <Text style={[styles.typeText, businessRegistrationType === 'dti_registration' && styles.typeTextActive]}>DTI</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.typeButton, businessRegistrationType === 'sec_registration' && styles.typeButtonActive]}
                          onPress={() => setBusinessRegistrationType('sec_registration')}
                        >
                          <Text style={[styles.typeText, businessRegistrationType === 'sec_registration' && styles.typeTextActive]}>SEC</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity style={styles.uploadBox} onPress={() => openDocumentPicker('registration')}>
                        <Text style={styles.uploadTitle}>
                          {businessRegistrationType === 'dti_registration' ? 'DTI Business Name Registration' : 'SEC Registration'}
                        </Text>
                        <Text style={styles.uploadValue}>{businessRegistration?.name || 'Tap to select PDF or image'}</Text>
                      </TouchableOpacity>

                      {businessRegistration && (
                        <View style={styles.previewContainer}>
                          {businessRegistration.type?.startsWith('image/') || /\.(png|jpe?g)$/i.test(String(businessRegistration.name || '')) ? (
                            <Image source={{ uri: businessRegistration.uri }} style={styles.previewImage} />
                          ) : (
                            <TouchableOpacity onPress={() => previewSelectedDocument(businessRegistration)} style={styles.previewButton}>
                              <Text style={styles.previewButtonText}>Preview PDF</Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity style={styles.removeAttachmentRow} onPress={() => clearSelectedDocument('registration')}>
                            <Text style={styles.removeAttachmentIcon}>×</Text>
                            <Text style={styles.removeAttachmentLabel}>Remove attachment</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </>
            )}

            {showUploadForm && (
              <>
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
                  <Text style={styles.submitButtonText}>{submitting ? 'Submitting...' : 'Submit Documents'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowUploadForm(false);
                    setBusinessPermit(null);
                    setBusinessRegistration(null);
                    setIncludeSupportingDocument(Boolean(documents.some((doc) => doc.document_type === 'dti_registration' || doc.document_type === 'sec_registration')));
                  }}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>

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

      <CustomAlertModal
        visible={showSuccessModal}
        title="Success"
        message="Verification documents uploaded successfully."
        buttonText="OK"
        colorScheme="success"
        onButtonPress={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
        onRequestClose={() => setShowSuccessModal(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { width: 18, height: 18, tintColor: '#fff', resizeMode: 'contain' },
  headerTitle: { color: '#fff', fontSize: 19, fontWeight: '700' },
  placeholder: { width: 32 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: '#4b5563', marginBottom: 14, lineHeight: 20 },
  verifiedStateCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
  },
  verifiedIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  verifiedIcon: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 28,
  },
  verifiedStateTitle: {
    color: '#065f46',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  verifiedStateText: {
    color: '#064e3b',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  statusBadge: {
    backgroundColor: '#fee2e2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  statusBadgeText: { color: '#b91c1c', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  rejectionHint: {
    color: '#7f1d1d',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    fontSize: 12.5,
    lineHeight: 18,
  },
  rejectionReasonBox: {
    color: '#7f1d1d',
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    fontSize: 12.5,
    lineHeight: 18,
  },
  secondaryButton: {
    backgroundColor: '#edf2ff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12.5,
  },
  resubmitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
    marginTop: 14,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  resubmitButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13.5,
    letterSpacing: 0.2,
  },
  uploadGroup: { marginBottom: 16 },
  label: { color: '#374151', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  uploadBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3ee',
    borderRadius: 12,
    padding: 14,
  },
  uploadTitle: { color: '#1f2937', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  uploadValue: { color: '#6b7280', fontSize: 12.5 },
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
    textAlign: 'center',
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
  previewContainer: {
    position: 'relative',
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3ee',
  },
  removeAttachmentButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(17, 24, 39, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  removeAttachmentText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 20,
  },
  removeAttachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    gap: 6,
    marginTop: 0,
  },
  removeAttachmentIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 18,
  },
  removeAttachmentLabel: {
    color: '#fff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  previewImage: {
    width: '100%',
    height: 170,
    resizeMode: 'cover',
  },
  previewButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#eef6ff',
    alignItems: 'center',
  },
  previewButtonText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '700',
  },
  supportingSection: { marginTop: 4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxActive: { backgroundColor: '#4f46e5' },
  checkMark: { color: '#fff', fontWeight: '700', fontSize: 14 },
  checkboxLabel: { color: '#374151', fontSize: 14, fontWeight: '600' },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  typeButton: {
    flex: 1,
    backgroundColor: '#edf2ff',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  typeButtonActive: { backgroundColor: '#4A90E2' },
  typeText: { color: '#374151', fontWeight: '700' },
  typeTextActive: { color: '#fff' },
  submitButton: {
    marginTop: 18,
    backgroundColor: '#2f7ae5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelButton: {
    marginTop: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: 12, fontSize: 16 },
  docSummaryBox: {
    width: '100%',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 12,
    marginTop: 14,
  },
  docSummaryLabel: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  docSummaryItem: {
    color: '#14532d',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  documentRejectionBox: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 12,
    marginBottom: 12,
  },
  documentRejectionTitle: {
    color: '#9a4d00',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  documentRejectionText: {
    color: '#7c2d12',
    fontSize: 12.5,
    lineHeight: 18,
  },
  documentRejectionReason: {
    color: '#7c2d12',
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 8,
  },
  uploadedDocsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfe7f1',
    padding: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  uploadedDocsTitle: {
    color: '#1f2937',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  uploadedDocRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  uploadedDocName: {
    color: '#374151',
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  uploadedDocStatus: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rejectedDocStatus: {
    color: '#dc2626',
    fontWeight: '800',
  },
  docRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  docMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docName: { color: '#1f2937', fontWeight: '600', flex: 1 },
  docStatus: { color: '#475569', fontSize: 11, fontWeight: '700', marginLeft: 10 },
  docLink: { color: '#2563eb', marginTop: 8, fontWeight: '600' },
});
