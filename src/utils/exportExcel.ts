import { BajaItem } from '../types';

/**
 * CSV Export Utility for Cafetería CGAO SENA.
 *
 * Los datos de inventario se exportan como CSV para evitar depender de parsers
 * XLSX con vulnerabilidades conocidas. El formato se abre directamente en Excel.
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
  agotado?: boolean;
}

// Etiquetas de categoría legibles al exportar (formato compatible con la app Flask SENA)
const CATEGORY_LABELS: Record<string, string> = {
  comida_rapida: 'Comida Rápida',
  bebidas_frias: 'Bebidas',
  cafe_calientes: 'Café & Calientes',
  combos_sena: 'Combos',
  reposteria: 'Postres',
  otros: 'Paquetes',
};

/**
 * Exports a CSV file containing:
 * - Sheet 1: "Inventario Activo" (format compatible with the reference Flask app:
 *   headers Nombre, Precio ($), Costo ($), Stock, Stock Mínimo, Categoría, Subcategoría,
 *   Descripción, Activo + ID, so the file can be re-imported by either system)
 * - Sheet 2: "Bajas y Mermas" (Fecha, Producto, Cantidad, Costo Unitario, Total, Motivo, Responsable)
 */
export function exportInventoryReport(items: ExportInventoryItem[], bajas: BajaItem[] = []) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Inventario_y_Bajas_CGAO_Velez_${timestamp}.csv`;

    // Sheet 1: Inventario Activo
    const inventoryHeaders = [
      'ID',
      'Nombre',
      'Precio ($)',
      'Costo ($)',
      'Stock',
      'Stock Mínimo',
      'Categoría',
      'Subcategoría',
      'Descripción',
      'Activo',
    ];

    const totalValorPrecio = items.reduce((acc, it) => acc + it.precio * it.stock, 0);
    const totalValorCosto = items.reduce((acc, it) => acc + it.costo * it.stock, 0);

    const inventoryData = [
      ['INVENTARIO GENERAL - CAFETERÍA CENTRO CGAO VÉLEZ - REGIONAL SANTANDER 2026'],
      [`Fecha de corte: ${new Date().toLocaleString('es-CO')}`],
      [],
      inventoryHeaders,
      ...items.map((item) => [
        item.id,
        item.nombre,
        item.precio,
        item.costo,
        item.stock,
        item.alertaStock,
        CATEGORY_LABELS[item.categoria] || item.categoria,
        item.subcategoria || 'General',
        item.descripcion || '',
        item.stock > 0 && !item.agotado ? 'Sí' : 'No',
      ]),
      [],
      ['TOTAL', '', totalValorPrecio, totalValorCosto, '', '', '', '', '', ''],
    ];

    // Sheet 2: Bajas y Mermas
    const bajasHeaders = [
      'ID Baja',
      'Fecha',
      'Hora',
      'Producto',
      'Cantidad',
      'Costo Unitario',
      'Total',
      'Motivo',
      'Categoría',
      'Responsable',
    ];

    const totalUnidadesBaja = bajas.reduce((acc, b) => acc + b.cantidad, 0);

    const bajasData = [
      ['REGISTRO DE BAJAS Y MERMAS DE INSUMOS - CGAO VÉLEZ 2026'],
      [`Fecha de generación: ${new Date().toLocaleString('es-CO')}`],
      [],
      bajasHeaders,
      ...bajas.map((b) => [
        b.id,
        b.fecha,
        b.hora,
        b.productoNombre,
        b.cantidad,
        b.costoUnitario,
        b.costoTotal,
        b.motivo,
        b.categoria,
        b.responsable,
      ]),
      [],
      ['TOTAL UNIDADES DE BAJA', '', '', '', totalUnidadesBaja, '', '', '', '', ''],
    ];

    const combinedRows = [
      ['=== HOJA 1: INVENTARIO GENERAL ACTIVO ==='],
      ...inventoryData,
      [],
      ['=== HOJA 2: REGISTRO DE BAJAS Y MERMAS ==='],
      ...bajasData,
    ];
    downloadCSV(filename, combinedRows);
}
