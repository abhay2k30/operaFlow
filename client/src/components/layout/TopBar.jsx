import React, { useState, useRef, useEffect } from 'react';
import { User, Menu, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const TopBar = ({ isDesktopCollapsed, toggleMobileSidebar }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const ROLE_COLORS = {
        Admin:            'bg-red-100 text-red-700',
        InventoryManager: 'bg-blue-100 text-blue-700',
        Procurement:      'bg-amber-100 text-amber-700',
        Production:       'bg-purple-100 text-purple-700',
        Sales:            'bg-green-100 text-green-700',
        Finance:          'bg-teal-100 text-teal-700',
        QualityControl:   'bg-orange-100 text-orange-700',
    };

    return (
        <header className={`
            h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6
            fixed top-0 right-0 z-10 transition-all duration-300
            left-0 ${isDesktopCollapsed ? 'md:left-20' : 'md:left-64'}
        `}>
            {/* Left — mobile toggle + app name */}
            <div className="flex items-center gap-3">
                <button onClick={toggleMobileSidebar}
                    className="p-1 md:hidden text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Menu size={24} />
                </button>
                <span className="text-base font-semibold text-gray-800 hidden md:block">OperaFlow ERP</span>
            </div>

            {/* Right — user menu */}
            <div className="relative" ref={ref}>
                <button
                    onClick={() => setOpen(!open)}
                    className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full transition-colors"
                >
                    <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center text-white shrink-0">
                        <User size={13} />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{user?.name || 'User'}</span>
                        <span className={`hidden md:inline text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[user?.role] || 'bg-gray-100 text-gray-600'}`}>
                            {user?.role}
                        </span>
                    </div>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {open && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
                        <div className="px-4 py-2.5 border-b border-gray-100">
                            <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <LogOut size={14} /> Sign out
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default TopBar;

