import { Settings } from "lucide-react";

const Configuracoes = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
      </div>
      <p className="text-muted-foreground">Em breve novas configurações estarão disponíveis.</p>
    </div>
  );
};

export default Configuracoes;
