import React from "react";

const variants = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700",
  default: "bg-slate-100 text-slate-800 hover:bg-slate-200",
};

const sizes = {
  md: "px-3 py-2 text-sm rounded",
  default: "px-3 py-2 text-sm rounded",
};

export default function Button({ children, variant = "default", size = "default", className = "", ...props }) {
  return (
    <button className={`${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`} {...props}>
      {children}
    </button>
  );
}
