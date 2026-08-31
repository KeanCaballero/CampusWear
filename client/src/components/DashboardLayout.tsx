import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, readStoredSidebarWidth, storeSidebarWidth } from "@/lib/sidebarWidth";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { BrandMark } from "./campuswear/BrandMark";
import { OfflineNotice } from "./campuswear/OfflineNotice";
import { LogOut, PanelLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

export type WorkspaceNavigationItem = { icon: LucideIcon; label: string; path: string };
export type WorkspacePrimaryAction = { icon: LucideIcon; label: string; path: string };

export default function DashboardLayout({
  children,
  items,
  workspaceLabel,
  primaryAction,
}: {
  children: React.ReactNode;
  items: WorkspaceNavigationItem[];
  workspaceLabel: string;
  primaryAction?: WorkspacePrimaryAction;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(readStoredSidebarWidth);
  const { loading, user } = useAuth();

  useEffect(() => { storeSidebarWidth(sidebarWidth); }, [sidebarWidth]);
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 text-center"><BrandMark /><div><h1 className="text-2xl font-extrabold tracking-[-0.04em]">Sign in to continue</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Access to the {workspaceLabel.toLowerCase()} requires authentication.</p></div><Button onClick={() => window.location.assign(`/auth?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`)} size="lg" className="w-full">Sign in</Button></div></div>;
  }
  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><DashboardLayoutContent items={items} workspaceLabel={workspaceLabel} primaryAction={primaryAction} setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent></SidebarProvider>;
}

function DashboardLayoutContent({ children, items, workspaceLabel, primaryAction, setSidebarWidth }: { children: React.ReactNode; items: WorkspaceNavigationItem[]; workspaceLabel: string; primaryAction?: WorkspacePrimaryAction; setSidebarWidth: (width: number) => void }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const activeMenuItem = items.find(item => item.path === location);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const width = event.clientX - left;
      if (width >= MIN_SIDEBAR_WIDTH && width <= MAX_SIDEBAR_WIDTH) setSidebarWidth(width);
    };
    const up = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[8px_0_24px_rgb(15_39_71/0.16)]"
          disableTransition={isResizing}
        >
          <SidebarHeader className="border-b border-sidebar-border px-3 py-4 group-data-[collapsible=icon]:px-1">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center">
              <button onClick={toggleSidebar} className="grid size-10 shrink-0 place-items-center rounded-xl text-blue-100 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-gold" aria-label="Toggle navigation">
                <PanelLeft className="size-4" />
              </button>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden"><BrandMark light /></div>
              {/* Collapsed to icons: keep the mark visible via the compact lockup. */}
              <div className="hidden group-data-[collapsible=icon]:block"><BrandMark light compact /></div>
            </div>
            <p className="mt-3 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-200 group-data-[collapsible=icon]:hidden">{workspaceLabel}</p>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-3 py-4">
            <SidebarMenu aria-label={`${workspaceLabel} navigation`} className="gap-1.5">
              {items.map(item => {
                const active = location === item.path;

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={active}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="min-h-11 gap-3 rounded-xl border-l-4 border-transparent px-4 text-[13px] font-semibold text-blue-100 transition-colors hover:bg-white/10 hover:text-white data-[active=true]:border-campus-gold data-[active=true]:bg-campus-blue data-[active=true]:text-white group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:px-2"
                    >
                      <item.icon className="size-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {primaryAction && (
              <div className="mt-5 px-1 group-data-[collapsible=icon]:hidden">
                <Button onClick={() => setLocation(primaryAction.path)} className="min-h-11 w-full gap-2 rounded-xl bg-campus-blue font-bold text-white shadow-sm hover:bg-campus-blue/90">
                  <primaryAction.icon className="size-4" aria-hidden="true" />
                  {primaryAction.label}
                </Button>
              </div>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex min-h-11 w-full items-center gap-3 rounded-xl p-1 text-left text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-gold group-data-[collapsible=icon]:justify-center">
                  <Avatar className="size-9 shrink-0 border border-white/25">
                    <AvatarFallback className="bg-white/12 text-xs font-bold text-white">{user?.name?.charAt(0).toUpperCase() ?? "C"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-bold leading-none">{user?.name ?? "CampusWear user"}</p>
                    <p className="mt-1.5 truncate text-[11px] text-blue-200">{user?.email ?? user?.role.replaceAll("_", " ")}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 size-4" />Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {!isCollapsed && <div className="absolute right-0 top-0 z-50 hidden h-full w-1 cursor-col-resize transition hover:bg-campus-gold/60 md:block" onMouseDown={() => setIsResizing(true)} />}
      </div>

      <SidebarInset>
        {isMobile && (
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card px-3">
            <SidebarTrigger className="size-10 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">{workspaceLabel}</p>
              <p className="truncate text-sm font-extrabold">{activeMenuItem?.label ?? workspaceLabel}</p>
            </div>
          </header>
        )}
        <OfflineNotice />
        <main className="min-h-screen flex-1 bg-background p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
