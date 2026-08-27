import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export const Layout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Check if we are on the document editor page (which needs full width)
  const isDocumentEditor = location.pathname.startsWith('/documents/') && location.pathname.length > 11;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <Header
        sidebarCollapsed={sidebarCollapsed}
        onOpenMobileMenu={() => setMobileOpen(true)}
      />

      <main
        className={`flex-1 transition-all duration-200 ${
          sidebarCollapsed ? "lg:pl-24" : "lg:pl-72"
        } ${isDocumentEditor ? "p-0" : "p-4 sm:p-6 lg:p-8"}`}
      >
        <div className={isDocumentEditor ? "w-full h-full" : "max-w-7xl mx-auto"}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
