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
import { launchCamera, launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, API_ENDPOINTS, API_CONFIG } from '../../config/api';
import CustomAlertModal from '../../components/CustomAlertModal';

export default function ShopInfo() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [currentImage, setCurrentImage] = useState<string>('');
  const [imageUploading, setImageUploading] = useState(false);
  const [shopStatus, setShopStatus] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [openingTime, setOpeningTime] = useState<Date | null>(null);
  const [closingTime, setClosingTime] = useState<Date | null>(null);
  const [activeTimePicker, setActiveTimePicker] = useState<'opening' | 'closing' | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showNoChangesModal, setShowNoChangesModal] = useState(false);
  
  const [originalFormData, setOriginalFormData] = useState({
    shopName: '',
    ownerName: '',
    street: '',
    zone: '',
    barangay: '',
    city: '',
    website: '',
    operatingHours: '',
  });
  
  const [formData, setFormData] = useState({
    shopName: '',
    ownerName: '',
    street: '',
    zone: '',
    barangay: '',
    city: '',
    website: '',
    operatingHours: '',
  });

  useEffect(() => {
    loadShopData();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    // Trim whitespace for certain fields
    let processedValue = value;
    if (field === 'shopName' || field === 'ownerName' || field === 'street' || field === 'barangay' || field === 'city') {
      // Don't trim while typing, but ensure no leading spaces
      processedValue = value.replace(/^\s+/, '');
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue,
    }));
  };

  const formatDisplayTime = (time: Date | null) => {
    if (!time) return 'Select time';
    const hour = time.getHours() % 12 || 12;
    const minutes = String(time.getMinutes()).padStart(2, '0');
    const period = time.getHours() >= 12 ? 'PM' : 'AM';
    return `${String(hour).padStart(2, '0')}:${minutes} ${period}`;
  };

  const getTimeInMinutes = (time: Date) => time.getHours() * 60 + time.getMinutes();

  const parseTime = (value: string, period: string) => {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;

    let hour = Number(match[1]);
    const minutes = Number(match[2]);
    if (hour < 1 || hour > 12 || minutes > 59) return null;
    if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
    if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;

    const time = new Date();
    time.setHours(hour, minutes, 0, 0);
    return time;
  };

  const parseOperatingHours = (value: string) => {
    const parts = value.split(/\s+-\s+/);
    if (parts.length !== 2) return { opening: null, closing: null };

    const parsePart = (part: string) => {
      const match = part.trim().match(/^(\d{1,2}:\d{2})\s*(AM|PM)$/i);
      return match ? parseTime(match[1], match[2]) : null;
    };

    return { opening: parsePart(parts[0]), closing: parsePart(parts[1]) };
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    const picker = activeTimePicker;
    setActiveTimePicker(null);
    if (event.type !== 'set' || !selectedTime || !picker) return;

    if (picker === 'opening') {
      setOpeningTime(selectedTime);
    } else {
      setClosingTime(selectedTime);
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedImage(null);
    setImageUploading(false);
    
    // Restore original form data
    setFormData({ ...originalFormData });
    const parsedHours = parseOperatingHours(originalFormData.operatingHours);
    setOpeningTime(parsedHours.opening);
    setClosingTime(parsedHours.closing);
  };

  const loadShopData = async () => {
    try {
      setInitialLoading(true);
      
      // Get shop data from AsyncStorage
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        Alert.alert('Error', 'User session not found');
        return;
      }

      const userData = JSON.parse(userDataStr);
      const shopId = userData.shop_id || userData.shopId;
      const adminId = userData.admin_id || userData.adminId;
      
      let response;
      let shopData;

      // Try to fetch shop data using shop_id first
      if (shopId && !isNaN(Number(shopId))) {
        console.log('Loading shop data using shop ID:', shopId);
        try {
          response = await api.get(`/shop/${shopId}`, {
            timeout: 10000 // 10 second timeout
          });
          shopData = response.data; // getShopById returns shop directly
          console.log('Shop data loaded via shop ID:', shopData);
        } catch (error: any) {
          console.log('Failed to fetch via shop ID, trying admin ID:', error.message);
          // Fall back to admin_id approach if shop_id fails
        }
      }

      // If shop_id approach failed or no shop_id available, try admin_id
      if (!shopData && adminId && !isNaN(Number(adminId))) {
        console.log('Loading shop data using admin ID:', adminId);
        response = await api.get(API_ENDPOINTS.SHOP.BY_ADMIN(adminId), {
          timeout: 10000 // 10 second timeout
        });
        shopData = response.data.shop; // getShopByAdmin returns { shop: data }
        console.log('Shop data loaded via admin ID:', shopData);
      }

      // Check if we have shop data
      if (!shopData) {
        Alert.alert('Error', 'No shop found for this account. Please register a shop first.');
        return;
      }

      if (shopData) {
        
        // Parse address if it's a single string
        const addressParts = shopData.address ? shopData.address.split(', ') : ['', '', '', ''];
        
        const newFormData = {
          shopName: shopData.name || '',
          ownerName: shopData.owner_name || '',
          street: addressParts[0] || '',
          zone: addressParts[1] || '',
          barangay: addressParts[2] || '',
          city: addressParts[3] || '',
          website: shopData.website || '',
          operatingHours: shopData.operation_hours || '',
        };
        
        setFormData(newFormData);
        setOriginalFormData({ ...newFormData }); // Store original data for cancel functionality
        const parsedHours = parseOperatingHours(newFormData.operatingHours);
        setOpeningTime(parsedHours.opening);
        setClosingTime(parsedHours.closing);
        setShopStatus(String(shopData.status || '').toLowerCase());
        setRejectionReason(shopData.rejection_reason || '');
        
        // Set current image if exists (use logo column like RegisterShop)
        if (shopData.logo) {
          const logoValue = shopData.logo as string;
          const url = logoValue.startsWith('http')
            ? logoValue
            : `${API_CONFIG.BASE_ORIGIN}${logoValue.startsWith('/') ? '' : '/'}${logoValue}`;
          setCurrentImage(url);
        }
      } else {
        Alert.alert('Error', 'Shop data not found');
      }
    } catch (error: any) {
      console.error('Error fetching shop data:', error);
      
      // More detailed error handling similar to EditProfile
      if (error.response) {
        // Server responded with error status
        console.error('Server error:', error.response.data);
        console.error('Status:', error.response.status);
        Alert.alert('Error', `Server error: ${error.response.data?.message || 'Unknown server error'}`);
      } else if (error.request) {
        // Request made but no response received (network error)
        console.error('Network error:', error.request);
        Alert.alert('Error', 'Network error. Please check your connection.');
      } else {
        // Something else happened
        console.error('Error:', error.message);
        Alert.alert('Error', `Failed to load shop data: ${error.message}`);
      }
    } finally {
      setInitialLoading(false);
    }
  };

  const selectImage = () => {
    Alert.alert(
      'Select Image',
      'Choose how to select your shop image',
      [
        { text: 'Camera', onPress: openCamera },
        { text: 'Gallery', onPress: openGallery },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openCamera = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: true, // help with Android content:// URIs if needed
      maxHeight: 2000,
      maxWidth: 2000,
    };

    launchCamera(options, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        console.log('Selected image from camera:', asset);
        setSelectedImage({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          fileName: asset.fileName || `shop-${Date.now()}.jpg`,
        });
      }
    });
  };

  const openGallery = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: true, // help with Android content:// URIs if needed
      maxHeight: 2000,
      maxWidth: 2000,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        console.log('Selected image from gallery:', asset);
        setSelectedImage({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          fileName: asset.fileName || `shop-${Date.now()}.jpg`,
        });
      }
    });
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.shopName.trim() || !formData.ownerName.trim() || !formData.street.trim() || !formData.barangay.trim() || !formData.city.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate shop name length
    if (formData.shopName.trim().length < 2) {
      Alert.alert('Error', 'Shop name must be at least 2 characters long');
      return;
    }

    // Validate owner name length
    if (formData.ownerName.trim().length < 2) {
      Alert.alert('Error', 'Owner name must be at least 2 characters long');
      return;
    }

    // Validate operating hours format if provided
    if (!openingTime || !closingTime) {
      Alert.alert('Error', 'Please select both an opening time and a closing time');
      return;
    }

    if (getTimeInMinutes(closingTime) <= getTimeInMinutes(openingTime)) {
      Alert.alert('Error', 'Closing time must be later than opening time. Overnight schedules are not supported.');
      return;
    }

    const operatingHours = `${formatDisplayTime(openingTime)} - ${formatDisplayTime(closingTime)}`;
    const currentValues = {
      shopName: formData.shopName.trim(),
      ownerName: formData.ownerName.trim(),
      street: formData.street.trim(),
      zone: formData.zone.trim(),
      barangay: formData.barangay.trim(),
      city: formData.city.trim(),
      website: formData.website.trim(),
      operatingHours,
    };
    const hasFormChanges = Object.keys(currentValues).some(field =>
      currentValues[field as keyof typeof currentValues] !== originalFormData[field as keyof typeof originalFormData].trim()
    );

    if (!hasFormChanges && !selectedImage) {
      setShowNoChangesModal(true);
      return;
    }

    setLoading(true);
    setImageUploading(selectedImage ? true : false);

    try {
      // Get shop data from AsyncStorage
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        Alert.alert('Error', 'User session not found');
        return;
      }

      const userData = JSON.parse(userDataStr);
      const shopId = userData.shop_id || userData.shopId;
      const adminId = userData.admin_id || userData.adminId;
      
      // Validate that we have either shop_id or admin_id
      if ((!shopId || isNaN(Number(shopId))) && (!adminId || isNaN(Number(adminId)))) {
        Alert.alert('Error', 'Invalid shop or admin ID');
        return;
      }

      // Use shop_id if available, otherwise use admin_id
      const idToUse = shopId && !isNaN(Number(shopId)) ? shopId : adminId;
      
      if (!idToUse) {
        Alert.alert('Error', 'No valid ID found');
        return;
      }

      // Create FormData for multipart request
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.shopName.trim());
      formDataToSend.append('address', `${formData.street.trim()}, ${formData.zone.trim()}, ${formData.barangay.trim()}, ${formData.city.trim()}`);
      formDataToSend.append('website', formData.website.trim() || '');
      formDataToSend.append('owner_name', formData.ownerName.trim());
      formDataToSend.append('operation_hours', operatingHours);
      if (shopStatus === 'rejected') {
        formDataToSend.append('status', 'pending');
      }

      // Add image if selected
      if (selectedImage) {
        formDataToSend.append('shopImage', {
          uri: selectedImage.uri,
          type: selectedImage.type,
          name: selectedImage.fileName || 'shop-image.jpg',
        } as any);
      }

      console.log('Updating shop with ID:', idToUse);
      console.log('Update data:', {
        name: formData.shopName.trim(),
        address: `${formData.street.trim()}, ${formData.zone.trim()}, ${formData.barangay.trim()}, ${formData.city.trim()}`,
        website: formData.website.trim() || '',
        owner_name: formData.ownerName.trim(),
        operation_hours: operatingHours,
      });
      console.log('FormData to send:', formDataToSend);

      // Use fetch for multipart; do not set Content-Type manually
      const res = await fetch(`${API_CONFIG.BASE_URL}/shop/${idToUse}`, {
        method: 'PUT',
        body: formDataToSend,
        headers: { Accept: 'application/json' },
      });
      let responseData: any = {};
      try { responseData = await res.json(); } catch {}
      if (!res.ok) {
        const msg = responseData?.message || 'Unknown server error';
        throw new Error(`Server error (${res.status}): ${msg}`);
      }
      const response = { data: responseData } as any;

      console.log('Update response:', response.data);
      
      // Update AsyncStorage with new shop name
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          userData.shop_name = formData.shopName.trim();
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
          console.log('AsyncStorage updated with new shop name');
        }
      } catch (storageError) {
        console.log('Warning: Failed to update AsyncStorage:', storageError);
      }
      
      setIsEditing(false);
      setSelectedImage(null);
      if (shopStatus === 'rejected') {
        setShopStatus('pending');
        setRejectionReason('');
      }
      
      // Reload data to get updated image URL
      await loadShopData();
      
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error updating shop:', error);
      
      // More detailed error handling similar to EditProfile
      if (error.response) {
        // Server responded with error status
        console.error('Server error:', error.response.data);
        console.error('Status:', error.response.status);
        console.error('Headers:', error.response.headers);
        Alert.alert('Error', `Server error (${error.response.status}): ${error.response.data?.message || error.response.data?.error || 'Unknown server error'}`);
      } else if (error.request) {
        // Request made but no response received (network error)
        console.error('Network error:', error.request);
        Alert.alert('Error', 'Network error. Please check your connection and ensure the backend server is running.');
      } else {
        // Something else happened
        console.error('Error:', error.message);
        Alert.alert('Error', `Failed to update shop: ${error.message}`);
      }
    } finally {
      setLoading(false);
      setImageUploading(false);
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
          <Text style={styles.headerTitle}>Shop Information</Text>
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
              <Text style={styles.loadingText}>Loading shop data...</Text>
            </View>
          ) : (
            <View style={styles.formContainer}>
              {shopStatus === 'rejected' && (
                <View style={styles.rejectionCard}>
                  <Text style={styles.rejectionTitle}>Shop request rejected</Text>
                  <Text style={styles.rejectionMessage}>
                    Please correct the shop information and resubmit your request.
                  </Text>
                  {rejectionReason ? (
                    <Text style={styles.rejectionReason}>Reason: {rejectionReason}</Text>
                  ) : null}
                </View>
              )}
              {/* Shop Image - No Card */}
              <View style={styles.imageSection}>
                <View style={[styles.imageContainer, (selectedImage || currentImage) && styles.imageContainerWithImage]}>
                  {imageUploading ? (
                    <View style={styles.uploadingContainer}>
                      <ActivityIndicator size="large" color="#5c7eb0" />
                      <Text style={styles.uploadingText}>Uploading image...</Text>
                    </View>
                  ) : selectedImage ? (
                    <Image source={{ uri: selectedImage.uri }} style={styles.shopImage} />
                  ) : currentImage ? (
                    <Image source={{ uri: currentImage }} style={styles.shopImage} />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <Image source={require('../../assets/img/image.png')} style={styles.placeholderIcon} />
                      <Text style={styles.placeholderText}>Tap "Add Image" to upload shop photo</Text>
                    </View>
                  )}
                </View>
                {isEditing && !imageUploading && (
                  <TouchableOpacity style={styles.changeImageButton} onPress={selectImage}>
                    <Text style={styles.changeImageText}>
                      {selectedImage || currentImage ? 'Change Image' : 'Add Image'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Basic Information Card */}
              <View style={styles.formCard}>
                <Text style={styles.cardTitle}>Basic Information</Text>
                
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Shop Name *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.formInput, !isEditing && styles.formInputDisabled]}
                      value={formData.shopName}
                      onChangeText={(value) => handleInputChange('shopName', value)}
                      placeholder="Enter shop name"
                      placeholderTextColor="#999"
                      editable={isEditing}
                    />
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Owner Name *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.formInput, !isEditing && styles.formInputDisabled]}
                      value={formData.ownerName}
                      onChangeText={(value) => handleInputChange('ownerName', value)}
                      placeholder="Enter owner name"
                      placeholderTextColor="#999"
                      editable={isEditing}
                    />
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Website</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.formInput, !isEditing && styles.formInputDisabled]}
                      value={formData.website}
                      onChangeText={(value) => handleInputChange('website', value)}
                      placeholder="Enter website or social media (optional)"
                      placeholderTextColor="#999"
                      editable={isEditing}
                      keyboardType="url"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Operating Hours</Text>
                  <View style={styles.timePickerRow}>
                    <View style={styles.timePickerField}>
                      <TouchableOpacity
                        style={[styles.timePickerButton, !isEditing && styles.formInputDisabled]}
                        onPress={() => isEditing && setActiveTimePicker('opening')}
                        disabled={!isEditing}
                      >
                        <Text style={[styles.timePickerValue, !openingTime && styles.timePickerPlaceholder]}>
                          {formatDisplayTime(openingTime)}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.timePickerLabel}>Opening Time</Text>
                    </View>
                    <Text style={styles.timeSeparator}>to</Text>
                    <View style={styles.timePickerField}>
                      <TouchableOpacity
                        style={[styles.timePickerButton, !isEditing && styles.formInputDisabled]}
                        onPress={() => isEditing && setActiveTimePicker('closing')}
                        disabled={!isEditing}
                      >
                        <Text style={[styles.timePickerValue, !closingTime && styles.timePickerPlaceholder]}>
                          {formatDisplayTime(closingTime)}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.timePickerLabel}>Closing Time</Text>
                    </View>
                  </View>
                  {activeTimePicker && (
                    <DateTimePicker
                      value={activeTimePicker === 'opening' ? openingTime || new Date() : closingTime || new Date()}
                      mode="time"
                      is24Hour={false}
                      display="default"
                      onChange={handleTimeChange}
                    />
                  )}
                </View>
              </View>

              {/* Address Information Card */}
              <View style={styles.formCard}>
                <Text style={styles.cardTitle}>Address Information</Text>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Street Address *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.formInput, !isEditing && styles.formInputDisabled]}
                      value={formData.street}
                      onChangeText={(value) => handleInputChange('street', value)}
                      placeholder="Enter street address"
                      placeholderTextColor="#999"
                      editable={isEditing}
                      multiline
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <Text style={styles.fieldLabel}>Zone/Purok</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={[styles.formInput, !isEditing && styles.formInputDisabled]}
                        value={formData.zone}
                        onChangeText={(value) => handleInputChange('zone', value)}
                        placeholder="Zone/Purok"
                        placeholderTextColor="#999"
                        editable={isEditing}
                      />
                    </View>
                  </View>

                  <View style={styles.formHalf}>
                    <Text style={styles.fieldLabel}>Barangay *</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={[styles.formInput, !isEditing && styles.formInputDisabled]}
                        value={formData.barangay}
                        onChangeText={(value) => handleInputChange('barangay', value)}
                        placeholder="Barangay"
                        placeholderTextColor="#999"
                        editable={isEditing}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>City *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.formInput, !isEditing && styles.formInputDisabled]}
                      value={formData.city}
                      onChangeText={(value) => handleInputChange('city', value)}
                      placeholder="Enter city"
                      placeholderTextColor="#999"
                      editable={isEditing}
                    />
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonSection}>
                {isEditing ? (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
                      onPress={handleSave}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.editButton} onPress={handleEditToggle}>
                    <Text style={styles.editButtonText}>
                      {shopStatus === 'rejected' ? 'Edit and Resubmit' : 'Edit Information'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlertModal
        visible={showSuccessModal}
        title="Success"
        message="Shop information updated successfully!"
        buttonText="OK"
        colorScheme="success"
        onButtonPress={() => {
          setShowSuccessModal(false);
          setTimeout(() => {
            navigation.goBack();
          }, 100);
        }}
        onRequestClose={() => setShowSuccessModal(false)}
      />

      <CustomAlertModal
        visible={showNoChangesModal}
        title="No changes detected"
        message="Make at least one change to your shop information or images before resubmitting."
        buttonText="Okay"
        colorScheme="info"
        onButtonPress={() => setShowNoChangesModal(false)}
        onRequestClose={() => setShowNoChangesModal(false)}
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
  // Professional Form Card Styles
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    marginBottom: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2f4058',
    marginBottom: 16,
    textAlign: 'center',
  },
  formField: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formHalf: {
    flex: 0.48,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  inputContainer: {
    borderWidth: 1.5,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  formInput: {
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
  },
  formInputDisabled: {
    backgroundColor: '#f8f9fa',
    color: '#6c757d',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timePickerField: {
    flex: 1,
  },
  timePickerButton: {
    minHeight: 50,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  timePickerValue: {
    fontSize: 16,
    color: '#333',
  },
  timePickerPlaceholder: {
    color: '#999',
  },
  timePickerLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },
  timeSeparator: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 8,
    marginTop: -20,
  },
  buttonSection: {
    marginTop: 8,
    marginBottom: 20,
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
    flex: 1,
  },
  verifiedCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  verifiedBadge: {
    color: '#065f46',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  verifiedMessage: {
    color: '#064e3b',
    fontSize: 14,
    lineHeight: 20,
  },
  rejectionCard: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  rejectionTitle: {
    color: '#be123c',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  rejectionMessage: {
    color: '#4c0519',
    fontSize: 14,
    lineHeight: 20,
  },
  rejectionReason: {
    color: '#881337',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    fontWeight: '600',
  },
  rejectionActionButton: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#fda4af',
    alignItems: 'center',
  },
  rejectionActionText: {
    color: '#be123c',
    fontSize: 12.5,
    fontWeight: '700',
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
  imageSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: '#ffffffdd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e1e5e9',
    borderStyle: 'dashed',
  },
  imageContainerWithImage: {
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderWidth: 0,
  },
  shopImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  uploadingText: {
    fontSize: 16,
    color: '#5c7eb0',
    marginTop: 12,
    fontWeight: '600',
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  placeholderIcon: {
    width: 60,
    height: 60,
    tintColor: '#bbb',
    marginBottom: 16,
    opacity: 0.7,
  },
  placeholderText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
  changeImageButton: {
    backgroundColor: '#5c7eb0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  changeImageText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
    marginTop: 16,
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
    color: '#fff',
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
  verifiedActionBox: {
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86efac',
    marginTop: 20,
  },
  verifiedActionText: {
    color: '#166534',
    fontSize: 15,
    fontWeight: '700',
  },
});