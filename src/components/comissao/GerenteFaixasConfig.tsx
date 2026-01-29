import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Percent, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  Users, 
  Calculator,
  History,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ComissaoGerenteFaixa, ComissaoGerenteFaixaHistorico, Profile } from '@/types/crm';

interface FaixaHistoricoWithUser extends ComissaoGerenteFaixaHistorico {
  usuario?: Profile;
}

export default function GerenteFaixasConfig() {
  const { profile, isDirector } = useAuth();
  const { toast } = useToast();
  const [faixas, setFaixas] = useState<ComissaoGerenteFaixa[]>([]);
  const [historico, setHistorico] = useState<FaixaHistoricoWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFaixa, setEditingFaixa] = useState<ComissaoGerenteFaixa | null>(null);

  const [formData, setFormData] = useState({
    faixa_inicio: '',
    faixa_fim: '',
    percentual: '',
    semLimite: false,
  });

  // Simulation state
  const [simulacaoVGV, setSimulacaoVGV] = useState('');
  const [simulacaoVendas, setSimulacaoVendas] = useState('');

  useEffect(() => {
    if (isDirector) {
      fetchData();
    }
  }, [isDirector]);

  const fetchData = async () => {
    try {
      const [faixasResult, historicoResult] = await Promise.all([
        supabase
          .from('comissao_gerente_faixas')
          .select('*')
          .order('faixa_inicio'),
        supabase
          .from('comissao_gerente_faixas_historico')
          .select('*, usuario:profiles(id, nome)')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (faixasResult.error) throw faixasResult.error;
      setFaixas((faixasResult.data as ComissaoGerenteFaixa[]) || []);
      setHistorico((historicoResult.data as FaixaHistoricoWithUser[]) || []);
    } catch (error) {
      console.error('Error fetching gerente faixas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (faixa?: ComissaoGerenteFaixa) => {
    if (faixa) {
      setEditingFaixa(faixa);
      setFormData({
        faixa_inicio: faixa.faixa_inicio.toString(),
        faixa_fim: faixa.faixa_fim?.toString() || '',
        percentual: faixa.percentual.toString(),
        semLimite: faixa.faixa_fim === null,
      });
    } else {
      setEditingFaixa(null);
      setFormData({
        faixa_inicio: '',
        faixa_fim: '',
        percentual: '',
        semLimite: false,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveFaixa = async () => {
    if (!formData.faixa_inicio || !formData.percentual) {
      toast({
        title: 'Erro',
        description: 'Preencha os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    const faixa_inicio = parseInt(formData.faixa_inicio);
    const faixa_fim = formData.semLimite ? null : parseInt(formData.faixa_fim);
    const percentual = parseFloat(formData.percentual);

    if (isNaN(faixa_inicio) || faixa_inicio < 1) {
      toast({
        title: 'Erro',
        description: 'Início da faixa deve ser maior que 0',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.semLimite && (isNaN(faixa_fim!) || faixa_fim! < faixa_inicio)) {
      toast({
        title: 'Erro',
        description: 'Fim da faixa deve ser maior ou igual ao início',
        variant: 'destructive',
      });
      return;
    }

    if (isNaN(percentual) || percentual < 0 || percentual > 100) {
      toast({
        title: 'Erro',
        description: 'Percentual deve estar entre 0 e 100',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      if (editingFaixa) {
        // Update existing
        const { error } = await supabase
          .from('comissao_gerente_faixas')
          .update({ 
            faixa_inicio,
            faixa_fim,
            percentual,
          })
          .eq('id', editingFaixa.id);

        if (error) throw error;

        // Log history
        await supabase.from('comissao_gerente_faixas_historico').insert({
          faixa_id: editingFaixa.id,
          acao: 'ATUALIZADO',
          percentual_anterior: editingFaixa.percentual,
          percentual_novo: percentual,
          usuario_id: profile?.id,
        });

        toast({ title: 'Faixa atualizada!' });
      } else {
        // Create new
        const { data: newFaixa, error } = await supabase
          .from('comissao_gerente_faixas')
          .insert({
            faixa_inicio,
            faixa_fim,
            percentual,
            ativo: true,
          })
          .select()
          .single();

        if (error) throw error;

        // Log history
        await supabase.from('comissao_gerente_faixas_historico').insert({
          faixa_id: newFaixa.id,
          acao: 'CRIADO',
          percentual_anterior: null,
          percentual_novo: percentual,
          usuario_id: profile?.id,
        });

        toast({ title: 'Faixa criada!' });
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving faixa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a faixa',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (faixa: ComissaoGerenteFaixa) => {
    try {
      const newAtivo = !faixa.ativo;
      const { error } = await supabase
        .from('comissao_gerente_faixas')
        .update({ ativo: newAtivo })
        .eq('id', faixa.id);

      if (error) throw error;

      // Log history
      await supabase.from('comissao_gerente_faixas_historico').insert({
        faixa_id: faixa.id,
        acao: newAtivo ? 'ATIVADO' : 'DESATIVADO',
        percentual_anterior: faixa.percentual,
        percentual_novo: faixa.percentual,
        usuario_id: profile?.id,
      });

      toast({ title: newAtivo ? 'Faixa ativada!' : 'Faixa desativada!' });
      fetchData();
    } catch (error) {
      console.error('Error toggling faixa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteFaixa = async (id: string) => {
    try {
      const { error } = await supabase
        .from('comissao_gerente_faixas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Faixa removida!' });
      fetchData();
    } catch (error) {
      console.error('Error deleting faixa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a faixa',
        variant: 'destructive',
      });
    }
  };

  // Calculate simulation
  const calcularSimulacao = () => {
    const vgv = parseFloat(simulacaoVGV) || 0;
    const vendas = parseInt(simulacaoVendas) || 0;
    
    if (vendas === 0 || vgv === 0) return null;

    // Find matching tier
    const faixaAtiva = faixas
      .filter(f => f.ativo)
      .find(f => vendas >= f.faixa_inicio && (f.faixa_fim === null || vendas <= f.faixa_fim));

    if (!faixaAtiva) return null;

    const comissao = (vgv * faixaAtiva.percentual) / 100;
    return {
      faixa: faixaAtiva,
      comissao,
    };
  };

  const simulacaoResult = calcularSimulacao();

  const formatFaixaLabel = (faixa: ComissaoGerenteFaixa) => {
    if (faixa.faixa_fim === null) {
      return `${faixa.faixa_inicio}+ vendas`;
    }
    if (faixa.faixa_inicio === faixa.faixa_fim) {
      return `${faixa.faixa_inicio} venda${faixa.faixa_inicio > 1 ? 's' : ''}`;
    }
    return `${faixa.faixa_inicio} a ${faixa.faixa_fim} vendas`;
  };

  const getAcaoLabel = (acao: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      CRIADO: { label: 'Criado', color: 'bg-green-500/10 text-green-600' },
      ATUALIZADO: { label: 'Atualizado', color: 'bg-blue-500/10 text-blue-600' },
      ATIVADO: { label: 'Ativado', color: 'bg-emerald-500/10 text-emerald-600' },
      DESATIVADO: { label: 'Desativado', color: 'bg-orange-500/10 text-orange-600' },
    };
    return labels[acao] || { label: acao, color: 'bg-gray-500/10 text-gray-600' };
  };

  if (!isDirector) {
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

  return (
    <div className="space-y-6">
      {/* Faixas de Comissão do Gerente */}
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Faixas de Comissão do Gerente
            </CardTitle>
            <CardDescription>
              Configure os percentuais de comissão retroativa baseados no volume de vendas do time
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Faixa
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Faixa de Vendas</TableHead>
                <TableHead>Percentual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faixas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma faixa configurada
                  </TableCell>
                </TableRow>
              ) : (
                faixas.map((faixa) => (
                  <TableRow key={faixa.id} className={!faixa.ativo ? 'opacity-50' : ''}>
                    <TableCell>
                      <span className="font-medium">{formatFaixaLabel(faixa)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-accent flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        {faixa.percentual}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={faixa.ativo}
                        onCheckedChange={() => handleToggleAtivo(faixa)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenDialog(faixa)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteFaixa(faixa.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="mt-4 p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Lógica Retroativa:</strong> Quando o time do gerente atinge uma nova faixa, 
              o percentual correspondente é aplicado sobre o <strong>TOTAL</strong> de VGV do período, 
              não por venda individual.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Simulador de Impacto */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Calculator className="h-5 w-5 text-accent" />
            Simulador de Impacto Financeiro
          </CardTitle>
          <CardDescription>
            Simule o impacto das configurações de comissão
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Quantidade de Vendas</Label>
              <Input
                type="number"
                min="0"
                placeholder="Ex: 8"
                value={simulacaoVendas}
                onChange={(e) => setSimulacaoVendas(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>VGV Total do Período (R$)</Label>
              <Input
                type="number"
                min="0"
                step="1000"
                placeholder="Ex: 5000000"
                value={simulacaoVGV}
                onChange={(e) => setSimulacaoVGV(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Resultado</Label>
              {simulacaoResult ? (
                <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                  <div className="text-sm text-muted-foreground">
                    Faixa: {formatFaixaLabel(simulacaoResult.faixa)} ({simulacaoResult.faixa.percentual}%)
                  </div>
                  <div className="text-lg font-bold text-accent">
                    Comissão: R$ {simulacaoResult.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-muted rounded-lg text-center text-muted-foreground text-sm">
                  Preencha os campos para simular
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Alterações */}
      <Accordion type="single" collapsible>
        <AccordionItem value="historico">
          <Card className="card-elevated">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle className="font-display flex items-center gap-2 text-base">
                <History className="h-5 w-5 text-accent" />
                Histórico de Alterações
              </CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="pt-0">
                {historico.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhuma alteração registrada
                  </p>
                ) : (
                  <div className="space-y-2">
                    {historico.map((item) => {
                      const acaoInfo = getAcaoLabel(item.acao);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <Badge className={acaoInfo.color}>
                              {acaoInfo.label}
                            </Badge>
                            <div>
                              {item.acao === 'ATUALIZADO' && item.percentual_anterior !== null && (
                                <span className="text-sm">
                                  <span className="text-muted-foreground">{item.percentual_anterior}%</span>
                                  <TrendingUp className="inline h-3 w-3 mx-1" />
                                  <span className="font-semibold">{item.percentual_novo}%</span>
                                </span>
                              )}
                              {item.acao === 'CRIADO' && (
                                <span className="text-sm font-semibold">{item.percentual_novo}%</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="text-muted-foreground">
                              {item.usuario?.nome || 'Sistema'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

      {/* Dialog para criar/editar faixa */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFaixa ? 'Editar Faixa' : 'Nova Faixa de Comissão do Gerente'}
            </DialogTitle>
            <DialogDescription>
              Configure a faixa de vendas e o percentual de comissão
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>De (vendas)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ex: 1"
                  value={formData.faixa_inicio}
                  onChange={(e) =>
                    setFormData({ ...formData, faixa_inicio: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Até (vendas)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ex: 5"
                  value={formData.faixa_fim}
                  onChange={(e) =>
                    setFormData({ ...formData, faixa_fim: e.target.value })
                  }
                  disabled={formData.semLimite}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="sem-limite"
                checked={formData.semLimite}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, semLimite: checked, faixa_fim: '' })
                }
              />
              <Label htmlFor="sem-limite">Sem limite superior (ex: 11+)</Label>
            </div>

            <div className="space-y-2">
              <Label>Percentual de Comissão (%)</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.percentual}
                  onChange={(e) =>
                    setFormData({ ...formData, percentual: e.target.value })
                  }
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveFaixa} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}