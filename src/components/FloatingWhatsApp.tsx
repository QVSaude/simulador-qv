
"use client"

import Link from "next/link";
import { WHATSAPP_NUMBER, WHATSAPP_GREETING } from "@/lib/config";
import { WhatsAppIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export function FloatingWhatsApp() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    WHATSAPP_GREETING
  )}`;

  return (
    <Link
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-green-500"
      )}
      aria-label="Fale conosco pelo WhatsApp"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </Link>
  );
}

    