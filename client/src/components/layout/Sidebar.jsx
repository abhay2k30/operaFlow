import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NAV_GROUPS } from '../../config/permissions';

const ROLE_META = {
  Admin:            { label: 'Admin',             color: 'bg-red-100 text-red-700' },
  InventoryManager: { label: 'Inventory Manager', color: 'bg-blue-100 text-blue-700' },
  Procurement:      { label: 'Procurement',       color: 'bg-amber-100 text-amber-700' },
  Production:       { label: 'Production',        color: 'bg-purple-100 text-purple-700' },
  Sales:            { label: 'Sales',             color: 'bg-green-100 text-green-700' },
  Finance:          { label: 'Finance',           color: 'bg-teal-100 text-teal-700' },
  QualityControl:   { label: 'Quality Control',   color: 'bg-orange-100 text-orange-700' },
};

function itemVisible(item, role) {
  if (item.roles === '*') return true;
  if (role === 'Admin') return true;
  return item.roles.includes(role);
}

const Sidebar = ({ isDesktopCollapsed, toggleDesktopSidebar, isMobileSidebarOpen, setIsMobileSidebarOpen }) => {
  const location = useLocation();
  const { user } = useAuth();
  const role = user?.role || '';
  const roleMeta = ROLE_META[role] || { label: role, color: 'bg-gray-100 text-gray-600' };

  const handleMobileLinkClick = () => {
    if (window.innerWidth < 768) setIsMobileSidebarOpen(false);
  };

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  // Filter groups — hide entire group if no items visible
  const visibleGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => itemVisible(item, role)),
  })).filter(group => group.items.length > 0);

  return (
    <div className={`
      fixed top-0 h-full bg-white border-r border-gray-200 z-30 transition-all duration-300 flex flex-col
      ${isMobileSidebarOpen ? 'left-0' : '-left-64 md:left-0'}
      ${isDesktopCollapsed ? 'md:w-20' : 'md:w-64'}
      w-64
    `}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-100 relative justify-between md:justify-start shrink-0">
        <Link to="/" className="flex items-center gap-2.5 overflow-hidden" onClick={handleMobileLinkClick}>
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={`flex flex-col transition-opacity duration-300 ${isDesktopCollapsed ? 'md:opacity-0 md:w-0' : 'opacity-100'}`}>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest whitespace-nowrap">SME Manufacturing</span>
            <span className="font-bold text-gray-900 text-sm whitespace-nowrap">OperaFlow</span>
          </div>
        </Link>
        <button
          onClick={toggleDesktopSidebar}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-full p-1 shadow-sm text-gray-400 hover:text-gray-800"
        >
          {isDesktopCollapsed ? <ChevronRight size={13}/> : <ChevronLeft size={13}/>}
        </button>
        <button onClick={() => setIsMobileSidebarOpen(false)} className="md:hidden p-1 text-gray-400">
          <ChevronLeft size={20}/>
        </button>
      </div>

      {/* Role badge — shown only in expanded mode */}
      {!isDesktopCollapsed && (
        <div className="px-4 py-2.5 border-b border-gray-50">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${roleMeta.color}`}>
            {roleMeta.label}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 overflow-x-hidden">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {!isDesktopCollapsed && (
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5 px-2">
              {group.items.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={handleMobileLinkClick}
                    title={isDesktopCollapsed ? item.label : ''}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
                      ${isActive(item.path)
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                      ${isDesktopCollapsed ? 'md:justify-center' : ''}
                    `}
                  >
                    <item.icon size={16} className="shrink-0"/>
                    <span className={`${isDesktopCollapsed ? 'md:hidden' : 'block'} whitespace-nowrap`}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={`px-4 py-3 border-t border-gray-100 shrink-0 ${isDesktopCollapsed ? 'md:hidden' : 'block'}`}>
        <p className="text-[10px] text-gray-300 text-center tracking-wider uppercase">OperaFlow v2.0</p>
      </div>
    </div>
  );
};

export default Sidebar;
