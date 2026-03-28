import { formatDistanceToNow, format } from "date-fns";

export const formatTime = (date: Date): string => {
  return formatDistanceToNow(date, { addSuffix: true });
};

export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

export const formatCharCount = (count: number): string => {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k chars`;
  return `${count} chars`;
};

export const formatRelativeDate = (iso: string): string => {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
};

export const formatFullDate = (iso: string): string => {
  return format(new Date(iso), "EEE, MMM d yyyy, h:mm:ss a OOO");
};
