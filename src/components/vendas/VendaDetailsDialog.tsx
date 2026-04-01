import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Building2, User, Calendar, Percent, DollarSign, Hash, Users } from 'lucide-react';
import type { Venda } from '@/types/crm';

interface VendaDetailsDialogProps {
  venda: Venda | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VendaDetailsDialog({ venda, open, onOpenChange }: VendaDetailsDialogProps) {
  if (!venda) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatPercent = (value: number) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + '%';

  const formatDate = (date: string) =>
    new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const percentual = (venda as any).percentual_comissao;
  const valorComissao = (venda as any).valor_comissao;
  const numeroVenda = (venda as any).numero_venda_periodo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Detalhes da Venda</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <Badge
              variant={venda.status === 'ATIVA' ? 'default' : 'destructive'}
              className={venda.status === 'ATIVA' ? 'bg-accent text-accent-foreground' : ''}
            >
              {venda.status === 'ATIVA' ? 'Ativa' : 'Distrato'}
            </Badge>
            {numeroVenda && (
              <Badge variant="outline" className="gap-1">
                <Hash className="h-3 w-3" />
                {numeroVenda}ª venda do mês
              </Badge>
            )}
          </div>

          {/* Lead / Client */}
          {venda.lead && (
            <DetailRow
              icon={<User className="h-4 w-4" />}
              label="Cliente"
              value={venda.lead.nome}
            />
          )}

          {/* Construtora */}
          <DetailRow
            icon={<Building2 className="h-4 w-4" />}
            label="Construtora"
            value={venda.construtora?.nome || '-'}
          />

          {/* Corretor */}
          <DetailRow
            icon={<User className="h-4 w-4" />}
            label="Corretor"
            value={venda.corretor?.nome || '-'}
          />

          {/* Gerente */}
          <DetailRow
            icon={<Users className="h-4 w-4" />}
            label="Gerente"
            value={venda.gerente?.nome || '-'}
          />

          {/* Data */}
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label="Data da Venda"
            value={formatDate(venda.data_venda)}
          />

          {/* VGV */}
          <DetailRow
            icon={<DollarSign className="h-4 w-4" />}
            label="Valor VGV"
            value={formatCurrency(Number(venda.valor_vgv))}
            highlight
          />

          {/* Commission */}
          {percentual != null && (
            <>
              <DetailRow
                icon={<Percent className="h-4 w-4" />}
                label="Percentual Aplicado"
                value={formatPercent(Number(percentual))}
              />
              <div className="bg-gradient-to-br from-accent/20 to-primary/10 rounded-xl p-4 border-2 border-accent/30">
                <p className="text-sm text-muted-foreground mb-1">Comissão do Corretor</p>
                <p className="text-2xl font-bold text-accent">
                  {formatCurrency(Number(valorComissao) || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pegou comissão de {formatPercent(Number(percentual))} sobre a venda
                </p>
              </div>
            </>
          )}

          {/* Observação */}
          {venda.observacao && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-1">Observações</p>
              <p className="text-sm">{venda.observacao}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className={`text-sm font-medium ${highlight ? 'text-accent' : ''}`}>{value}</span>
    </div>
  );
}
