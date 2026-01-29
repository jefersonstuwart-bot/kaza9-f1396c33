import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LEAD_STATUS_CONFIG, type LeadStatus } from '@/types/crm';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import ComissaoCorretorCard from '@/components/comissao/ComissaoCorretorCard';

interface DashboardData {
  totalLeads: number;
  totalLeadsMesAnterior: number;
  leadsByStatus: Record<string, number>;
  totalVendas: number;
  vendasAtivas: number;
  vendasAtivasMesAnterior: number;
  vgvTotal: number;
  vgvTotalMesAnterior: number;
  metaVgv: number;
  metaQtdVendas: number;
  realizadoVgv: number;
  realizadoQtdVendas: number;
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  NOVO: '#EAB308',
  EM_ATENDIMENTO: '#F97316',
  ANALISE_CREDITO: '#A855F7',
  APROVADO: '#22C55E',
  REPROVADO: '#EF4444',
  DISTRATO: '#1F2937',
};

export default function Dashboard() {
  const { profile } = useAuth();
  const [data, setData] = useState<DashboardData>({
    totalLeads: 0,
    totalLeadsMesAnterior: 0,
    leadsByStatus: {},
    totalVendas: 0,
    vendasAtivas: 0,
    vendasAtivasMesAnterior: 0,
    vgvTotal: 0,
    vgvTotalMesAnterior: 0,
    metaVgv: 0,
    metaQtdVendas: 0,
    realizadoVgv: 0,
    realizadoQtdVendas: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile) return;

    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      // Calculate previous month
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      
      // Date ranges for current month
      const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const currentMonthEnd = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
      
      // Date ranges for previous month
      const prevMonthStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
      const prevMonthEnd = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0];

      // Fetch all leads for status distribution
      const { data: allLeads, error: allLeadsError } = await supabase
        .from('leads')
        .select('status');

      if (allLeadsError) throw allLeadsError;

      // Count leads by status
      const leadsByStatus: Record<string, number> = {};
      allLeads?.forEach(lead => {
        leadsByStatus[lead.status] = (leadsByStatus[lead.status] || 0) + 1;
      });

      // Fetch leads created in current month
      const { data: leadsCurrentMonth, error: leadsCurrentError } = await supabase
        .from('leads')
        .select('id')
        .gte('data_criacao', currentMonthStart)
        .lte('data_criacao', `${currentMonthEnd}T23:59:59`);

      if (leadsCurrentError) throw leadsCurrentError;

      // Fetch leads created in previous month
      const { data: leadsPrevMonth, error: leadsPrevError } = await supabase
        .from('leads')
        .select('id')
        .gte('data_criacao', prevMonthStart)
        .lte('data_criacao', `${prevMonthEnd}T23:59:59`);

      if (leadsPrevError) throw leadsPrevError;

      // Fetch vendas for current month
      const { data: vendasCurrentMonth, error: vendasCurrentError } = await supabase
        .from('vendas')
        .select('valor_vgv, status')
        .gte('data_venda', currentMonthStart)
        .lte('data_venda', currentMonthEnd);

      if (vendasCurrentError) throw vendasCurrentError;

      // Fetch vendas for previous month
      const { data: vendasPrevMonth, error: vendasPrevError } = await supabase
        .from('vendas')
        .select('valor_vgv, status')
        .gte('data_venda', prevMonthStart)
        .lte('data_venda', prevMonthEnd);

      if (vendasPrevError) throw vendasPrevError;

      const vendasAtivasCurrentMonth = vendasCurrentMonth?.filter(v => v.status === 'ATIVA') || [];
      const vendasAtivasPrevMonth = vendasPrevMonth?.filter(v => v.status === 'ATIVA') || [];
      
      const vgvCurrentMonth = vendasAtivasCurrentMonth.reduce((sum, v) => sum + Number(v.valor_vgv), 0);
      const vgvPrevMonth = vendasAtivasPrevMonth.reduce((sum, v) => sum + Number(v.valor_vgv), 0);

      // Fetch metas for current month
      const { data: meta } = await supabase
        .from('metas')
        .select('meta_vgv, meta_qtd_vendas')
        .eq('usuario_id', profile.id)
        .eq('mes', currentMonth)
        .eq('ano', currentYear)
        .maybeSingle();

      setData({
        totalLeads: leadsCurrentMonth?.length || 0,
        totalLeadsMesAnterior: leadsPrevMonth?.length || 0,
        leadsByStatus,
        totalVendas: vendasCurrentMonth?.length || 0,
        vendasAtivas: vendasAtivasCurrentMonth.length,
        vendasAtivasMesAnterior: vendasAtivasPrevMonth.length,
        vgvTotal: vgvCurrentMonth,
        vgvTotalMesAnterior: vgvPrevMonth,
        metaVgv: meta?.meta_vgv || 0,
        metaQtdVendas: meta?.meta_qtd_vendas || 0,
        realizadoVgv: vgvCurrentMonth,
        realizadoQtdVendas: vendasAtivasCurrentMonth.length,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getProgressPercentage = (realized: number, goal: number) => {
    if (goal === 0) return 0;
    return Math.min((realized / goal) * 100, 100);
  };

  const calculateVariation = (current: number, previous: number) => {
    if (previous === 0) {
      if (current === 0) return { percentage: 0, isPositive: true, isZero: true };
      return { percentage: 100, isPositive: true, isZero: false };
    }
    const percentage = ((current - previous) / previous) * 100;
    return { 
      percentage: Math.abs(percentage), 
      isPositive: percentage >= 0, 
      isZero: percentage === 0 
    };
  };

  const VariationIndicator = ({ current, previous }: { current: number; previous: number }) => {
    const { percentage, isPositive, isZero } = calculateVariation(current, previous);
    
    if (isZero) {
      return (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Minus className="h-4 w-4" />
          <span>Sem variação</span>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-accent' : 'text-destructive'}`}>
        {isPositive ? (
          <ArrowUpRight className="h-4 w-4" />
        ) : (
          <ArrowDownRight className="h-4 w-4" />
        )}
        <span>{isPositive ? '+' : '-'}{percentage.toFixed(0)}% vs mês anterior</span>
      </div>
    );
  };

  const pieChartData = Object.entries(data.leadsByStatus).map(([status, count]) => ({
    name: LEAD_STATUS_CONFIG[status as LeadStatus]?.label || status,
    value: count,
    color: STATUS_COLORS[status as LeadStatus] || '#6B7280',
  }));

  const barChartData = [
    { name: 'Jan', vendas: 12 },
    { name: 'Fev', vendas: 19 },
    { name: 'Mar', vendas: 15 },
    { name: 'Abr', vendas: 22 },
    { name: 'Mai', vendas: 28 },
    { name: 'Jun', vendas: 25 },
  ];

  const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Bem-vindo, {profile?.nome?.split(' ')[0]}! Aqui está o resumo de {currentMonth}.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-metric">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads do Mês
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.totalLeads}</div>
            <VariationIndicator 
              current={data.totalLeads} 
              previous={data.totalLeadsMesAnterior} 
            />
          </CardContent>
        </Card>

        <Card className="card-metric">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendas do Mês
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.vendasAtivas}</div>
            <VariationIndicator 
              current={data.vendasAtivas} 
              previous={data.vendasAtivasMesAnterior} 
            />
          </CardContent>
        </Card>

        <Card className="card-metric">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              VGV do Mês
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(data.vgvTotal)}</div>
            <VariationIndicator 
              current={data.vgvTotal} 
              previous={data.vgvTotalMesAnterior} 
            />
          </CardContent>
        </Card>

        <Card className="card-metric">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Meta do Mês
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {getProgressPercentage(data.realizadoVgv, data.metaVgv).toFixed(0)}%
            </div>
            <Progress 
              value={getProgressPercentage(data.realizadoVgv, data.metaVgv)} 
              className="h-2 mt-2" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leads by Status */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="font-display">Leads por Status</CardTitle>
            <CardDescription>Distribuição atual dos leads</CardDescription>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum lead cadastrado ainda
              </div>
            )}
            
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4">
              {pieChartData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {entry.name} ({entry.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sales Chart */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="font-display">Vendas por Mês</CardTitle>
            <CardDescription>Evolução das vendas nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="vendas" 
                    fill="hsl(var(--accent))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals and Commission Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Target className="h-5 w-5 text-accent" />
              Meta de VGV
            </CardTitle>
            <CardDescription>{currentMonth}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Realizado</span>
                <span className="font-semibold">{formatCurrency(data.realizadoVgv)}</span>
              </div>
              <Progress 
                value={getProgressPercentage(data.realizadoVgv, data.metaVgv)} 
                className="h-3" 
              />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Meta</span>
                <span className="font-semibold">{formatCurrency(data.metaVgv || 500000)}</span>
              </div>
              
              {data.metaVgv > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {data.realizadoVgv >= data.metaVgv ? (
                      <span className="text-accent font-medium">🎉 Parabéns! Meta atingida!</span>
                    ) : (
                      <>
                        Faltam <span className="font-medium text-foreground">
                          {formatCurrency(data.metaVgv - data.realizadoVgv)}
                        </span> para atingir a meta
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Meta de Vendas
            </CardTitle>
            <CardDescription>{currentMonth}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Realizadas</span>
                <span className="font-semibold">{data.realizadoQtdVendas} vendas</span>
              </div>
              <Progress 
                value={getProgressPercentage(data.realizadoQtdVendas, data.metaQtdVendas || 10)} 
                className="h-3" 
              />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Meta</span>
                <span className="font-semibold">{data.metaQtdVendas || 10} vendas</span>
              </div>
              
              {(data.metaQtdVendas || 10) > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {data.realizadoQtdVendas >= (data.metaQtdVendas || 10) ? (
                      <span className="text-accent font-medium">🎉 Parabéns! Meta atingida!</span>
                    ) : (
                      <>
                        Faltam <span className="font-medium text-foreground">
                          {(data.metaQtdVendas || 10) - data.realizadoQtdVendas}
                        </span> vendas para atingir a meta
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission Card for Corretor */}
      <ComissaoCorretorCard />
    </div>
  );
}