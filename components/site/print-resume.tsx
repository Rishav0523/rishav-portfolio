"use client";

import { Printer } from "lucide-react";

export default function PrintResume() {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary print-hide">
      <Printer className="h-4 w-4" aria-hidden />
      Print / Save as PDF
    </button>
  );
}
