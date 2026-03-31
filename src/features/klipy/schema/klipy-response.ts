import { Klipy } from "@/features/klipy/schema/klipy";

export type KlipyResponseData = {
  current_page: number;
  per_page: number;
  has_next: boolean;

  data: Klipy[];

  meta: {
    ad_max_resize_percent: number;
    item_min_width: number;
  };
};

export type KlipyResponse =
  | {
      result: true;
      data: KlipyResponseData;
    }
  | {
      result: false;
    };
