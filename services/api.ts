export type Product = {
    name: string;
    price: string;
    currency: string;
}

export type ErrorResponse = {
    message: string;
}

const API_URL = "http://192.168.1.166:3000";

export async function getProductByBarcode(barcode: string) {
    try {
        const res = await fetch(`${API_URL}/products/${barcode}`);

        const text = await res.text(); // önce text al

        if (!res.ok) {
            throw new Error(`Server Error: ${text}`);
        }

        // JSON parse etmeyi biz kontrol edelim
        try {
            return JSON.parse(text) as Product;
        } catch {
            throw new Error("Server JSON dönmüyor");
        }

    } catch (error) {
        console.error("Fetch error:", error);
        return undefined;
    }
}
