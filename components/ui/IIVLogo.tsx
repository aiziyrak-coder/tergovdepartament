
import React from 'react';

interface IIVLogoProps {
  className?: string;
}

export const IIVLogo: React.FC<IIVLogoProps> = ({ className }) => {
  // Unique IDs for gradients to avoid conflicts if multiple logos are rendered
  const uniqueId = React.useId();
  const gradShieldId = `gradShield-${uniqueId}`;
  const gradSwordId = `gradSword-${uniqueId}`;
  const dropShadowId = `dropShadow-${uniqueId}`;

  return (
    <svg 
      viewBox="0 0 500 600" 
      className={className} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="IIV Тергов Департаменти Логоси"
    >
      <defs>
        <linearGradient id={gradShieldId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0064B0" />
          <stop offset="100%" stopColor="#004B87" />
        </linearGradient>
        <linearGradient id={gradSwordId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E0E0E0" />
          <stop offset="50%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#B0B0B0" />
        </linearGradient>
        <filter id={dropShadowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
          <feOffset dx="2" dy="4" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge> 
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/> 
          </feMerge>
        </filter>
      </defs>

      {/* --- SWORD (QILICH - ORQA FON) --- */}
      <g filter={`url(#${dropShadowId})`}>
         {/* Blade */}
         <path d="M250 40 L250 580" stroke="url(#silver)" strokeWidth="18" strokeLinecap="round" />
         <path d="M250 100 L250 550" stroke="#A0A0A0" strokeWidth="18" />
         <path d="M250 100 L250 550" stroke="#FFF" strokeWidth="2" opacity="0.6"/>
         {/* Handle */}
         <path d="M200 80 L300 80 L300 100 L250 110 L200 100 Z" fill={`url(#${gradSwordId})`} stroke="#666" strokeWidth="1"/>
         <rect x="235" y="30" width="30" height="60" rx="4" fill={`url(#${gradSwordId})`} stroke="#666"/>
      </g>

      {/* --- SHIELD (QALQON - ASOSIY) --- */}
      <path 
        d="M70 120 H430 L430 250 C430 410 250 540 250 540 C250 540 70 410 70 250 Z" 
        fill={`url(#${gradShieldId})`}
        stroke="#D0D0D0" 
        strokeWidth="12"
        filter={`url(#${dropShadowId})`}
      />
      
      {/* --- RIVETS (MIXCHALAR) --- */}
      <g fill="#888" stroke="#FFF" strokeWidth="1">
         <circle cx="85" cy="135" r="5"/>
         <circle cx="415" cy="135" r="5"/>
         <circle cx="85" cy="250" r="5"/>
         <circle cx="415" cy="250" r="5"/>
         <circle cx="250" cy="525" r="5"/>
      </g>

      {/* --- CENTER EMBLEM (GERB) --- */}
      <g transform="translate(250 210) scale(1.1)">
         {/* Outer Gold Circle */}
         <circle r="55" fill="none" stroke="#DAA520" strokeWidth="3"/>
         <circle r="55" fill="#FFF" opacity="0.1"/>
         
         {/* Inner Blue Circle */}
         <circle r="45" fill="#0099B5"/>

         {/* Bird (Humo - Stylized) */}
         <path 
            d="M-35 -10 Q0 -35 35 -10 Q45 0 55 -10 L45 30 Q0 50 -45 30 L-55 -10 Q-45 0 -35 -10" 
            fill="#C0C0C0" stroke="#FFF" strokeWidth="1.5"
         />
         {/* Sun Rays */}
         <path d="M0 -45 L0 45 M-45 0 L45 0" stroke="#DAA520" strokeWidth="2" opacity="0.6"/>
      </g>

      {/* --- TEXT (YOZUVLAR) --- */}
      <g transform="translate(250 330)">
          <text y="0" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="42" fill="white" style={{textShadow: "0 2px 4px rgba(0,0,0,0.5)"}}>ТЕРГОВ</text>
          <text y="40" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="26" fill="white" style={{textShadow: "0 2px 4px rgba(0,0,0,0.5)"}}>ДЕПАРТАМЕНТИ</text>
      </g>

      {/* --- BORDER TEXT (CHETKI YOZUVLAR) --- */}
      {/* Left Text: O'ZBEKISTON RESPUBLIKASI */}
      <text 
        x="95" y="300" 
        transform="rotate(-90 95,300)" 
        textAnchor="middle" 
        fontSize="11" 
        fontWeight="bold" 
        fill="white" 
        opacity="0.9" 
        fontFamily="Arial"
        letterSpacing="1px"
      >
        Ў'ЗБЕКИСТОН РЕСПУБЛИКАСИ
      </text>

      {/* Right Text: ICHKI ISHLAR VAZIRLIGI */}
      <text 
        x="405" y="300" 
        transform="rotate(90 405,300)" 
        textAnchor="middle" 
        fontSize="11" 
        fontWeight="bold" 
        fill="white" 
        opacity="0.9" 
        fontFamily="Arial"
        letterSpacing="1px"
      >
        ИЧҲИ ИШЛАР ВАЗИРЛИГИ
      </text>

    </svg>
  );
};
