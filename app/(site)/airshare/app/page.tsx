import type { Metadata } from "next";
import AirShareApp from "@/components/airshare/airshare-app";

export const metadata: Metadata = {
  title: "AirShare — local file transfer",
  description:
    "Open AirShare on two devices on the same Wi-Fi, join with a PIN, and send files or messages directly between the browsers without uploading them.",
  alternates: { canonical: "/airshare/app/" },
};

export default function AirShareAppPage() {
  return <AirShareApp />;
}
