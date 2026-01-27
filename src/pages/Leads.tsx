import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Phone, 
  Mail,
  Calendar,
  User,
  ChevronDown
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
import { LEAD_STATUS_CONFIG, type Lead, type LeadOrigem, type LeadStatus } from '@/types/crm';
import { z } from 'zod';

const leadSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  telefone: z.string().regex(/^\d{2}9\d{8}$/, 'Telefone deve ter DDD + 9 + 8 dígitos (ex: 11912345678)'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  origem_id: z.string().optional(),
  notas: z.string().optional(),
});

export default function Leads() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [origens, setOrigens] = useState<LeadOrigem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    origem_id: '',
    notas: '',
  });

  useEffect(() => {
    fetchLeads();
    fetchOrigens();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          origem:lead_origens(id, nome, ativo, created_at),
          corretor:profiles!leads_corretor_id_fkey(id, nome, email, nivel_corretor, gerente_id, ativo, avatar_url, empresa_id, user_id, created_at, updated_at)
        `)
        .order('data_criacao', { ascending: false });

      if (error) throw error;
      setLeads((data as Lead[]) || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrigens = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_origens')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setOrigens(data || []);
    } catch (error) {
      console.error('Error fetching origens:', error);
    }
  };

  const handleCreateLead = async () => {
    try {
      const validation = leadSchema.safeParse(formData);
      if (!validation.success) {
        toast({
          title: 'Erro de validação',
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }

      setSaving(true);

      const { error } = await supabase.from('leads').insert({
        nome: formData.nome,
        telefone: formData.telefone,
        email: formData.email || null,
        origem_id: formData.origem_id || null,
        notas: formData.notas || null,
        corretor_id: profile?.id,
        status: 'NOVO' as LeadStatus,
      });

      if (error) throw error;

      toast({
        title: 'Lead criado!',
        description: 'O lead foi adicionado com sucesso.',
      });

      setIsDialogOpen(false);
      setFormData({ nome: '', telefone: '', email: '', origem_id: '', notas: '' });
      fetchLeads();
    } catch (error) {
      console.error('Error creating lead:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o lead.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: 'Status atualizado!',
        description: `Status alterado para ${LEAD_STATUS_CONFIG[newStatus].label}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.nome.toLowerCase().includes(search.toLowerCase()) ||
      lead.telefone.includes(search) ||
      lead.email?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground">Gerencie seus leads e oportunidades</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Lead</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo lead
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  placeholder="Nome do lead"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  placeholder="11912345678"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value.replace(/\D/g, '') })}
                  maxLength={11}
                />
                <p className="text-xs text-muted-foreground">DDD + 9 + número (11 dígitos)</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="origem">Origem</Label>
                <Select
                  value={formData.origem_id}
                  onValueChange={(value) => setFormData({ ...formData, origem_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {origens.map((origem) => (
                      <SelectItem key={origem.id} value={origem.id}>
                        {origem.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notas">Observações</Label>
                <Textarea
                  id="notas"
                  placeholder="Informações adicionais..."
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateLead} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="card-elevated">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(LEAD_STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(LEAD_STATUS_CONFIG).map(([status, config]) => {
          const count = leads.filter(l => l.status === status).length;
          return (
            <Card 
              key={status} 
              className={`cursor-pointer transition-all hover:scale-105 ${
                statusFilter === status ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            >
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex items-center justify-between">
                  <span className={`status-badge ${config.bgClass}`}>
                    {config.label}
                  </span>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Leads Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="font-display">
            {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Lead</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Corretor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {loading ? 'Carregando...' : 'Nenhum lead encontrado'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="font-medium">{lead.nome}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {formatPhone(lead.telefone)}
                          </div>
                          {lead.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.origem?.nome || '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1">
                              <span className={`status-badge ${LEAD_STATUS_CONFIG[lead.status].bgClass}`}>
                                {LEAD_STATUS_CONFIG[lead.status].label}
                              </span>
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {Object.entries(LEAD_STATUS_CONFIG).map(([status, config]) => (
                              <DropdownMenuItem
                                key={status}
                                onClick={() => handleUpdateStatus(lead.id, status as LeadStatus)}
                                disabled={lead.status === status}
                              >
                                <span className={`status-badge ${config.bgClass} mr-2`}>
                                  {config.label}
                                </span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{lead.corretor?.nome || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(lead.data_criacao)}
                        </div>
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
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              Excluir
                            </DropdownMenuItem>
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
