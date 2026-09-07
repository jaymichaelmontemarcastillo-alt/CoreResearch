import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const location = useLocation();

  // Check if we are on the document editor page (which needs full width)
  const isDocumentEditor = location.pathname.startsWith('/documents/') && location.pathname.length > 11;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0c10] flex flex-row">
      {/* Sidebar in Flexbox flow — actively resizes & pushes the main viewport */}
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        isHovered={sidebarHovered}
        onHoverChange={setSidebarHovered}
      />

      {/* Main Viewport Column (Header + Page Body) — dynamically shrinks/shifts in real time */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        <Header
          onOpenMobileMenu={() => setMobileOpen(true)}
        />

        <main
          className={`flex-1 transition-all duration-300 ease-in-out ${
            isDocumentEditor ? "p-0" : "px-8 py-6 sm:px-12 sm:py-8 lg:px-16 lg:py-8"
          }`}
        >
          <div className={isDocumentEditor ? "w-full h-full" : "w-full"}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
