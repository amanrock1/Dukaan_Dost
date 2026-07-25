import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { db } from './db';

const BUSINESS = {
  name: 'Inventory Copilot AI',
  address: 'Demo Business, Sector 21, Gurugram, Haryana 122016',
  gstin: '06AADCD1234F1ZP',
  phone: '+91 98765 43210',
  email: 'hello@inventorycopilot.ai',
};

export async function generateInvoice(saleId: string): Promise<{ success: boolean; pdfData?: string; message: string }> {
  try {
    const sale = await db.sale.findUnique({
      where: { id: saleId },
      include: { product: true, invoice: true },
    });

    if (!sale) return { success: false, message: 'Sale not found.' };
    if (sale.invoice) return { success: false, message: 'Invoice already generated for this sale.' };

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const width = page.getWidth();
    let y = 790;

    // Colors
    const darkGray = rgb(0.15, 0.15, 0.15);
    const medGray = rgb(0.4, 0.4, 0.4);
    const accent = rgb(0.1, 0.5, 0.3);
    const white = rgb(1, 1, 1);
    const lightBg = rgb(0.95, 0.97, 0.95);

    // Header bar
    page.drawRectangle({ x: 0, y: y - 5, width, height: 60, color: accent });
    page.drawText('TAX INVOICE', { x: 40, y: y + 25, size: 22, font: fontBold, color: white });
    page.drawText('GST Compliant', { x: 40, y: y + 7, size: 10, font, color: rgb(0.8, 1, 0.85) });

    y -= 45;
    page.drawText(BUSINESS.name, { x: 40, y, size: 16, font: fontBold, color: accent });
    y -= 14;
    page.drawText(BUSINESS.address, { x: 40, y, size: 9, font, color: medGray });
    y -= 12;
    const gstinText = 'GSTIN: ' + BUSINESS.gstin + '  Phone: ' + BUSINESS.phone;
    page.drawText(gstinText, { x: 40, y, size: 9, font, color: medGray });

    // Invoice details right side
    const invNumber = 'INV-' + Date.now().toString(36).toUpperCase();
    const invDate = sale.timestamp.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    page.drawText('Invoice #: ' + invNumber, { x: 350, y: y + 26, size: 11, font: fontBold, color: darkGray });
    page.drawText('Date: ' + invDate, { x: 350, y: y + 12, size: 10, font, color: medGray });

    y -= 30;
    page.drawRectangle({ x: 0, y: y - 100, width, height: 130, color: lightBg });
    y -= 10;
    page.drawText('BILL TO:', { x: 40, y, size: 9, font: fontBold, color: medGray });
    y -= 14;
    page.drawText('Customer (Walk-in)', { x: 40, y, size: 12, font: fontBold, color: darkGray });
    y -= 12;
    page.drawText('State: Haryana (06)', { x: 40, y, size: 9, font, color: medGray });
    y -= 12;
    page.drawText('Place of Supply: Haryana', { x: 40, y, size: 9, font, color: medGray });

    // Table header
    y -= 40;
    page.drawRectangle({ x: 30, y: y - 18, width: width - 60, height: 24, color: accent });
    page.drawText('#', { x: 40, y: y - 8, size: 10, font: fontBold, color: white });
    page.drawText('Item Description', { x: 65, y: y - 8, size: 10, font: fontBold, color: white });
    page.drawText('HSN', { x: 250, y: y - 8, size: 10, font: fontBold, color: white });
    page.drawText('Qty', { x: 320, y: y - 8, size: 10, font: fontBold, color: white });
    page.drawText('Rate', { x: 380, y: y - 8, size: 10, font: fontBold, color: white });
    page.drawText('Amount', { x: 450, y: y - 8, size: 10, font: fontBold, color: white });

    // Table row
    y -= 32;
    page.drawText('1', { x: 40, y, size: 10, font, color: darkGray });
    page.drawText(sale.product.name, { x: 65, y, size: 10, font, color: darkGray });
    page.drawText(getHSN(sale.product.category), { x: 250, y, size: 10, font, color: darkGray });
    page.drawText(String(sale.quantity), { x: 330, y, size: 10, font, color: darkGray });
    const rateText = 'Rs. ' + sale.unitPrice.toLocaleString('en-IN');
    page.drawText(rateText, { x: 370, y, size: 10, font, color: darkGray });
    const amtText = 'Rs. ' + sale.amount.toLocaleString('en-IN');
    page.drawText(amtText, { x: 440, y, size: 10, font, color: darkGray });

    // Totals section
    y -= 40;
    page.drawRectangle({ x: 320, y: y - 80, width: 240, height: 90, color: lightBg });
    const tx = 335;
    const taxableText = 'Taxable Amount: Rs. ' + sale.amount.toLocaleString('en-IN');
    page.drawText(taxableText, { x: tx, y, size: 10, font, color: darkGray });
    y -= 16;
    const cgstRate = (sale.product.gstRate / 2).toString();
    const cgstAmt = (sale.gstAmount / 2).toLocaleString('en-IN');
    page.drawText('CGST @ ' + cgstRate + '%: Rs. ' + cgstAmt, { x: tx, y, size: 10, font, color: darkGray });
    y -= 16;
    const sgstAmt = (sale.gstAmount / 2).toLocaleString('en-IN');
    page.drawText('SGST @ ' + cgstRate + '%: Rs. ' + sgstAmt, { x: tx, y, size: 10, font, color: darkGray });
    y -= 20;
    page.drawRectangle({ x: 320, y: y - 4, width: 240, height: 22, color: accent });
    const totalText = 'Total: Rs. ' + sale.totalAmount.toLocaleString('en-IN');
    page.drawText(totalText, { x: tx + 5, y, size: 13, font: fontBold, color: white });

    // Amount in words
    y -= 40;
    const wordsText = 'Amount in Words: ' + numberToWords(sale.totalAmount) + ' Rupees Only';
    page.drawText(wordsText, { x: 40, y, size: 9, font: fontBold, color: darkGray });

    // Footer
    y -= 50;
    page.drawRectangle({ x: 0, y: y - 20, width, height: 50, color: rgb(0.95, 0.95, 0.95) });
    page.drawText('Thank you for your business!', { x: 40, y: y + 10, size: 11, font: fontBold, color: accent });
    const footerText = 'Generated by Inventory Copilot AI - ' + BUSINESS.gstin;
    page.drawText(footerText, { x: 40, y: y - 5, size: 8, font, color: medGray });
    page.drawText('This is a computer-generated invoice.', { x: 350, y: y - 5, size: 8, font, color: medGray });

    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    // Save to DB
    await db.invoice.create({
      data: {
        saleId,
        invoiceNumber: invNumber,
        pdfData: pdfBase64,
      },
    });

    return { success: true, pdfData: pdfBase64, message: 'Invoice ' + invNumber + ' generated for ' + sale.product.name + '.' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: 'Invoice generation failed: ' + msg };
  }
}

function getHSN(category: string): string {
  const hsnMap: Record<string, string> = {
    Electronics: '8471',
    Stationery: '4820',
    Footwear: '6403',
    Pharmacy: '3004',
  };
  return hsnMap[category] || '9999';
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = convert(rupees);
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
  return result;
}
