"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GetStartedPage() {
  useEffect(() => {
    window.location.replace("/");
  }, []);

  return (
    <div className="card">
      <h1 className="text-2xl font-black">Quick start has moved home</h1>
      <p className="mt-2 text-track-muted">The start page has been merged into the home page.</p>
      <Link className="btn btn-primary mt-4" href="/">Go to home page</Link>
    </div>
  );
}
