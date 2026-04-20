const router = require('express').Router();
const ExcelJS = require('exceljs');
const Order = require('../models/Order');
const adminAuth = require('../middleware/auth');

// GET /api/export/orders – stream Excel file
router.get('/orders', adminAuth, async (req, res, next) => {
  try {
    const { status, date_from, date_to } = req.query;
    const query = {};

    if (status) query.status = status;
    if (date_from || date_to) {
      query.created_at = {};
      if (date_from) query.created_at.$gte = new Date(date_from);
      if (date_to) query.created_at.$lte = new Date(date_to + 'T23:59:59');
    }

    const orders = await Order.find(query).sort({ created_at: -1 }).lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Saravana & Co Admin';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Orders', {
      pageSetup: { fitToPage: true, orientation: 'landscape' }
    });

    sheet.columns = [
      { header: 'Order ID', key: 'id', width: 26 },
      { header: 'Customer Name', key: 'customer_name', width: 25 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Address', key: 'address', width: 35 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Pincode', key: 'pincode', width: 12 },
      { header: 'Products Ordered', key: 'products', width: 60 },
      { header: 'Total Amount (₹)', key: 'total_amount', width: 18 },
      { header: 'Payment Method', key: 'payment_method', width: 18 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Order Date', key: 'created_at', width: 22 },
    ];

    // Header row styling
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4870A' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });
    headerRow.height = 28;

    // Data rows
    orders.forEach((row, i) => {
      // Map embedded order items to the aggregated string expected by the Excel builder
      const products_ordered = row.items?.map(oi => 
        `${oi.product_name} (x${oi.quantity} @ ₹${oi.price})`
      ).join(' | ') || '';

      const dataRow = sheet.addRow({
        id: row._id.toString(),
        customer_name: row.customer_name,
        phone: row.phone,
        email: row.email,
        address: row.address,
        city: row.city,
        state: row.state,
        pincode: row.pincode,
        products: products_ordered,
        total_amount: parseFloat(row.total_amount),
        status: row.status,
        payment_method: row.payment_method,
        created_at: new Date(row.created_at).toLocaleString('en-IN'),
      });

      dataRow.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'hair' }, left: { style: 'hair' },
          bottom: { style: 'hair' }, right: { style: 'hair' }
        };
        if (i % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8E7' } };
        }
      });

      // Color status cell
      const statusCell = dataRow.getCell('status');
      const statusColors = {
        Delivered: 'FF16A34A', 'In Transit': 'FF2563EB',
        Processing: 'FFD97706', Pending: 'FF6B7280', Cancelled: 'FFDC2626'
      };
      if (statusColors[row.status]) {
        statusCell.font = { bold: true, color: { argb: statusColors[row.status] } };
      }
    });

    // Freeze header
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const filename = `Saravana_Orders_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
