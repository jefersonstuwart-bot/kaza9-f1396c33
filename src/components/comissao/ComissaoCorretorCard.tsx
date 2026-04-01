import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Percent, TrendingUp, DollarSign, Loader2, Wallet } from 'lucide-react';
import { NIVEL_CORRETOR_LABELS, type NivelCorretor } from '@/types/crm';
import { useMountedState } from '@/hooks/useRealtimeSubscription';

interface VendaComissao {
  id: string;
  valor_vgv: number;
  percentual_comissao: number;
  valor_comissao: number;
  numero_venda_periodo: number;
  data_venda: string;
  construtora?: { nome: string } | null;
}

export default function ComissaoCorretorCard() {
  const { profile } = useAuth();
  const isMounted = useMountedState();
  const fetchIdRef = useRef(0);
  
  const [vendas, setVendas] = useState<VendaComissao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!profile?.id || !profile?.nivel_corretor) return;
    
    const fetchId = ++fetchIdRef.current;

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('vendas')
        .select('id, valor_vgv, percentual_comissao, valor_comissao, numero_venda_periodo, data_venda, construtora:construtoras(nome)')
        .eq('corretor_id', profile.id)
        .eq('status', 'ATIVA')
        .gte('data_venda', startOfMonth.toISOString().split('T')[0])
        .lte('data_venda', endOfMonth.toISOString().split('T')[0])
        .order('data_venda', { ascending: true });

      if (fetchId !== fetchIdRef.current || !isMounted()) return;
      if (error) throw error;

      setVendas((data as VendaComissao[]) || []);
    } catch (error) {
      if (isMounted()) {
        console.error('Error fetching comissao data:', error);
      }
    } finally {
      if (fetchId === fetchIdRef.current && isMounted()) {
        setLoading(false);
      }
    }
  }, [profile?.id, profile?.nivel_corretor, isMounted]);

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile?.id, fetchData]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatPercent = (value: number) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + '%';

  if (loading) {
    return (
      <Card className="card-elevated">
        <CardContent className="pt-6 flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!profile?.nivel_corretor) {
    return (
      <Card className="card-elevated">
        <CardContent className="pt-6 text-center text-muted-foreground">
          Configure seu nível de corretor para visualizar as comissões.
        </CardContent>
      </Card>
    );
  }

  const vendasCount = vendas.length;
  const nivelCorretor = profile.nivel_corretor;
  const isRetroativo = nivelCorretor !== 'JUNIOR';
  const totalVGV = vendas.reduce((sum, v) => sum + (v.valor_vgv || 0), 0);
  
  // For retroactive, use the highest percentual from vendas (last one)
  const lastVenda = vendas[vendas.length - 1];
  const currentPercentual = lastVenda?.percentual_comissao || 0;
  
  let totalComissao: number;
  if (isRetroativo) {
    totalComissao = (totalVGV * currentPercentual) / 100;
  } else {
    totalComissao = vendas.reduce((sum, v) => sum + (v.valor_comissao || 0), 0);
  }

  const currentMonth = new Date().toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Card className="card-elevated overflow-hidden">
      <div className="bg-gradient-to-r from-accent/10 to-primary/10 p-6">
        <CardTitle className="font-display flex items-center gap-2 text-xl">
          <Percent className="h-6 w-6 text-accent" />
          Sua Comissão
        </CardTitle>
        <CardDescription className="mt-1">
          {currentMonth} • {NIVEL_CORRETOR_LABELS[profile.nivel_corretor]}
        </CardDescription>
      </div>
      <CardContent className="pt-6 space-y-6">
        {/* Highlighted Commission Value */}
        <div className="bg-gradient-to-br from-accent/20 via-accent/10 to-primary/10 rounded-xl p-6 border-2 border-accent/30 shadow-lg">
          <div className="flex items-center gap-3 text-accent mb-2">
            <div className="bg-accent/20 p-2 rounded-full">
              <Wallet className="h-6 w-6" />
            </div>
            <span className="font-semibold text-lg">Comissão a Receber</span>
          </div>
          <p className="text-4xl md:text-5xl font-bold text-accent tracking-tight">
            {formatCurrency(totalComissao)}
          </p>
          {isRetroativo && (
            <p className="text-sm text-muted-foreground mt-2">
              {formatPercent(currentPercentual)} aplicado sobre VGV de {formatCurrency(totalVGV)}
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="bg-muted/50 rounded-lg p-4 border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Vendas no Período
            </div>
            <p className="text-2xl font-bold">{vendasCount}</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              VGV Total
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalVGV)}</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Percent className="h-4 w-4" />
              Percentual Atual
            </div>
            <p className="text-2xl font-bold text-accent">{formatPercent(currentPercentual)}</p>
          </div>
        </div>

        {/* Individual sales list - corretor sees values but NOT faixa progression */}
        {vendas.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Suas Vendas no Período</p>
            <div className="space-y-2">
              {vendas.map((v, i) => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {v.numero_venda_periodo || (i + 1)}ª
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{(v.construtora as any)?.nome || 'Venda'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.data_venda + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-accent">
                      {formatCurrency(isRetroativo ? (v.valor_vgv * currentPercentual / 100) : (v.valor_comissao || 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPercent(isRetroativo ? currentPercentual : (v.percentual_comissao || 0))} de {formatCurrency(v.valor_vgv)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
