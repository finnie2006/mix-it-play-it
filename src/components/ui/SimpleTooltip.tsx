import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SimpleTooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export const SimpleTooltip: React.FC<SimpleTooltipProps> = ({ 
  content, 
  children, 
  side = 'top' 
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className="bg-slate-700 border-slate-600 text-white">
        <p>{content}</p>
      </TooltipContent>
    </Tooltip>
  );
};