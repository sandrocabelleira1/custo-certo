
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  BadgeDollarSign,
  BookCopy,
  ChefHat,
  DollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  Sprout,
  Users,
  UtensilsCrossed,
  ClipboardList,
  Store as StoreIcon,
  Tags,
  UserCog,
  ClipboardPaste,
  CheckSquare,
  ChevronDown,
  Menu,
  TrendingUp,
  Hammer,
  WalletCards,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';
import { auth } from '@/lib/firebase';
import { useAuth } from './auth/auth-provider';
import StoreSwitcher from './store-switcher';
import { ThemeSwitcher } from './theme-switcher';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, useSidebar, SidebarTrigger } from './ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';


const navMenu = {
  gestao: [
    { href: '/faturamento', label: 'Faturamento', icon: DollarSign, roles: ['Master', 'Gerente'] },
    { href: '/compras', label: 'Compras', icon: ShoppingCart, roles: ['Master', 'Gerente'] },
    { href: '/despesas', label: 'Despesas Gerais', icon: WalletCards, roles: ['Master', 'Gerente'] },
    { href: '/contas-a-pagar', label: 'Contas a Pagar', icon: BadgeDollarSign, roles: ['Master', 'Gerente'] },
    { href: '/analise-cmv', label: 'Análise de CMV', icon: BookCopy, roles: ['Master', 'Gerente'] },
    { href: '/projecao-vendas', label: 'Projeção de Vendas', icon: TrendingUp, roles: ['Master', 'Gerente'] },
    { href: '/relatorios', label: 'Relatórios', icon: FileText, roles: ['Master'] },
    { href: '/lojas', label: 'Lojas', icon: StoreIcon, roles: ['Master'] },
    { href: '/usuarios', label: 'Usuários', icon: UserCog, roles: ['Master'] },
  ],
  operacao: [
    { href: '/assistente-compras', label: 'Assistente de Compras', icon: ClipboardPaste, roles: ['Master', 'Gerente'] },
    { href: '/producao', label: 'Produção / Desmembramento', icon: Hammer, roles: ['Master', 'Gerente', 'Colaborador'] },
    { href: '/checklists', label: 'Checklists', icon: CheckSquare, roles: ['Master', 'Gerente', 'Colaborador'] },
    { href: '/insumos', label: 'Insumos', icon: Sprout, roles: ['Master', 'Gerente'] },
    { href: '/ajuste-estoque', label: 'Saída de Estoque', icon: ClipboardList, roles: ['Master', 'Gerente', 'Colaborador'] },
    { href: '/balanco-estoque', label: 'Balanço de Estoque', icon: ClipboardList, roles: ['Master', 'Gerente', 'Colaborador'] },
    { href: '/fornecedores', label: 'Fornecedores', icon: Users, roles: ['Master', 'Gerente'] },
    { href: '/receitas', label: 'Fichas Técnicas', icon: ChefHat, roles: ['Master', 'Gerente'] },
    { href: '/etiquetas', label: 'Etiquetas', icon: Tags, roles: ['Master', 'Gerente', 'Colaborador'] },
  ]
};

const NavMenuItems = ({ items, userRole, setOpen }: { items: typeof navMenu.gestao, userRole: string, setOpen?: (open: boolean) => void }) => {
  const router = useRouter();
  const visibleItems = items.filter(item => userRole && item.roles.includes(userRole));

  const handleClick = (href: string) => {
    router.push(href);
    if (setOpen) {
      setOpen(false);
    }
  };

  return (
    <>
      {visibleItems.map((item) => (
        <DropdownMenuItem key={item.href} onClick={() => handleClick(item.href)} className="cursor-pointer">
            <item.icon className="mr-2 h-4 w-4" />
            <span>{item.label}</span>
        </DropdownMenuItem>
      ))}
    </>
  )
};

export default function AppSidebar() {
  const pathname = usePathname();
  const { user, appUser } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const { state } = useSidebar();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  if (!user || !appUser) {
    return null;
  }
  
  const userRole = appUser.role;

  const NavContent = () => (
    <SidebarMenu>
        <SidebarMenuItem>
          <Link href="/">
            <SidebarMenuButton tooltip="Dashboard" isActive={pathname === '/'}>
                <LayoutDashboard />
                <span>Dashboard</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
       
        <SidebarGroup>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <SidebarMenuButton tooltip="Gestão">
                  <Package />
                  <span>Gestão</span>
                </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <NavMenuItems items={navMenu.gestao} userRole={userRole} setOpen={setMobileNavOpen} />
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarGroup>
        
        <SidebarGroup>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <SidebarMenuButton tooltip="Operação">
                  <UtensilsCrossed />
                  <span>Operação</span>
                </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <NavMenuItems items={navMenu.operacao} userRole={userRole} setOpen={setMobileNavOpen} />
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarGroup>
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="offcanvas" variant="floating">
        <SidebarHeader>
          <Link href="/" className="flex items-center gap-2 font-semibold">
             <Image 
                src="https://firebasestorage.googleapis.com/v0/b/custocerto-vi1a8.firebasestorage.app/o/ChatGPT%20Image%208_06_2026%2C%2016_57_28.png?alt=media&token=13cfd52f-5ffb-4c84-9512-fc38066d0b20" 
                alt="Xisbox Logo" 
                width={32} 
                height={32}
                className="rounded-sm"
             />
            <span className={cn("font-semibold", state === 'collapsed' && 'hidden')}>Custo Certo</span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
            <NavContent />
        </SidebarContent>

        <SidebarFooter>
           {userRole !== 'Colaborador' && <StoreSwitcher />}
            <div className={cn("flex items-center justify-between", state === 'collapsed' && 'flex-col gap-2')}>
                <ThemeSwitcher />
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={handleSignOut} variant="ghost" size="icon">
                                <LogOut />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center">
                            Sair
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
           </div>
        </SidebarFooter>
    </Sidebar>
  );
}
