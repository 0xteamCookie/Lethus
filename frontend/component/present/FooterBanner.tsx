import React from "react";

const FooterBanner = ({ children }: { children: React.ReactNode }) => (
    <div className="border border-violet-200 bg-violet-50 rounded-lg px-5 py-4 text-violet-800 text-base font-medium leading-relaxed">
        {children}
    </div>
);

export default FooterBanner;
