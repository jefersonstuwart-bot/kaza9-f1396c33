import { useAuth } from '@/contexts/AuthContext';
import ComissaoConfigPanel from '@/components/comissao/ComissaoConfigPanel';
import ComissaoCorretorCard from '@/components/comissao/ComissaoCorretorCard';
import GerenteFaixasConfig from '@/components/comissao/GerenteFaixasConfig';
import GerenteComissaoCard from '@/components/comissao/GerenteComissaoCard';
import { Percent } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Comissoes() {
  const { isDirector, isGerente, isCorretor } = useAuth();

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
            ? 'Configure as regras de comissão para corretores e gerentes'
            : isGerente
            ? 'Acompanhe a comissão do seu time e sua evolução de faixas'
            : 'Acompanhe suas comissões e evolução de faixas'}
        </p>
      </div>

      {/* Director view: tabs for corretor and gerente config */}
      {isDirector && (
        <Tabs defaultValue="corretores" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="corretores">Corretores</TabsTrigger>
            <TabsTrigger value="gerentes">Gerentes</TabsTrigger>
          </TabsList>
          <TabsContent value="corretores" className="mt-6">
            <ComissaoConfigPanel />
          </TabsContent>
          <TabsContent value="gerentes" className="mt-6">
            <GerenteFaixasConfig />
          </TabsContent>
        </Tabs>
      )}

      {/* Manager view: show their commission card */}
      {isGerente && !isDirector && (
        <GerenteComissaoCard />
      )}

      {/* Corretor view: show their commission card */}
      {isCorretor && !isGerente && !isDirector && (
        <ComissaoCorretorCard />
      )}
    </div>
  );
}
