import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Percent, TrendingUp, DollarSign, Target, Loader2, Wallet } from 'lucide-react';
import { NIVEL_CORRETOR_LABELS, type NivelCorretor } from '@/types/crm';

interface ComissaoFaixa {
  numero_venda: number;
  percentual: number;
}

interface VendaComissao {
  id: string;
  valor_vgv: number;
  percentual_comissao: number;
  valor_comissao: number;
  numero_venda_periodo: number;
  data_venda: string;
}

export default function ComissaoCorretorCard() {
  const { profile } = useAuth();
  const [vendas, setVendas] = useState<VendaComissao[]>([]);
  const [faixas, setFaixas] = useState<ComissaoFaixa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile?.id]);

  const fetchData = async () => {
    if (!profile?.id || !profile?.nivel_corretor) return;

    try {
      // Get current period boundaries (mensal by default)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const [vendasResult, faixasResult] = await Promise.all([
        supabase
          .from('vendas')
          .select('id, valor_vgv, percentual_comissao, valor_comissao, numero_venda_periodo, data_venda')
          .eq('corretor_id', profile.id)
          .eq('status', 'ATIVA')
          .gte('data_venda', startOfMonth.toISOString().split('T')[0])
          .lte('data_venda', endOfMonth.toISOString().split('T')[0])
          .order('data_venda', { ascending: false }),
        supabase
          .from('comissao_faixas')
          .select('numero_venda, percentual')
          .eq('nivel_corretor', profile.nivel_corretor)
          .eq('ativo', true)
          .order('numero_venda'),
      ]);

      if (vendasResult.error) throw vendasResult.error;
      if (faixasResult.error) throw faixasResult.error;

      setVendas((vendasResult.data as VendaComissao[]) || []);
      setFaixas((faixasResult.data as ComissaoFaixa[]) || []);
    } catch (error) {
      console.error('Error fetching comissao data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

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
  
  // Check if corretor uses retroactive commission (PLENO, SENIOR, CLOSER)
  const isRetroativo = nivelCorretor !== 'JUNIOR';
  
  // Calculate total VGV
  const totalVGV = vendas.reduce((sum, v) => sum + (v.valor_vgv || 0), 0);
  
  // Find current percentual based on number of sales
  const maxFaixa = faixas.length > 0 ? Math.max(...faixas.map((f) => f.numero_venda)) : 1;
  const currentFaixaNum = Math.min(vendasCount, maxFaixa);
  const currentFaixa = faixas.find((f) => f.numero_venda === currentFaixaNum) || faixas[0];
  const currentPercentual = currentFaixa?.percentual || 0;
  
  // Calculate total commission
  let totalComissao: number;
  if (isRetroativo) {
    // Retroactive: apply current percentage to total VGV
    totalComissao = (totalVGV * currentPercentual) / 100;
  } else {
    // Progressive (JUNIOR): sum individual commissions
    totalComissao = vendas.reduce((sum, v) => sum + (v.valor_comissao || 0), 0);
  }

  // Find next faixa
  const nextFaixa = faixas.find((f) => f.numero_venda > vendasCount);
  const vendasParaProximaFaixa = nextFaixa ? nextFaixa.numero_venda - vendasCount : 0;
  const isMaxFaixa = vendasCount >= maxFaixa;

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
          {isRetroativo && (
            <Badge variant="outline" className="ml-2 text-xs">
              Retroativo
            </Badge>
          )}
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
              {currentPercentual}% aplicado sobre VGV de {formatCurrency(totalVGV)}
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
            <p className="text-2xl font-bold text-accent">{currentPercentual}%</p>
          </div>
        </div>

        {/* Progress to next tier */}
        {!isMaxFaixa && nextFaixa && (
          <div className="space-y-2 p-4 rounded-lg bg-muted/30 border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Target className="h-4 w-4" />
                Próxima faixa: {nextFaixa.percentual}%
              </span>
              <span className="font-medium">
                {vendasParaProximaFaixa} {vendasParaProximaFaixa === 1 ? 'venda' : 'vendas'} restante
                {vendasParaProximaFaixa !== 1 && 's'}
              </span>
            </div>
            <Progress
              value={(vendasCount / nextFaixa.numero_venda) * 100}
              className="h-3"
            />
          </div>
        )}

        {isMaxFaixa && (
          <div className="bg-accent/10 rounded-lg p-4 text-center border border-accent/30">
            <Badge className="bg-accent mb-2">🎉 Faixa Máxima Atingida!</Badge>
            <p className="text-sm text-muted-foreground">
              Você está na maior faixa de comissão: {currentPercentual}%
            </p>
          </div>
        )}

        {/* Faixas Reference */}
        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-2">Faixas de Comissão</p>
          <div className="flex flex-wrap gap-2">
            {faixas.map((faixa) => (
              <Badge
                key={faixa.numero_venda}
                variant={vendasCount >= faixa.numero_venda ? 'default' : 'outline'}
                className={vendasCount >= faixa.numero_venda ? 'bg-accent' : ''}
              >
                {faixa.numero_venda}ª: {faixa.percentual}%
              </Badge>
            ))}
          </div>
        </div>

        {/* Info about commission type */}
        <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
          <p className="text-sm text-accent-foreground">
            {isRetroativo ? (
              <>
                <strong>Comissão Retroativa:</strong> Quando você atinge uma nova faixa, 
                o novo percentual é aplicado sobre todo o VGV do período.
              </>
            ) : (
              <>
                <strong>Comissão Progressiva:</strong> Cada venda recebe o percentual 
                correspondente à sua posição na sequência de vendas.
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
