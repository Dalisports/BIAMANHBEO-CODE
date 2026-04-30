import React from "react";
import { Order, OrderItem } from "@/hooks/use-orders";
import { formatCurrencyFull } from "@/lib/utils";
import { exportReceiptAsPDF } from "@/lib/exportReceipt";

interface ReceiptProps {
  order: Order;
}

export function Receipt({ order }: ReceiptProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const paymentMethodText = (method: string | null) => {
    switch (method) {
      case "cash": return "TIỀN MẶT";
      case "transfer": return "CHUYỂN KHOẢN";
      case "vnpay": return "VNPAY";
      case "momo": return "MOMO";
      default: return "KHÁC";
    }
  };

  const handleExportPDF = async () => {
    try {
      await exportReceiptAsPDF();
    } catch (error) {
      alert("Lỗi xuất PDF: " + (error as Error).message);
    }
  };

  return (
    <div className="receipt-container">
      <div id="receipt-content" className="receipt-preview">
        {/* Header */}
        <div className="receipt-header">
          <h2 className="receipt-title">BIA MẠNH BÉO</h2>
          <p className="receipt-address">Số 582 - Đ.Trần Lãm - P.Trần Lãm</p>
          <p className="receipt-address">T.Hưng Yên (Thái Bình)</p>
          <p className="receipt-phone">📞 0962-86-1357</p>
          <div className="receipt-divider">================================</div>
        </div>

        {/* Order Info */}
        <div className="receipt-info">
          <div className="receipt-row">
            <span>Mã đơn:</span>
            <span>#{order.id}</span>
          </div>
          <div className="receipt-row">
            <span>Bàn:</span>
            <span>{order.tableNumber}</span>
          </div>
          <div className="receipt-row">
            <span>Ngày:</span>
            <span>{formatDate(order.paidAt || order.createdAt)}</span>
          </div>
          <div className="receipt-divider">--------------------------------</div>
        </div>

        {/* Items Table */}
        <div className="receipt-items">
          <div className="receipt-items-header">
            <span className="col-stt">STT</span>
            <span className="col-name">Tên món</span>
            <span className="col-qty">SL</span>
            <span className="col-price">Đơn giá</span>
            <span className="col-total">Thành tiền</span>
          </div>
          {order.items.map((item: OrderItem, index: number) => (
            <div key={index} className="receipt-item">
              <span className="col-stt">{index + 1}</span>
              <span className="col-name">{item.name}</span>
              <span className="col-qty">{item.quantity}</span>
              <span className="col-price">{formatCurrencyFull(item.price)}</span>
              <span className="col-total">{formatCurrencyFull(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="receipt-divider">--------------------------------</div>
        </div>

        {/* Total */}
        <div className="receipt-total">
          <div className="receipt-row total-row">
            <span className="total-label">TỔNG CỘNG:</span>
            <span className="total-amount">{formatCurrencyFull(order.totalAmount)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="receipt-payment">
          <div className="receipt-divider">--------------------------------</div>
          <div className="receipt-row">
            <span>Phương thức:</span>
            <span className="payment-method">{paymentMethodText(order.paymentMethod)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="receipt-footer">
          <div className="receipt-divider">================================</div>
          <p className="thank-you">CẢM ƠN QUÝ KHÁCH!</p>
          <p className="receipt-note">Hẹn gặp lại quý khách</p>
        </div>
      </div>

      {/* Export Button */}
      <div className="receipt-export-btn">
        <button
          onClick={handleExportPDF}
          className="export-pdf-btn"
        >
          📄 XUẤT HÓA ĐƠN PDF
        </button>
      </div>
    </div>
  );
}
