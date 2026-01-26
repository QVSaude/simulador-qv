
'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  FileText,
  ClipboardPenLine,
  LayoutGrid,
  FileClock,
  CalendarCheck2,
  CalendarDays,
  User,
  LogOut,
  ChevronDown,
  PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { WhatsAppIcon, QVIcon } from '@/components/icons';
import { ClientOnly } from '@/components/ClientOnly';
import { WHATSAPP_NUMBER } from '@/lib/config';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    // If auth is still loading, do nothing.
    if (isUserLoading) return;

    // If auth has loaded and there's no user, or the user is anonymous, redirect to login.
    if (!user || user.isAnonymous) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);
  
  const helpMessage = "Olá! Preciso de ajuda com o painel de corretor da QV Saúde.";
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(helpMessage)}`;

  // While checking auth or if user is not a real user, show a loading state
  if (isUserLoading || !user || user.isAnonymous) {
    return (
       <div className="flex h-screen w-screen items-center justify-center">
        <p>Carregando painel...</p>
      </div>
    );
  }


  return (
    <SidebarProvider>
      <Sidebar side="left" variant="sidebar" collapsible="icon">
        <SidebarHeader className="h-14 items-center justify-center border-b bg-primary text-primary-foreground">
          <Link href="/dashboard/proposals" className="flex items-center gap-2">
            <QVIcon className="size-6" />
            <h2 className="text-xl font-semibold group-data-[collapsible=icon]:hidden">QV Saúde</h2>
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-0">
          <SidebarMenu className="gap-0 p-0">

            <SidebarGroup className="p-1">
              <SidebarGroupLabel className="px-3 text-xs uppercase text-muted-foreground group-data-[collapsible=icon]:hidden">
                Meu Painel
              </SidebarGroupLabel>
            </SidebarGroup>

            <SidebarGroup className="p-1">
              <SidebarGroupLabel className="px-3 text-xs uppercase text-muted-foreground group-data-[collapsible=icon]:hidden">
                Adesão
              </SidebarGroupLabel>
              <SidebarMenuItem>
                <Link href="/dashboard/proposals" className="w-full">
                  <SidebarMenuButton isActive={pathname === '/dashboard/proposals'} tooltip="Propostas adesão">
                    <ClipboardPenLine />
                    <span>Propostas adesão</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                 <Link href="/dashboard/quotes" className="w-full">
                    <SidebarMenuButton isActive={pathname === '/dashboard/quotes'} tooltip="Cotações adesão">
                      <FileText />
                      <span>Cotações adesão</span>
                    </SidebarMenuButton>
                 </Link>
              </SidebarMenuItem>
            </SidebarGroup>
            
            <SidebarGroup className="p-1">
              <SidebarGroupLabel className="px-3 text-xs uppercase text-muted-foreground group-data-[collapsible=icon]:hidden">
                P.M.E Administrado
              </SidebarGroupLabel>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Propostas P.M.E">
                  <ClipboardPenLine />
                  <span>Propostas P.M.E</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Cotações P.M.E">
                  <FileText />
                  <span>Cotações P.M.E</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarGroup>

            <SidebarGroup className="p-1">
              <SidebarGroupLabel className="px-3 text-xs uppercase text-muted-foreground group-data-[collapsible=icon]:hidden">
                Consultas
              </SidebarGroupLabel>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Material de apoio">
                  <FileText />
                  <span>Material de apoio às vendas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Vigências e Fechamentos">
                  <FileClock />
                   <span>Vigências e Fechamentos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Elegibilidade">
                  <CalendarCheck2 />
                   <span>Elegibilidade</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton tooltip="Datas de Fechamentos">
                  <CalendarDays />
                   <span>Datas de Fechamentos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarGroup>

          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <SidebarGroup className="p-1">
              <SidebarGroupLabel className="px-3 text-xs uppercase text-muted-foreground group-data-[collapsible=icon]:hidden">
                Perfil
              </SidebarGroupLabel>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Meus dados">
                  <User />
                  <span>Meus dados</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarGroup>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b bg-background px-4">
            <SidebarTrigger className="md:hidden" />
            <div className='flex items-center gap-4'>
                {pathname === '/dashboard/proposals' && (
                    <Link href="/cotacao-form">
                        <Button size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nova Proposta
                        </Button>
                    </Link>
                )}
            </div>
            <div className="flex items-center gap-4 ml-auto">
                 <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2">
                        <WhatsAppIcon className="h-4 w-4 text-green-500"/>
                        Preciso de ajuda
                    </Button>
                 </Link>
                <ClientOnly>
                  <UserMenu />
                </ClientOnly>
            </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <ClientOnly>{children}</ClientOnly>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};


const UserMenu = () => {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  if (isUserLoading) {
    return <Skeleton className="h-8 w-48" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.photoURL || undefined} />
            <AvatarFallback>{user?.displayName?.[0] || user?.email?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start">
             <span className="text-sm font-medium">Olá, {user?.displayName?.split(' ')[0] || 'Usuário'}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Meu Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
