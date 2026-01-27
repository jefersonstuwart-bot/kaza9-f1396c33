import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Search, 
  Building2,
  ExternalLink,
  MoreHorizontal,
  Percent,
  Edit,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { Construtora } from '@/types/crm';
import { z } from 'zod';

const construtoraSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  foto_url: z.string().url('URL inválida').optional().or(z.literal('')),
  drive_url: z.string().url('URL inválida').optional().or(z.literal('')),
  percentual_comissao: z.number().min(0).max(100).optional(),
});

export default function Construtoras() {
  const { isDirector } = useAuth();
  const { toast } = useToast();
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    foto_url: '',
    drive_url: '',
    percentual_comissao: '',
    ativo: true,
  });

  useEffect(() => {
    fetchConstrutoras();
  }, []);

  const fetchConstrutoras = async () => {
    try {
      const { data, error } = await supabase
        .from('construtoras')
        .select('*')
        .order('nome');

      if (error) throw error;
      setConstrutoras(data || []);
    } catch (error) {
      console.error('Error fetching construtoras:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const validation = construtoraSchema.safeParse({
        ...formData,
        percentual_comissao: formData.percentual_comissao ? Number(formData.percentual_comissao) : undefined,
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

      const data = {
        nome: formData.nome,
        foto_url: formData.foto_url || null,
        drive_url: formData.drive_url || null,
        percentual_comissao: formData.percentual_comissao ? Number(formData.percentual_comissao) : 0,
        ativo: formData.ativo,
      };

      if (editingId) {
        const { error } = await supabase
          .from('construtoras')
          .update(data)
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: 'Construtora atualizada!',
          description: 'Os dados foram salvos com sucesso.',
        });
      } else {
        const { error } = await supabase.from('construtoras').insert(data);

        if (error) throw error;

        toast({
          title: 'Construtora criada!',
          description: 'A construtora foi adicionada com sucesso.',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchConstrutoras();
    } catch (error) {
      console.error('Error saving construtora:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a construtora.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (construtora: Construtora) => {
    setEditingId(construtora.id);
    setFormData({
      nome: construtora.nome,
      foto_url: construtora.foto_url || '',
      drive_url: construtora.drive_url || '',
      percentual_comissao: construtora.percentual_comissao?.toString() || '',
      ativo: construtora.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('construtoras')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Construtora removida',
        description: 'A construtora foi excluída com sucesso.',
      });
      
      fetchConstrutoras();
    } catch (error) {
      console.error('Error deleting construtora:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a construtora.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      nome: '',
      foto_url: '',
      drive_url: '',
      percentual_comissao: '',
      ativo: true,
    });
  };

  const filteredConstrutoras = construtoras.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Construtoras</h1>
          <p className="text-muted-foreground">Gerencie as construtoras parceiras</p>
        </div>
        
        {isDirector && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Construtora
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar' : 'Adicionar'} Construtora</DialogTitle>
                <DialogDescription>
                  Preencha os dados da construtora
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    placeholder="Nome da construtora"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="foto_url">URL da Foto</Label>
                  <Input
                    id="foto_url"
                    placeholder="https://..."
                    value={formData.foto_url}
                    onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="drive_url">Link do Google Drive</Label>
                  <Input
                    id="drive_url"
                    placeholder="https://drive.google.com/..."
                    value={formData.drive_url}
                    onChange={(e) => setFormData({ ...formData, drive_url: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="percentual_comissao">Percentual de Comissão (%)</Label>
                  <Input
                    id="percentual_comissao"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.percentual_comissao}
                    onChange={(e) => setFormData({ ...formData, percentual_comissao: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Visível apenas para diretores
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="ativo">Ativa</Label>
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <Card className="card-elevated">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar construtora..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Construtoras Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="card-elevated animate-pulse">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredConstrutoras.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Nenhuma construtora encontrada
          </div>
        ) : (
          filteredConstrutoras.map((construtora) => (
            <Card key={construtora.id} className="card-elevated group">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    {construtora.foto_url ? (
                      <img 
                        src={construtora.foto_url} 
                        alt={construtora.nome}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold truncate">{construtora.nome}</h3>
                        <Badge 
                          variant={construtora.ativo ? 'default' : 'secondary'}
                          className={construtora.ativo ? 'bg-accent mt-1' : 'mt-1'}
                        >
                          {construtora.ativo ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      
                      {isDirector && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(construtora)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDelete(construtora.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    
                    {isDirector && construtora.percentual_comissao > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                        <Percent className="h-3 w-3" />
                        <span>{construtora.percentual_comissao}% comissão</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {construtora.drive_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4 gap-2"
                    onClick={() => window.open(construtora.drive_url!, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Acessar Drive
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
