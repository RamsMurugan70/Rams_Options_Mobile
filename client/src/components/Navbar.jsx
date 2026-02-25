import React from 'react';
import { LayoutDashboard, IndianRupee } from 'lucide-react';

const Navbar = () => {
    return (
        <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo Section */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-3 group">
                            <div className="bg-gradient-to-br from-brand-500 to-brand-700 p-2 rounded-xl text-white shadow-lg group-hover:shadow-brand-200 transition-all">
                                <LayoutDashboard size={20} className="text-white" />
                            </div>
                            <div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="flex items-center space-x-1">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-brand-50 text-brand-600 shadow-sm ring-1 ring-brand-100">
                            <IndianRupee size={18} className="text-brand-500" />
                            Options
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
