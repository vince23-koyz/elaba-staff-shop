import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';
import Icons from './Icons';

export type ManageHeaderActive = 'booking' | 'scheduled' | 'delivery';

interface Props {
  active?: ManageHeaderActive;
}

export default function ManageHeader({ active }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.quickLinksSection}>
      <Text style={styles.quickLinksTitle}>Manage</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.segmentRow}
      >
        <TouchableOpacity
          style={[styles.segmentBtn, styles.segmentBtnStandard, active === 'booking' && styles.segmentBtnActive]}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('BookingManagement')}
        >
          <View style={[styles.segmentIconWrap, active === 'booking' && styles.segmentIconWrapActive]}>
            <Icons.Calendar size={16} color="#2c3e50" />
          </View>
          <Text style={styles.segmentText}>Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, styles.segmentBtnStandard, active === 'scheduled' && styles.segmentBtnActive]}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('ScheduledSummary')}
        >
          <View style={styles.segmentIconWrap}>
            <Icons.Calendar size={16} color="#2c3e50" />
          </View>
          <Text style={styles.segmentText}>Scheduled</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, styles.segmentBtnWide, active === 'delivery' && styles.segmentBtnActive]}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('PickupDelivery')}
        >
          <View style={[styles.segmentIconWrap, active === 'delivery' && styles.segmentIconWrapActive]}>
            <Icons.Truck size={16} color="#2c3e50" />
          </View>
          <Text style={styles.segmentText}>Pickup & Delivery</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  quickLinksSection: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e6edf2',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickLinksTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
    flexGrow: 0,
  },
  segmentBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f8fb',
    borderWidth: 1,
    borderColor: '#dbe7f1',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  segmentBtnStandard: {
    width: 132,
  },
  segmentBtnWide: {
    width: 190,
  },
  segmentBtnActive: {
    backgroundColor: '#e9f3ff',
    borderColor: '#bcdcff',
  },
  segmentIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef6ff',
    borderWidth: 1,
    borderColor: '#d6e6ff',
    marginRight: 8,
    flexShrink: 0,
  },
  segmentIconWrapActive: {
    backgroundColor: '#dcecff',
    borderColor: '#bcdcff',
  },
  segmentText: {
    color: '#2c3e50',
    fontWeight: '700',
    fontSize: 13,
    flexShrink: 0,
  },
});
