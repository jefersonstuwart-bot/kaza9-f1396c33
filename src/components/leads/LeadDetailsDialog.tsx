import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Phone,
  Mail,
  Calendar,
  User,
  MessageSquare,
  Upload,
  Loader2,
  ImageIcon,
  Trash2,
  Save,
  Plus,
  Clock,
} from 'lucide-react';
import { LEAD_STATUS_CONFIG, type Lead, type LeadOrigem, type LeadStatus } from '@/types/crm';

interface LeadAtualizacao {
  id: string;
  lead_id: string;
  usuario_id: string | null;
  tipo: string;
  descricao: string | null;
  imagem_url: string | null;
  created_at: string;
  usuario?: { nome: string } | null;
}

interface LeadDetailsDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  origens: LeadOrigem[];
  onLeadUpdated: () => void;
}

const TIPO_ATUALIZACAO = {
  OBSERVACAO: { label: 'Observação', icon: MessageSquare },
  WHATSAPP: { label: 'WhatsApp', icon: MessageSquare },
  LIGACAO: { label: 'Ligação', icon: Phone },
  EMAIL: { label: 'Email', icon: Mail },
  VISITA: { label: 'Visita', icon: User },
};

export function LeadDetailsDialog({
  lead,
  open,
  onOpenChange,
  origens,
  onLeadUpdated,
}: LeadDetailsDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [atualizacoes, setAtualizacoes] = useState<LeadAtualizacao[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form de edição do lead
  const [editForm, setEditForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    origem_id: '',
    notas: '',
    status: '' as LeadStatus | '',
  });

  // Form de nova atualização
  const [novaAtualizacao, setNovaAtualizacao] = useState({
    tipo: 'WHATSAPP',
    descricao: '',
    imagem_url: '',
  });

  useEffect(() => {
    if (lead && open) {
      setEditForm({
        nome: lead.nome,
        telefone: lead.telefone,
        email: lead.email || '',
        origem_id: lead.origem_id || '',
        notas: lead.notas || '',
        status: lead.status,
      });
      fetchAtualizacoes();
    }
  }, [lead, open]);

  const fetchAtualizacoes = async () => {
    if (!lead) return;
    
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('lead_atualizacoes')
        .select(`
          *,
          usuario:profiles!lead_atualizacoes_usuario_id_fkey(nome)
        `)
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAtualizacoes(data || []);
    } catch (error) {
      console.error('Error fetching atualizacoes:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUploadImage = async (file: File) => {
    try {
      setUploading(true);

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'O arquivo deve ter no máximo 5MB.',
          variant: 'destructive',
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${lead?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('lead-uploads')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('lead-uploads')
        .getPublicUrl(fileName);

      setNovaAtualizacao({ ...novaAtualizacao, imagem_url: publicUrl });

      toast({
        title: 'Imagem enviada!',
        description: 'A imagem foi carregada com sucesso.',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a imagem.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAddAtualizacao = async () => {
    if (!lead || !profile) return;
    if (!novaAtualizacao.descricao && !novaAtualizacao.imagem_url) {
      toast({
        title: 'Campo obrigatório',
        description: 'Adicione uma descrição ou imagem.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.from('lead_atualizacoes').insert({
        lead_id: lead.id,
        usuario_id: profile.id,
        tipo: novaAtualizacao.tipo,
        descricao: novaAtualizacao.descricao || null,
        imagem_url: novaAtualizacao.imagem_url || null,
      });

      if (error) throw error;

      toast({
        title: 'Atualização adicionada!',
        description: 'O histórico foi atualizado.',
      });

      setNovaAtualizacao({ tipo: 'WHATSAPP', descricao: '', imagem_url: '' });
      fetchAtualizacoes();
    } catch (error) {
      console.error('Error adding atualizacao:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar a atualização.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLead = async () => {
    if (!lead) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('leads')
        .update({
          nome: editForm.nome,
          telefone: editForm.telefone,
          email: editForm.email || null,
          origem_id: editForm.origem_id || null,
          notas: editForm.notas || null,
          status: editForm.status as LeadStatus,
        })
        .eq('id', lead.id);

      if (error) throw error;

      toast({
        title: 'Lead atualizado!',
        description: 'Os dados foram salvos com sucesso.',
      });

      onLeadUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o lead.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAtualizacao = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lead_atualizacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Atualização removida',
      });

      fetchAtualizacoes();
    } catch (error) {
      console.error('Error deleting atualizacao:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a atualização.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-3">
            <span>{lead.nome}</span>
            <Badge className={LEAD_STATUS_CONFIG[lead.status].bgClass}>
              {LEAD_STATUS_CONFIG[lead.status].label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Coluna esquerda - Dados do Lead */}
          <div className="p-6 space-y-4 md:w-1/2 md:border-r overflow-y-auto">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Dados do Lead
            </h3>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-nome">Nome</Label>
                <Input
                  id="edit-nome"
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-telefone">Telefone</Label>
                <Input
                  id="edit-telefone"
                  value={editForm.telefone}
                  onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value.replace(/\D/g, '') })}
                  maxLength={11}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm({ ...editForm, status: value as LeadStatus })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAD_STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-origem">Origem</Label>
                <Select
                  value={editForm.origem_id}
                  onValueChange={(value) => setEditForm({ ...editForm, origem_id: value })}
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

              <div className="space-y-1.5">
                <Label htmlFor="edit-notas">Observações</Label>
                <Textarea
                  id="edit-notas"
                  value={editForm.notas}
                  onChange={(e) => setEditForm({ ...editForm, notas: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <Button onClick={handleSaveLead} disabled={saving} className="w-full gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>

          {/* Coluna direita - Histórico */}
          <div className="p-6 space-y-4 md:w-1/2 flex flex-col overflow-hidden">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Histórico de Atualizações
            </h3>

            {/* Formulário de nova atualização */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
              <div className="flex gap-2">
                <Select
                  value={novaAtualizacao.tipo}
                  onValueChange={(value) => setNovaAtualizacao({ ...novaAtualizacao, tipo: value })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_ATUALIZACAO).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadImage(file);
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {novaAtualizacao.imagem_url && (
                <div className="relative">
                  <img
                    src={novaAtualizacao.imagem_url}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => setNovaAtualizacao({ ...novaAtualizacao, imagem_url: '' })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <Textarea
                placeholder="Descreva a atualização..."
                value={novaAtualizacao.descricao}
                onChange={(e) => setNovaAtualizacao({ ...novaAtualizacao, descricao: e.target.value })}
                rows={2}
              />

              <Button
                onClick={handleAddAtualizacao}
                disabled={saving || (!novaAtualizacao.descricao && !novaAtualizacao.imagem_url)}
                className="w-full gap-2"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Adicionar Atualização
              </Button>
            </div>

            {/* Lista de atualizações */}
            <ScrollArea className="flex-1">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : atualizacoes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma atualização registrada
                </div>
              ) : (
                <div className="space-y-3">
                  {atualizacoes.map((atualizacao) => {
                    const tipoConfig = TIPO_ATUALIZACAO[atualizacao.tipo as keyof typeof TIPO_ATUALIZACAO] || TIPO_ATUALIZACAO.OBSERVACAO;
                    const TipoIcon = tipoConfig.icon;
                    
                    return (
                      <div key={atualizacao.id} className="p-3 bg-background border rounded-lg space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="gap-1">
                              <TipoIcon className="h-3 w-3" />
                              {tipoConfig.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(atualizacao.created_at)}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteAtualizacao(atualizacao.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {atualizacao.imagem_url && (
                          <a href={atualizacao.imagem_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={atualizacao.imagem_url}
                              alt="Anexo"
                              className="w-full max-h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            />
                          </a>
                        )}

                        {atualizacao.descricao && (
                          <p className="text-sm whitespace-pre-wrap">{atualizacao.descricao}</p>
                        )}

                        {atualizacao.usuario && (
                          <p className="text-xs text-muted-foreground">
                            Por: {atualizacao.usuario.nome}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}