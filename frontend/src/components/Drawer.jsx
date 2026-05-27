// ============================================================
// src/components/Drawer.jsx
// Skeuomorphic File Cabinet Drawer with Pulling animations
// ============================================================
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Drawer = ({ title, subtitle, isOpen, onToggle, icon, children }) => {
  return (
    <div className="drawer-slot">
      {/* Drawer Face (Handle & Label) */}
      <div 
        className={`drawer-face ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left Side Icon and Small Lock Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #ffe680 0%, #b38600 100%)',
              border: '1px solid #775500',
              boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.5)',
            }} />
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>LOCK STATUS: OK</div>
          </div>

          {/* Right Side Category Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {icon}
          </div>
        </div>

        {/* Tactile Metal Pull Handle */}
        <div className="drawer-handle-bracket">
          <div className="drawer-handle-bar" />
        </div>

        {/* Paper Window Label */}
        <div className="drawer-label-window">
          <div className="drawer-label-text">{title}</div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {subtitle}
        </div>
      </div>

      {/* Slide-out Drawer Contents */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: 'auto', 
              opacity: 1,
              transition: {
                height: { duration: 0.35, ease: 'easeOut' },
                opacity: { duration: 0.25, delay: 0.1 }
              }
            }}
            exit={{ 
              height: 0, 
              opacity: 0,
              transition: {
                height: { duration: 0.3, ease: 'easeIn' },
                opacity: { duration: 0.15 }
              }
            }}
            style={{ overflow: 'hidden' }}
          >
            <div className="drawer-contents">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
