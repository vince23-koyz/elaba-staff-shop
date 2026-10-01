import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, API_ENDPOINTS, API_CONFIG } from '../../config/api';
import CustomAlertModal from '../../components/CustomAlertModal';

export default function EditProfile() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    street: '',
    zone: '',
    barangay: '',
    city: '',
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Optionally reload the original data
    loadUserData();
  };

  const loadUserData = async () => {
    try {
      setInitialLoading(true);
      
      // Get admin ID from AsyncStorage
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        Alert.alert('Error', 'User session not found');
        return;
      }

      const userData = JSON.parse(userDataStr);
      const adminId = userData.admin_id || userData.adminId;
      
      if (!adminId) {
        Alert.alert('Error', 'Admin ID not found');
        return;
      }

    // Fetch admin data from backend
    const response = await api.get(API_ENDPOINTS.ADMIN.BY_ID(adminId));
      
      if (response.data) {
        const adminData = response.data;
        setFormData({
          firstName: adminData.first_name || '',
          lastName: adminData.last_name || '',
          street: adminData.street || '',
          zone: adminData.zone || '',
          barangay: adminData.barangay || '',
          city: adminData.city || '',
        });
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate required fields (phone is handled separately)
    if (!formData.firstName || !formData.lastName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Get admin ID from AsyncStorage
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        Alert.alert('Error', 'User session not found');
        return;
      }

      const userData = JSON.parse(userDataStr);
      const adminId = userData.admin_id || userData.adminId;
      
      // Validate admin ID
      if (!adminId || isNaN(Number(adminId))) {
        Alert.alert('Error', 'Invalid admin ID');
        return;
      }

      // Update admin profile via API
      const updateData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        street: formData.street || '',
        zone: formData.zone || '',
        barangay: formData.barangay || '',
        city: formData.city || '',
        // phone_number is intentionally excluded. It is confidential and handled separately.
      };

      console.log('Updating admin profile:', {
        adminId,
        updateData,
        url: `${API_CONFIG.BASE_URL}${API_ENDPOINTS.ADMIN.BY_ID(adminId)}`
      });

      const response = await api.put(API_ENDPOINTS.ADMIN.BY_ID(adminId), updateData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });
      console.log('Update response:', response.data);
      
      setIsEditing(false); // Exit edit mode after successful save
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      
      // More detailed error handling
      if (error.response) {
        // Server responded with error status
        console.error('Server error:', error.response.data);
        console.error('Status:', error.response.status);
        Alert.alert('Error', `Server error: ${error.response.data?.message || 'Unknown server error'}`);
      } else if (error.request) {
        // Network error
        console.error('Network error:', error.request);
        Alert.alert('Error', 'Network error. Please check your connection.');
      } else {
        // Other error
        console.error('Error:', error.message);
        Alert.alert('Error', `Failed to update profile: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient 
        colors={['#71c5b4', '#6fa8dc']}
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        style={styles.flex1} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Image source={require('../../assets/img/back.png')} style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {initialLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : (
            <View style={styles.formContainer}>
              {/* Form Fields */}
              <View style={styles.inputSection}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                
                <View style={styles.inputRow}>
                  <View style={styles.inputHalf}>
                    <Text style={styles.inputLabel}>First Name *</Text>
                    <TextInput
                      style={[styles.textInput, !isEditing && styles.textInputLocked]}
                      value={formData.firstName}
                      onChangeText={(value) => handleInputChange('firstName', value)}
                      placeholder="Enter first name"
                      placeholderTextColor="#999"
                      editable={isEditing}
                    />
                  </View>
                   
                  <View style={styles.inputHalf}>
                    <Text style={styles.inputLabel}>Last Name *</Text>
                    <TextInput
                      style={[styles.textInput, !isEditing && styles.textInputLocked]}
                      value={formData.lastName}
                      onChangeText={(value) => handleInputChange('lastName', value)}
                      placeholder="Enter last name"
                      placeholderTextColor="#999"
                      editable={isEditing}
                    />
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Address Information</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Street</Text>
                  <TextInput
                    style={[styles.textInput, !isEditing && styles.textInputLocked]}
                    value={formData.street}
                    onChangeText={(value) => handleInputChange('street', value)}
                    placeholder="Enter street address"
                    placeholderTextColor="#999"
                    editable={isEditing}
                  />
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputHalf}>
                    <Text style={styles.inputLabel}>Zone/Purok</Text>
                    <TextInput
                      style={[styles.textInput, !isEditing && styles.textInputLocked]}
                      value={formData.zone}
                      onChangeText={(value) => handleInputChange('zone', value)}
                      placeholder="Enter zone"
                      placeholderTextColor="#999"
                      editable={isEditing}
                    />
                  </View>
                  
                  <View style={styles.inputHalf}>
                    <Text style={styles.inputLabel}>Barangay</Text>
                    <TextInput
                      style={[styles.textInput, !isEditing && styles.textInputLocked]}
                      value={formData.barangay}
                      onChangeText={(value) => handleInputChange('barangay', value)}
                      placeholder="Enter barangay"
                      placeholderTextColor="#999"
                      editable={isEditing}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={[styles.textInput, !isEditing && styles.textInputLocked]}
                    value={formData.city}
                    onChangeText={(value) => handleInputChange('city', value)}
                    placeholder="Enter city"
                    placeholderTextColor="#999"
                    editable={isEditing}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              {!isEditing ? (
                // Edit Button
                <TouchableOpacity 
                  style={styles.editButton} 
                  onPress={handleEditToggle}
                >
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              ) : (
                // Save and Cancel Buttons
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={handleCancel}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
                    onPress={handleSave}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlertModal
        visible={showSuccessModal}
        title="Success"
        message="Profile updated successfully!"
        buttonText="OK"
        colorScheme="success"
        onButtonPress={() => setShowSuccessModal(false)}
        onRequestClose={() => setShowSuccessModal(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  flex1: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    width: 25,
    height: 25,
    tintColor: '#fff',
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: {
    width: 50,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 12,
    fontWeight: '600',
  },
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ffffffdd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  profileInitial: {
    fontSize: 36,
    fontWeight: '700',
    color: '#333',
  },
  changePictureButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changePictureText: {
    fontSize: 14,
    color: '#fff',
    textDecorationLine: 'underline',
  },
  inputSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2f4058',
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inputHalf: {
    width: '48%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#ffffffdd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  textInputLocked: {
    backgroundColor: '#f5f5f5dd',
    color: '#666',
  },
  textArea: {
    height: 80,
    paddingTop: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  editButton: {
    backgroundColor: '#5c7eb0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#999',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flex: 0.45,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#5c7eb0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flex: 0.45,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  accountCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 8,
    marginBottom: 16,
  },
  accountHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    opacity: 0.9,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  accountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#eaf3ff',
    marginBottom: 4,
  },
  accountValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  chevron: {
    fontSize: 22,
    color: '#eaf3ff',
    opacity: 0.8,
    fontWeight: '300',
  },
});