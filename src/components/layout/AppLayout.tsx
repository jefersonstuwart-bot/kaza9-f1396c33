import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function AppLayout() {
  const { user, loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse-soft">
            <div className="h-12 w-12 rounded-xl bg-primary/20"></div>
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Header */}
          <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-card/80 backdrop-blur-sm px-6">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            
            <div className="flex-1" />
            
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive"></span>
            </Button>
          </header>

          {/* Main content */}
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
