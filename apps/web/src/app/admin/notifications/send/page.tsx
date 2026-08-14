import type { Metadata } from "next";
import { SendMessagePage } from "./_components/send-message-page";

export const metadata: Metadata = {
  title: "Send message | Admin Console",
  description: "Send email, SMS, or mobile push messages to a group or to specific people.",
};

export default function Page() {
  return <SendMessagePage />;
}
