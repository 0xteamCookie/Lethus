import React from "react";

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white border border-gray-200 rounded-lg p-5 ${className}`}>
        {children}
    </div>
);

export default Card;
