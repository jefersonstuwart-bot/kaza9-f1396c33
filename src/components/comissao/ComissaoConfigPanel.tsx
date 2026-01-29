import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Percent, Plus, Edit, Trash2, Loader2, Calendar, Settings } from 'lucide-react';
import { NIVEL_CORRETOR_LABELS, type NivelCorretor } from '@/types/crm';

interface ComissaoFaixa {
  id: string;
  nivel_corretor: NivelCorretor;
  numero_venda: number;
  percentual: number;
  ativo: boolean;
}

interface PeriodoConfig {
  id: string;
  tipo: string;
  ativo: boolean;
}

export default function ComissaoConfigPanel() {
  const { isDirector } = useAuth();
  const { toast } = useToast();
  const [faixas, setFaixas] = useState<ComissaoFaixa[]>([]);
  const [periodoConfig, setPeriodoConfig] = useState<PeriodoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFaixa, setEditingFaixa] = useState<ComissaoFaixa | null>(null);

  const [formData, setFormData] = useState({
    nivel_corretor: '' as NivelCorretor | '',
    numero_venda: '',
    percentual: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [faixasResult, periodoResult] = await Promise.all([
        supabase
          .from('comissao_faixas')
          .select('*')
          .eq('ativo', true)
          .order('nivel_corretor')
          .order('numero_venda'),
        supabase
          .from('comissao_periodo_config')
          .select('*')
          .eq('ativo', true)
          .maybeSingle(),
      ]);

      if (faixasResult.error) throw faixasResult.error;
      setFaixas((faixasResult.data as ComissaoFaixa[]) || []);
      setPeriodoConfig(periodoResult.data as PeriodoConfig | null);
    } catch (error) {
      console.error('Error fetching comissao config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (faixa?: ComissaoFaixa) => {
    if (faixa) {
      setEditingFaixa(faixa);
      setFormData({
        nivel_corretor: faixa.nivel_corretor,
        numero_venda: faixa.numero_venda.toString(),
        percentual: faixa.percentual.toString(),
      });
    } else {
      setEditingFaixa(null);
      setFormData({
        nivel_corretor: '',
        numero_venda: '',
        percentual: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveFaixa = async () => {
    if (!formData.nivel_corretor || !formData.numero_venda || !formData.percentual) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos',
        variant: 'destructive',
      });
      return;
    }

    const percentual = parseFloat(formData.percentual);
    const numero_venda = parseInt(formData.numero_venda);

    if (isNaN(percentual) || percentual < 0 || percentual > 100) {
      toast({
        title: 'Erro',
        description: 'Percentual deve estar entre 0 e 100',
        variant: 'destructive',
      });
      return;
    }

    if (isNaN(numero_venda) || numero_venda < 1) {
      toast({
        title: 'Erro',
        description: 'Número da venda deve ser maior que 0',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      if (editingFaixa) {
        const { error } = await supabase
          .from('comissao_faixas')
          .update({ percentual })
          .eq('id', editingFaixa.id);

        if (error) throw error;
        toast({ title: 'Faixa atualizada!' });
      } else {
        // Check if faixa already exists
        const existing = faixas.find(
          (f) =>
            f.nivel_corretor === formData.nivel_corretor &&
            f.numero_venda === numero_venda
        );

        if (existing) {
          toast({
            title: 'Erro',
            description: 'Já existe uma faixa para este nível e número de venda',
            variant: 'destructive',
          });
          return;
        }

        const { error } = await supabase.from('comissao_faixas').insert({
          nivel_corretor: formData.nivel_corretor,
          numero_venda,
          percentual,
          ativo: true,
        });

        if (error) throw error;
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

  const handleDeleteFaixa = async (id: string) => {
    try {
      const { error } = await supabase
        .from('comissao_faixas')
        .update({ ativo: false })
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

  const handleUpdatePeriodo = async (tipo: string) => {
    try {
      if (periodoConfig) {
        const { error } = await supabase
          .from('comissao_periodo_config')
          .update({ tipo })
          .eq('id', periodoConfig.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('comissao_periodo_config')
          .insert({ tipo, ativo: true });

        if (error) throw error;
      }

      toast({ title: 'Período atualizado!' });
      fetchData();
    } catch (error) {
      console.error('Error updating periodo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o período',
        variant: 'destructive',
      });
    }
  };

  // Group faixas by nivel
  const faixasByNivel = faixas.reduce((acc, faixa) => {
    if (!acc[faixa.nivel_corretor]) {
      acc[faixa.nivel_corretor] = [];
    }
    acc[faixa.nivel_corretor].push(faixa);
    return acc;
  }, {} as Record<NivelCorretor, ComissaoFaixa[]>);

  if (!isDirector) {
    return (
      <Card className="card-elevated">
        <CardContent className="pt-6 text-center text-muted-foreground">
          Apenas diretores podem gerenciar as configurações de comissão.
        </CardContent>
      </Card>
    );
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
      {/* Período Config */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent" />
            Período de Contagem
          </CardTitle>
          <CardDescription>
            Define o período para contabilizar vendas e calcular a comissão progressiva
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label>Período:</Label>
            <Select
              value={periodoConfig?.tipo || 'MENSAL'}
              onValueChange={handleUpdatePeriodo}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MENSAL">Mensal</SelectItem>
                <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                <SelectItem value="ANUAL">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Faixas Progressivas */}
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display flex items-center gap-2">
              <Settings className="h-5 w-5 text-accent" />
              Faixas de Comissão Progressiva
            </CardTitle>
            <CardDescription>
              Configure os percentuais de comissão por nível e número de vendas
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Faixa
          </Button>
        </CardHeader>
        <CardContent>
          {Object.entries(NIVEL_CORRETOR_LABELS).map(([nivel, label]) => (
            <div key={nivel} className="mb-6 last:mb-0">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Badge variant="outline">{label}</Badge>
              </h4>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nº Venda</TableHead>
                    <TableHead>Percentual</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(faixasByNivel[nivel as NivelCorretor] || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhuma faixa configurada
                      </TableCell>
                    </TableRow>
                  ) : (
                    (faixasByNivel[nivel as NivelCorretor] || [])
                      .sort((a, b) => a.numero_venda - b.numero_venda)
                      .map((faixa) => (
                        <TableRow key={faixa.id}>
                          <TableCell>
                            {faixa.numero_venda}ª venda
                            {faixa.numero_venda === Math.max(
                              ...(faixasByNivel[nivel as NivelCorretor] || []).map(
                                (f) => f.numero_venda
                              )
                            ) && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (e seguintes)
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-accent flex items-center gap-1">
                              <Percent className="h-3 w-3" />
                              {faixa.percentual}%
                            </span>
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
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFaixa ? 'Editar Faixa' : 'Nova Faixa de Comissão'}
            </DialogTitle>
            <DialogDescription>
              {editingFaixa
                ? 'Altere o percentual da faixa'
                : 'Configure uma nova faixa progressiva'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nível do Corretor</Label>
              <Select
                value={formData.nivel_corretor}
                onValueChange={(value) =>
                  setFormData({ ...formData, nivel_corretor: value as NivelCorretor })
                }
                disabled={!!editingFaixa}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NIVEL_CORRETOR_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Número da Venda</Label>
              <Input
                type="number"
                min="1"
                placeholder="Ex: 1, 2, 3..."
                value={formData.numero_venda}
                onChange={(e) =>
                  setFormData({ ...formData, numero_venda: e.target.value })
                }
                disabled={!!editingFaixa}
              />
              <p className="text-xs text-muted-foreground">
                A última faixa configurada será aplicada às vendas seguintes
              </p>
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
