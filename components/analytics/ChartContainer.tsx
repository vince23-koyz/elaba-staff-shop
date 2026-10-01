import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';

const { width: screenWidth } = Dimensions.get('window');

interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }>;
}

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  data: ChartData;
  type: 'line' | 'bar';
  period: 'day' | 'week' | 'month' | 'year';
  onDataPointClick?: (data: { index: number; value: number; x: number; y: number }) => void;
  currencyFormat?: boolean;
  height?: number;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  subtitle,
  data,
  type,
  period,
  onDataPointClick,
  currencyFormat = true,
  height = 240,
}) => {
  // Calculate dynamic chart width for horizontal scrolling on dense data
  const calculateChartWidth = () => {
    const baseWidth = screenWidth - 48; // Account for padding
    const minBarWidth = 40;
    const minLinePointSpacing = 35;
    
    if (period === 'day') {
      return Math.max(baseWidth, data.labels.length * minLinePointSpacing);
    }
    if (period === 'month') {
      return Math.max(baseWidth, data.labels.length * minBarWidth * 0.8);
    }
    return baseWidth;
  };

  const chartWidth = calculateChartWidth();
  const needsHorizontalScroll = chartWidth > screenWidth - 48;

  // Enhanced chart configuration with professional styling
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(31, 160, 162, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
    strokeWidth: 2.5,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#1fa0a2',
      fill: '#ffffff',
    },
    propsForBackgroundLines: {
      strokeDasharray: '', // Solid lines
      strokeWidth: 1,
      stroke: '#f3f4f6',
    },
    propsForLabels: {
      fontSize: 12,
      fontWeight: '500',
    },
  };

  // Format labels for better readability based on period
  const formatLabels = (labels: string[]) => {
    if (period === 'day') {
      // Show every 3rd hour for daily view
      return labels.map((label, index) => 
        index % 3 === 0 ? label : ''
      );
    }
    if (period === 'month') {
      // Show every other day for monthly view
      return labels.map((label, index) => 
        index % 2 === 0 ? label : ''
      );
    }
    return labels;
  };

  const displayData = {
    ...data,
    labels: formatLabels(data.labels),
  };

  const renderChart = () => {
    const commonProps = {
      data: displayData,
      width: chartWidth,
      height,
      chartConfig,
      style: styles.chart,
      fromZero: true,
      yAxisLabel: currencyFormat ? '₱ ' : '',
      yAxisSuffix: '',
      verticalLabelRotation: period === 'day' || period === 'month' ? 30 : 0,
    };

    if (type === 'line') {
      return (
        <LineChart
          {...commonProps}
          bezier
          onDataPointClick={onDataPointClick}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLines={period !== 'day'}
          withHorizontalLines={true}
          segments={4}
        />
      );
    }

    return (
      <BarChart
        {...commonProps}
        showValuesOnTopOfBars={false}
        withCustomBarColorFromData={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      
      <View style={styles.chartWrapper}>
        {needsHorizontalScroll ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {renderChart()}
          </ScrollView>
        ) : (
          <View style={{ alignItems: 'center' }}>
            {renderChart()}
          </View>
        )}
      </View>
      
      {needsHorizontalScroll && (
        <Text style={styles.scrollHint}>← Scroll to see more data →</Text>
      )}
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
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  chartWrapper: {
    overflow: 'hidden',
  },
  scrollContent: {
    paddingRight: 20,
  },
  chart: {
    borderRadius: 12,
  },
  scrollHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 8,
  },
});

export default ChartContainer;