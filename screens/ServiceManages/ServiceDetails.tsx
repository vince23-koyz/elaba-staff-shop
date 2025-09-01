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

// icons
import editIcon from '../../assets/img/edit.png'
import closeIcon from '../../assets/img/close.png'
import deleteIcon from '../../assets/img/delete.png'

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
    setIsEditing(!isEditing)
    setEditableService(service) // reset kapag cancel edit
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

  const handleSave = async () => {
    const success = await updateService(service.service_id, {
      offers: editableService.offers,
      description: editableService.description,
      price: Number(editableService.price),
      quantity: Number(editableService.quantity),
      status: status ? "Active" : "Inactive"
    });
    if (success) setIsEditing(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Service Details</Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={handleEditToggle} style={styles.iconBtn}>
              <Image 
                source={isEditing ? closeIcon : editIcon} 
                style={styles.iconImg} 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
              <Image 
                source={deleteIcon} 
                style={[styles.iconImg, {tintColor: "#e74c3c"}]} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Service Name */}
        <Text style={styles.label}>Service Name</Text>
        <TextInput
          style={[styles.input, !isEditing && styles.readonlyInput]}
          value={editableService.offers}
          onChangeText={(text) =>
            setEditableService({ ...editableService, offers: text })
          }
          editable={isEditing}
        />

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
        />

        {/* Price */}
        <Text style={styles.label}>Price</Text>
        <TextInput
          style={[styles.input, !isEditing && styles.readonlyInput]}
          value={String(editableService?.price ?? "")}
          onChangeText={(text) =>
            setEditableService({ ...editableService, price: text })
          }
          editable={isEditing}
          keyboardType="numeric"
        />

        {/* Stock */}
        <Text style={styles.label}>Stock</Text>
        <TextInput
          style={[styles.input, !isEditing && styles.readonlyInput]}
          value={String(editableService?.quantity ?? "")}
          onChangeText={(text) =>
            setEditableService({ ...editableService, quantity: text })
          }
          editable={isEditing}
          keyboardType="numeric"
        />

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

        {/* Save Button */}
        {isEditing && (
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={actionLoading}>
            <Text style={styles.saveBtnText}>
              {actionLoading ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2c3e50",
    letterSpacing: 0.5
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  }
})
