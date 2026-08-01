import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/liora/states";

export const Route = createFileRoute("/_authenticated/chats/")({
  component: () => (
    <EmptyState
      icon={<MessageCircle className="size-5" />}
      title="Pick a conversation"
      body="Choose someone on the left, or start a new chat from Contacts."
    />
  ),
});
