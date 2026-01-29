import { useAuth } from '@/contexts/AuthContext';
import ComissaoConfigPanel from '@/components/comissao/ComissaoConfigPanel';
import ComissaoCorretorCard from '@/components/comissao/ComissaoCorretorCard';
import { Percent } from 'lucide-react';

export default function Comissoes() {
  const { isDirector } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <Percent className="h-8 w-8 text-accent" />
          Comissões
        </h1>
        <p className="text-muted-foreground">
          {isDirector
            ? 'Configure as regras de comissão progressiva por nível'
            : 'Acompanhe suas comissões e evolução de faixas'}
        </p>
      </div>

      {/* Show config panel for directors, commission card for others */}
      {isDirector ? (
        <ComissaoConfigPanel />
      ) : (
        <ComissaoCorretorCard />
      )}
    </div>
  );
}
