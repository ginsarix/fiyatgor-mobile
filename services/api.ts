import { API_URL } from "@/constants/api";

export type Product = {
  name: string;
  price: string;
  currency: string;
};

export type ProductResponse = {
  product?: Product;
  message: string;
};

type Identifier =
  | { serverCode: string; firmCode?: never }
  | { serverCode?: never; firmCode: string };

type getProductByBarcodeProps = Identifier & { barcode: string };

export async function getProductByBarcode({
  serverCode,
  firmCode,
  barcode,
}: getProductByBarcodeProps) {
  if (!serverCode && !firmCode) {
    throw new Error("Sunucu kodu veya firma kodu girilmelidir");
  }

  try {
    const identifierResource = serverCode
      ? `servers/${serverCode}`
      : `firms/${firmCode!}`;

    const res = await fetch(
      `${API_URL}/${identifierResource}/products/${barcode}`,
    );

    const text = await res.text(); // önce text al

    console.log(text);

    if (!res.ok) {
      throw new Error(`Server Error: ${text}`);
    }

    // JSON parse etmeyi biz kontrol edelim
    try {
      const json = JSON.parse(text);

      return json as ProductResponse;
    } catch {
      throw new Error("Server JSON dönmüyor");
    }
  } catch (error) {
    console.error("Fetch error:", error);
    return undefined;
  }
}
