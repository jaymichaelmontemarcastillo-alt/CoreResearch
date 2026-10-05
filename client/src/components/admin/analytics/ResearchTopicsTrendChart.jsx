// src/components/admin/analytics/ResearchTopicsTrendChart.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { Badge } from '../../ui/Badge';
import {
  HiChartBar,
  HiAdjustmentsHorizontal,
  HiSparkles,
  HiHashtag,
} from 'react-icons/hi2';

/**
 * Custom dark-mode friendly tooltip for individual topic bars
 */
const CustomTopicBarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-[#1c1d28]/95 backdrop-blur-md border border-gray-200 dark:border-[#2b2d3f] shadow-2xl text-xs space-y-2 min-w-[210px] max-w-[280px] z-50">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2b2d3f] pb-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-bold text-gray-900 dark:text-white tracking-tight truncate">
              {item.name || item.topic || item.shortLabel}
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 shrink-0">
            {item.count} {item.count === 1 ? 'project' : 'projects'}
          </span>
        </div>

        <div className="flex items-center justify-between text-gray-500 dark:text-[#a0a3bd] text-[11px]">
          <span>Proportion of Total:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {item.percentage}%
          </span>
        </div>

        {Array.isArray(item.projectTitles) && item.projectTitles.length > 0 && (
          <div className="pt-1.5 border-t border-gray-100 dark:border-[#2b2d3f] space-y-1">
            <div className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500">
              Sample Titles:
            </div>
            <ul className="space-y-0.5">
              {item.projectTitles.slice(0, 3).map((title, idx) => (
                <li
                  key={idx}
                  className="text-[11px] text-gray-700 dark:text-gray-300 truncate list-disc list-inside"
                >
                  {title}
                </li>
              ))}
              {item.projectTitles.length > 3 && (
                <li className="text-[10px] text-blue-500 font-medium">
                  +{item.projectTitles.length - 3} more
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const ResearchTopicsTrendChart = ({ data, loading = false }) => {
  // Extract all topics and only those that exist (count > 0)
  const allTopics = data?.topics || [];
  const existingTopics = useMemo(() => {
    if (data?.existingTopics && data.existingTopics.length > 0) {
      return data.existingTopics;
    }
    return allTopics.filter((t) => (t.count || t.totalVolume || 0) > 0);
  }, [data, allTopics]);

  // Selected topics filter set (defaults to all existing topics)
  const [selectedTopicIds, setSelectedTopicIds] = useState(() => {
    return new Set(existingTopics.map((t) => t.id));
  });

  // Keep selectedTopicIds in sync when existingTopics changes
  useEffect(() => {
    if (existingTopics.length > 0) {
      setSelectedTopicIds(new Set(existingTopics.map((t) => t.id)));
    }
  }, [existingTopics]);

  // Toggle single topic filter
  const toggleTopic = (id) => {
    setSelectedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) {
          next.delete(id);
        }
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedTopicIds(new Set(existingTopics.map((t) => t.id)));
  };

  // Filtered dataset for the bar chart (only existing topics that are active in the filter)
  const displayData = useMemo(() => {
    return existingTopics.filter((t) => selectedTopicIds.has(t.id));
  }, [existingTopics, selectedTopicIds]);

  const totalVisibleProjects = useMemo(() => {
    return displayData.reduce((acc, cur) => acc + (cur.count || cur.totalVolume || 0), 0);
  }, [displayData]);

  // Top topic for badge spotlight
  const topTopic = useMemo(() => {
    if (data?.topTopic && selectedTopicIds.has(data.topTopic.id)) {
      return data.topTopic;
    }
    if (displayData.length === 0) return null;
    return [...displayData].sort((a, b) => (b.count || 0) - (a.count || 0))[0];
  }, [data, displayData, selectedTopicIds]);

  const isEmpty = !loading && displayData.length === 0;

  return (
    <ChartCard
      title="Research Topics"
      subtitle="Volume and distribution of research projects categorized by domain keyword"
      loading={loading}
      isEmpty={isEmpty}
      emptyMessage="No research topic records found"
      icon={HiChartBar}
      badge={
        topTopic && (topTopic.count || topTopic.totalVolume) > 0 ? (
          <Badge variant="blue" className="flex items-center gap-1 font-semibold text-[11px] py-0.5">
            <HiSparkles className="w-3 h-3 text-blue-400" />
            <span>
              Leading: {topTopic.shortLabel || topTopic.name} ({topTopic.count || topTopic.totalVolume})
            </span>
          </Badge>
        ) : null
      }
    >
      <div className="w-full space-y-3 pt-1">
        {/* Interactive Topic Filter Badges (only topics that exist) */}
        {existingTopics.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            <div className="text-[11px] font-medium text-gray-400 dark:text-[#7f839b] mr-1 flex items-center gap-1">
              <HiAdjustmentsHorizontal className="w-3.5 h-3.5" />
              <span>Filter:</span>
            </div>

            {existingTopics.map((topic) => {
              const isSelected = selectedTopicIds.has(topic.id);
              const count = topic.count || topic.totalVolume || 0;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => toggleTopic(topic.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                    isSelected
                      ? 'border shadow-xs font-semibold'
                      : 'bg-gray-100/70 dark:bg-[#1c1d28]/70 text-gray-400 dark:text-gray-500 border border-transparent line-through opacity-60 hover:opacity-90'
                  }`}
                  style={
                    isSelected
                      ? {
                          borderColor: `${topic.color}66`,
                          backgroundColor: `${topic.color}15`,
                          color: topic.color,
                        }
                      : {}
                  }
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: isSelected ? topic.color : '#9ca3af',
                    }}
                  />
                  <span>{topic.shortLabel || topic.name}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded-full font-bold"
                    style={
                      isSelected
                        ? {
                            backgroundColor: `${topic.color}25`,
                            color: topic.color,
                          }
                        : { backgroundColor: '#e5e7eb', color: '#6b7280' }
                    }
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {selectedTopicIds.size < existingTopics.length && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline px-1.5 py-1"
              >
                Reset All
              </button>
            )}
          </div>
        )}

        {/* Bar Graph: X-Axis represents research topics */}
        <div className="w-full h-[260px]">
          <ResponsiveContainer width="100%" height="100%" debounce={150}>
            <BarChart
              data={displayData}
              margin={{ top: 15, right: 15, left: -20, bottom: displayData.length > 5 ? 20 : 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                className="dark:stroke-[#222433]"
                vertical={false}
              />
              <XAxis
                dataKey="shortLabel"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
                interval={0}
                angle={displayData.length > 5 ? -18 : 0}
                textAnchor={displayData.length > 5 ? 'end' : 'middle'}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTopicBarTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.06)' }} />
              <Bar
                dataKey="count"
                name="Projects"
                radius={[6, 6, 0, 0]}
                maxBarSize={44}
              >
                {displayData.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Footer Summary Insight */}
        <div className="pt-2 border-t border-gray-100 dark:border-[#222433] flex flex-wrap items-center justify-between text-[11px] text-gray-500 dark:text-[#9396a8] gap-2">
          <div className="flex items-center gap-1.5">
            <HiHashtag className="w-3.5 h-3.5 text-blue-500" />
            <span>
              {displayData.length} {displayData.length === 1 ? 'topic domain' : 'topic domains'} active
            </span>
          </div>
          <div>
            Total classified projects:{' '}
            <span className="font-bold text-gray-900 dark:text-white">
              {totalVisibleProjects}
            </span>
          </div>
        </div>
      </div>
    </ChartCard>
  );
};

export default ResearchTopicsTrendChart;
