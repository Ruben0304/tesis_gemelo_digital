// ──────────────────────────────────────────────────────────────────────────────
// FlujoEnergia (React + SVG + Tailwind) — Componente listo para copiar/pegar
// ──────────────────────────────────────────────────────────────────────────────
// Instrucciones rápidas de integración:
// 1) Requisitos: React 17+ (ideal 18), TailwindCSS 3+.
// 2) Copia este archivo en tu proyecto (por ejemplo: components/FlujoEnergia.tsx) y expórtalo.
// 3) Usa <FlujoEnergia /> donde quieras renderizar el diagrama.
// 4) Props disponibles:
//    - values: { solar: number; battery: number; grid: number; consumo: number }
//    - batteryLevel?: number (0–100) — predeterminado 100
//    - unit?: string — predeterminado "kW"
// 5) Notas:
//    - No hay fondo degradado; el componente es transparente para encajar en cualquier layout.
//    - Animaciones de los círculos suavizadas (menos opacas y más lentas).
//    - Las flechas usan <animateMotion> sobre paths SVG. Si tu build deshabilita SMIL, avísame y te doy fallback CSS.
// 6) Pruebas: exporta y renderiza <TestCases /> en una ruta de sandbox para ver escenarios.
// ──────────────────────────────────────────────────────────────────────────────

import React from "react";

// ===== Utilidades =====
const fmt = (n: number) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);

const COLORS = {
  solar: {
    ring: "from-yellow-400 via-amber-300 to-transparent",
    bg: "bg-white",
    border: "border-amber-400",
    text: "text-amber-600",
    stroke: "#f59e0b",
  },
  battery: {
    ring: "from-emerald-400 via-green-300 to-transparent",
    bg: "bg-white",
    border: "border-emerald-400",
    text: "text-emerald-600",
    stroke: "#10b981",
  },
  grid: {
    ring: "from-gray-400 via-gray-300 to-transparent",
    bg: "bg-white",
    border: "border-gray-300",
    text: "text-gray-600",
    stroke: "#9ca3af",
  },
  consumo: {
    ring: "from-blue-400 via-sky-300 to-transparent",
    bg: "bg-white",
    border: "border-sky-400",
    text: "text-sky-700",
    stroke: "#38bdf8",
  },
};

type ColorKey = keyof typeof COLORS;

type NodeProps = {
  x: number;
  y: number;
  label?: string;
  value: number;
  unit?: string;
  colorKey?: ColorKey;
  subtitle?: string;
  children?: React.ReactNode;
};

// ===== Iconos mínimos en SVG =====
const SunIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="4" />
    {Array.from({ length: 8 }).map((_, i) => {
      const a = (i * Math.PI) / 4;
      const x1 = 12 + Math.cos(a) * 7;
      const y1 = 12 + Math.sin(a) * 7;
      const x2 = 12 + Math.cos(a) * 10.5;
      const y2 = 12 + Math.sin(a) * 10.5;
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
    })}
  </svg>
);

const BatteryIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="7" width="16" height="10" rx="2" />
    <rect x="19" y="10" width="2" height="4" rx="1" />
    <rect x="5" y="9" width="12" height="6" fill="currentColor" opacity="0.15" />
  </svg>
);

const TowerIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <path d="M8 21h8M12 3v3m-6 3h12M7 9l5 12m5-12-5 12M5 12h14" />
  </svg>
);

const HomeBoltIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M6 10.5V20h12v-9.5" />
    <path d="M12 10.5 9.5 15h3l-1.5 3.5" />
  </svg>
);

// ===== Nodo circular con glow/pulso (suavizado) =====
function Node({ x, y, label, value, unit = "kW", colorKey = "solar", children, subtitle }: NodeProps) {
  const c = COLORS[colorKey];
  const SIZE = 96; // diámetro del círculo interior
  return (
    <div className="absolute" style={{ left: x - SIZE / 2, top: y - SIZE / 2 }}>
      <div className="flex flex-col items-center select-none">
        {label && (
          <div className="mb-2 text-sm font-medium text-gray-500 tracking-wide">{label}</div>
        )}

        {/* Keyframes locales: ping suave */}
        <style>{`
          @keyframes softPing { 0% { transform: scale(1); opacity: .16 } 60% { transform: scale(1.05); opacity: .07 } 100% { transform: scale(1.1); opacity: 0 } }
          @keyframes haloSpin { to { transform: rotate(360deg) } }
        `}</style>

        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          {/* Aureola giratoria sutil, más lenta y menos opaca */}
          <div
            className="absolute -inset-[18px] rounded-full bg-[conic-gradient(var(--tw-gradient-stops))] from-transparent via-white/30 to-transparent blur-md"
            style={{ opacity: 0.35, animation: "haloSpin 22s linear infinite" }}
          />

          {/* Pulso más suave */}
          <span
            className={`absolute -inset-[10px] rounded-full bg-gradient-to-b ${c.ring}`}
            style={{ animation: "softPing 4s ease-in-out infinite" }}
          />

          {/* Círculo principal */}
          <div
            className={`relative ${c.bg} rounded-full border ${c.border} shadow-lg grid place-items-center`}
            style={{ width: SIZE, height: SIZE }}
          >
            <div className={`flex flex-col items-center ${c.text}`}>
              <div className="mb-1" aria-hidden>
                {children}
              </div>
              <div className="font-semibold text-xl leading-none">{fmt(value)}</div>
              <div className="text-[0.8rem] -mt-0.5 text-gray-400">{unit}</div>
            </div>
          </div>
        </div>
        {subtitle && (
          <div className="mt-2 text-xs text-gray-500">{subtitle}</div>
        )}
      </div>
    </div>
  );
}

// ===== Flecha que se mueve sobre un path =====
function MovingArrow({ pathId, color = "#999", duration = 7, delay = 0 }: { pathId: string; color?: string; duration?: number; delay?: number }) {
  return (
    <g>
      {/* Triángulo que se desplaza a lo largo del path */}
      <g opacity="0">
        <polygon points="0,-6 12,0 0,6" fill={color} />
        <animate attributeName="opacity" values="0;1;1;0" dur={`${duration}s`} begin={`${delay}s`} keyTimes="0;0.1;0.9;1" repeatCount="indefinite" />
        <animateMotion dur={`${duration}s`} begin={`${delay}s`} repeatCount="indefinite" rotate="auto">
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </g>
    </g>
  );
}

// ===== Diagrama principal =====
export default function FlujoEnergia({
  values = { solar: 5389, battery: 0, grid: 5841, consumo: 11230 },
  batteryLevel = 100,
  unit = "kW",
}: {
  values?: { solar: number; battery: number; grid: number; consumo: number };
  batteryLevel?: number;
  unit?: string;
}) {
  // Geometría (layout base)
  const W = 620, H = 720;
  const POS = {
    solar: { x: W / 2, y: 120 },
    battery: { x: 110, y: 360 },
    grid: { x: W - 110, y: 360 },
    consumo: { x: W / 2, y: H - 110 },
  } as const;

  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: W, height: H }}>
        {/* ❌ Fondo degradado REMOVIDO: el componente ahora es transparente */}

        {/* Conexiones en SVG */}
        <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Animación de flujo en el trazo */}
            <style>{`
              .flow { stroke-dasharray: 6 10; animation: dash 8s linear infinite; }
              @keyframes dash { to { stroke-dashoffset: -320; } }
            `}</style>
          </defs>

          {/* Path: FV -> Consumo (vertical) */}
          <path d={`M ${POS.solar.x} ${POS.solar.y + 62} V ${POS.consumo.y - 60}`} stroke={COLORS.solar.stroke} strokeOpacity="0.25" strokeWidth="12" fill="none" strokeLinecap="round" filter="url(#softGlow)" />
          <path id="p-solar-consumo" d={`M ${POS.solar.x} ${POS.solar.y + 62} V ${POS.consumo.y - 60}`} stroke={COLORS.solar.stroke} strokeWidth="6" fill="none" strokeLinecap="round" className="flow" filter="url(#softGlow)" />
          <MovingArrow pathId="p-solar-consumo" color={COLORS.solar.stroke} duration={7.5} />

          {/* Path: FV -> Batería (curva izquierda) */}
          <path id="p-solar-battery" d={`M ${POS.solar.x - 25} ${POS.solar.y + 40} C ${POS.solar.x - 140} ${POS.solar.y + 80}, ${POS.battery.x + 80} ${POS.battery.y - 80}, ${POS.battery.x + 52} ${POS.battery.y - 46}`} stroke={COLORS.battery.stroke} strokeWidth="6" fill="none" strokeLinecap="round" className="flow" filter="url(#softGlow)" />
          <MovingArrow pathId="p-solar-battery" color={COLORS.battery.stroke} duration={8.5} delay={1.5} />

          {/* Path: Red -> Consumo (curva derecha) */}
          <path id="p-grid-consumo" d={`M ${POS.grid.x - 52} ${POS.grid.y} C ${POS.grid.x - 110} ${POS.grid.y + 20}, ${POS.solar.x + 90} ${POS.solar.y + 210}, ${POS.consumo.x + 2} ${POS.consumo.y - 60}`} stroke={COLORS.consumo.stroke} strokeWidth="6" fill="none" strokeLinecap="round" className="flow" filter="url(#softGlow)" />
          <MovingArrow pathId="p-grid-consumo" color={COLORS.consumo.stroke} duration={9} delay={0.8} />

          {/* Overlay extra para asegurar visibilidad de FV -> Consumo */}
          <path d={`M ${POS.solar.x} ${POS.solar.y + 62} V ${POS.consumo.y - 60}`} stroke={COLORS.solar.stroke} strokeWidth="7" strokeOpacity="0.85" fill="none" strokeLinecap="round" filter="url(#softGlow)" />
          <path d={`M ${POS.solar.x} ${POS.solar.y + 62} V ${POS.consumo.y - 60}`} stroke={COLORS.solar.stroke} strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="6 10">
            <animate attributeName="stroke-dashoffset" from="0" to="-320" dur="8s" repeatCount="indefinite" />
          </path>
        </svg>

        {/* Nodos */}
        <Node x={POS.solar.x} y={POS.solar.y} label="FV" value={values.solar} unit={unit} colorKey="solar">
          <span className="text-amber-600"><SunIcon /></span>
        </Node>

        <Node x={POS.battery.x} y={POS.battery.y} label="Batería" value={values.battery} unit={unit} colorKey="battery" subtitle={`${batteryLevel}%`}>
          <span className="text-emerald-600"><BatteryIcon /></span>
        </Node>

        <Node x={POS.grid.x} y={POS.grid.y} label="Red eléctrica" value={values.grid} unit={unit} colorKey="grid">
          <span className="text-gray-500"><TowerIcon /></span>
        </Node>

        <Node x={POS.consumo.x} y={POS.consumo.y} label="Consumo" value={values.consumo} unit={unit} colorKey="consumo">
          <span className="text-sky-700"><HomeBoltIcon /></span>
        </Node>
      </div>
    </div>
  );
}

// ===== Test cases manuales =====
// Mantengo los casos existentes y los uso como referencia visual.
export const TestCases = () => (
  <div className="grid md:grid-cols-2 gap-8 p-6 bg-transparent">
    {/* Caso 1: Base */}
    <div className="rounded-xl border p-3 bg-white/50">
      <div className="text-sm mb-2 text-gray-600">Caso 1 — Números de ejemplo</div>
      <FlujoEnergia values={{ solar: 5389, battery: 0, grid: 5841, consumo: 11230 }} batteryLevel={100} />
    </div>

    {/* Caso 2: Alta demanda */}
    <div className="rounded-xl border p-3 bg-white/50">
      <div className="text-sm mb-2 text-gray-600">Caso 2 — Alta demanda</div>
      <FlujoEnergia values={{ solar: 3200, battery: 1200, grid: 7400, consumo: 10800 }} batteryLevel={56} />
    </div>

    {/* Caso 3: Poca red */}
    <div className="rounded-xl border p-3 bg-white/50">
      <div className="text-sm mb-2 text-gray-600">Caso 3 — Poca red</div>
      <FlujoEnergia values={{ solar: 2500, battery: 350, grid: 900, consumo: 2900 }} batteryLevel={78} />
    </div>
  </div>
);
