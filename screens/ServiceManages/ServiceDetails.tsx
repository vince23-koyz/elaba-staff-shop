// ServiceManages/ServiceDetails.tsx
import { 
  StyleSheet, Text, View, ScrollView, ActivityIndicator, 
  TextInput, TouchableOpacity, Switch, Alert, Image
} from 'react-native'
import React, { useEffect, useState } from 'react'
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native'
import type { RootStackParamList } from '../../navigation/Navigator'
import { useShopServices } from '../../hooks/useShopServices'
import { useServiceActions } from '../../hooks/useServiceActions'
import ServiceFormModal from './ServiceFormModal'

type ServiceDetailsRouteProp = RouteProp<RootStackParamList, 'ServiceDetails'>

export default function ServiceDetails() {
  const route = useRoute<ServiceDetailsRouteProp>()
  const navigation = useNavigation()
  const { serviceId, shopId } = route.params
  const { services, loading } = useShopServices(shopId)
  const { updateService, deleteService, loading: actionLoading } = useServiceActions()

  const service = services.find(s => Number(s.service_id) === Number(serviceId))

  const [isEditing, setIsEditing] = useState(false)
  const [editableService, setEditableService] = useState<any>({
    offers: "",
    description: "",
    price: "",
    quantity: "",
    status: "Inactive"
  });
  const [formVisible, setFormVisible] = useState(false);
  const [validation, setValidation] = useState({
    offers: '',
    price: '',
    quantity: ''
  });

  useEffect(() => {
    if (service) {
      setEditableService({
        offers: service.offers || "",
        description: service.description || "",
        price: String(service.price ?? ""),
        quantity: String(service.quantity ?? ""),
        status: service.status || "Inactive"
      });
      setStatus(service.status === "Active");
    }
  }, [service]);


const [status, setStatus] = useState(
  service?.status === "Active"
);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    )
  }

  if (!service) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#555' }}>Service not found.</Text>
      </View>
    )
  }

  const handleEditToggle = () => {
    // Open modal overlay for edit instead of inline editing
    setEditableService({
      offers: service.offers || "",
      description: service.description || "",
      price: String(service.price ?? ""),
      quantity: String(service.quantity ?? ""),
      status: service.status || "Inactive"
    });
    setValidation({ offers: '', price: '', quantity: '' });
    setFormVisible(true);
  }

  const handleDelete = () => {
    Alert.alert(
      "Delete Service",
      "Are you sure you want to delete this service?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
          const success = await deleteService(service.service_id)
          if (success) navigation.goBack()
        }}
      ]
    )
  }

  const validateFields = () => {
    let valid = true;
    let v = { offers: '', price: '', quantity: '' };
    if (!editableService.offers.trim()) {
      v.offers = 'Service name is required.';
      valid = false;
    }
    if (!editableService.price || isNaN(Number(editableService.price))) {
      v.price = 'Valid price is required.';
      valid = false;
    }
    if (!editableService.quantity || isNaN(Number(editableService.quantity))) {
      v.quantity = 'Valid stock is required.';
      valid = false;
    }
    setValidation(v);
    return valid;
  };

  const handleSave = async () => {
    if (!validateFields()) return;
    const success = await updateService(service.service_id, {
      offers: editableService.offers,
      description: editableService.description,
      price: Number(editableService.price),
      quantity: Number(editableService.quantity),
      status: status ? "Active" : "Inactive"
    });
    if (success) {
      setIsEditing(false);
      Alert.alert('Success', 'Service updated successfully!');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Image source={require('../../assets/img/back.png')} style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Service Details</Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={handleEditToggle} style={styles.iconBtn}>
              <Image 
                source={isEditing ? require('../../assets/img/close.png') : require('../../assets/img/edit.png')} 
                style={styles.iconImg} 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
              <Image 
                source={require('../../assets/img/delete.png')} 
                style={[styles.iconImg, {tintColor: "#e74c3c"}]} 
              />
            </TouchableOpacity>
          </View>
        </View>


        {/* Divider */}
        <View style={styles.divider} />

        {/* Service Name */}
        <Text style={styles.label}>Service Name <Text style={{color:'#e74c3c'}}>*</Text></Text>
        <TextInput
          style={[styles.input, !isEditing && styles.readonlyInput, validation.offers && styles.inputError]}
          value={editableService.offers}
          onChangeText={(text) => {
            setEditableService({ ...editableService, offers: text });
            if (validation.offers) setValidation(v => ({ ...v, offers: '' }));
          }}
          editable={isEditing}
          placeholder="Enter service name"
        />
        {validation.offers ? <Text style={styles.errorText}>{validation.offers}</Text> : null}

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, !isEditing && styles.readonlyInput]}
          value={editableService.description}
          onChangeText={(text) =>
            setEditableService({ ...editableService, description: text })
          }
          editable={isEditing}
          multiline
          placeholder="Enter description (optional)"
        />

        {/* Price */}
        <Text style={styles.label}>Price <Text style={{color:'#e74c3c'}}>*</Text></Text>
        <TextInput
          style={[styles.input, !isEditing && styles.readonlyInput, validation.price && styles.inputError]}
          value={String(editableService?.price ?? "")}
          onChangeText={(text) => {
            setEditableService({ ...editableService, price: text });
            if (validation.price) setValidation(v => ({ ...v, price: '' }));
          }}
          editable={isEditing}
          keyboardType="numeric"
          placeholder="Enter price"
        />
        {validation.price ? <Text style={styles.errorText}>{validation.price}</Text> : null}

        {/* Stock */}
        <Text style={styles.label}>Quantity<Text style={{color:'#e74c3c'}}>*</Text></Text>
        <TextInput
          style={[styles.input, !isEditing && styles.readonlyInput, validation.quantity && styles.inputError]}
          value={String(editableService?.quantity ?? "")}
          onChangeText={(text) => {
            setEditableService({ ...editableService, quantity: text });
            if (validation.quantity) setValidation(v => ({ ...v, quantity: '' }));
          }}
          editable={isEditing}
          keyboardType="numeric"
          placeholder="Enter stock quantity"
        />
        {validation.quantity ? <Text style={styles.errorText}>{validation.quantity}</Text> : null}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Status */}
        <View style={styles.toggleRow}>
          <Text style={styles.label}>
            Active Status: {status ? "Active" : "Inactive"}
          </Text>
          <Switch
            value={status}
            onValueChange={setStatus}
            disabled={!isEditing}
            thumbColor={status ? "#4CAF50" : "#F44336"}
          />
        </View>

        {/* Inline save removed in favor of modal editing */}
      </View>
      {/* Edit Service Modal */}
      <ServiceFormModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        mode="edit"
        initial={{
          service_id: service.service_id,
          offers: service.offers,
          description: service.description,
          price: service.price,
          quantity: service.quantity,
          package: (service as any).package,
          status: service.status,
          shop_id: shopId || undefined
        }}
        shopId={shopId}
        onSaved={() => {
          // After successful save, just close modal; list will refresh when navigating back.
          setFormVisible(false);
          // Optionally, navigate back to list
          // navigation.goBack();
        }}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f4f6f9',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18
  },
  backBtn: {
    marginRight: 10,
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#ecf0f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: '#2980b9',
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: "#2c3e50",
    letterSpacing: 0.5,
    textAlign: 'center',
    marginLeft: -32, // visually center title with back button
  },
  actions: {
    flexDirection: "row",
  },
  iconBtn: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#ecf0f1",
  },
  iconImg: {
    width: 22,
    height: 22,
    tintColor: "#2980b9",
    resizeMode: "contain"
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 14,
    marginBottom: 6,
    color: "#34495e"
  },
  input: {
    borderWidth: 1,
    borderColor: "#dfe6e9",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#fff",
    marginBottom: 10,
    color: "#2c3e50"
  },
  readonlyInput: {
    backgroundColor: "#f0f2f5",
    color: "#7f8c8d"
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: "#ecf0f1"
  },
  saveBtn: {
    backgroundColor: "#3498db",
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 28,
    alignItems: "center",
    elevation: 3
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5
  },
  // ...existing code...
  divider: {
    height: 1,
    backgroundColor: '#ecf0f1',
    marginVertical: 16,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 13,
    marginBottom: 2,
    marginLeft: 2,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  }
})
