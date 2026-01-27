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
  Edit
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
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    nivel_corretor: '' as NivelCorretor | '',
    gerente_id: '',
    ativo: true,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

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
    setEditForm({
      nivel_corretor: user.nivel_corretor || '',
      gerente_id: user.gerente_id || '',
      ativo: user.ativo,
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Equipe</h1>
          <p className="text-muted-foreground">Gerencie os membros da sua equipe</p>
        </div>
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
                          <Badge variant="outline">
                            {NIVEL_CORRETOR_LABELS[user.nivel_corretor]}
                          </Badge>
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
                        {isDirector && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
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
            
            <div className="space-y-2">
              <Label>Gerente</Label>
              <Select
                value={editForm.gerente_id}
                onValueChange={(value) => setEditForm({ ...editForm, gerente_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gerente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
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
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
