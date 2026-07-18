import type { ChannelAdapter } from "./channel";
import { telegramAdapter } from "./telegram";

// Resolve a ChannelAdapter by channel name. Telegram is the chosen v0 channel
// (see the channel research); Slack would slot in here as another case. Single
// seam so the cron + webhook routes never import a specific channel directly.

export type ChannelName = "slack" | "telegram";

export function getAdapter(channel: ChannelName): ChannelAdapter {
  switch (channel) {
    case "telegram":
      return telegramAdapter;
    default:
      throw new Error(`No adapter registered for channel: ${channel}`);
  }
}
