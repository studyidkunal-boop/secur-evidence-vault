import React from 'react';

/**
 * SecuraLogo - Consistent geometric brand mark matching the LEXA reference
 * Ensures the capital letters 'SECUR' and the black square 'A' mark have
 * the EXACT SAME EQUAL HEIGHT and EQUAL LENGTH.
 */
export default function SecuraLogo({
  className = '',
  textClassName = '',
  boxClassName = '',
  dark = false,
}) {
  const defaultTextClass = dark ? 'text-white' : 'text-slate-950';
  const defaultBoxClass = dark ? 'bg-white' : 'bg-black';
  const svgStroke = dark ? 'stroke-black' : 'stroke-white';

  return (
    <div
      className={`inline-flex items-center select-none font-sans font-black tracking-[0.12em] ${className}`}
    >
      <span
        className={`leading-none flex items-center font-black ${
          textClassName || defaultTextClass
        }`}
      >
        SECUR
      </span>
      <span
        className={`ml-1.5 flex items-center justify-center rounded-[4px] shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform duration-150 ${
          boxClassName || defaultBoxClass
        }`}
        style={{ width: '0.98em', height: '0.98em' }}
      >
        <svg
          viewBox="0 0 24 24"
          className={`fill-none ${svgStroke}`}
          style={{ width: '74%', height: '74%' }}
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 19L12 5.5L19 19" />
        </svg>
      </span>
    </div>
  );
}
