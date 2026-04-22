import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  Folder,
  Presentation,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type FileKind = {
  label: string;
  icon: IconType;
  tone: string;
};

const FALLBACK: FileKind = {
  label: "File",
  icon: File,
  tone: "text-muted-foreground",
};

export function classifyFileMime(mime: string): FileKind {
  if (mime === "inode/directory") {
    return { label: "Folder", icon: Folder, tone: "text-sky-400" };
  }

  // Office / Documents
  if (mime === "application/pdf") {
    return { label: "PDF", icon: FileText, tone: "text-rose-400" };
  }
  if (
    mime === "application/msword" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/vnd.oasis.opendocument.text" ||
    mime === "application/rtf"
  ) {
    return { label: "Word", icon: FileText, tone: "text-blue-400" };
  }
  if (
    mime === "application/vnd.ms-excel" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.oasis.opendocument.spreadsheet" ||
    mime === "text/csv" ||
    mime === "text/tab-separated-values"
  ) {
    return { label: "Sheet", icon: FileSpreadsheet, tone: "text-emerald-400" };
  }
  if (
    mime === "application/vnd.ms-powerpoint" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    mime === "application/vnd.oasis.opendocument.presentation"
  ) {
    return { label: "Slides", icon: Presentation, tone: "text-orange-400" };
  }

  // Archives
  if (
    mime === "application/zip" ||
    mime === "application/x-tar" ||
    mime === "application/gzip" ||
    mime === "application/x-bzip2" ||
    mime === "application/x-xz" ||
    mime === "application/x-7z-compressed" ||
    mime === "application/vnd.rar" ||
    mime === "application/epub+zip"
  ) {
    return { label: "Archive", icon: FileArchive, tone: "text-amber-400" };
  }

  // Code / data
  if (
    mime === "application/json" ||
    mime === "application/yaml" ||
    mime === "application/toml" ||
    mime === "application/xml" ||
    mime === "application/sql" ||
    mime === "application/javascript" ||
    mime === "application/typescript" ||
    mime.startsWith("text/x-") ||
    mime === "text/css" ||
    mime === "text/html" ||
    mime === "application/x-shellscript"
  ) {
    return { label: "Code", icon: FileCode, tone: "text-violet-400" };
  }

  if (mime === "text/plain" || mime === "text/markdown") {
    return { label: "Text", icon: FileText, tone: "text-slate-300" };
  }

  if (mime.startsWith("image/")) {
    return { label: "Image", icon: FileImage, tone: "text-pink-400" };
  }
  if (mime.startsWith("video/")) {
    return { label: "Video", icon: FileVideo, tone: "text-purple-400" };
  }
  if (mime.startsWith("audio/")) {
    return { label: "Audio", icon: FileAudio, tone: "text-teal-400" };
  }
  if (mime.startsWith("font/")) {
    return { label: "Font", icon: FileType, tone: "text-indigo-400" };
  }

  return FALLBACK;
}

function basenameOf(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  return idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
}

function parentOf(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  return idx > 0 ? trimmed.slice(0, idx) : "/";
}

type Props = {
  path: string;
  fileMime: string;
};

export const ClipboardItemFile = ({ path, fileMime }: Props) => {
  const kind = classifyFileMime(fileMime);
  const Icon = kind.icon;
  const name = basenameOf(path);
  const parent = parentOf(path);

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className={`flex items-center justify-center size-9 rounded-md bg-muted/40 shrink-0 ${kind.tone}`}
      >
        <Icon className="size-5" />
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <p
          className="text-sm text-card-foreground truncate"
          title={name}
        >
          {name}
        </p>
        <p
          className="text-[11px] text-muted-foreground truncate"
          title={parent}
        >
          {parent}
        </p>
      </div>
    </div>
  );
};
