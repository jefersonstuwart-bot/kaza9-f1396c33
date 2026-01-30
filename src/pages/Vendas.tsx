import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Search, 
  Calendar,
  DollarSign,
  Building2,
  User,
  MoreHorizontal,
  TrendingUp,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Venda, Construtora, VendaStatus } from '@/types/crm';
import { useRealtimeSubscription, useMountedState } from '@/hooks/useRealtimeSubscription';
import { z } from 'zod';

const vendaSchema = z.object({
  construtora_id: z.string().min(1, 'Selecione uma construtora'),
  valor_vgv: z.number().min(1, 'Valor deve ser maior que zero'),
  data_venda: z.string().min(1, 'Data é obrigatória'),
  observacao: z.string().optional(),
});

export default function Vendas() {
  const { profile, isDirector } = useAuth();
  const { toast } = useToast();
  const isMounted = useMountedState();
  const fetchIdRef = useRef(0);
  
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    construtora_id: '',
    valor_vgv: '',
    data_venda: new Date().toISOString().split('T')[0],
    observacao: '',
  });

  // Fetch vendas com proteção contra race conditions
  const fetchVendas = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    
    try {
      const { data, error } = await supabase
        .from('vendas')
        .select(`
          *,
          construtora:construtoras(*),
          corretor:profiles!vendas_corretor_id_fkey(*),
          gerente:profiles!vendas_gerente_id_fkey(*)
        `)
        .order('data_venda', { ascending: false });

      // Verificar se ainda é a requisição mais recente e componente está montado
      if (fetchId !== fetchIdRef.current || !isMounted()) return;
      
      if (error) throw error;
      setVendas((data as Venda[]) || []);
    } catch (error) {
      if (isMounted()) {
        console.error('Error fetching vendas:', error);
      }
    } finally {
      if (fetchId === fetchIdRef.current && isMounted()) {
        setLoading(false);
      }
    }
  }, [isMounted]);

  const fetchConstrutoras = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('construtoras')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (!isMounted()) return;
      if (error) throw error;
      setConstrutoras(data || []);
    } catch (error) {
      if (isMounted()) {
        console.error('Error fetching construtoras:', error);
      }
    }
  }, [isMounted]);

  // Subscription realtime isolada com cleanup automático
  useRealtimeSubscription(
    { table: 'vendas' },
    useCallback(() => {
      fetchVendas();
    }, [fetchVendas]),
    true
  );

  useEffect(() => {
    fetchVendas();
    fetchConstrutoras();
  }, [fetchVendas, fetchConstrutoras]);


  const handleCreateVenda = async () => {
    try {
      const validation = vendaSchema.safeParse({
        ...formData,
        valor_vgv: Number(formData.valor_vgv.replace(/\D/g, '')) / 100,
      });

      if (!validation.success) {
        toast({
          title: 'Erro de validação',
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }

      setSaving(true);

      const { error } = await supabase.from('vendas').insert({
        construtora_id: formData.construtora_id,
        corretor_id: profile?.id,
        gerente_id: profile?.gerente_id,
        valor_vgv: Number(formData.valor_vgv.replace(/\D/g, '')) / 100,
        data_venda: formData.data_venda,
        observacao: formData.observacao || null,
        status: 'ATIVA' as VendaStatus,
      });

      if (error) throw error;

      toast({
        title: 'Venda registrada!',
        description: 'A venda foi adicionada com sucesso.',
      });

      setIsDialogOpen(false);
      setFormData({
        construtora_id: '',
        valor_vgv: '',
        data_venda: new Date().toISOString().split('T')[0],
        observacao: '',
      });
      fetchVendas();
    } catch (error) {
      console.error('Error creating venda:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar a venda.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDistrato = async (vendaId: string) => {
    try {
      const { error } = await supabase
        .from('vendas')
        .update({ status: 'DISTRATO' as VendaStatus })
        .eq('id', vendaId);

      if (error) throw error;

      toast({
        title: 'Distrato registrado',
        description: 'A venda foi marcada como distrato.',
      });
    } catch (error) {
      console.error('Error updating venda:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a venda.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteVenda = async (vendaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('vendas')
        .delete()
        .eq('id', vendaId);

      if (error) throw error;

      toast({
        title: 'Venda excluída',
        description: 'A venda foi removida com sucesso.',
      });
      fetchVendas();
    } catch (error) {
      console.error('Error deleting venda:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a venda.',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatCurrencyInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = Number(numbers) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredVendas = vendas.filter((venda) => {
    return (
      venda.construtora?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      venda.corretor?.nome?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const totalVgvAtivo = filteredVendas
    .filter(v => v.status === 'ATIVA')
    .reduce((sum, v) => sum + Number(v.valor_vgv), 0);

  const totalDistrato = filteredVendas
    .filter(v => v.status === 'DISTRATO')
    .reduce((sum, v) => sum + Number(v.valor_vgv), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Vendas</h1>
          <p className="text-muted-foreground">Acompanhe todas as vendas em tempo real</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Venda
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Venda</DialogTitle>
              <DialogDescription>
                Preencha os dados da nova venda
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="construtora">Construtora *</Label>
                <Select
                  value={formData.construtora_id}
                  onValueChange={(value) => setFormData({ ...formData, construtora_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a construtora" />
                  </SelectTrigger>
                  <SelectContent>
                    {construtoras.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="valor_vgv">Valor VGV *</Label>
                <Input
                  id="valor_vgv"
                  placeholder="R$ 0,00"
                  value={formData.valor_vgv ? formatCurrencyInput(formData.valor_vgv) : ''}
                  onChange={(e) => setFormData({ ...formData, valor_vgv: e.target.value.replace(/\D/g, '') })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="data_venda">Data da Venda *</Label>
                <Input
                  id="data_venda"
                  type="date"
                  value={formData.data_venda}
                  onChange={(e) => setFormData({ ...formData, data_venda: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="observacao">Observações</Label>
                <Textarea
                  id="observacao"
                  placeholder="Informações adicionais..."
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateVenda} disabled={saving}>
                {saving ? 'Salvando...' : 'Registrar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-metric">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Vendas
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filteredVendas.filter(v => v.status === 'ATIVA').length}</div>
            <p className="text-sm text-muted-foreground">vendas ativas</p>
          </CardContent>
        </Card>

        <Card className="card-metric">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              VGV Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{formatCurrency(totalVgvAtivo)}</div>
            <p className="text-sm text-muted-foreground">em vendas ativas</p>
          </CardContent>
        </Card>

        <Card className="card-metric">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Distratos
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {filteredVendas.filter(v => v.status === 'DISTRATO').length}
            </div>
            <p className="text-sm text-muted-foreground">{formatCurrency(totalDistrato)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="card-elevated">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por construtora ou corretor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vendas Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="font-display">
            {filteredVendas.length} {filteredVendas.length === 1 ? 'venda' : 'vendas'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Construtora</TableHead>
                  <TableHead>Corretor</TableHead>
                  <TableHead>VGV</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {loading ? 'Carregando...' : 'Nenhuma venda encontrada'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendas.map((venda) => (
                    <TableRow key={venda.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            {venda.construtora?.foto_url ? (
                              <img 
                                src={venda.construtora.foto_url} 
                                alt={venda.construtora.nome}
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            ) : (
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <span className="font-medium">{venda.construtora?.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{venda.corretor?.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-accent">
                          {formatCurrency(Number(venda.valor_vgv))}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(venda as any).percentual_comissao != null ? (
                          <div className="space-y-1">
                            <span className="font-semibold text-accent">
                              {formatCurrency(Number((venda as any).valor_comissao) || 0)}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {(venda as any).percentual_comissao}% • {(venda as any).numero_venda_periodo}ª venda
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(venda.data_venda)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={venda.status === 'ATIVA' ? 'default' : 'destructive'}
                          className={venda.status === 'ATIVA' ? 'bg-accent' : ''}
                        >
                          {venda.status === 'ATIVA' ? 'Ativa' : 'Distrato'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                            {isDirector && venda.status === 'ATIVA' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDistrato(venda.id)}
                                >
                                  Registrar Distrato
                                </DropdownMenuItem>
                              </>
                            )}
                            {isDirector && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDeleteVenda(venda.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir Venda
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
