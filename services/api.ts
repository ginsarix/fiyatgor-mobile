export type Product = {
  name: string;
  price: string;
  currency: string;
};

export type ProductResponse = {
  product?: Product;
  message: string;
};

const API_URL = "https://api.fiyatgor.panunet.com.tr";

export async function getProductByBarcode(serverCode: string, barcode: string) {
  try {
    const res = await fetch(
      `${API_URL}/servers/${serverCode}/products/${barcode}`,
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
