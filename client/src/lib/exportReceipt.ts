import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function exportReceiptAsPDF(): Promise<void> {
  const receiptElement = document.getElementById("receipt-content");
  if (!receiptElement) {
    throw new Error("Không tìm thấy nội dung hóa đơn");
  }

  try {
    const canvas = await html2canvas(receiptElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: 302,
      windowWidth: 302,
    });

    const imgData = canvas.toDataURL("image/png");
    
    // Calculate PDF height based on content
    const pdfWidth = 80; // 80mm
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, imgHeight + 10], // Dynamic height based on content
    });

    pdf.addImage(imgData, "PNG", 0, 5, pdfWidth, imgHeight);
    pdf.save(`HoaDon_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.pdf`);
  } catch (error) {
    console.error("Lỗi xuất PDF:", error);
    throw error;
  }
}
