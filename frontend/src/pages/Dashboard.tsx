import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { FileSpreadsheet, AlertTriangle, CheckCircle2, RefreshCw, AlertCircle, Inbox, FolderSearch, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── INTERFACES PARA TIPADO DE LA API ────────────────────────────────────────
interface EvolucionDia {
  fecha: string;
  procesados: number;
}

interface TopIncidencia {
  codigo: string;
  incidencias: number;
}

interface ArchivoReciente {
  id: number;
  nombre: string;
  fecha: string;
  estado: string;
  registros: number;
}

interface DashboardMetricas {
  evolucion: EvolucionDia[];
  top_incidencias: TopIncidencia[];
  ultimos_archivos: ArchivoReciente[];
}
// ─────────────────────────────────────────────────────────────────────────────

// Componente Tooltip Personalizado (Soporta Modo Oscuro y Claro nativo)
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover text-popover-foreground border border-border shadow-md rounded-lg p-3 text-sm animate-in fade-in zoom-in-95 duration-200">
        <p className="font-bold mb-2 text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="font-medium text-muted-foreground">{entry.name}:</span>
            <span className="font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function KardexDashboard() {
  const navigate = useNavigate();
  const [metricas, setMetricas] = useState<DashboardMetricas | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetricas = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      
      const res = await fetch(`${apiUrl}/api/v1/dashboard/metricas`);
      if (!res.ok) {
        throw new Error("No se pudieron cargar las métricas del dashboard.");
      }
      
      const data: DashboardMetricas = await res.json();
      setMetricas(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    fetchMetricas();
  }, [fetchMetricas]);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "procesado":
        return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20 backdrop-blur-sm transition-colors"><CheckCircle2 className="w-3 h-3 mr-1"/> Limpio</Badge>;
      case "con_alertas":
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-500 hover:bg-amber-500/25 border-amber-500/20 backdrop-blur-sm transition-colors"><AlertTriangle className="w-3 h-3 mr-1"/> Alertas</Badge>;
      case "error":
        return <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-500 hover:bg-rose-500/25 border-rose-500/20 backdrop-blur-sm transition-colors"><AlertTriangle className="w-3 h-3 mr-1"/> Errores</Badge>;
      default:
        return <Badge variant="outline" className="backdrop-blur-sm">Desconocido</Badge>;
    }
  };

  const formatearFechaRelativa = (fechaStr: string) => {
    try {
      const date = new Date(fechaStr);
      if (isNaN(date.getTime())) return fechaStr;
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    } catch {
      return fechaStr;
    }
  };

  const handleBarClick = (data: any) => {
    toast.info(`Explorando incidencias para: ${data.codigo}`);
    // Aquí puedes redirigir a una vista de detalle del producto si existe
    // navigate(`/incidencias?producto=${data.codigo}`);
  };

  // ════ KPI CALCULATIONS ════
  const totalArchivos7Dias = metricas?.evolucion.reduce((acc, curr) => acc + curr.procesados, 0) || 0;
  const totalIncidencias = metricas?.top_incidencias.reduce((acc, curr) => acc + curr.incidencias, 0) || 0;
  
  const exitoArchivos = metricas?.ultimos_archivos.filter(a => a.estado === 'procesado').length || 0;
  const totalRecientes = metricas?.ultimos_archivos.length || 1;
  const successRate = metricas ? Math.round((exitoArchivos / totalRecientes) * 100) : 0;

  // ════ SKELETON LOADER ════
  if (cargando && !metricas) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-32 w-full rounded-xl" />))}
        </div>
        <Skeleton className="h-[350px] w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // ════ PANTALLA DE ERROR GLOBAL ════
  if (error && !metricas) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 text-center px-4">
        <div className="p-4 bg-rose-500/10 rounded-full">
          <AlertCircle className="w-12 h-12 text-rose-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">Error de conexión</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">No pudimos conectar con el servidor para obtener las métricas: {error}</p>
          <Button onClick={fetchMetricas} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Intentar nuevamente
          </Button>
        </div>
      </div>
    );
  }

  // ════ RENDERIZADO DEL DASHBOARD REAL ════
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Panel de Auditoría
          </h2>
          <p className="text-muted-foreground mt-1">Monitoreo de calidad y procesamiento de Kardex.</p>
        </div>
        <Button 
          onClick={fetchMetricas} 
          variant="outline" 
          size="sm"
          disabled={cargando}
          className="gap-2 transition-all hover:bg-muted"
        >
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} /> 
          {cargando ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </div>

      {/* ════ TARJETAS DE KPIs ════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-muted/60 overflow-hidden relative group hover:border-blue-500/30 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <FileSpreadsheet className="w-16 h-16" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Archivos (7 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalArchivos7Dias}</div>
            <p className="text-xs text-muted-foreground mt-1">Archivos Excel procesados</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-muted/60 overflow-hidden relative group hover:border-amber-500/30 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-amber-500">
            <AlertTriangle className="w-16 h-16" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalIncidencias}</div>
            <p className="text-xs text-muted-foreground mt-1">Incidencias reportadas</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-muted/60 overflow-hidden relative group hover:border-emerald-500/30 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-emerald-500">
            <CheckCircle2 className="w-16 h-16" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Éxito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{successRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">En archivos recientes</p>
          </CardContent>
        </Card>
      </div>

      {/* ════ GRÁFICO PRINCIPAL: EVOLUCIÓN DE PROCESAMIENTOS ════ */}
      <Card className="shadow-sm border-muted/60">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-md">
              <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            Volumen de Archivos Procesados
          </CardTitle>
          <CardDescription>Cantidad de Excels de Kardex auditados en los últimos 7 días.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full mt-2">
            {!metricas || metricas.evolucion.length === 0 ? (
              <div className="flex flex-col h-full items-center justify-center text-muted-foreground border border-dashed border-muted/60 rounded-xl bg-muted/10">
                <Inbox className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">No hay datos de procesamiento recientes.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricas.evolucion} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="colorProcesados" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                  <XAxis 
                    dataKey="fecha" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'currentColor' }} 
                    className="text-muted-foreground opacity-70"
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                    className="text-muted-foreground opacity-70"
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'currentColor', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.2 }} />
                  <Area 
                    type="monotone" 
                    dataKey="procesados" 
                    name="Archivos"
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorProcesados)"
                    activeDot={{ r: 6, fill: '#3b82f6', stroke: 'var(--background)', strokeWidth: 2 }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ════ DOS COLUMNAS: TOP INCIDENCIAS Y ÚLTIMOS ARCHIVOS ════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* GRÁFICO BARRAS: TOP PRODUCTOS CON INCIDENCIAS */}
        <Card className="shadow-sm border-muted/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/10 rounded-md">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
              </div>
              Top Productos con Incidencias
            </CardTitle>
            <CardDescription>Códigos que requirieron más recálculos o tienen errores.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full mt-2">
              {!metricas || metricas.top_incidencias.length === 0 ? (
                 <div className="flex flex-col h-full items-center justify-center text-emerald-600 border border-dashed border-emerald-500/20 rounded-xl bg-emerald-500/5">
                   <CheckCircle2 className="w-10 h-10 mb-3 opacity-50" />
                   <p className="text-sm font-medium">¡Excelente! No hay incidencias.</p>
                 </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={metricas.top_incidencias} 
                    layout="vertical" 
                    margin={{ top: 5, right: 30, bottom: 5, left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="currentColor" className="opacity-10" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="codigo" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'currentColor', fontWeight: 500 }}
                      className="text-muted-foreground opacity-80"
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', opacity: 0.05 }} />
                    <Bar 
                      dataKey="incidencias" 
                      name="Alertas/Errores"
                      fill="#f59e0b" 
                      radius={[0, 6, 6, 0]} 
                      barSize={24}
                      onClick={handleBarClick}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      {metricas.top_incidencias.map((entry, index) => (
                        <Cell key={`cell-${index}`} className="hover:fill-amber-400 transition-colors duration-200" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* TABLA: ÚLTIMOS ARCHIVOS */}
        <Card className="shadow-sm border-muted/60 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/10 rounded-md">
                  <FolderSearch className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                Actividad Reciente
              </CardTitle>
              <CardDescription>Los últimos reportes subidos.</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/historial')}
            >
              Ver historial <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {!metricas || metricas.ultimos_archivos.length === 0 ? (
               <div className="flex flex-col h-[280px] items-center justify-center text-muted-foreground border border-dashed border-muted/60 rounded-xl bg-muted/5 mt-2">
                 <Inbox className="w-10 h-10 mb-3 opacity-20" />
                 <p className="text-sm">No hay actividad reciente.</p>
               </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-b-muted/60">
                    <TableHead>Archivo</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metricas.ultimos_archivos.map((archivo) => (
                    <TableRow 
                      key={archivo.id} 
                      className="hover:bg-muted/40 transition-colors duration-200 group border-b-muted/40 cursor-pointer"
                      onClick={() => navigate(`/kardex/${archivo.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="truncate w-[120px] sm:w-[180px] text-foreground group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" title={archivo.nombre}>
                          {archivo.nombre}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-normal mt-1 group-hover:text-muted-foreground/80">
                          {formatearFechaRelativa(archivo.fecha)}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">
                        {archivo.registros.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {getEstadoBadge(archivo.estado)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}