// =====================================================
// PRESET ERP BLING - 54 COLUNAS PADRÃO
// =====================================================

import type { ColumnConfig } from '@/utils/dataProcessors';

// Colunas protegidas que NUNCA devem ser modificadas pela IA
const PROTECTED_COLUMNS = [
  'Preço', 'Preço de Venda', 'Preço Venda', 'Preço de Custo', 'Preco',
  'Estoque', 'Estoque Atual', 'Quantidade', 'Qtde', 'Qtd',
  'Custo', 'Custo Unitário', 'Custo Unit',
  'Valor', 'Valor Unitário',
  'Peso', 'Peso Bruto', 'Peso Líquido',
  'Largura', 'Altura', 'Profundidade', 'Comprimento',
  'Volumes', 'GTIN', 'EAN', 'ISBN', 'NCM',
  'Preço promocional', 'Preço custo',
];

// Colunas que devem ser analisadas pela IA
const ANALYZE_COLUMNS = [
  'Nome', 'Nome Produto', 'Descrição', 'Descrição Curta', 'Descrição Longa',
  'Descrição Completa', 'Descricao', 'Titulo', 'Título',
  'Categoria', 'Categoria do Produto', 'Subcategoria',
  'Marca', 'Fabricante',
  'Cor', 'Tamanho', 'Material', 'Modelo',
  'Palavras-chave', 'Tags', 'SEO', 'Meta Description',
  'Características', 'Especificações', 'Observações',
];

// Mapeamento completo das 54 colunas típicas do Bling
export const BLING_COLUMN_CONFIG: Record<string, ColumnConfig> = {
  // Identificadores - Ignorar
  'ID': { action: 'ignore', defaultValue: '', isProtected: true },
  'Código': { action: 'ignore', defaultValue: '', isProtected: true },
  'Código Produto': { action: 'ignore', defaultValue: '', isProtected: true },
  'SKU': { action: 'ignore', defaultValue: '', isProtected: true },
  'Código de Barras': { action: 'ignore', defaultValue: '', isProtected: true },
  'GTIN': { action: 'ignore', defaultValue: '', isProtected: true },
  'EAN': { action: 'ignore', defaultValue: '', isProtected: true },
  'NCM': { action: 'ignore', defaultValue: '', isProtected: true },
  'CEST': { action: 'ignore', defaultValue: '', isProtected: true },
  
  // Campos de texto para IA
  'Nome': { action: 'analyze', defaultValue: '', isProtected: false },
  'Nome Produto': { action: 'analyze', defaultValue: '', isProtected: false },
  'Título': { action: 'analyze', defaultValue: '', isProtected: false },
  'Descrição': { action: 'analyze', defaultValue: '', isProtected: false },
  'Descrição Curta': { action: 'analyze', defaultValue: '', isProtected: false },
  'Descrição Longa': { action: 'analyze', defaultValue: '', isProtected: false },
  'Descrição Completa': { action: 'analyze', defaultValue: '', isProtected: false },
  'Descrição do Produto': { action: 'analyze', defaultValue: '', isProtected: false },
  'Descrição complementar': { action: 'analyze', defaultValue: '', isProtected: false },
  
  // Classificação
  'Categoria': { action: 'analyze', defaultValue: '', isProtected: false },
  'Categoria do Produto': { action: 'analyze', defaultValue: '', isProtected: false },
  'Subcategoria': { action: 'analyze', defaultValue: '', isProtected: false },
  'Marca': { action: 'analyze', defaultValue: '', isProtected: false },
  'Fabricante': { action: 'analyze', defaultValue: '', isProtected: false },
  
  // Atributos
  'Cor': { action: 'analyze', defaultValue: '', isProtected: false },
  'Tamanho': { action: 'analyze', defaultValue: '', isProtected: false },
  'Material': { action: 'analyze', defaultValue: '', isProtected: false },
  'Modelo': { action: 'analyze', defaultValue: '', isProtected: false },
  'Tipo': { action: 'analyze', defaultValue: '', isProtected: false },
  'Características': { action: 'analyze', defaultValue: '', isProtected: false },
  'Especificações': { action: 'analyze', defaultValue: '', isProtected: false },
  
  // SEO
  'Palavras-chave': { action: 'analyze', defaultValue: '', isProtected: false },
  'Tags': { action: 'analyze', defaultValue: '', isProtected: false },
  'Meta Title': { action: 'analyze', defaultValue: '', isProtected: false },
  'Meta Description': { action: 'analyze', defaultValue: '', isProtected: false },
  'Grupo de Tags/Tags': { action: 'analyze', defaultValue: '', isProtected: false },
  
  // Preços - PROTEGIDOS
  'Preço': { action: 'ignore', defaultValue: '', isProtected: true },
  'Preço de Venda': { action: 'ignore', defaultValue: '', isProtected: true },
  'Preço Venda': { action: 'ignore', defaultValue: '', isProtected: true },
  'Preço de Custo': { action: 'ignore', defaultValue: '', isProtected: true },
  'Preço Custo': { action: 'ignore', defaultValue: '', isProtected: true },
  'Preço promocional': { action: 'ignore', defaultValue: '', isProtected: true },
  'Custo': { action: 'ignore', defaultValue: '', isProtected: true },
  'Valor': { action: 'ignore', defaultValue: '', isProtected: true },
  
  // Estoque - PROTEGIDOS
  'Estoque': { action: 'ignore', defaultValue: '', isProtected: true },
  'Estoque Atual': { action: 'ignore', defaultValue: '', isProtected: true },
  'Estoque mínimo': { action: 'ignore', defaultValue: '', isProtected: true },
  'Estoque máximo': { action: 'ignore', defaultValue: '', isProtected: true },
  'Quantidade': { action: 'ignore', defaultValue: '', isProtected: true },
  
  // Dimensões - PROTEGIDOS
  'Peso': { action: 'ignore', defaultValue: '', isProtected: true },
  'Peso Bruto': { action: 'ignore', defaultValue: '', isProtected: true },
  'Peso Líquido': { action: 'ignore', defaultValue: '', isProtected: true },
  'Largura': { action: 'ignore', defaultValue: '', isProtected: true },
  'Altura': { action: 'ignore', defaultValue: '', isProtected: true },
  'Profundidade': { action: 'ignore', defaultValue: '', isProtected: true },
  'Comprimento': { action: 'ignore', defaultValue: '', isProtected: true },
  'Unidade de Medida': { action: 'ignore', defaultValue: '', isProtected: true },
  
  // Imagens
  'URL Imagens Externas': { action: 'ignore', defaultValue: '', isProtected: false },
  'Imagem': { action: 'ignore', defaultValue: '', isProtected: false },
  'Imagens': { action: 'ignore', defaultValue: '', isProtected: false },
  
  // Status
  'Situação': { action: 'ignore', defaultValue: '', isProtected: false },
  'Status': { action: 'ignore', defaultValue: '', isProtected: false },
  'Ativo': { action: 'ignore', defaultValue: '', isProtected: false },
  
  // Observações
  'Observações': { action: 'analyze', defaultValue: '', isProtected: false },
  'Observação': { action: 'analyze', defaultValue: '', isProtected: false },
  'Obs': { action: 'analyze', defaultValue: '', isProtected: false },
};

// Abreviações comuns para produtos brasileiros
export const BLING_ABBREVIATIONS: Record<string, string> = {
  // Medidas
  'cm': 'centímetro',
  'kg': 'quilograma',
  'gr': 'grama',
  'ml': 'mililitro',
  'lt': 'litro',
  'mt': 'metro',
  'mm': 'milímetro',
  
  // Unidades
  'un': 'unidade',
  'und': 'unidade',
  'pc': 'peça',
  'pç': 'peça',
  'pçs': 'peças',
  'pcs': 'peças',
  'cx': 'caixa',
  'pct': 'pacote',
  'kit': 'kit',
  'jg': 'jogo',
  'par': 'par',
  'dz': 'dúzia',
  
  // Tamanhos (usando versões longas para evitar conflito)
  'tam': 'tamanho',
  'tam-p': 'tamanho pequeno',
  'tam-m': 'tamanho médio',
  'tam-g': 'tamanho grande',
  'tam-gg': 'tamanho extra grande',
  'tam-xg': 'tamanho extra grande',
  'tam-pp': 'tamanho extra pequeno',
  'med': 'médio',
  'peq': 'pequeno',
  'grd': 'grande',
  
  // Preposições
  'c/': 'com',
  's/': 'sem',
  'p/': 'para',
  
  // Outros
  'qnt': 'quantidade',
  'qtd': 'quantidade',
  'ref': 'referência',
  'mod': 'modelo',
  'cor': 'cor',
  'fab': 'fabricante',
  'orig': 'original',
  'imp': 'importado',
  'nac': 'nacional',
  'aut': 'autêntico',
  'gen': 'genérico',
  'univ': 'universal',
  'compat': 'compatível',
  'inox': 'aço inoxidável',
  'alum': 'alumínio',
  'mad': 'madeira',
  'plast': 'plástico',
  'borr': 'borracha',
  'tec': 'tecido',
  'sint': 'sintético',
  'nat': 'natural',
};

export interface PresetDefinition {
  id: string;
  name: string;
  description: string;
  columnConfig: Record<string, ColumnConfig>;
  abbreviations: Record<string, string>;
  isBuiltIn: boolean;
}

// Lista de presets pré-definidos
export const BUILTIN_PRESETS: PresetDefinition[] = [
  {
    id: 'bling-54',
    name: 'ERP BLING (54 colunas)',
    description: 'Configuração otimizada para planilhas exportadas do Bling com proteção de campos financeiros.',
    columnConfig: BLING_COLUMN_CONFIG,
    abbreviations: BLING_ABBREVIATIONS,
    isBuiltIn: true,
  },
];

// Função auxiliar para aplicar preset a colunas detectadas
export function applyPresetToColumns(
  detectedColumns: string[],
  preset: PresetDefinition
): Record<string, ColumnConfig> {
  const result: Record<string, ColumnConfig> = {};
  
  detectedColumns.forEach(col => {
    // Busca exata primeiro
    if (preset.columnConfig[col]) {
      result[col] = preset.columnConfig[col];
      return;
    }
    
    // Busca case-insensitive
    const lowerCol = col.toLowerCase().trim();
    const matchedKey = Object.keys(preset.columnConfig).find(
      k => k.toLowerCase().trim() === lowerCol
    );
    
    if (matchedKey) {
      result[col] = preset.columnConfig[matchedKey];
      return;
    }
    
    // Busca parcial (contém)
    const partialMatch = Object.keys(preset.columnConfig).find(k => 
      lowerCol.includes(k.toLowerCase()) || k.toLowerCase().includes(lowerCol)
    );
    
    if (partialMatch) {
      result[col] = preset.columnConfig[partialMatch];
      return;
    }
    
    // Verifica se é coluna protegida por padrão (preço, estoque, etc.)
    const isProtected = /preço|preco|price|valor|custo|cost|estoque|stock|quantidade|qtde?|peso|weight|largura|altura|profundidade|comprimento|gtin|ean|ncm|cest/i.test(col);
    
    result[col] = {
      action: isProtected ? 'ignore' : 'analyze',
      defaultValue: '',
      isProtected: isProtected,
    };
  });
  
  return result;
}
