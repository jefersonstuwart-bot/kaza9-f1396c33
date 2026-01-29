// CRM KAZA9 Types

export type UserRole = 'DIRETOR' | 'GERENTE' | 'CORRETOR';
export type NivelCorretor = 'JUNIOR' | 'PLENO' | 'SENIOR' | 'CLOSER';
export type LeadStatus = 'NOVO' | 'EM_ATENDIMENTO' | 'ANALISE_CREDITO' | 'APROVADO' | 'REPROVADO' | 'DISTRATO';
export type VendaStatus = 'ATIVA' | 'DISTRATO';

export interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  nivel_corretor: NivelCorretor;
  gerente_id: string | null;
  ativo: boolean;
  avatar_url: string | null;
  empresa_id: string | null;
  created_at: string;
  updated_at: string;
  role?: UserRole;
}

export interface Construtora {
  id: string;
  nome: string;
  foto_url: string | null;
  drive_url: string | null;
  percentual_comissao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadOrigem {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  origem_id: string | null;
  status: LeadStatus;
  corretor_id: string | null;
  notas: string | null;
  data_criacao: string;
  data_ultima_movimentacao: string;
  origem?: LeadOrigem;
  corretor?: Profile;
}

export interface LeadHistorico {
  id: string;
  lead_id: string;
  status_anterior: LeadStatus | null;
  status_novo: LeadStatus;
  usuario_id: string | null;
  observacao: string | null;
  created_at: string;
  usuario?: Profile;
}

export interface Venda {
  id: string;
  construtora_id: string;
  corretor_id: string;
  gerente_id: string | null;
  lead_id: string | null;
  valor_vgv: number;
  data_venda: string;
  status: VendaStatus;
  observacao: string | null;
  created_at: string;
  updated_at: string;
  construtora?: Construtora;
  corretor?: Profile;
  gerente?: Profile;
  lead?: Lead;
}

export interface Meta {
  id: string;
  usuario_id: string;
  meta_vgv: number;
  meta_qtd_vendas: number;
  mes: number;
  ano: number;
  created_at: string;
  updated_at: string;
  usuario?: Profile;
}

export interface ComissaoConfig {
  id: string;
  tipo: 'GERENTE_FAIXA' | 'CORRETOR_NIVEL';
  valor_referencia: string;
  percentual: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Manager commission tier (ranges like 1-5, 6-10, 11+)
export interface ComissaoGerenteFaixa {
  id: string;
  faixa_inicio: number;
  faixa_fim: number | null; // NULL means "or more" (e.g., 11+)
  percentual: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Manager commission for a specific period
export interface ComissaoGerentePeriodo {
  id: string;
  gerente_id: string;
  mes: number;
  ano: number;
  total_vendas: number;
  valor_vgv_total: number;
  faixa_id: string | null;
  percentual_aplicado: number | null;
  valor_comissao: number | null;
  created_at: string;
  updated_at: string;
  faixa?: ComissaoGerenteFaixa;
}

// History of tier changes
export interface ComissaoGerenteFaixaHistorico {
  id: string;
  faixa_id: string;
  acao: 'CRIADO' | 'ATUALIZADO' | 'ATIVADO' | 'DESATIVADO';
  percentual_anterior: number | null;
  percentual_novo: number | null;
  usuario_id: string | null;
  created_at: string;
  usuario?: Profile;
}

// Calculated manager commission result
export interface GerenteComissaoCalculo {
  total_vendas: number;
  valor_vgv_total: number;
  faixa_id: string | null;
  percentual_aplicado: number;
  valor_comissao: number;
  vendas_para_proxima_faixa: number;
}

export interface Alerta {
  id: string;
  usuario_id: string | null;
  tipo: string;
  titulo: string;
  mensagem: string;
  lido: boolean;
  lead_id: string | null;
  venda_id: string | null;
  created_at: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalLeads: number;
  leadsByStatus: Record<LeadStatus, number>;
  totalVendas: number;
  vgvTotal: number;
  comissaoEstimada: number;
  metaVgv: number;
  metaQtdVendas: number;
  realizadoVgv: number;
  realizadoQtdVendas: number;
}

// Lead Status Config
export const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bgClass: string }> = {
  NOVO: { label: 'Novo', color: 'status-novo', bgClass: 'status-novo' },
  EM_ATENDIMENTO: { label: 'Em Atendimento', color: 'status-atendimento', bgClass: 'status-atendimento' },
  ANALISE_CREDITO: { label: 'Análise de Crédito', color: 'status-analise', bgClass: 'status-analise' },
  APROVADO: { label: 'Aprovado', color: 'status-aprovado', bgClass: 'status-aprovado' },
  REPROVADO: { label: 'Reprovado', color: 'status-reprovado', bgClass: 'status-reprovado' },
  DISTRATO: { label: 'Distrato', color: 'status-distrato', bgClass: 'status-distrato' },
};

export const NIVEL_CORRETOR_LABELS: Record<NivelCorretor, string> = {
  JUNIOR: 'Júnior',
  PLENO: 'Pleno',
  SENIOR: 'Sênior',
  CLOSER: 'Closer',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  DIRETOR: 'Diretor',
  GERENTE: 'Gerente',
  CORRETOR: 'Corretor',
};
