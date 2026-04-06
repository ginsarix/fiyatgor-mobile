export type ScanEntry = {
  id: number;
  barcode: string;
  productName: string | null;
  price: string | null;
  currency: string | null;
  demo?: boolean;
};
