import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
      <Footer />
    </>
  );
}
