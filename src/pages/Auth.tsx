import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import logoKaza9 from '@/assets/logo-kaza9.png';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
      if (!validation.success) {
        toast({
          title: 'Erro de validação',
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { error } = await signIn(loginEmail, loginPassword);
      
      if (error) {
        let message = 'Erro ao fazer login';
        if (error.message.includes('Invalid login credentials')) {
          message = 'Email ou senha incorretos';
        } else if (error.message.includes('Email not confirmed')) {
          message = 'Por favor, confirme seu email antes de fazer login';
        }
        toast({
          title: 'Erro',
          description: message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Bem-vindo!',
          description: 'Login realizado com sucesso',
        });
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="flex items-center gap-4 mb-8">
            <img src={logoKaza9} alt="KAZA9" className="h-16 w-16 rounded-xl" />
            <div>
              <h1 className="text-3xl font-display font-bold text-primary-foreground">KAZA9</h1>
              <p className="text-primary-foreground/70 text-sm tracking-widest">IMÓVEIS</p>
            </div>
          </div>
          
          <h2 className="text-4xl xl:text-5xl font-display font-bold text-primary-foreground leading-tight mb-6">
            Gestão Imobiliária<br />
            <span className="text-accent">Inteligente</span>
          </h2>
          
          <p className="text-primary-foreground/80 text-lg max-w-md mb-8">
            CRM completo para corretores, gerentes e diretores. 
            Controle leads, vendas, metas e comissões em tempo real.
          </p>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-primary-foreground/70">
              <div className="w-2 h-2 rounded-full bg-accent"></div>
              <span>Dashboards em tempo real</span>
            </div>
            <div className="flex items-center gap-3 text-primary-foreground/70">
              <div className="w-2 h-2 rounded-full bg-accent"></div>
              <span>Cálculo automático de comissões</span>
            </div>
            <div className="flex items-center gap-3 text-primary-foreground/70">
              <div className="w-2 h-2 rounded-full bg-accent"></div>
              <span>Gestão de metas e resultados</span>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-20 w-64 h-64 bg-kaza-gold/10 rounded-full blur-2xl"></div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src={logoKaza9} alt="KAZA9" className="h-12 w-12 rounded-lg" />
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">KAZA9</h1>
              <p className="text-muted-foreground text-xs tracking-widest">IMÓVEIS</p>
            </div>
          </div>

          <Card className="border-0 shadow-none lg:border lg:shadow-card">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-display">Acesse sua conta</CardTitle>
              <CardDescription>
                Entre com suas credenciais para acessar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Entrar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
              
              <p className="text-center text-sm text-muted-foreground mt-6">
                Acesso restrito. Contate o administrador para obter credenciais.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
