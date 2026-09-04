import type ExcelJSNamespace from 'exceljs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Product } from '../types/product';
import { HttpError } from '../utils/http-error';

export const TEMPLATE_PATH = path.resolve(process.cwd(), 'templates/Exportacao de Produtos Linx - Template.xlsx');
const PRODUCT_SHEET = 'PRODUTOS';

/**
 * O template tem ~4,8 MB. Lê-lo do disco (ou do compartilhamento de rede) a
 * cada export/download é caro, então o conteúdo fica em memória após o
 * primeiro acesso.
 */
let templateBytes: Promise<Buffer> | undefined;
export function readTemplateBytes(): Promise<Buffer> {
  templateBytes ??= fs.readFile(TEMPLATE_PATH).catch((error) => {
    templateBytes = undefined;
    throw new HttpError(500, `Template do Linx não encontrado em ${TEMPLATE_PATH}.`, { cause: String(error) });
  });
  return templateBytes;
}

/**
 * O exceljs sozinho carrega ~460 arquivos. Como só os endpoints de
 * export/import precisam dele, o import fica fora do caminho de boot.
 */
let excelJsPromise: Promise<typeof ExcelJSNamespace> | undefined;
async function loadExcelJs(): Promise<typeof ExcelJSNamespace> {
  excelJsPromise ??= import('exceljs').then((mod) => mod.default ?? (mod as unknown as typeof ExcelJSNamespace));
  return excelJsPromise;
}

const columns = [
  'ID do Produto','ID de Integração Produto','Nome do Produto','Código Referência Produto','Definição','Marca',
  'Categoria Principal','Categoria','Forcar skus para indisponibilidade?','Disponível a partir de','Disponível até',
  'Exibir no site?','Exibir a partir de','Exibir até','Usar esse produto como brinde?','Pode ser pesquisado?',
  'Exibir preço na loja?','Exibir disponibilidade?','Exibir estoque no site?','Flag','Frete Grátis?','Regiões de Frete Grátis',
  'Frete Grátis Marketplace?','Venda sob-consulta?','Política de Compra','Tags','Imagens','Títulos das imagens',
  'Descrição Curta','Descrição Longa','Título da página','URL Amigável','Meta description','Meta Keywords',
  'Termos para pesquisa','Formulário de Compra','Termo de Aceite','Descrição de Garantia','Produto_Material',
  'Produto_garantia','Produto_lado','Produto_peso','Produto_largura','Produto_altura','Produto_comprimento',
  'Produto_cod_comercial','Produto_voltagem','Produto_aplicacao','Produto_veiculo_modelo','Produto_veic_compativeis',
  'ID do SKU','ID de Integração SKU','Nome do SKU','Código Referência SKU','Fornecedor','Código de barras (EAN)',
  'Estoque','Venda sem estoque','Limite de venda sem estoque','Dias para envio do SKU com estoque',
  'Dias para envio do SKU sem estoque','Indisponibilizar Sku ao atingir estoque mínimo','Estoque Mínimo',
  'Preço Base','Preço de custo','Taxa','Promoção?','Preço da promoção','Período da promoção de',
  'Período da promoção até','Virtual?','Peso','Largura','Altura','Profundidade','Condição do SKU',
  'Exibir condição no site?','Quantidade por embalagem','Unidade de medida','Programa de pontos?','Pontuação',
] as const;

type CellValue = ExcelJSNamespace.Cell['value'];

/**
 * Texto legível de uma célula, cobrindo rich text, hyperlink e fórmula.
 * Devolve '' para conteúdo que o exceljs não conseguiu interpretar — é isso que
 * permite detectar um cabeçalho ilegível em vez de comparar '[object Object]'.
 */
function cellText(value: CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();

  if (typeof value === 'object') {
    const candidate = value as { richText?: { text?: string }[]; text?: unknown; result?: unknown };
    if (Array.isArray(candidate.richText)) {
      return candidate.richText.map((part) => part.text ?? '').join('').trim();
    }
    if (typeof candidate.text === 'string') return candidate.text.trim();
    if (candidate.result !== undefined && candidate.result !== null) return String(candidate.result).trim();
  }
  return '';
}

/**
 * Mapeia cada coluna esperada para o índice (1-based) em que ela está na aba.
 *
 * O template oficial do Linx grava o cabeçalho como shared string com namespace
 * prefixado (<d:t>), formato que o exceljs não interpreta: as células da linha 1
 * chegam como objeto vazio. Quando todo o cabeçalho está ilegível assim,
 * assumimos o layout canônico posicional; se o cabeçalho é legível, ele manda.
 */
function resolveColumnIndexes(sheet: ExcelJSNamespace.Worksheet, context: string): Map<string, number> {
  const headers: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = cellText(cell.value);
  });

  const byName = new Map<string, number>();
  headers.forEach((header, index) => {
    if (header && !byName.has(header)) byName.set(header, index + 1);
  });

  const missing = columns.filter((column) => !byName.has(column));
  if (!missing.length) {
    return new Map(columns.map((column) => [column, byName.get(column)!]));
  }

  const readable = headers.filter(Boolean).length;
  const width = Math.max(sheet.columnCount, headers.length);
  if (readable === 0 && width >= columns.length) {
    return new Map(columns.map((column, index) => [column, index + 1]));
  }

  throw new HttpError(422, `${context} Colunas ausentes: ${missing.join(', ')}`, { missingColumns: missing });
}

/**
 * Monta a planilha do zero em vez de editar o template.
 *
 * O template oficial dispara três incompatibilidades do exceljs, todas
 * silenciosas: (1) o cabeçalho vem como shared string com namespace prefixado e
 * é lido como objeto vazio, (2) ao regravar, esse objeto vira o texto literal
 * "[object Object]" em todas as colunas do cabeçalho e (3) spliceRows não
 * remove linhas finais — `spliceRows(2, rowCount - 1)` não apagava nenhuma das
 * ~6.500 linhas de exemplo, que iam junto no arquivo exportado.
 *
 * Gerar o arquivo também deixa o export ordens de grandeza mais rápido: o
 * template tem 4,8 MB e ~24 MB de shared strings para interpretar.
 * O arquivo original continua disponível em GET /api/linx/template.
 */
export async function exportProducts(products: Product[]) {
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'linx-commerce-test-api';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(PRODUCT_SHEET, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = columns.map((column) => ({
    header: column,
    key: column,
    width: Math.min(Math.max(column.length + 2, 12), 45),
  }));

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } };
  header.alignment = { vertical: 'middle' };

  for (const product of products) {
    const values = productToLinxRow(product);
    sheet.addRow(columns.map((column) => values[column] ?? ''));
  }

  return workbook.xlsx.writeBuffer();
}

export async function importProducts(buffer: Buffer) {
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new HttpError(400, 'Não foi possível ler o arquivo. Envie um .xlsx válido.');
  }

  const sheet = workbook.getWorksheet(PRODUCT_SHEET);
  if (!sheet) throw new HttpError(422, `Aba ${PRODUCT_SHEET} não encontrada na planilha enviada.`);

  const indexes = resolveColumnIndexes(sheet, 'Planilha fora do layout do Linx.');

  const rows: Record<string, unknown>[] = [];
  const texts: Record<string, string>[] = [];
  const rowNumbers: number[] = [];
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    if (!row.hasValues) continue;
    const item: Record<string, unknown> = {};
    const text: Record<string, string> = {};
    for (const [column, index] of indexes) {
      const value = row.getCell(index).value;
      item[column] = value ?? '';
      text[column] = cellText(value);
    }
    rows.push(item);
    texts.push(text);
    rowNumbers.push(i);
  }

  return {
    sheet: PRODUCT_SHEET,
    rowsRead: rows.length,
    rows,
    validation: validateRows(texts, rowNumbers),
  };
}

function validateRows(rows: Record<string, string>[], rowNumbers: number[]) {
  const required = [
    'ID de Integração Produto','Nome do Produto','Código Referência Produto','Definição','Marca',
    'Categoria Principal','Categoria','Exibir no site?','Pode ser pesquisado?','Exibir preço na loja?',
    'Exibir disponibilidade?','Exibir estoque no site?','ID de Integração SKU','Nome do SKU',
    'Código Referência SKU','Estoque','Preço Base','Condição do SKU',
  ];

  const errors: { row: number; field: string; message: string }[] = [];
  rows.forEach((row, index) => {
    for (const field of required) {
      if ((row[field] ?? '').trim() === '') {
        // Linhas vazias no meio da planilha são puladas, então o número real da
        // linha vem de rowNumbers e não de index + 2.
        errors.push({ row: rowNumbers[index] ?? index + 2, field, message: 'Campo obrigatório não preenchido.' });
      }
    }
  });
  return { valid: errors.length === 0, errors };
}

function productToLinxRow(p: Product): Record<string, unknown> {
  const yesNo = (v: boolean) => (v ? 'Sim' : 'Não');
  return {
    'ID do Produto': '',
    'ID de Integração Produto': p.integrationProductId,
    'Nome do Produto': p.name,
    'Código Referência Produto': p.referenceCode,
    'Definição': p.definition,
    'Marca': p.brand,
    'Categoria Principal': p.mainCategory,
    'Categoria': p.category,
    'Forcar skus para indisponibilidade?': 'Não',
    'Disponível a partir de': '',
    'Disponível até': '',
    'Exibir no site?': yesNo(p.showOnSite),
    'Exibir a partir de': '',
    'Exibir até': '',
    'Usar esse produto como brinde?': 'Não',
    'Pode ser pesquisado?': yesNo(p.searchable),
    'Exibir preço na loja?': yesNo(p.showPrice),
    'Exibir disponibilidade?': yesNo(p.showAvailability),
    'Exibir estoque no site?': yesNo(p.showStock),
    'Flag': '',
    'Frete Grátis?': 'Não',
    'Regiões de Frete Grátis': '',
    'Frete Grátis Marketplace?': 'Não',
    'Venda sob-consulta?': 'Não',
    'Política de Compra': '',
    'Tags': 'teste-linx',
    'Imagens': '',
    'Títulos das imagens': '',
    'Descrição Curta': p.shortDescription,
    'Descrição Longa': p.longDescription,
    'Título da página': p.pageTitle,
    'URL Amigável': p.slug,
    'Meta description': p.metaDescription,
    'Meta Keywords': '',
    'Termos para pesquisa': p.searchTerms,
    'Formulário de Compra': '',
    'Termo de Aceite': '',
    'Descrição de Garantia': p.warranty,
    'Produto_Material': p.material,
    'Produto_garantia': p.warranty,
    'Produto_lado': p.side,
    'Produto_peso': formatDecimal(p.productWeight),
    'Produto_largura': formatDecimal(p.productWidth),
    'Produto_altura': formatDecimal(p.productHeight),
    'Produto_comprimento': formatDecimal(p.productLength),
    'Produto_cod_comercial': p.commercialCode,
    'Produto_voltagem': p.voltage,
    'Produto_aplicacao': p.application,
    'Produto_veiculo_modelo': p.vehicleModel,
    'Produto_veic_compativeis': p.compatibleVehicles,
    'ID do SKU': '',
    'ID de Integração SKU': p.sku.integrationId,
    'Nome do SKU': p.sku.name,
    'Código Referência SKU': p.sku.referenceCode,
    'Fornecedor': p.sku.supplier,
    'Código de barras (EAN)': p.sku.ean,
    'Estoque': String(p.sku.stock).replace('.', ','),
    'Venda sem estoque': yesNo(p.sku.sellWithoutStock),
    'Limite de venda sem estoque': formatDecimal(p.sku.maxBackorder),
    'Dias para envio do SKU com estoque': String(p.sku.shippingDaysWithStock),
    'Dias para envio do SKU sem estoque': String(p.sku.shippingDaysWithoutStock),
    'Indisponibilizar Sku ao atingir estoque mínimo': yesNo(p.sku.minimumStockEnabled),
    'Estoque Mínimo': formatDecimal(p.sku.minimumStock),
    'Preço Base': formatDecimal(p.sku.basePrice),
    'Preço de custo': formatDecimal(p.sku.costPrice),
    'Taxa': formatDecimal(p.sku.tax),
    'Promoção?': yesNo(p.sku.promotion),
    'Preço da promoção': p.sku.promotion ? formatDecimal(p.sku.promotionPrice) : '',
    'Período da promoção de': '',
    'Período da promoção até': '',
    'Virtual?': yesNo(p.sku.virtual),
    'Peso': formatDecimal(p.sku.weight),
    'Largura': formatDecimal(p.sku.width),
    'Altura': formatDecimal(p.sku.height),
    'Profundidade': formatDecimal(p.sku.depth),
    'Condição do SKU': p.sku.condition,
    'Exibir condição no site?': yesNo(p.sku.showCondition),
    'Quantidade por embalagem': String(p.sku.packageQuantity).replace('.', ','),
    'Unidade de medida': p.sku.unitOfMeasure,
    'Programa de pontos?': yesNo(p.sku.pointsProgram),
    'Pontuação': formatDecimal(p.sku.points),
  };
}

function formatDecimal(value: number) {
  return (Number.isFinite(value) ? value : 0).toFixed(2).replace('.', ',');
}
