"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  className = "",
  buttonClassName = "",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle key navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative font-sans ${className} ${isOpen ? "z-[100]" : "z-10"}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-[#0c0c0e]/90 hover:bg-[#141418] focus:border-[#1754d8] focus:ring-1 focus:ring-[#1754d8] transition-all flex items-center justify-between text-left text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <span className={`truncate ${selectedOption ? "text-white font-medium" : "text-zinc-500"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 shrink-0 ml-2 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#1754d8]" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-[9999] mt-1.5 min-w-[220px] max-h-64 overflow-y-auto rounded-xl border border-white/[0.14] bg-[#0c0c0e]/98 backdrop-blur-2xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-lg text-left text-xs transition-all flex items-center justify-between group ${
                  isSelected
                    ? "bg-[#1754d8] text-white font-medium shadow-md shadow-[#1754d8]/20"
                    : "text-zinc-300 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="truncate">{option.label}</div>
                  {option.description && (
                    <div
                      className={`text-3xs truncate mt-0.5 ${
                        isSelected ? "text-blue-100" : "text-zinc-500 group-hover:text-zinc-400"
                      }`}
                    >
                      {option.description}
                    </div>
                  )}
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
