import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import * as Icons from 'lucide-react-native';

interface PaymentMethodItem {
  method: string;
  amount: number;
  percentage: number;
  icon: keyof typeof Icons;
  color: string;
}

interface PaymentMethodBreakdownProps {
  title: string;
  data: PaymentMethodItem[];
  currencyFormatter: (amount: number) => string;
}

const PaymentMethodBreakdown: React.FC<PaymentMethodBreakdownProps> = ({
  title,
  data,
  currencyFormatter,
}) => {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.emptyText}>No payment data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.itemsContainer}>
        {data.map((item, index) => {
          const IconComponent = Icons[item.icon] as LucideIcon;
          return (
            <TouchableOpacity key={index} style={styles.item} activeOpacity={0.7}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                  <IconComponent size={20} color={item.color} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.methodName}>{item.method}</Text>
                  <Text style={styles.methodAmount}>{currencyFormatter(item.amount)}</Text>
                </View>
              </View>
              
              <View style={styles.itemRight}>
                <Text style={styles.percentage}>{item.percentage.toFixed(1)}%</Text>
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }
                    ]} 
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },
  itemsContainer: {
    gap: 16,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  methodAmount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  itemRight: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  percentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  progressBarContainer: {
    width: 60,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});

export default PaymentMethodBreakdown;