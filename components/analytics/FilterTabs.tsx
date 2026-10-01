import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';

export type FilterPeriod = 'day' | 'week' | 'month' | 'year';

interface FilterTab {
  key: FilterPeriod;
  label: string;
  description?: string;
}

interface FilterTabsProps {
  activeFilter: FilterPeriod;
  onFilterChange: (filter: FilterPeriod) => void;
  style?: ViewStyle;
}

const FilterTabs: React.FC<FilterTabsProps> = ({
  activeFilter,
  onFilterChange,
  style,
}) => {
  const filters: FilterTab[] = [
    { key: 'day', label: 'Today', description: 'Last 24 hours' },
    { key: 'week', label: 'Week', description: 'Last 7 days' },
    { key: 'month', label: 'Month', description: 'Current month' },
    { key: 'year', label: 'Year', description: 'Last 12 months' },
  ];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.tabsContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            onPress={() => onFilterChange(filter.key)}
            style={[
              styles.tab,
              activeFilter === filter.key && styles.activeTab,
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeFilter === filter.key && styles.activeTabText,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  activeTab: {
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#1fa0a2',
    fontWeight: '700',
  },
});

export default FilterTabs;