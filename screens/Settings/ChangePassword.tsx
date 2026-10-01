import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
} from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/Navigator'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api, API_ENDPOINTS } from '../../config/api'

export default function ChangePassword() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [focusedField, setFocusedField] = useState('')
    const [passwordStrength, setPasswordStrength] = useState(0)
    const [errors, setErrors] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })

    const validatePassword = (password: string) => {
        const minLength = 8
        const hasUpperCase = /[A-Z]/.test(password)
        const hasLowerCase = /[a-z]/.test(password)
        const hasNumbers = /\d/.test(password)
        const hasNonalphas = /\W/.test(password)
        
        if (password.length < minLength) {
            return `Password must be at least ${minLength} characters long`
        }
        if (!hasUpperCase) {
            return 'Password must contain at least one uppercase letter'
        }
        if (!hasLowerCase) {
            return 'Password must contain at least one lowercase letter'
        }
        if (!hasNumbers) {
            return 'Password must contain at least one number'
        }
        if (!hasNonalphas) {
            return 'Password must contain at least one special character'
        }
        return ''
    }

    const calculatePasswordStrength = (password: string) => {
        let strength = 0
        if (password.length >= 8) strength += 1
        if (password.length >= 12) strength += 1
        if (/[A-Z]/.test(password)) strength += 1
        if (/[a-z]/.test(password)) strength += 1
        if (/\d/.test(password)) strength += 1
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1
        return strength
    }

    const getPasswordStrengthText = (strength: number) => {
        if (strength === 0) return ''
        if (strength <= 2) return 'Weak'
        if (strength <= 4) return 'Medium'
        return 'Strong'
    }

    const getPasswordStrengthColor = (strength: number) => {
        if (strength <= 2) return '#e74c3c'
        if (strength <= 4) return '#f39c12'
        return '#27ae60'
    }

    const handleNewPasswordChange = (password: string) => {
        setNewPassword(password)
        const strength = calculatePasswordStrength(password)
        setPasswordStrength(strength)
    }

    const handleChangePassword = async () => {
        // Reset errors
        setErrors({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        })

        // Validation
        let hasErrors = false
        const newErrors = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        }

        if (!currentPassword.trim()) {
            newErrors.currentPassword = 'Current password is required'
            hasErrors = true
        }

        if (!newPassword.trim()) {
            newErrors.newPassword = 'New password is required'
            hasErrors = true
        } else {
            const passwordError = validatePassword(newPassword)
            if (passwordError) {
                newErrors.newPassword = passwordError
                hasErrors = true
            }
        }

        if (!confirmPassword.trim()) {
            newErrors.confirmPassword = 'Please confirm your new password'
            hasErrors = true
        } else if (newPassword !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match'
            hasErrors = true
        }

        if (currentPassword === newPassword) {
            newErrors.newPassword = 'New password must be different from current password'
            hasErrors = true
        }

        if (hasErrors) {
            setErrors(newErrors)
            return
        }

        setIsLoading(true)
        try {
            // Get admin ID from AsyncStorage
            const userDataStr = await AsyncStorage.getItem('userData')
            if (!userDataStr) {
                Alert.alert('Error', 'User data not found. Please login again.')
                return
            }

            const userData = JSON.parse(userDataStr)
            const adminId = userData.admin_id || userData.adminId

            if (!adminId) {
                Alert.alert('Error', 'Admin ID not found. Please login again.')
                return
            }

            // Make API call to change password
            const response = await api.post(`${API_ENDPOINTS.ADMIN.BASE}/${adminId}/change-password`, {
                currentPassword: currentPassword.trim(),
                newPassword: newPassword.trim()
            })

            if (response.data.success) {
                Alert.alert(
                    'Success', 
                    'Password changed successfully',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                setCurrentPassword('')
                                setNewPassword('')
                                setConfirmPassword('')
                                setPasswordStrength(0)
                                navigation.goBack()
                            }
                        }
                    ]
                )
            } else {
                Alert.alert('Error', response.data.message || 'Failed to change password')
            }
        } catch (error: any) {
            console.error('Change password error:', error)
            
            // Handle specific error responses
            if (error.response?.data?.message) {
                if (error.response.data.message === 'Current password is incorrect') {
                    setErrors({
                        currentPassword: 'Current password is incorrect',
                        newPassword: '',
                        confirmPassword: ''
                    })
                } else {
                    Alert.alert('Error', error.response.data.message)
                }
            } else if (error.message === 'Network Error') {
                Alert.alert('Error', 'Network error. Please check your connection and try again.')
            } else {
                Alert.alert('Error', 'Failed to change password. Please try again.')
            }
        } finally {
            setIsLoading(false)
        }
    }

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
                    <Text style={styles.headerTitle}>Change Password</Text>
                    <View style={styles.placeholder} />
                </View>

                <ScrollView 
                    contentContainerStyle={styles.scrollContent} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.formContainer}>
                        <Text style={styles.sectionTitle}>Security Information</Text>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Current Password *</Text>
                            <View style={styles.passwordInputContainer}>
                                <TextInput
                                    style={[
                                        styles.textInput, 
                                        styles.passwordInput, 
                                        errors.currentPassword && styles.textInputError,
                                        focusedField === 'currentPassword' && styles.textInputFocused
                                    ]}
                                    placeholder="Enter current password"
                                    placeholderTextColor="#999"
                                    secureTextEntry={!showCurrentPassword}
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    onFocus={() => setFocusedField('currentPassword')}
                                    onBlur={() => setFocusedField('')}
                                    editable={!isLoading}
                                />
                                <View style={styles.inputIcons}>
                                    {currentPassword && !errors.currentPassword && (
                                        <Image source={require('../../assets/img/check.png')} style={styles.validationIcon} />
                                    )}
                                    {errors.currentPassword && (
                                        <Image source={require('../../assets/img/close.png')} style={styles.validationIconError} />
                                    )}
                                    <TouchableOpacity
                                        style={styles.eyeButton}
                                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                                        hitSlop={8}
                                        accessibilityRole="button"
                                        accessibilityLabel={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                                    >
                                        <Image 
                                            source={showCurrentPassword ? 
                                                require('../../assets/img/visibility.png') : 
                                                require('../../assets/img/visibility-off.png')
                                            } 
                                            style={styles.eyeIcon} 
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            {errors.currentPassword ? (
                                <Text style={styles.errorText}>{errors.currentPassword}</Text>
                            ) : null}
                        </View>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>New Password *</Text>
                            <View style={styles.passwordInputContainer}>
                                <TextInput
                                    style={[
                                        styles.textInput, 
                                        styles.passwordInput, 
                                        errors.newPassword && styles.textInputError,
                                        focusedField === 'newPassword' && styles.textInputFocused
                                    ]}
                                    placeholder="Enter new password"
                                    placeholderTextColor="#999"
                                    secureTextEntry={!showNewPassword}
                                    value={newPassword}
                                    onChangeText={handleNewPasswordChange}
                                    onFocus={() => setFocusedField('newPassword')}
                                    onBlur={() => setFocusedField('')}
                                    editable={!isLoading}
                                />
                                <View style={styles.inputIcons}>
                                    {newPassword && !errors.newPassword && (
                                        <Image source={require('../../assets/img/check.png')} style={styles.validationIcon} />
                                    )}
                                    {errors.newPassword && (
                                        <Image source={require('../../assets/img/close.png')} style={styles.validationIconError} />
                                    )}
                                    <TouchableOpacity
                                        style={styles.eyeButton}
                                        onPress={() => setShowNewPassword(!showNewPassword)}
                                        hitSlop={8}
                                        accessibilityRole="button"
                                        accessibilityLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
                                    >
                                        <Image 
                                            source={showNewPassword ? 
                                                require('../../assets/img/visibility.png') : 
                                                require('../../assets/img/visibility-off.png')
                                            } 
                                            style={styles.eyeIcon} 
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            {newPassword && (
                                <View style={styles.passwordStrengthContainer}>
                                    <View style={styles.strengthBar}>
                                        <View 
                                            style={[
                                                styles.strengthBarFill,
                                                { 
                                                    width: `${(passwordStrength / 6) * 100}%`,
                                                    backgroundColor: getPasswordStrengthColor(passwordStrength)
                                                }
                                            ]} 
                                        />
                                    </View>
                                    <Text style={[styles.strengthText, { color: getPasswordStrengthColor(passwordStrength) }]}>
                                        {getPasswordStrengthText(passwordStrength)}
                                    </Text>
                                </View>
                            )}
                            {errors.newPassword ? (
                                <Text style={styles.errorText}>{errors.newPassword}</Text>
                            ) : null}
                        </View>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Confirm New Password *</Text>
                            <View style={styles.passwordInputContainer}>
                                <TextInput
                                    style={[
                                        styles.textInput, 
                                        styles.passwordInput, 
                                        errors.confirmPassword && styles.textInputError,
                                        focusedField === 'confirmPassword' && styles.textInputFocused
                                    ]}
                                    placeholder="Confirm new password"
                                    placeholderTextColor="#999"
                                    secureTextEntry={!showConfirmPassword}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    onFocus={() => setFocusedField('confirmPassword')}
                                    onBlur={() => setFocusedField('')}
                                    editable={!isLoading}
                                />
                                <View style={styles.inputIcons}>
                                    {confirmPassword && !errors.confirmPassword && confirmPassword === newPassword && (
                                        <Image source={require('../../assets/img/check.png')} style={styles.validationIcon} />
                                    )}
                                    {errors.confirmPassword && (
                                        <Image source={require('../../assets/img/close.png')} style={styles.validationIconError} />
                                    )}
                                    <TouchableOpacity
                                        style={styles.eyeButton}
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        hitSlop={8}
                                        accessibilityRole="button"
                                        accessibilityLabel={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
                                    >
                                        <Image 
                                            source={showConfirmPassword ? 
                                                require('../../assets/img/visibility.png') : 
                                                require('../../assets/img/visibility-off.png')
                                            } 
                                            style={styles.eyeIcon} 
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            {errors.confirmPassword ? (
                                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                            ) : null}
                        </View>

                        <View style={styles.passwordRequirements}>
                            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                            <View style={styles.requirementsList}>
                                <View style={styles.requirementItem}>
                                    <Image 
                                        source={newPassword.length >= 8 ? 
                                            require('../../assets/img/check.png') : 
                                            require('../../assets/img/close.png')
                                        }
                                        style={[styles.requirementIcon, newPassword.length >= 8 && styles.requirementMet]}
                                    />
                                    <Text style={[styles.requirementText, newPassword.length >= 8 && styles.requirementTextMet]}>
                                        At least 8 characters long
                                    </Text>
                                </View>
                                <View style={styles.requirementItem}>
                                    <Image 
                                        source={/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? 
                                            require('../../assets/img/check.png') : 
                                            require('../../assets/img/close.png')
                                        }
                                        style={[styles.requirementIcon, /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && styles.requirementMet]}
                                    />
                                    <Text style={[styles.requirementText, /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && styles.requirementTextMet]}>
                                        Contains uppercase and lowercase letters
                                    </Text>
                                </View>
                                <View style={styles.requirementItem}>
                                    <Image 
                                        source={/\d/.test(newPassword) ? 
                                            require('../../assets/img/check.png') : 
                                            require('../../assets/img/close.png')
                                        }
                                        style={[styles.requirementIcon, /\d/.test(newPassword) && styles.requirementMet]}
                                    />
                                    <Text style={[styles.requirementText, /\d/.test(newPassword) && styles.requirementTextMet]}>
                                        Contains at least one number
                                    </Text>
                                </View>
                                <View style={styles.requirementItem}>
                                    <Image 
                                        source={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 
                                            require('../../assets/img/check.png') : 
                                            require('../../assets/img/close.png')
                                        }
                                        style={[styles.requirementIcon, /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) && styles.requirementMet]}
                                    />
                                    <Text style={[styles.requirementText, /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) && styles.requirementTextMet]}>
                                        Contains at least one special character
                                    </Text>
                                </View>
                            </View>
                        </View>
                        
                        <TouchableOpacity 
                            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]} 
                            onPress={handleChangePassword}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.saveButtonText}>Change Password</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    )
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
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 20,
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
    passwordInputContainer: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
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
        borderWidth: 2,
        borderColor: 'transparent',
    },
    textInputFocused: {
        borderColor: '#5c7eb0',
        backgroundColor: '#ffffff',
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 6,
        transform: [{ scale: 1.02 }],
    },
    passwordInput: {
        flex: 1,
        paddingRight: 90, // Increased to accommodate icons
    },
    textInputError: {
        backgroundColor: '#ffdddd',
        borderColor: '#e74c3c',
        borderWidth: 2,
    },
    inputIcons: {
        position: 'absolute',
        right: 4,
        top: 4,
        bottom: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        minWidth: 44,
        paddingLeft: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.65)',
        borderRadius: 10,
        zIndex: 2,
        elevation: 2,
    },
    validationIcon: {
        width: 18,
        height: 18,
        tintColor: '#27ae60',
    },
    validationIconError: {
        width: 18,
        height: 18,
        tintColor: '#e74c3c',
    },
    eyeButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
    },
    eyeIcon: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
        tintColor: '#0e1012',
    },
    passwordStrengthContainer: {
        marginTop: 8,
        paddingHorizontal: 4,
    },
    strengthBar: {
        height: 4,
        backgroundColor: '#e1e8ed',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 6,
    },
    strengthBarFill: {
        height: '100%',
        borderRadius: 2,
        minWidth: 2,
    },
    strengthText: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'right',
    },
    errorText: {
        color: '#fff',
        fontSize: 14,
        marginTop: 5,
        marginLeft: 4,
        backgroundColor: 'rgba(231, 76, 60, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    passwordRequirements: {
        backgroundColor: '#ffffffdd',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    requirementsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    requirementText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        flex: 1,
    },
    requirementTextMet: {
        color: '#27ae60',
        fontWeight: '600',
    },
    requirementsList: {
        gap: 8,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    requirementIcon: {
        width: 14,
        height: 14,
        tintColor: '#bbb',
    },
    requirementMet: {
        tintColor: '#27ae60',
    },
    saveButton: {
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
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
})