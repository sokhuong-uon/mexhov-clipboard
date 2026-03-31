import { KlipyCategory } from "@/features/klipy/schema/klipy-category";

export type KlipyCategoryResponse = {
  result: boolean;
  data: {
    locale: string;
    categories: KlipyCategory[];
  };
};
