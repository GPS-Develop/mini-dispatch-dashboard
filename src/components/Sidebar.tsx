'use client';

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { NAV_ITEMS } from "../utils/constants";
import Button from "./Button/Button";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
  };

  const handleNavClick = () => {
    // Close mobile menu when navigation item is clicked
    if (onMobileClose) {
      onMobileClose();
    }
  };

  // Close mobile sidebar when clicking outside (handled by overlay)
  const handleOverlayClick = () => {
    if (onMobileClose) {
      onMobileClose();
    }
  };

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to reset body scroll
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

  const renderSidebarContent = () => {
    if (loading) {
      return (
        <>
          <div className="sidebar-title">Mini Dispatch</div>
          <div className="loading-container">
            <div className="text-muted">Loading...</div>
          </div>
        </>
      );
    }

    if (!user) {
      return (
        <>
          <div className="sidebar-title">Mini Dispatch</div>
          <div className="sidebar-signout">
            <Link 
              href="/login"
              className="btn-primary"
              onClick={handleNavClick}
            >
              Sign In
            </Link>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="sidebar-title">Mini Dispatch</div>
        
        {/* User Info */}
        <div className="sidebar-user-info">
          <div className="sidebar-user-info-label">Signed in as:</div>
          <div className="sidebar-user-info-email">{user.email}</div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`sidebar-nav-item ${pathname === item.href ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Sign Out Button */}
        <div className="sidebar-signout">
          <Button
            onClick={handleSignOut}
            variant="danger"
          >
            Sign Out
          </Button>
        </div>
      </>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar-desktop">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${isMobileOpen ? 'open' : ''}`}
        onClick={handleOverlayClick}
      />

      {/* Mobile Sidebar */}
      <aside className={`sidebar-mobile ${isMobileOpen ? 'open' : ''}`}>
        {/* Close Button */}
        <button
          onClick={onMobileClose}
          className="sidebar-close-btn"
          aria-label="Close menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {renderSidebarContent()}
      </aside>
    </>
  );
} 

 