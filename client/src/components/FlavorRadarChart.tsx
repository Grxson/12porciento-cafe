import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useMemo } from 'react';

const DIMENSIONS = ['Dulzor', 'Acidez', 'Cuerpo', 'Amargor', 'Final', 'Intensidad'];

interface RadarPoint {
  flavor: string;
  value: number;
}

interface FlavorRadarChartProps {
  userData: RadarPoint[];
  communityData?: RadarPoint[];
}

export default function FlavorRadarChart({ userData, communityData }: FlavorRadarChartProps) {
  const chartData = useMemo(
    () =>
      DIMENSIONS.map((flavor) => ({
        flavor,
        user: userData.find((d) => d.flavor === flavor)?.value ?? 0,
        community: communityData?.find((d) => d.flavor === flavor)?.value,
      })),
    [userData, communityData],
  );

  if (!userData || userData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-coffee-50 dark:bg-coffee-900/50 border border-dashed border-coffee-300 dark:border-coffee-700">
        <p className="text-sm text-coffee-500">Completa tu perfil de sabor</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius="72%"
            margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
          >
            <PolarGrid stroke="var(--polar-grid-stroke, #8B7355)" strokeOpacity={0.3} />
            <PolarAngleAxis
              dataKey="flavor"
              tick={{ fill: 'var(--angle-fill, #8B7355)', fontSize: 11 }}
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip />
            <Radar
              name="Tú"
              dataKey="user"
              fill="#c9a96e"
              fillOpacity={0.2}
              stroke="#c9a96e"
              strokeWidth={2}
              dot={{ fill: '#c9a96e', strokeWidth: 0, r: 3 }}
            />
            {communityData && (
              <Radar
                name="Comunidad"
                dataKey="community"
                fill="#a05a2c"
                fillOpacity={0.1}
                stroke="#a05a2c"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ fill: '#a05a2c', strokeWidth: 0, r: 3 }}
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gold-500" />
          <span className="text-xs text-coffee-700 dark:text-coffee-300">Tú</span>
        </div>
        {communityData && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-coffee-400" />
            <span className="text-xs text-coffee-700 dark:text-coffee-300">Comunidad</span>
          </div>
        )}
      </div>
    </div>
  );
}
