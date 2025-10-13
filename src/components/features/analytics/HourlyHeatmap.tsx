import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { HourlyPattern } from '../../../types';
import { ChartCard } from './ChartCard';

interface HourlyHeatmapProps {
  data: HourlyPattern[];
  title: string;
  description?: string;
  isLoading?: boolean;
}

export const HourlyHeatmap: React.FC<HourlyHeatmapProps> = ({
  data,
  title,
  description,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  // Sort data by hour and format for chart
  const chartData = [...data]
    .sort((a, b) => a.hour - b.hour)
    .map(item => ({
      hour: formatHour(item.hour, t),
      minutes: item.avgMinutes,
      hours: (item.avgMinutes / 60).toFixed(1),
    }));

  // Calculate max value for color intensity
  const maxMinutes = Math.max(...data.map(d => d.avgMinutes), 1);

  // Get color based on intensity
  const getColor = (minutes: number): string => {
    const intensity = minutes / maxMinutes;
    if (intensity > 0.8) return '#0ea5e9'; // Primary blue
    if (intensity > 0.6) return '#38bdf8'; // Light blue
    if (intensity > 0.4) return '#7dd3fc'; // Lighter blue
    if (intensity > 0.2) return '#bae6fd'; // Very light blue
    return '#e0f2fe'; // Pale blue
  };

  return (
    <ChartCard
      title={title}
      description={description}
      isLoading={isLoading}
      isEmpty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis
            dataKey="hour"
            stroke="#94a3b8"
            style={{ fontSize: '11px' }}
          />
          <YAxis
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
            label={{ value: t('analytics.avgHours'), angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            labelStyle={{ color: '#f1f5f9', fontWeight: 600 }}
            itemStyle={{ color: '#cbd5e1' }}
            formatter={(value: number) => [`${value} ${t('analytics.hours').toLowerCase()}`, t('analytics.averageActivity')]}
          />
          <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.minutes)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

// Helper function to format hour (0-23) to 12-hour format
function formatHour(hour: number, t: any): string {
  const am = t('analytics.am');
  const pm = t('analytics.pm');

  if (hour === 0) return `12 ${am}`;
  if (hour === 12) return `12 ${pm}`;
  if (hour < 12) return `${hour} ${am}`;
  return `${hour - 12} ${pm}`;
}
