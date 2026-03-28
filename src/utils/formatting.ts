import { formatDistanceToNow, format } from "date-fns";

export const formatTime = (date: Date): string => {
  return formatDistanceToNow(date, { addSuffix: true });
};

export const formatRelativeDate = (iso: string): string => {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
};

export const formatFullDate = (iso: string): string => {
  return format(new Date(iso), "EEE, MMM d yyyy, h:mm:ss a OOO");
};
