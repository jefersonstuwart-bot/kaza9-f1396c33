import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Percent, TrendingUp, DollarSign, Target, Loader2 } from 'lucide-react';
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
  const currentPercentual = vendas[0]?.percentual_comissao || faixas[0]?.percentual || 0;
  const totalComissao = vendas.reduce((sum, v) => sum + (v.valor_comissao || 0), 0);

  // Find next faixa
  const maxFaixa = faixas.length > 0 ? Math.max(...faixas.map((f) => f.numero_venda)) : 1;
  const nextFaixa = faixas.find((f) => f.numero_venda > vendasCount);
  const vendasParaProximaFaixa = nextFaixa ? nextFaixa.numero_venda - vendasCount : 0;
  const isMaxFaixa = vendasCount >= maxFaixa;

  const currentMonth = new Date().toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Percent className="h-5 w-5 text-accent" />
          Sua Comissão
        </CardTitle>
        <CardDescription>
          {currentMonth} • {NIVEL_CORRETOR_LABELS[profile.nivel_corretor]}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Vendas no Período
            </div>
            <p className="text-2xl font-bold">{vendasCount}</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Percent className="h-4 w-4" />
              Percentual Atual
            </div>
            <p className="text-2xl font-bold text-accent">{currentPercentual}%</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Total Comissão
            </div>
            <p className="text-2xl font-bold text-accent">{formatCurrency(totalComissao)}</p>
          </div>
        </div>

        {/* Progress to next tier */}
        {!isMaxFaixa && nextFaixa && (
          <div className="space-y-2">
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
              className="h-2"
            />
          </div>
        )}

        {isMaxFaixa && (
          <div className="bg-accent/10 rounded-lg p-4 text-center">
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
      </CardContent>
    </Card>
  );
}
