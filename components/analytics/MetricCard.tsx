import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import * as Icons from 'lucide-react-native';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Icons;
  iconColor?: string;
  backgroundColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  style?: ViewStyle;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconColor = '#1fa0a2',
  backgroundColor = '#ffffff',
  trend,
  trendValue,
  style,
}) => {
  // Safe rendering with error handling
  const getTrendIcon = () => {
    if (!trend) return null;
    try {
      switch (trend) {
        case 'up':
          return { icon: Icons.ArrowUp, color: '#10b981' };
        case 'down':
          return { icon: Icons.ArrowDown, color: '#ef4444' };
        default:
          return { icon: Icons.Minus, color: '#6b7280' };
      }
    } catch {
      return null;
    }
  };

  const trendIcon = getTrendIcon();
  
  // Safe icon component resolution
  const IconComponent = React.useMemo(() => {
    try {
      return Icons[icon] as LucideIcon;
    } catch {
      return Icons.HelpCircle as LucideIcon; // Fallback icon
    }
  }, [icon]);

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <IconComponent size={24} color={iconColor} />
        </View>
        {trendIcon && (
          <View style={styles.trendContainer}>
            <trendIcon.icon size={16} color={trendIcon.color} />
            {trendValue && (
              <Text style={[styles.trendText, { color: trendIcon.color }]}>
                {trendValue}
              </Text>
            )}
          </View>
        )}
      </View>
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(31, 160, 162, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
});

export default MetricCard;