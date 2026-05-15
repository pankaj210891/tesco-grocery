"use client";

import { useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { toast } from "sonner";

const TOAST_ID = "network-status";

export default function NetworkStatus() {
  useEffect(() => {
    function handleOffline() {
      toast.error("You are offline", {
        id:          TOAST_ID,
        description: "Check your internet connection.",
        icon:        <WifiOff className="h-4 w-4" />,
        duration:    Infinity, // stays until connection is restored
      });
    }

    function handleOnline() {
      toast.dismiss(TOAST_ID);
      toast.success("You are back online", {
        description: "Your connection has been restored.",
        icon:        <Wifi className="h-4 w-4" />,
        duration:    3000,
      });
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online",  handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online",  handleOnline);
    };
  }, []);

  return null;
}
