import { KlipyFile } from "@/features/klipy/schema/klipy-file";

export type Klipy = {
  id: number;
  slug: string;
  title: string;

  tags: string[];

  file: KlipyFile;
  blur_preview: string;
  type: "gif";
};
