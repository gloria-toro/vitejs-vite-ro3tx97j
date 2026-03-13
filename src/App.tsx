import { useState, useMemo, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const SHEET_URL =
  'https://script.google.com/macros/s/AKfycbyPDdwkQEF7rqPXp9aD7c92dzgUZZPjUc3E-BUvVsVjtARZqU09tk2ELR9gtSHu_m7f/exec';

const MESES_ORDER = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];
const CANAL_COLORS: Record<string, string> = {
  Shopify: '#06b6d4',
  Marketplaces: '#f97316',
  Tiendas: '#a78bfa',
  B2B: '#34d399',
};
const CANAL_ICONS: Record<string, string> = {
  Shopify: '🛒',
  Marketplaces: '🏪',
  Tiendas: '🏬',
  B2B: '🤝',
};
const EMP_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ec4899',
  '#38bdf8',
  '#fb7185',
];
const METRIC_COLORS: Record<string, string> = {
  ventas: '#6366f1',
  costo: '#f43f5e',
  marketing: '#f59e0b',
};

const fmt = (v: number) => `$${(v / 1000).toFixed(1)}k`;
const fmtFull = (v: number) => `$${Math.round(v).toLocaleString('es-CL')}`;
const pct = (a: number, b: number) =>
  !b || !isFinite(a / b) ? '--' : `${((a / b) * 100).toFixed(1)}%`;
const roasFmt = (v: number, m: number) =>
  !m || !v || !isFinite(v / m) ? '--' : `${(v / m).toFixed(2)}x`;
const yoyLabel = (curr: number, prev: number) => {
  if (!prev) return null;
  const v = ((curr - prev) / prev) * 100;
  return {
    val: `${v >= 0 ? '▲' : '▼'} ${Math.abs(v).toFixed(1)}% vs año ant.`,
    positive: v >= 0,
  };
};

interface Row {
  año: string;
  mes: string;
  empresa: string;
  canal: string;
  ventas: number;
  costo: number;
  marketing: number;
}
interface Totals {
  v: number;
  c: number;
  m: number;
  pv: number;
  pc: number;
  pm: number;
}

function calcTotals(rows: Row[]): Totals {
  return rows.reduce(
    (a, d) => ({
      v: a.v + d.ventas,
      c: a.c + d.costo,
      m: a.m + d.marketing,
      pv: a.pv + (d.presupuesto_ventas || 0),
      pc: a.pc + (d.presupuesto_costo || 0),
      pm: a.pm + (d.presupuesto_marketing || 0),
    }),
    { v: 0, c: 0, m: 0, pv: 0, pc: 0, pm: 0 }
  );
}

const KPI = ({ label, value, sub, color, yoyInfo }: any) => (
  <div
    style={{
      background: '#1e1e2e',
      borderRadius: 12,
      padding: '16px 18px',
      borderLeft: `4px solid ${color}`,
    }}
  >
    <div
      style={{
        color: '#888',
        fontSize: 10,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
      }}
    >
      {label}
    </div>
    <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{value}</div>
    {sub && <div style={{ color, fontSize: 11, marginTop: 3 }}>{sub}</div>}
    {yoyInfo && (
      <div
        style={{
          color: yoyInfo.positive ? '#22c55e' : '#f43f5e',
          fontSize: 11,
          marginTop: 4,
          fontWeight: 600,
        }}
      >
        {yoyInfo.val}
      </div>
    )}
  </div>
);

const ProgressBar = ({
  value,
  target,
  color,
}: {
  value: number;
  target: number;
  color: string;
}) => {
  const pct = target > 0 ? Math.min((value / target) * 100, 150) : 0;
  const pctDisplay = target > 0 ? ((value / target) * 100).toFixed(1) : '—';
  const barColor = pct >= 100 ? '#22c55e' : pct >= 80 ? '#f59e0b' : '#f43f5e';
  return (
    <div style={{ marginTop: 6 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 3,
        }}
      >
        <span style={{ color: '#666', fontSize: 10 }}>Cumplimiento</span>
        <span style={{ color: barColor, fontSize: 11, fontWeight: 700 }}>
          {pctDisplay}%
        </span>
      </div>
      <div
        style={{
          background: '#2a2a3e',
          borderRadius: 4,
          height: 5,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: '100%',
            background: barColor,
            borderRadius: 4,
            transition: 'width 0.3s',
          }}
        />
      </div>
    </div>
  );
};

const BudgetKPI = ({
  label,
  real,
  budget,
  color,
}: {
  label: string;
  real: number;
  budget: number;
  color: string;
}) => {
  const varDollar = real - budget;
  const varPct = budget > 0 ? ((real - budget) / budget) * 100 : 0;
  const positive = varDollar >= 0;
  return (
    <div
      style={{
        background: '#1e1e2e',
        borderRadius: 12,
        padding: '16px 18px',
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div
        style={{
          color: '#888',
          fontSize: 10,
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
      <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>
        {fmtFull(real)}
      </div>
      <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>
        Ppto: {fmtFull(budget)}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <span
          style={{
            color: positive ? '#22c55e' : '#f43f5e',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {positive ? '▲' : '▼'} {fmtFull(Math.abs(varDollar))}
        </span>
        <span
          style={{
            color: positive ? '#22c55e' : '#f43f5e',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          ({Math.abs(varPct).toFixed(1)}%)
        </span>
      </div>
      <ProgressBar value={real} target={budget} color={color} />
    </div>
  );
};

const RatioCard = ({ label, value, desc, color }: any) => (
  <div
    style={{
      background: '#1e1e2e',
      borderRadius: 12,
      padding: '14px 16px',
      border: `1px solid ${color}33`,
    }}
  >
    <div
      style={{
        color: '#888',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 5,
      }}
    >
      {label}
    </div>
    <div style={{ color, fontSize: 24, fontWeight: 800 }}>{value}</div>
    <div style={{ color: '#555', fontSize: 10, marginTop: 3 }}>{desc}</div>
  </div>
);

const Toggle = ({ label, color, active, onClick }: any) => (
  <button
    onClick={onClick}
    style={{
      background: active ? color + '22' : '#1e1e2e',
      border: `1px solid ${active ? color : '#333'}`,
      color: active ? color : '#666',
      borderRadius: 20,
      padding: '4px 12px',
      fontSize: 11,
      cursor: 'pointer',
    }}
  >
    {label}
  </button>
);

function GraficaYoY({ filteredCurr, filteredPrev, empColor }: any) {
  const [metric, setMetric] = useState('ventas');
  const data = filteredCurr.map((d: any, i: number) => ({
    month: d.mes,
    'Año actual': d[metric],
    'Año anterior': filteredPrev[i] ? filteredPrev[i][metric] : 0,
  }));
  return (
    <div
      style={{
        background: '#1e1e2e',
        borderRadius: 12,
        padding: 18,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 13, color: '#ccc' }}>
          Año actual vs año anterior
        </h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['ventas', 'costo', 'marketing'] as const).map((k) => (
            <Toggle
              key={k}
              label={k.charAt(0).toUpperCase() + k.slice(1)}
              color={METRIC_COLORS[k]}
              active={metric === k}
              onClick={() => setMetric(k)}
            />
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
          <XAxis
            dataKey="month"
            stroke="#555"
            tick={{ fill: '#888', fontSize: 11 }}
          />
          <YAxis
            stroke="#555"
            tick={{ fill: '#888', fontSize: 11 }}
            tickFormatter={fmt}
          />
          <Tooltip
            contentStyle={{
              background: '#1e1e2e',
              border: '1px solid #333',
              borderRadius: 8,
            }}
            formatter={(v: any) => fmtFull(v)}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="Año actual"
            stroke={empColor}
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="Año anterior"
            stroke={empColor}
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="5 4"
            opacity={0.45}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function VistaIndividual({ rawData, empresas, years, empColors }: any) {
  const [empIdx, setEmpIdx] = useState(0);
  const [yearCurr, setYearCurr] = useState(years[years.length - 1]);
  const [yearPrev, setYearPrev] = useState(years[years.length - 2] || years[0]);
  const [mesDesde, setMesDesde] = useState(0);
  const [mesHasta, setMesHasta] = useState(11);
  const [canalVista, setCanalVista] = useState('todos');
  const [showV, setShowV] = useState(true);
  const [showC, setShowC] = useState(true);
  const [showM, setShowM] = useState(true);

  const empresa = empresas[empIdx];
  const empColor = empColors[empIdx] || '#6366f1';

  const rowsCurr = useMemo(
    () =>
      MESES_ORDER.slice(mesDesde, mesHasta + 1).map((mes) => {
        const canales = [
          ...new Set(
            rawData
              .filter(
                (r: Row) =>
                  r.empresa === empresa && String(r.año) === String(yearCurr)
              )
              .map((r: Row) => r.canal)
          ),
        ] as string[];
        const byCanal: Record<string, any> = {};
        let vT = 0,
          cT = 0,
          mT = 0,
          pvT = 0,
          pcT = 0,
          pmT = 0;
        canales.forEach((canal) => {
          const r = rawData.find(
            (d: Row) =>
              d.empresa === empresa &&
              d.año === String(yearCurr) &&
              d.mes === mes &&
              d.canal === canal
          );
          const v = r ? r.ventas : 0,
            c = r ? r.costo : 0,
            m = r ? r.marketing : 0,
            pv = r ? r.presupuesto_ventas || 0 : 0,
            pc = r ? r.presupuesto_costo || 0 : 0,
            pm = r ? r.presupuesto_marketing || 0 : 0;
          byCanal[canal] = { ventas: v, costo: c, marketing: m };
          vT += v;
          cT += c;
          mT += m;
          pvT += pv;
          pcT += pc;
          pmT += pm;
        });
        return {
          mes,
          ventas: vT,
          costo: cT,
          marketing: mT,
          presupuesto_ventas: pvT,
          presupuesto_costo: pcT,
          presupuesto_marketing: pmT,
          canales: byCanal,
        };
      }),
    [rawData, empresa, yearCurr, mesDesde, mesHasta]
  );

  const rowsPrev = useMemo(
    () =>
      MESES_ORDER.slice(mesDesde, mesHasta + 1).map((mes) => {
        let vT = 0,
          cT = 0,
          mT = 0;
        rawData
          .filter(
            (r: Row) =>
              r.empresa === empresa &&
              String(r.año) === String(yearPrev) &&
              r.mes === mes
          )
          .forEach((r: Row) => {
            vT += r.ventas;
            cT += r.costo;
            mT += r.marketing;
          });
        return { mes, ventas: vT, costo: cT, marketing: mT };
      }),
    [rawData, empresa, yearPrev, mesDesde, mesHasta]
  );

  const tC = useMemo(() => calcTotals(rowsCurr as any), [rowsCurr]);
  const tP = useMemo(() => calcTotals(rowsPrev as any), [rowsPrev]);
  const gC = tC.v - tC.c - tC.m,
    gP = tP.v - tP.c - tP.m;

  const canales = useMemo(
    () =>
      [
        ...new Set(
          rawData
            .filter(
              (r: Row) =>
                r.empresa === empresa && String(r.año) === String(yearCurr)
            )
            .map((r: Row) => r.canal)
        ),
      ] as string[],
    [rawData, empresa, yearCurr]
  );

  const canalTotals = useMemo(
    () =>
      canales.map((canal) => {
        const rows = rawData.filter(
          (r: Row) =>
            r.empresa === empresa &&
            String(r.año) === String(yearCurr) &&
            r.canal === canal &&
            MESES_ORDER.indexOf(r.mes) >= mesDesde &&
            MESES_ORDER.indexOf(r.mes) <= mesHasta
        );
        const t = calcTotals(rows);
        const g = t.v - t.c - t.m;
        return {
          canal,
          color: CANAL_COLORS[canal] || '#888',
          icon: CANAL_ICONS[canal] || '📦',
          ...t,
          ganancia: g,
          margen: (!t.v || !isFinite(g/t.v)) ? "-" : ((g/t.v)*100).toFixed(1),
          pesoCosto: (!t.v || !isFinite(g/t.v)) ? "-" : ((t.c/t.v)*100).toFixed(1),
          pesoMktg: (!t.v || !isFinite(t.m/t.v)) ? "-" : ((t.m/t.v)*100).toFixed(1),
          roasVal: (!t.m || !isFinite(t.v/t.m)) ? "-" : (t.v/t.m).toFixed(2),
        };
      }),
    [rawData, empresa, yearCurr, canales, mesDesde, mesHasta]
  );

  const totalVentas = canalTotals.reduce((a, c) => a + c.v, 0);
  const pieData = canalTotals.map((c) => ({ name: c.canal, value: c.v }));

  const canalChartData = useMemo(() => {
    if (canalVista === 'todos')
      return rowsCurr.map((d: any) => {
        const row: any = { month: d.mes };
        canales.forEach((c) => {
          row[c] = d.canales[c] ? d.canales[c].ventas : 0;
        });
        return row;
      });
    return rowsCurr.map((d: any) => ({
      month: d.mes,
      ventas: d.canales[canalVista]?.ventas || 0,
      costo: d.canales[canalVista]?.costo || 0,
      marketing: d.canales[canalVista]?.marketing || 0,
    }));
  }, [rowsCurr, canales, canalVista]);

  return (
    <>
      <div
        style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}
      >
        {empresas.map((e: string, i: number) => (
          <button
            key={e}
            onClick={() => setEmpIdx(i)}
            style={{
              background:
                empIdx === i ? (empColors[i] || '#6366f1') + '22' : '#1e1e2e',
              border: `2px solid ${
                empIdx === i ? empColors[i] || '#6366f1' : '#333'
              }`,
              color: empIdx === i ? empColors[i] || '#6366f1' : '#666',
              borderRadius: 10,
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {e}
          </button>
        ))}
      </div>

      <div
        style={{
          background: '#1e1e2e',
          borderRadius: 12,
          padding: '12px 18px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#888', fontSize: 12 }}>Año:</span>
          {years.map((y: string) => (
            <button
              key={y}
              onClick={() => {
                setYearCurr(y);
                const pi = years.indexOf(y);
                setYearPrev(years[pi - 1] || y);
              }}
              style={{
                background: yearCurr === y ? '#6366f133' : 'transparent',
                border: `1px solid ${yearCurr === y ? '#6366f1' : '#333'}`,
                color: yearCurr === y ? '#6366f1' : '#555',
                borderRadius: 6,
                padding: '3px 12px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {y}
            </button>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: '#888', fontSize: 12 }}>Período:</span>
          {MESES_ORDER.map((m, i) => (
            <button
              key={i}
              onClick={() => {
                if (i === mesDesde && i === mesHasta) {
                  setMesDesde(0);
                  setMesHasta(11);
                } else if (
                  i === mesDesde ||
                  i === mesHasta ||
                  (i > mesDesde && i < mesHasta)
                ) {
                  setMesDesde(i);
                  setMesHasta(i);
                } else if (i < mesDesde) {
                  setMesDesde(i);
                } else {
                  setMesHasta(i);
                }
              }}
              style={{
                background:
                  i >= mesDesde && i <= mesHasta ? '#6366f133' : 'transparent',
                border: `1px solid ${
                  i >= mesDesde && i <= mesHasta ? '#6366f1' : '#333'
                }`,
                color: i >= mesDesde && i <= mesHasta ? '#6366f1' : '#555',
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <KPI
          label="Ingresos"
          value={fmtFull(tC.v)}
          sub={`vs ${fmtFull(tP.v)} año ant.`}
          color={empColor}
          yoyInfo={yoyLabel(tC.v, tP.v)}
        />
        <KPI
          label="Costo producto"
          value={fmtFull(tC.c)}
          sub={pct(tC.c, tC.v) + ' de ventas'}
          color="#f43f5e"
          yoyInfo={yoyLabel(tC.c, tP.c)}
        />
        <KPI
          label="Marketing"
          value={fmtFull(tC.m)}
          sub={pct(tC.m, tC.v) + ' de ventas'}
          color="#f59e0b"
          yoyInfo={yoyLabel(tC.m, tP.m)}
        />
        <KPI
          label="Ganancia bruta"
          value={fmtFull(gC)}
          sub={`Margen ${pct(gC, tC.v)}`}
          color="#22c55e"
          yoyInfo={yoyLabel(gC, gP)}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3,1fr)',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <RatioCard
          label="% Costo / Ventas"
          value={pct(tC.c, tC.v)}
          desc="Peso del costo sobre ventas"
          color="#f43f5e"
        />
        <RatioCard
          label="% Mktg / Ventas"
          value={pct(tC.m, tC.v)}
          desc="Peso del marketing sobre ventas"
          color="#f59e0b"
        />
        <RatioCard
          label="ROAS"
          value={roasFmt(tC.v, tC.m)}
          desc="Retorno sobre inversión en marketing"
          color="#a78bfa"
        />
      </div>

      {/* Presupuesto */}
      {console.log('Presupuesto tC:', tC.pv, tC.pc, tC.pm)}
      {(tC.pv > 0 || tC.pc > 0 || tC.pm > 0) && (
        <div style={{ marginBottom: 16 }}>
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: 15,
              color: '#fff',
              fontWeight: 700,
            }}
          >
            🎯 Real vs Presupuesto
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <BudgetKPI
              label="Ventas"
              real={tC.v}
              budget={tC.pv}
              color={empColor}
            />
            <BudgetKPI
              label="Costo producto"
              real={tC.c}
              budget={tC.pc}
              color="#f43f5e"
            />
            <BudgetKPI
              label="Marketing"
              real={tC.m}
              budget={tC.pm}
              color="#f59e0b"
            />
          </div>
          <div
            style={{
              background: '#1e1e2e',
              borderRadius: 12,
              padding: 18,
              marginBottom: 16,
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#ccc' }}>
              Real vs Presupuesto — mensual
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={rowsCurr.map((d: any) => ({
                  month: d.mes,
                  Real: d.ventas,
                  Presupuesto: d.presupuesto_ventas || 0,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                <XAxis
                  dataKey="month"
                  stroke="#555"
                  tick={{ fill: '#888', fontSize: 11 }}
                />
                <YAxis
                  stroke="#555"
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickFormatter={fmt}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1e1e2e',
                    border: '1px solid #333',
                    borderRadius: 8,
                  }}
                  formatter={(v: any) => fmtFull(v)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="Real"
                  stroke={empColor}
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Presupuesto"
                  stroke={empColor}
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="5 4"
                  opacity={0.5}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <GraficaYoY
        filteredCurr={rowsCurr}
        filteredPrev={rowsPrev}
        empColor={empColor}
      />

      <div
        style={{
          background: '#1e1e2e',
          borderRadius: 12,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 13, color: '#ccc' }}>
            Tendencia mensual
          </h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <Toggle
              label="Ventas"
              color={METRIC_COLORS.ventas}
              active={showV}
              onClick={() => setShowV((p: boolean) => !p)}
            />
            <Toggle
              label="Costo"
              color={METRIC_COLORS.costo}
              active={showC}
              onClick={() => setShowC((p: boolean) => !p)}
            />
            <Toggle
              label="Mktg"
              color={METRIC_COLORS.marketing}
              active={showM}
              onClick={() => setShowM((p: boolean) => !p)}
            />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={rowsCurr}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
            <XAxis
              dataKey="mes"
              stroke="#555"
              tick={{ fill: '#888', fontSize: 11 }}
            />
            <YAxis
              stroke="#555"
              tick={{ fill: '#888', fontSize: 11 }}
              tickFormatter={fmt}
            />
            <Tooltip
              contentStyle={{
                background: '#1e1e2e',
                border: '1px solid #333',
                borderRadius: 8,
              }}
              formatter={(v: any) => fmtFull(v)}
            />
            {showV && (
              <Line
                type="monotone"
                dataKey="ventas"
                stroke={METRIC_COLORS.ventas}
                strokeWidth={2}
                dot={false}
                name="Ventas"
              />
            )}
            {showC && (
              <Line
                type="monotone"
                dataKey="costo"
                stroke={METRIC_COLORS.costo}
                strokeWidth={2}
                dot={false}
                name="Costo"
              />
            )}
            {showM && (
              <Line
                type="monotone"
                dataKey="marketing"
                stroke={METRIC_COLORS.marketing}
                strokeWidth={2}
                dot={false}
                name="Marketing"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Canales */}
      <div style={{ marginTop: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <h2
            style={{ margin: 0, fontSize: 15, color: '#fff', fontWeight: 700 }}
          >
            📡 Canales de venta
          </h2>
          <div
            style={{
              display: 'flex',
              background: '#1e1e2e',
              borderRadius: 10,
              padding: 3,
              gap: 3,
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => setCanalVista('todos')}
              style={{
                background: canalVista === 'todos' ? '#6366f1' : 'transparent',
                border: 'none',
                color: canalVista === 'todos' ? '#fff' : '#666',
                borderRadius: 7,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Todos
            </button>
            {canales.map((c) => (
              <button
                key={c}
                onClick={() => setCanalVista(c)}
                style={{
                  background:
                    canalVista === c
                      ? CANAL_COLORS[c] || '#888'
                      : 'transparent',
                  border: 'none',
                  color: canalVista === c ? '#fff' : '#666',
                  borderRadius: 7,
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {CANAL_ICONS[c] || '📦'} {c}
              </button>
            ))}
          </div>
        </div>

        {canalVista === 'todos' ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))',
                gap: 12,
                marginBottom: 16,
              }}
            >
              {canalTotals.map((c) => (
                <div
                  key={c.canal}
                  style={{
                    background: '#1e1e2e',
                    borderRadius: 12,
                    padding: '14px 16px',
                    borderLeft: `4px solid ${c.color}`,
                  }}
                >
                  <div
                    style={{
                      color: c.color,
                      fontSize: 13,
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    {c.icon} {c.canal}
                  </div>
                  <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>
                    {fmtFull(c.v)}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: 8,
                    }}
                  >
                    <span style={{ color: '#888', fontSize: 11 }}>
                      Participación
                    </span>
                    <span
                      style={{ color: c.color, fontSize: 12, fontWeight: 700 }}
                    >
                      {pct(c.v, totalVentas)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: 4,
                    }}
                  >
                    <span style={{ color: '#888', fontSize: 11 }}>ROAS</span>
                    <span
                      style={{
                        color: '#a78bfa',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {c.roasVal}x
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: 4,
                    }}
                  >
                    <span style={{ color: '#888', fontSize: 11 }}>Margen</span>
                    <span
                      style={{
                        color: '#22c55e',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {c.margen}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
                marginBottom: 16,
              }}
            >
              <div
                style={{ background: '#1e1e2e', borderRadius: 12, padding: 18 }}
              >
                <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#ccc' }}>
                  Ventas por canal (mensual)
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={canalChartData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                    <XAxis
                      dataKey="month"
                      stroke="#555"
                      tick={{ fill: '#888', fontSize: 11 }}
                    />
                    <YAxis
                      stroke="#555"
                      tick={{ fill: '#888', fontSize: 11 }}
                      tickFormatter={fmt}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#1e1e2e',
                        border: '1px solid #333',
                        borderRadius: 8,
                      }}
                      formatter={(v: any) => fmtFull(v)}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {canales.map((c) => (
                      <Bar
                        key={c}
                        dataKey={c}
                        fill={CANAL_COLORS[c] || '#888'}
                        stackId="a"
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div
                style={{ background: '#1e1e2e', borderRadius: 12, padding: 18 }}
              >
                <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#ccc' }}>
                  Participación de canales
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={85}
                      paddingAngle={0}
                      dataKey="value"
                    >
                      {canalTotals.map((_, i) => (
                        <Cell
                          key={i}
                          fill={canalTotals[i].color}
                          stroke="#13131f"
                          strokeWidth={3}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#1e1e2e',
                        border: '1px solid #333',
                        borderRadius: 8,
                      }}
                      formatter={(v: any) => [fmtFull(v), '']}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#888' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div
              style={{ background: '#1e1e2e', borderRadius: 12, padding: 18 }}
            >
              <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#ccc' }}>
                Tabla comparativa de canales
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2a3e' }}>
                      {[
                        'Canal',
                        'Ventas',
                        '% Part.',
                        'Costo',
                        '% Costo',
                        'Marketing',
                        '% Mktg',
                        'Ganancia',
                        'Margen',
                        'ROAS',
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '8px 10px',
                            color: '#666',
                            textAlign: 'right',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {canalTotals.map((c, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: '1px solid #2a2a3e22',
                          background: i % 2 === 0 ? '#ffffff05' : 'transparent',
                        }}
                      >
                        <td
                          style={{
                            padding: '8px 10px',
                            color: c.color,
                            fontWeight: 700,
                          }}
                        >
                          {c.icon} {c.canal}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            color: '#fff',
                            textAlign: 'right',
                          }}
                        >
                          {fmtFull(c.v)}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            color: c.color,
                            textAlign: 'right',
                            fontWeight: 700,
                          }}
                        >
                          {pct(c.v, totalVentas)}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            color: '#f43f5e',
                            textAlign: 'right',
                          }}
                        >
                          {fmtFull(c.c)}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            color: '#f43f5e',
                            textAlign: 'right',
                          }}
                        >
                          {c.pesoCosto}%
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            color: '#f59e0b',
                            textAlign: 'right',
                          }}
                        >
                          {fmtFull(c.m)}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            color: '#f59e0b',
                            textAlign: 'right',
                          }}
                        >
                          {c.pesoMktg}%
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            color: '#22c55e',
                            textAlign: 'right',
                          }}
                        >
                          {fmtFull(c.ganancia)}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            color: '#888',
                            textAlign: 'right',
                          }}
                        >
                          {c.margen}%
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            color: '#a78bfa',
                            textAlign: 'right',
                            fontWeight: 700,
                          }}
                        >
                          {c.roasVal}x
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          (() => {
            const ct = canalTotals.find((c) => c.canal === canalVista);
            if (!ct) return null;
            return (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <KPI
                    label="Ventas"
                    value={fmtFull(ct.v)}
                    sub="Canal seleccionado"
                    color={ct.color}
                  />
                  <KPI
                    label="Costo"
                    value={fmtFull(ct.c)}
                    sub={pct(ct.c, ct.v) + ' ventas'}
                    color="#f43f5e"
                  />
                  <KPI
                    label="Marketing"
                    value={fmtFull(ct.m)}
                    sub={pct(ct.m, ct.v) + ' ventas'}
                    color="#f59e0b"
                  />
                  <KPI
                    label="Ganancia"
                    value={fmtFull(ct.ganancia)}
                    sub={`Margen ${ct.margen}%`}
                    color="#22c55e"
                  />
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3,1fr)',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <RatioCard
                    label="% Costo / Ventas"
                    value={`${ct.pesoCosto}%`}
                    desc="Peso del costo"
                    color="#f43f5e"
                  />
                  <RatioCard
                    label="% Mktg / Ventas"
                    value={`${ct.pesoMktg}%`}
                    desc="Peso del marketing"
                    color="#f59e0b"
                  />
                  <RatioCard
                    label="ROAS"
                    value={`${ct.roasVal}x`}
                    desc="Retorno en marketing"
                    color="#a78bfa"
                  />
                </div>
                <div
                  style={{
                    background: '#1e1e2e',
                    borderRadius: 12,
                    padding: 18,
                  }}
                >
                  <h3
                    style={{ margin: '0 0 12px', fontSize: 13, color: '#ccc' }}
                  >
                    Tendencia — {ct.icon} {ct.canal}
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={canalChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                      <XAxis
                        dataKey="month"
                        stroke="#555"
                        tick={{ fill: '#888', fontSize: 11 }}
                      />
                      <YAxis
                        stroke="#555"
                        tick={{ fill: '#888', fontSize: 11 }}
                        tickFormatter={fmt}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#1e1e2e',
                          border: '1px solid #333',
                          borderRadius: 8,
                        }}
                        formatter={(v: any) => fmtFull(v)}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line
                        type="monotone"
                        dataKey="ventas"
                        stroke={ct.color}
                        strokeWidth={2}
                        dot={false}
                        name="Ventas"
                      />
                      <Line
                        type="monotone"
                        dataKey="costo"
                        stroke="#f43f5e"
                        strokeWidth={2}
                        dot={false}
                        name="Costo"
                      />
                      <Line
                        type="monotone"
                        dataKey="marketing"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                        name="Marketing"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            );
          })()
        )}
      </div>
    </>
  );
}

function VistaComparativa({ rawData, empresas, years, empColors }: any) {
  const [yearCurr, setYearCurr] = useState(years[years.length - 1]);
  const [metric, setMetric] = useState('ventas');

  const totals = useMemo(
    () =>
      empresas.map((emp: string, i: number) => {
        const rC = rawData.filter(
          (r: Row) => r.empresa === emp && String(r.año) === String(yearCurr)
        );
        const rP = rawData.filter(
          (r: Row) =>
            r.empresa === emp &&
            String(r.año) ===
              String(years[years.indexOf(yearCurr) - 1] || yearCurr)
        );
        const t = calcTotals(rC),
          tP = calcTotals(rP);
        const g = t.v - t.c - t.m,
          gP = tP.v - tP.c - tP.m;
        return {
          emp,
          color: empColors[i] || '#888',
          ...t,
          ganancia: g,
          margen: (!t.v || !isFinite(g/t.v)) ? "--" : ((g/t.v)*100).toFixed(1),
          pesoCosto: (!t.v || !isFinite(t.c/t.v)) ? "--" : ((t.c/t.v)*100).toFixed(1),
          ppesoMktg: (!t.v || !isFinite(t.m/t.v)) ? "--" : ((t.m/t.v)*100).toFixed(1),
          roasVal: (!t.m || !isFinite(t.v/t.m)) ?  "--": (t.v/t.m).toFixed(2),
          yoyV: yoyLabel(t.v, tP.v),
          yoyG: yoyLabel(g, gP),
        };
      }),
    [rawData, empresas, yearCurr, years, empColors]
  );

  const lineData = useMemo(
    () =>
      MESES_ORDER.map((mes) => {
        const row: any = { month: mes };
        empresas.forEach((emp: string) => {
          const r = rawData.filter(
            (d: Row) =>
              d.empresa === emp && d.año === String(yearCurr) && d.mes === mes
          );
          row[emp] = r.reduce(
            (a: number, d: Row) =>
              a +
              (metric === 'ventas'
                ? d.ventas
                : metric === 'costo'
                ? d.costo
                : d.marketing),
            0
          );
        });
        return row;
      }),
    [rawData, empresas, yearCurr, metric]
  );

  const canales = [...new Set(rawData.map((r: Row) => r.canal))] as string[];
  const canalEmpData = useMemo(
    () =>
      canales.map((canal) => {
        const row: any = { canal };
        empresas.forEach((emp: string) => {
          row[emp] = rawData
            .filter(
              (d: Row) =>
                d.empresa === emp &&
                d.año === String(yearCurr) &&
                d.canal === canal
            )
            .reduce((a: number, d: Row) => a + d.ventas, 0);
        });
        return row;
      }),
    [rawData, empresas, yearCurr, canales]
  );

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
        }}
      >
        <span style={{ color: '#888', fontSize: 12 }}>Año:</span>
        {years.map((y: string) => (
          <button
            key={y}
            onClick={() => setYearCurr(y)}
            style={{
              background: yearCurr === y ? '#6366f133' : 'transparent',
              border: `1px solid ${yearCurr === y ? '#6366f1' : '#333'}`,
              color: yearCurr === y ? '#6366f1' : '#555',
              borderRadius: 6,
              padding: '3px 12px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {y}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))',
          gap: 12,
          marginBottom: 18,
        }}
      >
        {totals.map((e: any) => (
          <div
            key={e.emp}
            style={{
              background: '#1e1e2e',
              borderRadius: 12,
              padding: '14px 16px',
              borderLeft: `4px solid ${e.color}`,
            }}
          >
            <div
              style={{
                color: e.color,
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              {e.emp}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
              }}
            >
              <div>
                <div
                  style={{
                    color: '#666',
                    fontSize: 10,
                    textTransform: 'uppercase',
                  }}
                >
                  Ventas
                </div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                  {fmt(e.v)}
                </div>
                {e.yoyV && (
                  <div
                    style={{
                      color: e.yoyV.positive ? '#22c55e' : '#f43f5e',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {e.yoyV.val}
                  </div>
                )}
              </div>
              <div>
                <div
                  style={{
                    color: '#666',
                    fontSize: 10,
                    textTransform: 'uppercase',
                  }}
                >
                  Ganancia
                </div>
                <div
                  style={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}
                >
                  {fmt(e.ganancia)}
                </div>
                {e.yoyG && (
                  <div
                    style={{
                      color: e.yoyG.positive ? '#22c55e' : '#f43f5e',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {e.yoyG.val}
                  </div>
                )}
              </div>
              <div>
                <div
                  style={{
                    color: '#666',
                    fontSize: 10,
                    textTransform: 'uppercase',
                  }}
                >
                  % Costo
                </div>
                <div
                  style={{ color: '#f43f5e', fontSize: 13, fontWeight: 600 }}
                >
                  {e.pesoCosto}%
                </div>
              </div>
              <div>
                <div
                  style={{
                    color: '#666',
                    fontSize: 10,
                    textTransform: 'uppercase',
                  }}
                >
                  % Mktg
                </div>
                <div
                  style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600 }}
                >
                  {e.pesoMktg}%
                </div>
              </div>
              <div>
                <div
                  style={{
                    color: '#666',
                    fontSize: 10,
                    textTransform: 'uppercase',
                  }}
                >
                  Margen
                </div>
                <div style={{ color: '#888', fontSize: 13, fontWeight: 600 }}>
                  {e.margen}%
                </div>
              </div>
              <div>
                <div
                  style={{
                    color: '#666',
                    fontSize: 10,
                    textTransform: 'uppercase',
                  }}
                >
                  ROAS
                </div>
                <div
                  style={{ color: '#a78bfa', fontSize: 13, fontWeight: 700 }}
                >
                  {e.roasVal}x
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: '#1e1e2e',
          borderRadius: 12,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 13, color: '#ccc' }}>
            Comparativa entre empresas
          </h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['ventas', 'costo', 'marketing'] as const).map((k) => (
              <Toggle
                key={k}
                label={k.charAt(0).toUpperCase() + k.slice(1)}
                color={METRIC_COLORS[k]}
                active={metric === k}
                onClick={() => setMetric(k)}
              />
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
            <XAxis
              dataKey="month"
              stroke="#555"
              tick={{ fill: '#888', fontSize: 11 }}
            />
            <YAxis
              stroke="#555"
              tick={{ fill: '#888', fontSize: 11 }}
              tickFormatter={fmt}
            />
            <Tooltip
              contentStyle={{
                background: '#1e1e2e',
                border: '1px solid #333',
                borderRadius: 8,
              }}
              formatter={(v: any) => fmtFull(v)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {empresas.map((e: string, i: number) => (
              <Line
                key={e}
                type="monotone"
                dataKey={e}
                stroke={empColors[i] || '#888'}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          background: '#1e1e2e',
          borderRadius: 12,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#ccc' }}>
          Ventas por canal — comparativa
        </h3>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={canalEmpData} barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
            <XAxis
              dataKey="canal"
              stroke="#555"
              tick={{ fill: '#888', fontSize: 11 }}
            />
            <YAxis
              stroke="#555"
              tick={{ fill: '#888', fontSize: 11 }}
              tickFormatter={fmt}
            />
            <Tooltip
              contentStyle={{
                background: '#1e1e2e',
                border: '1px solid #333',
                borderRadius: 8,
              }}
              formatter={(v: any) => fmtFull(v)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {empresas.map((e: string, i: number) => (
              <Bar
                key={e}
                dataKey={e}
                fill={empColors[i] || '#888'}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 18 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#ccc' }}>
          Resumen consolidado
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a3e' }}>
                {[
                  'Empresa',
                  'Ventas',
                  'YoY',
                  'Costo',
                  '% Costo',
                  'Marketing',
                  '% Mktg',
                  'Ganancia',
                  'YoY',
                  'Margen',
                  'ROAS',
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '8px 10px',
                      color: '#666',
                      textAlign: 'right',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {totals.map((e: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #2a2a3e22' }}>
                  <td
                    style={{
                      padding: '8px 10px',
                      color: e.color,
                      fontWeight: 700,
                    }}
                  >
                    {e.emp}
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      color: METRIC_COLORS.ventas,
                      textAlign: 'right',
                    }}
                  >
                    {fmtFull(e.v)}
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      textAlign: 'right',
                      color: e.yoyV?.positive ? '#22c55e' : '#f43f5e',
                      fontWeight: 600,
                    }}
                  >
                    {e.yoyV?.val || '—'}
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      color: METRIC_COLORS.costo,
                      textAlign: 'right',
                    }}
                  >
                    {fmtFull(e.c)}
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      color: '#f43f5e',
                      textAlign: 'right',
                    }}
                  >
                    {e.pesoCosto}%
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      color: METRIC_COLORS.marketing,
                      textAlign: 'right',
                    }}
                  >
                    {fmtFull(e.m)}
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      color: '#f59e0b',
                      textAlign: 'right',
                    }}
                  >
                    {e.pesoMktg}%
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      color: '#22c55e',
                      textAlign: 'right',
                    }}
                  >
                    {fmtFull(e.ganancia)}
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      textAlign: 'right',
                      color: e.yoyG?.positive ? '#22c55e' : '#f43f5e',
                      fontWeight: 600,
                    }}
                  >
                    {e.yoyG?.val || '—'}
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      color: '#888',
                      textAlign: 'right',
                    }}
                  >
                    {e.margen}%
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      color: '#a78bfa',
                      textAlign: 'right',
                      fontWeight: 700,
                    }}
                  >
                    {e.roasVal}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const [modo, setModo] = useState('individual');
  const [rawData, setRawData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://script.google.com/macros/s/AKfycbyPDdwkQEF7rqPXp9aD7c92dzgUZZPjUc3E-BUvVsVjtARZqU09tk2ELR9gtSHu_m7f/exec?t=${Date.now()}`;
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error('Error al conectar');
      const json = await res.json();
      const rows: Row[] = json
        .map((obj: any) => {
          const clean: any = {};
          Object.keys(obj).forEach((k) => {
            clean[k.trim().toLowerCase()] = obj[k];
          });
          return {
            año: String(clean['año'] || clean['ano'] || ''),
            mes: String(clean['mes'] || ''),
            empresa: String(clean['empresa'] || ''),
            canal: String(clean['canal'] || ''),
            ventas: parseFloat(clean['ventas'] || 0),
            costo: parseFloat(clean['costo'] || 0),
            marketing: parseFloat(clean['marketing'] || 0),
            presupuesto_ventas: parseFloat(clean['presupuesto_ventas'] || 0),
            presupuesto_costo: parseFloat(clean['presupuesto_costo'] || 0),
            presupuesto_marketing: parseFloat(
              clean['presupuesto_marketing'] || 0
            ),
          };
        })
        .filter((r: Row) => r.empresa && r.mes && String(r.año));
      console.log('Campos:', Object.keys(json[0]));
      console.log('Presupuesto muestra:', rows[0]?.presupuesto_ventas);
      setRawData(rows);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const empresas = useMemo(
    () => [...new Set(rawData.map((r) => r.empresa))].sort(),
    [rawData]
  );
  const years = useMemo(
    () => [...new Set(rawData.map((r) => String(r.año)))].sort(),
    [rawData]
  );
  const empColors = useMemo(
    () => empresas.map((_, i) => EMP_COLORS[i % EMP_COLORS.length]),
    [empresas]
  );

  return (
    <div
      style={{
        background: '#13131f',
        color: '#fff',
        fontFamily: 'Inter, sans-serif',
        minHeight: '100vh',
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            📊 Dashboard del Grupo
          </h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>
            Ventas · Costos · Marketing · Canales · YoY
            {lastUpdate && (
              <span style={{ marginLeft: 12, color: '#444' }}>
                · Actualizado {lastUpdate}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={fetchData}
            style={{
              background: '#1e1e2e',
              border: '1px solid #333',
              color: '#888',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            🔄 Actualizar
          </button>
          <div
            style={{
              display: 'flex',
              background: '#1e1e2e',
              borderRadius: 10,
              padding: 4,
              gap: 4,
            }}
          >
            {[
              ['individual', 'Por empresa'],
              ['comparativa', 'Comparar todas'],
            ].map(([v, lbl]) => (
              <button
                key={v}
                onClick={() => setModo(v)}
                style={{
                  background: modo === v ? '#6366f1' : 'transparent',
                  border: 'none',
                  color: modo === v ? '#fff' : '#666',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 80, color: '#666' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div>Cargando datos desde Google Sheets...</div>
        </div>
      )}
      {error && (
        <div
          style={{
            background: '#2a1a1a',
            border: '1px solid #f43f5e44',
            borderRadius: 12,
            padding: 24,
            textAlign: 'center',
            color: '#f43f5e',
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontWeight: 600 }}>Error al cargar los datos</div>
          <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
            {error}
          </div>
          <button
            onClick={fetchData}
            style={{
              marginTop: 16,
              background: '#f43f5e22',
              border: '1px solid #f43f5e',
              color: '#f43f5e',
              borderRadius: 8,
              padding: '8px 20px',
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      )}
      {!loading && !error && rawData.length === 0 && (
        <div style={{ textAlign: 'center', padding: 80, color: '#666' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <div>No se encontraron datos en el Google Sheet.</div>
        </div>
      )}
      {!loading &&
        !error &&
        rawData.length > 0 &&
        empresas.length > 0 &&
        years.length > 0 &&
        (modo === 'individual' ? (
          <VistaIndividual
            rawData={rawData}
            empresas={empresas}
            years={years}
            empColors={empColors}
          />
        ) : (
          <VistaComparativa
            rawData={rawData}
            empresas={empresas}
            years={years}
            empColors={empColors}
          />
        ))}
    </div>
  );
}
