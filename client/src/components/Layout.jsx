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
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0c10] flex flex-col">
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
          sidebarCollapsed 
            ? (isDocumentEditor ? "lg:ml-20" : "lg:ml-20") 
            : (isDocumentEditor ? "lg:ml-64" : "lg:ml-64")
        } ${isDocumentEditor ? "p-0" : "px-8 py-6 sm:px-12 sm:py-8 lg:px-16 lg:py-8"}`}
      >
        <div className={isDocumentEditor ? "w-full h-full" : "w-full"}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
