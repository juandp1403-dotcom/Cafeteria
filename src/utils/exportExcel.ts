import * as XLSX from 'xlsx';
import { BajaItem } from '../types';

/**
 * Excel / CSV Export Utility for Cafetería CGAO SENA
 * Uses SheetJS (XLSX) to produce native multi-sheet .xlsx files and CSV fallback
 */

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const processCell = (cell: string | number) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = '\uFEFF' + rows.map((row) => row.map(processCell).join(';')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ExportSalesItem {
  id: string;
  numeroTurno: string;
  fecha: string;
  hora: string;
  clienteNombre: string;
  documento: string;
  ficha: string;
  programa: string;
  metodoPago: string;
  itemsDescripcion: string;
  total: number;
  estado: string;
}

export function exportSalesReport(title: string, data: ExportSalesItem[], period: 'dia' | 'semana_laboral' | 'mes') {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Ventas_CGAO_${period}_${timestamp}.csv`;

  const headers = [
    'ID Venta / Turno',
    'Fecha',
    'Hora',
    'Nombre del Cliente',
    'Documento',
    'Ficha SENA',
    'Programa Formación',
    'Método de Pago',
    'Detalle de Productos',
    'Total Venta (COP)',
    'Estado Transacción',
    'Sede Regional',
  ];

  const rows = [
    [`REPORTE DE VENTAS - CAFETERÍA CENTRO CGAO VÉLEZ - REGIONAL SANTANDER 2026`],
    [`Filtro: ${title}`],
    [`Generado el: ${new Date().toLocaleString('es-CO')}`],
    [],
    headers,
    ...data.map((item) => [
      item.numeroTurno,
      item.fecha,
      item.hora,
      item.clienteNombre,
      item.documento,
      item.ficha,
      item.programa,
      item.metodoPago,
      item.itemsDescripcion,
      item.total,
      item.estado,
      'Centro CGAO Vélez - Regional Santander',
    ]),
  ];

  downloadCSV(filename, rows);
}

export interface ExportInventoryItem {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  subcategoria: string;
  costo: number;
  precio: number;
  stock: number;
  alertaStock: number;
  calorias: number;
  tag: string;
}

/**
 * Exports a multi-sheet Excel (.xlsx) file containing:
 * - Sheet 1: "Inventario Activo" (full catalogue, prices, costs, margins, current stock, alerts)
 * - Sheet 2: "Bajas y Mermas" (all waste and loss registrations, reasons, financial impact, responsible staff)
 */
export function exportInventoryReport(items: ExportInventoryItem[], bajas: BajaItem[] = []) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Inventario_y_Bajas_CGAO_Velez_${timestamp}.xlsx`;

  try {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Inventario Activo
    const inventoryData = [
      ['INVENTARIO GENERAL - CAFETERÍA CENTRO CGAO VÉLEZ - REGIONAL SANTANDER 2026'],
      [`Fecha de corte: ${new Date().toLocaleString('es-CO')}`],
      [],
      [
        'Código ID',
        'Nombre del Producto',
        'Descripción',
        'Categoría',
        'Subcategoría',
        'Costo Unitario (COP)',
        'Precio de Venta (COP)',
        'Margen Ganancia (%)',
        'Stock Actual',
        'Alerta Mínima Stock',
        'Estado de Existencias',
        'Calorías (kcal)',
        'Etiqueta',
      ],
      ...items.map((item) => {
        const margin = item.precio > 0 ? (((item.precio - item.costo) / item.precio) * 100).toFixed(1) + '%' : '0%';
        const status = item.stock === 0 ? 'AGOTADO' : item.stock <= item.alertaStock ? 'ALERTA AMARILLA' : 'ÓPTIMO';

        return [
          item.id,
          item.nombre,
          item.descripcion,
          item.categoria,
          item.subcategoria || 'General',
          item.costo,
          item.precio,
          margin,
          item.stock,
          item.alertaStock,
          status,
          item.calorias,
          item.tag,
        ];
      }),
    ];

    const wsInventory = XLSX.utils.aoa_to_sheet(inventoryData);

    // Auto-fit columns
    wsInventory['!cols'] = [
      { wch: 14 }, // ID
      { wch: 28 }, // Nombre
      { wch: 35 }, // Descripción
      { wch: 18 }, // Categoría
      { wch: 20 }, // Subcategoría
      { wch: 16 }, // Costo
      { wch: 16 }, // Precio
      { wch: 14 }, // Margen
      { wch: 12 }, // Stock
      { wch: 16 }, // Alerta
      { wch: 16 }, // Estado
      { wch: 12 }, // Calorías
      { wch: 18 }, // Tag
    ];

    XLSX.utils.book_append_sheet(wb, wsInventory, 'Inventario Activo');

    // Sheet 2: Bajas y Mermas
    const bajasData = [
      ['REGISTRO DE BAJAS Y MERMAS DE INSUMOS - CGAO VÉLEZ 2026'],
      [`Fecha de generación: ${new Date().toLocaleString('es-CO')}`],
      [],
      [
        'ID Baja',
        'Fecha',
        'Hora',
        'Semana',
        'Producto Afectado',
        'Cantidad Descargada (u)',
        'Costo Unitario (COP)',
        'Pérdida Económica (COP)',
        'Motivo de la Baja',
        'Responsable (Personal)',
        'Observaciones Técnicas',
      ],
      ...bajas.map((b) => [
        b.id,
        b.fecha,
        b.hora,
        b.semana,
        b.productoNombre,
        b.cantidad,
        b.costoUnitario,
        b.costoTotal,
        b.motivo,
        b.responsable,
        b.observaciones || 'Sin observaciones adicionales.',
      ]),
    ];

    const wsBajas = XLSX.utils.aoa_to_sheet(bajasData);
    wsBajas['!cols'] = [
      { wch: 12 }, // ID
      { wch: 12 }, // Fecha
      { wch: 10 }, // Hora
      { wch: 24 }, // Semana
      { wch: 26 }, // Producto
      { wch: 16 }, // Cantidad
      { wch: 16 }, // Costo Unitario
      { wch: 18 }, // Pérdida Total
      { wch: 35 }, // Motivo
      { wch: 24 }, // Responsable
      { wch: 45 }, // Observaciones
    ];

    XLSX.utils.book_append_sheet(wb, wsBajas, 'Bajas y Mermas');

    // Download native multi-sheet Excel file
    XLSX.writeFile(wb, filename);
  } catch (err) {
    console.error('Error generating multi-sheet Excel workbook:', err);
    // Fallback to CSV with both sections
    const combinedRows = [
      ['=== HOJA 1: INVENTARIO GENERAL ACTIVO ==='],
      ...items.map((item) => [item.id, item.nombre, item.categoria, item.costo, item.precio, item.stock]),
      [],
      ['=== HOJA 2: REGISTRO DE BAJAS Y MERMAS ==='],
      ...bajas.map((b) => [b.id, b.fecha, b.productoNombre, b.cantidad, b.costoTotal, b.motivo, b.responsable]),
    ];
    downloadCSV(`Inventario_CGAO_${timestamp}.csv`, combinedRows);
  }
}
