import { Klipy } from "@/features/klipy/schema/klipy";

export type KlipyResponse = {
  data: {
    current_page: number;
    per_page: number;
    has_next: boolean;

    data: Klipy[];

    meta: {
      ad_max_resize_percent: number;
      item_min_width: number;
    };
  };

  result: boolean;
};
