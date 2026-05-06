import QRCode from "qrcode";

export async function generateQRDataURL(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 200,
    margin: 1,
    color: { dark: "#0c1525", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}
