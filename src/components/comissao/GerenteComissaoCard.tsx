import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  Users, 
  TrendingUp, 
  DollarSign,
  Target,
  Percent
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ComissaoGerenteFaixa } from '@/types/crm';
import { useMountedState } from '@/hooks/useRealtimeSubscription';

interface GerenteComissaoData {
  total_vendas: number;
  valor_vgv_total: number;
  faixa_id: string | null;
  percentual_aplicado: number;
  valor_comissao: number;
  vendas_para_proxima_faixa: number;
}

export default function GerenteComissaoCard() {
  const { profile, isGerente } = useAuth();
  const isMounted = useMountedState();
  const fetchIdRef = useRef(0);
  
  const [loading, setLoading] = useState(true);
  const [comissaoData, setComissaoData] = useState<GerenteComissaoData | null>(null);
  const [faixas, setFaixas] = useState<ComissaoGerenteFaixa[]>([]);
  const [faixaAtual, setFaixaAtual] = useState<ComissaoGerenteFaixa | null>(null);
  const [proximaFaixa, setProximaFaixa] = useState<ComissaoGerenteFaixa | null>(null);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const fetchData = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    
    try {
      // Fetch commission calculation using RPC
      const { data: calcData, error: calcError } = await supabase.rpc(
        'calculate_gerente_commission',
        {
          _gerente_id: profile!.id,
          _mes: currentMonth,
          _ano: currentYear,
        }
      );

      // Verificar se ainda é a requisição mais recente e componente está montado
      if (fetchId !== fetchIdRef.current || !isMounted()) return;

      if (calcError) {
        console.error('Error calculating commission:', calcError);
      } else if (calcData && calcData.length > 0) {
        setComissaoData(calcData[0] as GerenteComissaoData);
      }

      // Fetch all tiers
      const { data: faixasData, error: faixasError } = await supabase
        .from('comissao_gerente_faixas')
        .select('*')
        .eq('ativo', true)
        .order('faixa_inicio');

      if (fetchId !== fetchIdRef.current || !isMounted()) return;

      if (faixasError) throw faixasError;
      setFaixas((faixasData as ComissaoGerenteFaixa[]) || []);

      // Find current and next tier
      if (calcData && calcData.length > 0 && faixasData) {
        const current = faixasData.find((f: ComissaoGerenteFaixa) => f.id === calcData[0].faixa_id);
        setFaixaAtual(current as ComissaoGerenteFaixa || null);

        // Find next tier
        const totalVendas = calcData[0].total_vendas;
        const next = faixasData.find(
          (f: ComissaoGerenteFaixa) => f.faixa_inicio > totalVendas
        );
        setProximaFaixa(next as ComissaoGerenteFaixa || null);
      }
    } catch (error) {
      if (isMounted()) {
        console.error('Error fetching gerente comissao:', error);
      }
    } finally {
      if (fetchId === fetchIdRef.current && isMounted()) {
        setLoading(false);
      }
    }
  }, [profile, currentMonth, currentYear, isMounted]);

  useEffect(() => {
    if (isGerente && profile?.id) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isGerente, profile?.id, fetchData]);

  const formatFaixaLabel = (faixa: ComissaoGerenteFaixa) => {
    if (faixa.faixa_fim === null) {
      return `${faixa.faixa_inicio}+ vendas`;
    }
    if (faixa.faixa_inicio === faixa.faixa_fim) {
      return `${faixa.faixa_inicio} venda${faixa.faixa_inicio > 1 ? 's' : ''}`;
    }
    return `${faixa.faixa_inicio} a ${faixa.faixa_fim} vendas`;
  };

  const calculateProgress = () => {
    if (!comissaoData || !proximaFaixa) return 100;
    if (!faixaAtual) return 0;
    
    const currentStart = faixaAtual.faixa_inicio;
    const nextStart = proximaFaixa.faixa_inicio;
    const vendas = comissaoData.total_vendas;
    
    const progress = ((vendas - currentStart + 1) / (nextStart - currentStart)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  if (!isGerente) {
    return null;
  }

  if (loading) {
    return (
      <Card className="card-elevated">
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const periodoLabel = format(new Date(currentYear, currentMonth - 1), "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6">
      {/* Main Commission Card */}
      <Card className="card-elevated overflow-hidden">
        <div className="bg-gradient-to-r from-accent/10 to-primary/10 p-6">
          <CardTitle className="font-display flex items-center gap-2 text-xl">
            <Users className="h-6 w-6 text-accent" />
            Sua Comissão de Gerente
          </CardTitle>
          <CardDescription className="mt-1">
            Período: {periodoLabel}
          </CardDescription>
        </div>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Vendas */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <TrendingUp className="h-4 w-4" />
                Vendas do Time
              </div>
              <div className="text-3xl font-bold">
                {comissaoData?.total_vendas || 0}
              </div>
            </div>

            {/* VGV Total */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <DollarSign className="h-4 w-4" />
                VGV Total
              </div>
              <div className="text-2xl font-bold">
                R$ {(comissaoData?.valor_vgv_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </div>
            </div>

            {/* Faixa Atual */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Percent className="h-4 w-4" />
                Faixa Atual
              </div>
              <div className="flex items-center gap-2">
                {faixaAtual ? (
                  <>
                    <Badge variant="outline" className="text-lg font-bold bg-accent/10 text-accent border-accent/30">
                      {comissaoData?.percentual_aplicado || 0}%
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({formatFaixaLabel(faixaAtual)})
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            </div>

          </div>

          {/* Highlighted Commission Value */}
          <div className="mt-6 bg-gradient-to-br from-accent/20 via-accent/10 to-primary/10 rounded-xl p-6 border-2 border-accent/30 shadow-lg">
            <div className="flex items-center gap-3 text-accent mb-2">
              <div className="bg-accent/20 p-2 rounded-full">
                <DollarSign className="h-6 w-6" />
              </div>
              <span className="font-semibold text-lg">Comissão a Receber</span>
            </div>
            <p className="text-4xl md:text-5xl font-bold text-accent tracking-tight">
              R$ {(comissaoData?.valor_comissao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {comissaoData?.percentual_aplicado || 0}% aplicado sobre VGV de R$ {(comissaoData?.valor_vgv_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </p>
          </div>

          {/* Progress to next tier */}
          {proximaFaixa && comissaoData && comissaoData.vendas_para_proxima_faixa > 0 && (
            <div className="mt-6 p-4 rounded-lg bg-muted/30 border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-accent" />
                  <span className="font-medium">Próxima Faixa</span>
                </div>
                <Badge variant="outline">
                  {formatFaixaLabel(proximaFaixa)} → {proximaFaixa.percentual}%
                </Badge>
              </div>
              <Progress value={calculateProgress()} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                Faltam <span className="font-bold text-accent">{comissaoData.vendas_para_proxima_faixa}</span> venda{comissaoData.vendas_para_proxima_faixa > 1 ? 's' : ''} para alcançar a próxima faixa
              </p>
            </div>
          )}

          {/* All tiers reference */}
          {faixas.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                Faixas de Comissão Configuradas
              </h4>
              <div className="flex flex-wrap gap-2">
                {faixas.map((faixa) => (
                  <Badge
                    key={faixa.id}
                    variant={faixa.id === faixaAtual?.id ? 'default' : 'outline'}
                    className={faixa.id === faixaAtual?.id ? 'bg-accent' : ''}
                  >
                    {formatFaixaLabel(faixa)}: {faixa.percentual}%
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-accent/10 rounded-lg border border-accent/20">
            <p className="text-sm text-accent-foreground">
              <strong>Nota:</strong> A comissão é calculada de forma retroativa - 
              quando você atinge uma nova faixa, o novo percentual é aplicado sobre 
              todo o VGV do período.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}