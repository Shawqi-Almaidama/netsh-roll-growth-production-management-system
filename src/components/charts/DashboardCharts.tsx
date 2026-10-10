import React, { useState } from 'react';

// ============================================================================
// 1. Horizontal Workflow Stages Chart (مخطط مسار ومراحل طلبات الاحتياج)
// ============================================================================
export interface WorkflowStageItem {
  status: string;
  label: string;
  count: number;
  color?: string;
}

export const HorizontalWorkflowChart: React.FC<{
  data: WorkflowStageItem[];
  totalCount?: number;
}> = ({ data, totalCount = 0 }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0 || totalCount === 0) {
    return (
      <div className="h-48 w-full flex flex-col items-center justify-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <span>لا توجد طلبات احتياج مسجلة للفترة المحددة</span>
      </div>
    );
  }

  const maxVal = Math.max(1, ...data.map((d) => d.count));

  const statusColors: Record<string, { bar: string; bg: string; text: string }> = {
    DRAFT: { bar: '#94a3b8', bg: 'bg-slate-100', text: 'text-slate-600' },
    SUBMITTED: { bar: '#f59e0b', bg: 'bg-amber-100', text: 'text-amber-700' },
    UNDER_REVIEW: { bar: '#3b82f6', bg: 'bg-blue-100', text: 'text-blue-700' },
    APPROVED: { bar: '#10b981', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    REJECTED: { bar: '#ef4444', bg: 'bg-rose-100', text: 'text-rose-700' },
    COMPLETED: { bar: '#059669', bg: 'bg-emerald-100', text: 'text-emerald-800' }
  };

  return (
    <div className="w-full space-y-2.5 py-1">
      {data.map((item, idx) => {
        const pct = Math.max(0, Math.min(100, (item.count / maxVal) * 100));
        const colors = statusColors[item.status] || {
          bar: item.color || '#3b82f6',
          bg: 'bg-slate-100',
          text: 'text-slate-700'
        };
        const isHovered = hoveredIndex === idx;

        return (
          <div
            key={item.status || idx}
            className={`group p-1.5 rounded-lg transition-colors cursor-default ${
              isHovered ? 'bg-slate-50' : ''
            }`}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: colors.bar }}
                />
                {item.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900">
                  {item.count.toLocaleString('ar-EG')} طلب
                </span>
                <span className="text-[10px] text-slate-400 font-mono w-9 text-left">
                  {totalCount > 0 ? `${Math.round((item.count / totalCount) * 100)}%` : '0%'}
                </span>
              </div>
            </div>

            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  backgroundColor: colors.bar
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// 2. Vertical Categorical Bar Chart (مخطط أعمدة بيانية رأسية)
// Used for: Requisition Types, Daily Mortality, Daily Sales Revenue
// ============================================================================
export interface BarChartItem {
  label: string;
  value: number;
  color?: string;
  formattedValue?: string;
  subLabel?: string;
}

export const VerticalBarChart: React.FC<{
  data: BarChartItem[];
  height?: number;
  barColor?: string;
  unitLabel?: string;
  yAxisFormatter?: (v: number) => string;
  emptyMessage?: string;
}> = ({
  data,
  height = 200,
  barColor = '#3b82f6',
  unitLabel = '',
  yAxisFormatter = (v) => v.toLocaleString('ar-EG'),
  emptyMessage = 'لا توجد بيانات مسجلة للفترة المحددة'
}) => {
  const [activeTooltip, setActiveTooltip] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200"
        style={{ height }}
      >
        <span>{emptyMessage}</span>
      </div>
    );
  }

  const rawMax = Math.max(...data.map((d) => d.value));
  // Provide nice rounded ceil for y-axis
  const maxVal = rawMax === 0 ? 10 : Math.ceil(rawMax * 1.15);

  const svgWidth = 600;
  const svgHeight = height;
  const padLeft = 60;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 36;
  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxVal * ratio));
  const numBars = data.length;
  const slotWidth = chartWidth / numBars;
  const barWidth = Math.min(48, Math.max(16, slotWidth * 0.55));

  return (
    <div className="relative w-full overflow-x-auto" style={{ height }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full min-w-[420px] h-full select-none"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Horizontal grid lines & Y-axis labels */}
        {yTicks.map((tickVal, i) => {
          const y = padTop + chartHeight - (tickVal / maxVal) * chartHeight;
          return (
            <g key={i}>
              <line
                x1={padLeft}
                y1={y}
                x2={svgWidth - padRight}
                y2={y}
                stroke="#f1f5f9"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <text
                x={padLeft - 8}
                y={y + 3}
                fill="#94a3b8"
                fontSize={10}
                textAnchor="end"
                fontFamily="monospace"
              >
                {yAxisFormatter(tickVal)}
              </text>
            </g>
          );
        })}

        {/* X-axis baseline */}
        <line
          x1={padLeft}
          y1={padTop + chartHeight}
          x2={svgWidth - padRight}
          y2={padTop + chartHeight}
          stroke="#e2e8f0"
          strokeWidth={1}
        />

        {/* Bars */}
        {data.map((item, idx) => {
          const x = padLeft + idx * slotWidth + (slotWidth - barWidth) / 2;
          const barH = Math.max(0, (item.value / maxVal) * chartHeight);
          const y = padTop + chartHeight - barH;
          const isHovered = activeTooltip?.index === idx;
          const color = item.color || barColor;

          return (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setActiveTooltip({
                  index: idx,
                  x: rect.left + rect.width / 2,
                  y: rect.top
                });
              }}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              {/* Invisible touch/hover target */}
              <rect
                x={padLeft + idx * slotWidth}
                y={padTop}
                width={slotWidth}
                height={chartHeight}
                fill="transparent"
              />

              {/* Bar background on hover */}
              {isHovered && (
                <rect
                  x={padLeft + idx * slotWidth + 2}
                  y={padTop}
                  width={slotWidth - 4}
                  height={chartHeight}
                  fill="#f8fafc"
                  rx={4}
                />
              )}

              {/* The data bar */}
              <rect
                x={x}
                y={barH === 0 ? padTop + chartHeight - 2 : y}
                width={barWidth}
                height={Math.max(2, barH)}
                fill={color}
                opacity={isHovered ? 1 : 0.85}
                rx={4}
                ry={4}
                className="transition-all duration-300"
              />

              {/* Value label above bar if space permits */}
              {barH > 14 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  fill="#475569"
                  fontSize={10}
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {item.formattedValue || item.value.toLocaleString('ar-EG')}
                </text>
              )}

              {/* X-axis label */}
              <text
                x={x + barWidth / 2}
                y={padTop + chartHeight + 18}
                fill={isHovered ? '#0f172a' : '#64748b'}
                fontSize={10}
                fontWeight={isHovered ? 'bold' : 'normal'}
                textAnchor="middle"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Interactive Tooltip Card */}
      {activeTooltip !== null && (
        <div
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-slate-900 text-white text-xs py-1.5 px-3 rounded-lg shadow-lg"
          style={{
            left: `${((activeTooltip.index + 0.5) / numBars) * 100}%`,
            top: '20%'
          }}
        >
          <p className="font-semibold text-slate-200">
            {data[activeTooltip.index].label}
          </p>
          <p className="font-bold text-emerald-400 font-mono mt-0.5">
            {data[activeTooltip.index].formattedValue ||
              `${data[activeTooltip.index].value.toLocaleString('ar-EG')} ${unitLabel}`}
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. Trend Line & Gradient Area Chart (مخطط المسار الزمني والإنتاج)
// Used for: Daily Egg Production Trend
// ============================================================================
export interface TrendLinePoint {
  date: string;
  value: number;
  formattedValue?: string;
  label?: string;
}

export const TrendLineAreaChart: React.FC<{
  data: TrendLinePoint[];
  height?: number;
  strokeColor?: string;
  gradientId?: string;
  unitLabel?: string;
  emptyMessage?: string;
}> = ({
  data,
  height = 220,
  strokeColor = '#059669',
  gradientId = 'eggProdGrad',
  unitLabel = 'طبق',
  emptyMessage = 'لا توجد سجلات إنتاج مسجلة للفترة المحددة'
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200"
        style={{ height }}
      >
        <span>{emptyMessage}</span>
      </div>
    );
  }

  const rawMax = Math.max(...data.map((d) => d.value));
  const maxVal = rawMax === 0 ? 100 : Math.ceil(rawMax * 1.15);

  const svgWidth = 600;
  const svgHeight = height;
  const padLeft = 55;
  const padRight = 25;
  const padTop = 20;
  const padBottom = 34;
  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(maxVal * r));

  // Compute points coordinates
  const n = data.length;
  const coords = data.map((d, i) => {
    const x = n === 1 ? padLeft + chartWidth / 2 : padLeft + (i / (n - 1)) * chartWidth;
    const y = padTop + chartHeight - (d.value / maxVal) * chartHeight;
    return { x, y, data: d };
  });

  // Construct smooth bezier SVG path
  let pathD = '';
  if (coords.length === 1) {
    pathD = `M ${coords[0].x - 20} ${coords[0].y} L ${coords[0].x + 20} ${coords[0].y}`;
  } else {
    pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const cx = (p0.x + p1.x) / 2;
      pathD += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
  }

  // Area path (closed at bottom)
  let areaD = '';
  if (coords.length > 1) {
    areaD = `${pathD} L ${coords[coords.length - 1].x} ${padTop + chartHeight} L ${coords[0].x} ${padTop + chartHeight} Z`;
  }

  return (
    <div className="relative w-full overflow-x-auto" style={{ height }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full min-w-[420px] h-full select-none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((tickVal, i) => {
          const y = padTop + chartHeight - (tickVal / maxVal) * chartHeight;
          return (
            <g key={i}>
              <line
                x1={padLeft}
                y1={y}
                x2={svgWidth - padRight}
                y2={y}
                stroke="#f1f5f9"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <text
                x={padLeft - 8}
                y={y + 3}
                fill="#94a3b8"
                fontSize={10}
                textAnchor="end"
                fontFamily="monospace"
              >
                {tickVal.toLocaleString('ar-EG')}
              </text>
            </g>
          );
        })}

        {/* Baseline */}
        <line
          x1={padLeft}
          y1={padTop + chartHeight}
          x2={svgWidth - padRight}
          y2={padTop + chartHeight}
          stroke="#e2e8f0"
          strokeWidth={1}
        />

        {/* Area fill */}
        {areaD && <path d={areaD} fill={`url(#${gradientId})`} />}

        {/* The line */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive Dots and Dates */}
        {coords.map((pt, i) => {
          const isHovered = hoveredPoint === i;
          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(i)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Touch hit area */}
              <circle cx={pt.x} cy={pt.y} r={18} fill="transparent" />

              {/* Highlight halo */}
              {isHovered && (
                <circle cx={pt.x} cy={pt.y} r={10} fill={strokeColor} opacity={0.2} />
              )}

              {/* Data dot */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 6 : 4}
                fill="#ffffff"
                stroke={strokeColor}
                strokeWidth={isHovered ? 3 : 2}
                className="transition-all duration-200"
              />

              {/* Date label at bottom */}
              <text
                x={pt.x}
                y={padTop + chartHeight + 18}
                fill={isHovered ? '#0f172a' : '#64748b'}
                fontSize={10}
                fontWeight={isHovered ? 'bold' : 'normal'}
                textAnchor="middle"
                fontFamily="monospace"
              >
                {pt.data.date}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredPoint !== null && (
        <div
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-slate-900 text-white text-xs py-1.5 px-3 rounded-lg shadow-lg"
          style={{
            left: `${((coords[hoveredPoint].x - padLeft) / chartWidth) * 80 + 10}%`,
            top: '25%'
          }}
        >
          <p className="font-semibold text-slate-300 font-mono">
            {coords[hoveredPoint].data.date}
          </p>
          <p className="font-bold text-emerald-400 font-mono mt-0.5">
            {coords[hoveredPoint].data.value.toLocaleString('ar-EG')} {unitLabel}
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. Comparison Grouped Bar Chart (مخطط المقارنة المزدوج للإنتاج والوفيات)
// Used for: Production Manager Dashboard (أحمد صبر)
// ============================================================================
export interface ComparisonItem {
  record_date: string;
  total_prod: number;
  total_mortality: number;
}

export const ComparisonBarChart: React.FC<{
  data: ComparisonItem[];
  height?: number;
  emptyMessage?: string;
}> = ({
  data,
  height = 240,
  emptyMessage = 'لا توجد سجلات إنتاج كافية للرسم البياني'
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200"
        style={{ height }}
      >
        <span>{emptyMessage}</span>
      </div>
    );
  }

  const rawMax = Math.max(
    ...data.map((d) => Math.max(d.total_prod || 0, d.total_mortality || 0))
  );
  const maxVal = rawMax === 0 ? 100 : Math.ceil(rawMax * 1.15);

  const svgWidth = 600;
  const svgHeight = height;
  const padLeft = 55;
  const padRight = 25;
  const padTop = 32;
  const padBottom = 34;
  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(maxVal * r));
  const numGroups = data.length;
  const groupWidth = chartWidth / numGroups;
  const barW = Math.min(22, Math.max(10, groupWidth * 0.35));

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Legend */}
      <div className="flex items-center justify-end gap-4 text-xs mb-1 px-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block" />
          <span className="text-slate-700 font-medium">الإنتاج اليومي (طبق)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" />
          <span className="text-slate-700 font-medium">الوفيات (طائر)</span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[420px] h-full select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
        {yTicks.map((tickVal, i) => {
          const y = padTop + chartHeight - (tickVal / maxVal) * chartHeight;
          return (
            <g key={i}>
              <line
                x1={padLeft}
                y1={y}
                x2={svgWidth - padRight}
                y2={y}
                stroke="#f1f5f9"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <text
                x={padLeft - 8}
                y={y + 3}
                fill="#94a3b8"
                fontSize={10}
                textAnchor="end"
                fontFamily="monospace"
              >
                {tickVal.toLocaleString('ar-EG')}
              </text>
            </g>
          );
        })}

        {/* Baseline */}
        <line
          x1={padLeft}
          y1={padTop + chartHeight}
          x2={svgWidth - padRight}
          y2={padTop + chartHeight}
          stroke="#e2e8f0"
          strokeWidth={1}
        />

        {/* Dual Bars */}
        {data.map((item, idx) => {
          const groupCenterX = padLeft + idx * groupWidth + groupWidth / 2;
          const prodH = Math.max(0, ((item.total_prod || 0) / maxVal) * chartHeight);
          const mortH = Math.max(0, ((item.total_mortality || 0) / maxVal) * chartHeight);
          const prodX = groupCenterX - barW - 2;
          const mortX = groupCenterX + 2;
          const isHovered = hoveredIdx === idx;

          return (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Background highlight */}
              {isHovered && (
                <rect
                  x={padLeft + idx * groupWidth + 2}
                  y={padTop}
                  width={groupWidth - 4}
                  height={chartHeight}
                  fill="#f8fafc"
                  rx={4}
                />
              )}

              {/* Prod Bar (Green) */}
              <rect
                x={prodX}
                y={padTop + chartHeight - prodH}
                width={barW}
                height={Math.max(2, prodH)}
                fill="#047857"
                rx={3}
                className="transition-all duration-300"
              />

              {/* Mortality Bar (Red) */}
              <rect
                x={mortX}
                y={padTop + chartHeight - mortH}
                width={barW}
                height={Math.max(2, mortH)}
                fill="#f43f5e"
                rx={3}
                className="transition-all duration-300"
              />

              {/* Date label */}
              <text
                x={groupCenterX}
                y={padTop + chartHeight + 18}
                fill={isHovered ? '#0f172a' : '#64748b'}
                fontSize={10}
                fontWeight={isHovered ? 'bold' : 'normal'}
                textAnchor="middle"
                fontFamily="monospace"
              >
                {item.record_date}
              </text>
            </g>
          );
        })}
        </svg>
      </div>

      {/* Floating Tooltip */}
      {hoveredIdx !== null && (
        <div
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-slate-900 text-white text-xs py-2 px-3 rounded-lg shadow-lg space-y-1"
          style={{
            left: `${((hoveredIdx + 0.5) / numGroups) * 100}%`,
            top: '20%'
          }}
        >
          <p className="font-bold text-slate-200 font-mono">
            {data[hoveredIdx].record_date}
          </p>
          <div className="flex items-center gap-2 text-emerald-400">
            <span>الإنتاج:</span>
            <span className="font-bold font-mono">
              {data[hoveredIdx].total_prod.toLocaleString('ar-EG')} طبق
            </span>
          </div>
          <div className="flex items-center gap-2 text-rose-400">
            <span>الوفيات:</span>
            <span className="font-bold font-mono">
              {data[hoveredIdx].total_mortality.toLocaleString('ar-EG')} طائر
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
