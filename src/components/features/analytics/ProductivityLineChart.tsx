import React from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { ProductivityTrend } from '@/types';
import { ChartCard } from './ChartCard';

interface ProductivityLineChartProps {
  data: ProductivityTrend[];
  title: string;
  description?: string;
  isLoading?: boolean;
}

export const ProductivityLineChart: React.FC<ProductivityLineChartProps> = ({
  data,
  title,
  description,
  isLoading = false,
}) => {
  const { t, i18n } = useTranslation();
  // Format data for chart
  const chartData = data.map(item => ({
    ...item,
    formattedDate: formatDate(item.date, i18n.language),
    hours: (item.value / 60).toFixed(1),
  }));

  return (
    <ChartCard
      title={title}
      description={description}
      isLoading={isLoading}
      isEmpty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="productivityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis
            dataKey="formattedDate"
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
            label={{ value: t('analytics.hours'), angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }}
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
            formatter={(value: number) => [`${value} ${t('analytics.hours').toLowerCase()}`, t('analytics.productivity')]}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="hours"
            stroke="#0ea5e9"
            strokeWidth={3}
            dot={{ fill: '#0ea5e9', r: 4 }}
            activeDot={{ r: 6, fill: '#38bdf8' }}
            name={t('analytics.hoursTracked')}
            fill="url(#productivityGradient)"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

// Helper function to format dates
function formatDate(dateStr: string, locale: string): string {
  const lang = locale === 'ar' ? 'ar' : 'en-US';

  // Handle different date formats (day, week, month)
  if (dateStr.includes('W')) {
    // Week format: 2025-W14
    const [_year, week] = dateStr.split('-W');
    // "Week" is already translated in the parent component via t()
    return `${locale === 'ar' ? 'أسبوع' : 'Week'} ${week}`;
  } else if (dateStr.match(/^\d{4}-\d{2}$/)) {
    // Month format: 2025-01
    const [year, month] = dateStr.split('-');
    // Guard against undefined
    if (!year || !month) {
      return dateStr;
    }
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString(lang, { month: 'short', year: 'numeric' });
  } else {
    // Day format: 2025-01-15
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang, { month: 'short', day: 'numeric' });
  }
}
