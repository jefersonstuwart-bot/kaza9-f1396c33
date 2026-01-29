import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Search, 
  User,
  Mail,
  MoreHorizontal,
  Shield,
  UserCheck,
  UserX,
  Edit,
  Lock,
  Loader2,
  Percent,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  USER_ROLE_LABELS, 
  NIVEL_CORRETOR_LABELS, 
  type Profile, 
  type UserRole, 
  type NivelCorretor 
} from '@/types/crm';
import { z } from 'zod';

interface ComissaoConfig {
  id: string;
  tipo: string;
  valor_referencia: string;
  percentual: number;
  ativo: boolean;
}

const createUserSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  role: z.enum(['DIRETOR', 'GERENTE', 'CORRETOR']),
});

interface UserWithRole extends Profile {
  role?: UserRole;
}

export default function Equipe() {
  const { isDirector, isGerente, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [comissoes, setComissoes] = useState<ComissaoConfig[]>([]);

  const [editForm, setEditForm] = useState({
    nivel_corretor: '' as NivelCorretor | '',
    gerente_id: '',
    ativo: true,
    percentual_comissao: '',
  });

  const [createForm, setCreateForm] = useState({
    nome: '',
    email: '',
    password: '',
    role: 'CORRETOR' as UserRole,
  });

  useEffect(() => {
    fetchUsers();
    fetchComissoes();
  }, []);

  const fetchComissoes = async () => {
    try {
      const { data, error } = await supabase
        .from('comissao_config')
        .select('*')
        .eq('tipo', 'CORRETOR_NIVEL')
        .eq('ativo', true);

      if (error) throw error;
      setComissoes(data || []);
    } catch (error) {
      console.error('Error fetching comissoes:', error);
    }
  };

  const getComissaoByNivel = (nivel: NivelCorretor | null) => {
    if (!nivel) return null;
    const config = comissoes.find(c => c.valor_referencia === nivel);
    return config?.percentual;
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('nome');

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles: UserWithRole[] = [];
      
      for (const profile of profiles || []) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.user_id)
          .maybeSingle();

        usersWithRoles.push({
          ...profile,
          role: roleData?.role as UserRole | undefined,
        });
      }

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserWithRole) => {
    setSelectedUser(user);
    const comissao = user.nivel_corretor ? getComissaoByNivel(user.nivel_corretor) : null;
    setEditForm({
      nivel_corretor: user.nivel_corretor || '',
      gerente_id: user.gerente_id || '',
      ativo: user.ativo,
      percentual_comissao: comissao?.toString() || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          nivel_corretor: editForm.nivel_corretor || null,
          gerente_id: editForm.gerente_id || null,
          ativo: editForm.ativo,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Atualizar comissão do nível se tiver nível definido e percentual alterado
      if (editForm.nivel_corretor && editForm.percentual_comissao) {
        const percentual = parseFloat(editForm.percentual_comissao);
        if (!isNaN(percentual) && percentual >= 0 && percentual <= 100) {
          // Verificar se já existe config para este nível
          const existingConfig = comissoes.find(c => c.valor_referencia === editForm.nivel_corretor);
          
          if (existingConfig) {
            await supabase
              .from('comissao_config')
              .update({ percentual })
              .eq('id', existingConfig.id);
          } else {
            await supabase
              .from('comissao_config')
              .insert({
                tipo: 'CORRETOR_NIVEL',
                valor_referencia: editForm.nivel_corretor,
                percentual,
                ativo: true,
              });
          }
          
          // Atualizar lista de comissões
          fetchComissoes();
        }
      }

      toast({
        title: 'Usuário atualizado!',
        description: 'Os dados foram salvos com sucesso.',
      });

      setIsEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o usuário.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      // Delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;

      toast({
        title: 'Perfil atualizado!',
        description: `Perfil alterado para ${USER_ROLE_LABELS[newRole]}`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil.',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleToggleAtivo = async (user: UserWithRole) => {
    try {
      const newStatus = !user.ativo;
      
      const { error } = await supabase
        .from('profiles')
        .update({ ativo: newStatus })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: newStatus ? 'Login ativado!' : 'Login desativado!',
        description: `${user.nome} ${newStatus ? 'agora pode' : 'não pode mais'} acessar o sistema.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status do usuário.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setDeleting(true);

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userToDelete.user_id },
      });

      if (error) {
        toast({
          title: 'Erro',
          description: error.message || 'Não foi possível excluir o usuário.',
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        toast({
          title: 'Erro',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Usuário excluído!',
        description: `${userToDelete.nome} foi removido do sistema.`,
      });

      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o usuário.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (user: UserWithRole) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const getRoleBadgeColor = (role?: UserRole) => {
    switch (role) {
      case 'DIRETOR':
        return 'bg-kaza-gold text-foreground';
      case 'GERENTE':
        return 'bg-accent text-accent-foreground';
      case 'CORRETOR':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const gerentes = users.filter(u => u.role === 'GERENTE');

  const filteredUsers = users.filter((user) =>
    user.nome.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: users.length,
    diretores: users.filter(u => u.role === 'DIRETOR').length,
    gerentes: users.filter(u => u.role === 'GERENTE').length,
    corretores: users.filter(u => u.role === 'CORRETOR').length,
    ativos: users.filter(u => u.ativo).length,
  };

  const handleCreateUser = async () => {
    try {
      setCreating(true);

      // Gerentes só podem criar corretores
      const targetRole = isGerente ? 'CORRETOR' : createForm.role;

      const validation = createUserSchema.safeParse({ ...createForm, role: targetRole });
      if (!validation.success) {
        toast({
          title: 'Erro de validação',
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }

      // Use edge function to create user (handles role and gerente_id assignment)
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: createForm.email,
          password: createForm.password,
          nome: createForm.nome,
          role: targetRole,
        },
      });

      if (error) {
        toast({
          title: 'Erro',
          description: error.message || 'Não foi possível criar o usuário.',
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        toast({
          title: 'Erro',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Usuário criado!',
        description: `${createForm.nome} foi cadastrado com sucesso.`,
      });

      setIsCreateDialogOpen(false);
      setCreateForm({ nome: '', email: '', password: '', role: 'CORRETOR' });
      
      // Wait a moment for the trigger to create the profile
      setTimeout(() => fetchUsers(), 1000);
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o usuário.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Equipe</h1>
          <p className="text-muted-foreground">Gerencie os membros da sua equipe</p>
        </div>
      {(isDirector || isGerente) && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {isGerente ? 'Novo Corretor' : 'Novo Usuário'}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-metric">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-metric">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Diretores</p>
                <p className="text-2xl font-bold">{stats.diretores}</p>
              </div>
              <Shield className="h-8 w-8 text-kaza-gold" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-metric">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gerentes</p>
                <p className="text-2xl font-bold">{stats.gerentes}</p>
              </div>
              <UserCheck className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-metric">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Corretores</p>
                <p className="text-2xl font-bold">{stats.corretores}</p>
              </div>
              <User className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="card-elevated">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="font-display">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'membro' : 'membros'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Usuário</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Gerente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url || ''} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(user.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.nome}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isDirector ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="cursor-pointer">
                                <Badge className={getRoleBadgeColor(user.role)}>
                                  {user.role ? USER_ROLE_LABELS[user.role] : 'Sem perfil'}
                                </Badge>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {(['DIRETOR', 'GERENTE', 'CORRETOR'] as UserRole[]).map((role) => (
                                <DropdownMenuItem
                                  key={role}
                                  onClick={() => handleUpdateRole(user.user_id, role)}
                                  disabled={user.role === role}
                                >
                                  {USER_ROLE_LABELS[role]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role ? USER_ROLE_LABELS[user.role] : 'Sem perfil'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.nivel_corretor && (
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline">
                              {NIVEL_CORRETOR_LABELS[user.nivel_corretor]}
                            </Badge>
                            {isDirector && getComissaoByNivel(user.nivel_corretor) !== null && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Percent className="h-3 w-3" />
                                {getComissaoByNivel(user.nivel_corretor)}% comissão
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.gerente_id ? (
                          <span className="text-sm">
                            {users.find(u => u.id === user.gerente_id)?.nome || '-'}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.ativo ? 'default' : 'secondary'}>
                          {user.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(isDirector || (isGerente && user.gerente_id === currentProfile?.id)) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isDirector && (
                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleToggleAtivo(user)}>
                                {user.ativo ? (
                                  <>
                                    <UserX className="h-4 w-4 mr-2" />
                                    Desativar Login
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Ativar Login
                                  </>
                                )}
                              </DropdownMenuItem>
                              {isDirector && currentProfile?.user_id !== user.user_id && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => openDeleteDialog(user)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir Usuário
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere os dados de {selectedUser?.nome}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nível do Corretor</Label>
              <Select
                value={editForm.nivel_corretor}
                onValueChange={(value) => setEditForm({ ...editForm, nivel_corretor: value as NivelCorretor })}
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

            {/* Campo de Percentual de Comissão - visível apenas se tiver nível */}
            {editForm.nivel_corretor && (
              <div className="space-y-2">
                <Label htmlFor="percentual_comissao">Percentual de Comissão (%)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="percentual_comissao"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0.00"
                    value={editForm.percentual_comissao}
                    onChange={(e) => setEditForm({ ...editForm, percentual_comissao: e.target.value })}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Comissão do nível {NIVEL_CORRETOR_LABELS[editForm.nivel_corretor as NivelCorretor]} sobre cada venda
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Gerente</Label>
              <Select
                value={editForm.gerente_id || "none"}
                onValueChange={(value) => setEditForm({ ...editForm, gerente_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gerente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {gerentes.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Usuário ativo</Label>
              <Switch
                checked={editForm.ativo}
                onCheckedChange={(checked) => setEditForm({ ...editForm, ativo: checked })}
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Cadastre um novo membro para a equipe
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-nome">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="create-nome"
                  placeholder="Nome do usuário"
                  value={createForm.nome}
                  onChange={(e) => setCreateForm({ ...createForm, nome: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="create-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-password">Senha inicial</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="create-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Gerentes só podem criar corretores, então escondemos o seletor */}
            {isDirector && (
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value) => setCreateForm({ ...createForm, role: value as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(USER_ROLE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isGerente && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  O corretor será automaticamente vinculado à sua equipe.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={creating} className="gap-2">
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Usuário'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{userToDelete?.nome}</strong>? 
              Esta ação não pode ser desfeita e todos os dados do usuário serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
