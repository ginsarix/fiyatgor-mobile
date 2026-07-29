export type ScanEntry = {
  id: number;
  barcode: string;
  productName: string | null;
  price: string | null;
  currency: string | null;
  discountedPrice?: string | null;
  discountActive?: boolean;
  demo?: boolean;
};
