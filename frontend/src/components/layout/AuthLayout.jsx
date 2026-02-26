export default function AuthLayout({ title, subtitle, children, maxWidthClass = 'max-w-sm' }) {
    return (
        <div className="min-h-screen flex bg-hero-gradient">
            {/* Left Brand */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16">
                <div className="max-w-md">
                    <div className="flex items-center gap-3 mb-8">
                        <img src="/Logo-removedbg.png" alt="TripAllied" className="h-10 w-10 object-contain" />
                        <span className="text-[22px] font-semibold text-white tracking-tight">TripAllied</span>
                    </div>
                    <h1 className="text-display-xl text-white mb-4">
                        {title}
                    </h1>
                    <p className="text-body-lg text-white/50">
                        {subtitle}
                    </p>
                </div>
            </div>

            {/* Right Form */}
            <div className="flex-1 flex items-center justify-center px-6 py-8">
                <div className={`w-full ${maxWidthClass} animate-fade-in-up`}>
                    <div className="lg:hidden flex items-center gap-2.5 mb-8">
                        <img src="/Logo-removedbg.png" alt="TripAllied" className="h-9 w-9 object-contain" />
                        <span className="text-[18px] font-semibold text-white">TripAllied</span>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-8 max-h-[88vh] overflow-y-auto">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
