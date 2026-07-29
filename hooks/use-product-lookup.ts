import { getProductByBarcode } from "@/services/api";
import { ScanEntry } from "@/types/scan-history";
import { useRef, useState } from "react";

type Params = {
  serverCode: string;
  firmCode: string;
  connectionMode: "firm" | "server";
  initiateSuccessUX: () => Promise<void>;
  initiateErrorUX: () => Promise<void>;
};

const COOLDOWN_MS = 1200;

function getCodeFromScan(raw: string): string {
  const s = (raw || "").trim();
  if (s.startsWith("http://") || s.startsWith("https://")) {
    const last = s.split("/").filter(Boolean).pop();
    return (last || s).trim();
  }
  if (s.startsWith("{") && s.endsWith("}")) {
    try {
      const obj = JSON.parse(s);
      const code = obj?.barcode || obj?.code || obj?.data;
      if (typeof code === "string") return code.trim();
    } catch {}
  }
  return s;
}

export function useProductLookup({
  serverCode,
  firmCode,
  connectionMode,
  initiateSuccessUX,
  initiateErrorUX,
}: Params) {
  const [barcode, setBarcode] = useState("");
  const [productLoading, setProductLoading] = useState(false);
  const [productName, setProductName] = useState<string | null | undefined>();
  const [price, setPrice] = useState<string | null>();
  const [currency, setCurrency] = useState<string | null>();
  const [discountedPrice, setDiscountedPrice] = useState<string | null>(null);
  const [discountActive, setDiscountActive] = useState(false);
  const [discountEndsAt, setDiscountEndsAt] = useState<string | null>(null);
  const [discountDetail, setDiscountDetail] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanEntry[]>([]);

  const nextIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const lastCodeRef = useRef("");
  const lastAtRef = useRef(0);

  // Keep refs in sync so the scanner callback never sees stale values.
  const connectionModeRef = useRef(connectionMode);
  const serverCodeRef = useRef(serverCode);
  const firmCodeRef = useRef(firmCode);
  connectionModeRef.current = connectionMode;
  serverCodeRef.current = serverCode;
  firmCodeRef.current = firmCode;

  const appendHistory = (scan: Omit<ScanEntry, "id">) => {
    setScanHistory((prev) => [{ ...scan, id: nextIdRef.current++ }, ...prev]);
  };

  const onScan = async ({ data }: { data: string }) => {
    const code = getCodeFromScan(data);
    const now = Date.now();

    if (code === lastCodeRef.current && now - lastAtRef.current < COOLDOWN_MS) return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    lastCodeRef.current = code;
    lastAtRef.current = now;
    setBarcode(code);

    try {
      setProductLoading(true);
      const activeCode =
        connectionModeRef.current === "firm"
          ? { firmCode: firmCodeRef.current }
          : { serverCode: serverCodeRef.current };

      const response = await getProductByBarcode({ ...activeCode, barcode: code });

      if (!response?.product) {
        await initiateErrorUX();
        setProductName(null);
        setPrice(null);
        setCurrency(null);
        setDiscountedPrice(null);
        setDiscountActive(false);
        setDiscountEndsAt(null);
        setDiscountDetail(null);
        appendHistory({ barcode: code, productName: null, price: null, currency: null });
        return;
      }

      setProductName(response.product.name);
      setPrice(response.product.price);
      setCurrency(response.product.currency);
      setDiscountedPrice(response.product.discountedPrice);
      setDiscountActive(response.product.discountActive);
      setDiscountEndsAt(response.product.discountEndsAt);
      setDiscountDetail(response.product.discountDetail);
      appendHistory({
        barcode: code,
        productName: response.product.name,
        price: response.product.price,
        currency: response.product.currency,
        discountedPrice: response.product.discountedPrice,
        discountActive: response.product.discountActive,
      });
      await initiateSuccessUX();
    } catch {
      setDiscountedPrice(null);
      setDiscountActive(false);
      setDiscountEndsAt(null);
      setDiscountDetail(null);
      appendHistory({ barcode: code, productName: null, price: null, currency: null });
      await initiateErrorUX();
    } finally {
      setTimeout(() => { inFlightRef.current = false; }, COOLDOWN_MS);
      setProductLoading(false);
    }
  };

  const demoScan = async () => {
    const demoDiscountEndsAt = new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000,
    ).toISOString();

    setBarcode("5555555555555");
    await initiateSuccessUX();
    setProductName("İnşaat Demiri (8mm)");
    setPrice("12000");
    setCurrency("TL");
    setDiscountedPrice("9600");
    setDiscountActive(true);
    setDiscountEndsAt(demoDiscountEndsAt);
    setDiscountDetail("Demo Kampanya: %20 İndirim");
    appendHistory({
      barcode: "5555555555555",
      productName: "İnşaat Demiri (8mm)",
      price: "12000",
      currency: "TL",
      discountedPrice: "9600",
      discountActive: true,
      demo: true,
    });
  };

  return {
    barcode,
    setBarcode,
    productLoading,
    discountedPrice,
    discountActive,
    discountEndsAt,
    discountDetail,
    productName,
    price,
    currency,
    scanHistory,
    setScanHistory,
    onScan,
    demoScan,
  };
}
