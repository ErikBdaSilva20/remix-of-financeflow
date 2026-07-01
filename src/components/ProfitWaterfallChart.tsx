import { useRef, useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProfitWaterfallChartProps {
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  className?: string;
  onBarClick?: (metric: string) => void;
  formatCurrency: (amount: number) => string;
}

interface Step {
  name: string;
  displayValue: number; // Absolute magnitude for bar height
  realValue: number;    // Actual signed value for labels and tooltips
  type: 'positive' | 'negative' | 'total';
}

const COLORS = {
  positive: '#047857',
  negative: '#EF4444',
  total: '#059669',
} as const;

const GRADIENTS = {
  positive: ['#34D399', '#047857'],
  negative: ['#FCA5A5', '#DC2626'],
  total: ['#6EE7B7', '#059669'],
} as const;

export function ProfitWaterfallChart({
  revenue,
  cogs,
  operatingExpenses,
  className,
  onBarClick,
  formatCurrency,
}: ProfitWaterfallChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - operatingExpenses;

  // We display all bars growing UP from the bottom baseline using their absolute magnitudes,
  // but we color code them (Green for gains, Red for costs/losses) and show their signed values.
  const steps: Step[] = useMemo(
    () => [
      { name: 'Receita', displayValue: revenue, realValue: revenue, type: 'positive' },
      { name: 'CPV', displayValue: cogs, realValue: -cogs, type: 'negative' },
      { name: 'Lucro Bruto', displayValue: Math.abs(grossProfit), realValue: grossProfit, type: grossProfit >= 0 ? 'positive' : 'negative' },
      { name: 'Desp. Oper.', displayValue: operatingExpenses, realValue: -operatingExpenses, type: 'negative' },
      { name: 'Lucro Líquido', displayValue: Math.abs(netProfit), realValue: netProfit, type: netProfit >= 0 ? 'positive' : 'negative' },
    ],
    [revenue, cogs, grossProfit, operatingExpenses, netProfit]
  );

  // Chart geometry — fixed min width so it always scrolls cleanly on mobile
  const MIN_WIDTH = 480;
  const svgWidth = Math.max(width, MIN_WIDTH);
  const svgHeight = 320;
  const pad = { top: 30, right: 24, bottom: 52, left: 75 };
  const innerW = Math.max(svgWidth - pad.left - pad.right, 1);
  const innerH = svgHeight - pad.top - pad.bottom;

  // Y-axis scale (0 to max absolute magnitude)
  const maxVal = Math.max(...steps.map((s) => s.displayValue), 1000);
  const yScale = (v: number) => yScaleBaseline - (v / maxVal) * innerH;

  // X positioning
  const gap = innerW / steps.length;
  const barW = Math.min(gap * 0.52, 60);
  const xCenter = (i: number) => pad.left + gap * (i + 0.5);

  // Nice clean Y-ticks from 0 to maxVal
  const rawStep = maxVal / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceStep = Math.ceil(rawStep / magnitude) * magnitude;
  const ticks: number[] = [];
  for (let v = 0; v <= maxVal + niceStep/2; v += niceStep) {
    ticks.push(v);
  }

  // Format Y tick
  const fmtTick = (v: number) => {
    if (v === 0) return 'R$ 0';
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
    return `R$ ${v}`;
  };

  // Format bar value label
  const fmtLabel = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
    return formatCurrency(v);
  };

  // The baseline where all bars start (bottom border line)
  const yScaleBaseline = svgHeight - pad.bottom;

  if (!width) {
    return (
      <Card className={`${className ?? ''} w-full min-w-0`}>
        <CardHeader><CardTitle className="text-lg font-semibold">Cascata de Lucro</CardTitle></CardHeader>
        <CardContent className="w-full min-w-0">
          <div ref={containerRef} className="w-full min-w-0">
            <div className="h-80 min-w-[480px]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className ?? ''} w-full min-w-0`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Cascata de Lucro</CardTitle>
      </CardHeader>
      <CardContent className="w-full min-w-0">
        {/* containerRef measures the constrained width */}
        <div ref={containerRef} className="w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <div style={{ minWidth: `${MIN_WIDTH}px`, display: 'block' }}>
              <svg width={svgWidth} height={svgHeight} className="select-none">
            <defs>
              {(['positive', 'negative', 'total'] as const).map((type) => (
                <linearGradient key={type} id={`wf-grad-${type}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GRADIENTS[type][0]} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={GRADIENTS[type][1]} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>

            {/* Grid lines */}
            {ticks.map((v, i) => (
              <line
                key={i}
                x1={pad.left}
                x2={svgWidth - pad.right}
                y1={yScale(v)}
                y2={yScale(v)}
                stroke="hsl(var(--border))"
                strokeWidth={v === 0 ? 1.5 : 0.5}
                strokeDasharray={v === 0 ? 'none' : '4 4'}
                opacity={v === 0 ? 0.7 : 0.4}
              />
            ))}

            {/* Y-axis ticks */}
            {ticks.map((v, i) => (
              <text
                key={i}
                x={pad.left - 8}
                y={yScale(v)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill="hsl(var(--muted-foreground))"
              >
                {fmtTick(v)}
              </text>
            ))}

            {/* Bars growing from bottom to top */}
            {steps.map((step, i) => {
              const x = xCenter(i) - barW / 2;
              const barY = yScale(step.displayValue);
              const barHeight = Math.max(yScaleBaseline - barY, 2);
              const isHovered = hoveredIndex === i;

              // Color based on value type
              const colorType = step.realValue < 0 ? 'negative' : 'positive';
              const labelColor = COLORS[colorType];

              return (
                <g
                  key={i}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => onBarClick?.(step.name)}
                >
                  {/* Hover highlight - constrained to the bar width/height */}
                  {isHovered && (
                    <rect
                      x={x - 4}
                      y={barY - 4}
                      width={barW + 8}
                      height={barHeight + 8}
                      rx={8}
                      fill="hsl(var(--muted))"
                      opacity={0.35}
                    />
                  )}

                  {/* Full-width Top Cap Line */}
                  <line
                    x1={0}
                    x2={svgWidth}
                    y1={barY}
                    y2={barY}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    opacity={isHovered ? 0.3 : 0.15}
                    style={{ transition: 'opacity 0.2s ease' }}
                  />

                  {/* Bar */}
                  <rect
                    x={x}
                    y={barY}
                    width={barW}
                    height={barHeight}
                    rx={5}
                    fill={`url(#wf-grad-${colorType})`}
                    style={{
                      transition: 'opacity 0.2s ease',
                      opacity: isHovered ? 1 : 0.9,
                      filter: isHovered ? 'brightness(1.08)' : 'none',
                    }}
                  />

                  {/* Value label always above the bar */}
                  <text
                    x={xCenter(i)}
                    y={barY - 12}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    fill={labelColor}
                  >
                    {step.realValue < 0 ? '-' : ''}
                    {fmtLabel(Math.abs(step.realValue))}
                  </text>
                </g>
              );
            })}

            {/* X-axis labels */}
            {steps.map((step, i) => (
              <text
                key={i}
                x={xCenter(i)}
                y={svgHeight - pad.bottom + 22}
                textAnchor="middle"
                fontSize={12}
                fill="hsl(var(--muted-foreground))"
                fontWeight={hoveredIndex === i ? 600 : 400}
              >
                {step.name}
              </text>
            ))}

            {/* Fine bottom border line */}
            <line
              x1={pad.left}
              x2={svgWidth - pad.right}
              y1={yScaleBaseline}
              y2={yScaleBaseline}
              stroke="hsl(var(--border))"
              strokeWidth={1.5}
            />
          </svg>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(180deg, #34D399, #047857)' }} />
            <span className="text-muted-foreground">Receita / Lucro</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(180deg, #FCA5A5, #DC2626)' }} />
            <span className="text-muted-foreground">Despesas / Prejuízo</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}