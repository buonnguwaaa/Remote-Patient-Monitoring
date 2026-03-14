import React from "react";

interface TooltipProps {
  text: string;
  children?: React.ReactNode;
}

const Tooltip = ({ text, children }: TooltipProps) => {
  return (
    <div className="relative inline-block group">
      {children}

      <div
        className="
          absolute bottom-full left-1/2 mb-2 hidden group-hover:block
          -translate-x-1/2 z-50
          px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap
          
          after:content-[''] after:absolute after:top-full after:left-1/2 
          after:-translate-x-1/2
          after:border-4 after:border-transparent after:border-t-gray-800
        "
      >
        {text}
      </div>
    </div>
  );
};

export default Tooltip;
