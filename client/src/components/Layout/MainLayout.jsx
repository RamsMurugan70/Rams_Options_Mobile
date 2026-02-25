import React from 'react';

const MainLayout = ({ children }) => {
    return (
        <div className="min-h-screen bg-slate-50 relative overflow-x-hidden font-sans text-slate-900 selection:bg-brand-100 selection:text-brand-900">
            {/* Ambient Background Gradients */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-100/40 blur-[100px]" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] rounded-full bg-accent-100/40 blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[30%] h-[30%] rounded-full bg-brand-50/60 blur-[100px]" />
            </div>

            {/* Content Content - Elevated above background */}
            <div className="relative z-10 w-full">
                {children}
            </div>
        </div>
    );
};

export default MainLayout;
