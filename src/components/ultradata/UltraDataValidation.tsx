import { useState, useMemo } from 'react';
import { Check, AlertTriangle, Download, Filter, CheckCircle2, XCircle, FileText, FileDown, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { ProcessedProduct } from '@/pages/UltraData';

interface ExportOptions {
  includeOriginalColumns: boolean;
  includeEnrichedColumns: boolean;
  includeNcmDetails: boolean;
  includeStatusColumns: boolean;
  includeProcessingMetadata: boolean;
  onlyValidated: boolean;
  onlyNeedsReview: boolean;
}

interface UltraDataValidationProps {
  processedProducts: ProcessedProduct[];
  columns: string[];
  onValidationChange: (products: ProcessedProduct[]) => void;
}

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeOriginalColumns: true,
  includeEnrichedColumns: true,
  includeNcmDetails: true,
  includeStatusColumns: true,
  includeProcessingMetadata: false,
  onlyValidated: false,
  onlyNeedsReview: false,
};

const UltraDataValidation = ({
  processedProducts,
  columns,
  onValidationChange,
}: UltraDataValidationProps) => {
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'review' | 'validated'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [exportOptions, setExportOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);

  const filteredProducts = useMemo(() => {
    return processedProducts.filter(p => {
      if (filter === 'review') return p.necessita_revisao && !p.validado;
      if (filter === 'validated') return p.validado;
      return true;
    });
  }, [processedProducts, filter]);

  const stats = useMemo(() => ({
    total: processedProducts.length,
    validated: processedProducts.filter(p => p.validado).length,
    needsReview: processedProducts.filter(p => p.necessita_revisao && !p.validado).length,
  }), [processedProducts]);

  const toggleProduct = (index: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    const indices = filteredProducts.map((_, i) => 
      processedProducts.indexOf(filteredProducts[i])
    );
    setSelectedIds(new Set(indices));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const validateSelected = () => {
    const updated = processedProducts.map((p, i) => ({
      ...p,
      validado: selectedIds.has(i) ? true : p.validado,
    }));
    onValidationChange(updated);
    setSelectedIds(new Set());
    toast({
      title: "Produtos validados",
      description: `${selectedIds.size} produtos foram marcados como validados.`,
    });
  };

  const invalidateSelected = () => {
    const updated = processedProducts.map((p, i) => ({
      ...p,
      validado: selectedIds.has(i) ? false : p.validado,
    }));
    onValidationChange(updated);
    setSelectedIds(new Set());
  };

  const buildExportData = (products: ProcessedProduct[], options: ExportOptions) => {
    return products.map((p, index) => {
      const row: Record<string, unknown> = {};
      
      // Original columns
      if (options.includeOriginalColumns) {
        Object.entries(p.original).forEach(([key, value]) => {
          row[key] = value;
        });
      }
      
      // Enriched columns
      if (options.includeEnrichedColumns) {
        if (p.enriched.nome_padronizado) row['Nome Padronizado (IA)'] = p.enriched.nome_padronizado;
        if (p.enriched.descricao_enriquecida) row['Descrição Enriquecida (IA)'] = p.enriched.descricao_enriquecida;
        if (p.enriched.categoria_inferida) row['Categoria Inferida (IA)'] = p.enriched.categoria_inferida;
        if (p.enriched.marca_inferida) row['Marca Inferida (IA)'] = p.enriched.marca_inferida;
        if (p.enriched.origem_inferida) row['Origem Inferida (IA)'] = p.enriched.origem_inferida;
      }
      
      // NCM Details
      if (options.includeNcmDetails && p.enriched.ncm_sugerido?.codigo) {
        row['NCM Sugerido (IA)'] = p.enriched.ncm_sugerido.codigo;
        row['NCM Descrição'] = p.enriched.ncm_sugerido.descricao;
        row['NCM Confiança'] = p.enriched.ncm_sugerido.confianca;
        row['NCM Observação'] = p.enriched.ncm_sugerido.observacao;
      }
      
      // Status columns
      if (options.includeStatusColumns) {
        row['Validado'] = p.validado ? 'Sim' : 'Não';
        row['Necessita Revisão'] = p.necessita_revisao ? 'Sim' : 'Não';
        if (p.razao_revisao) row['Razão Revisão'] = p.razao_revisao;
      }
      
      // Processing metadata
      if (options.includeProcessingMetadata) {
        row['Índice Original'] = index + 1;
        if (p.tempo_processamento_ms) row['Tempo Processamento (ms)'] = p.tempo_processamento_ms;
      }
      
      return row;
    });
  };

  const exportToExcel = (exportType: 'all' | 'validated' | 'review' | 'selected') => {
    let productsToExport: ProcessedProduct[] = [];
    let filenamePrefix = 'ultradata';
    
    switch (exportType) {
      case 'validated':
        productsToExport = processedProducts.filter(p => p.validado);
        filenamePrefix = 'ultradata_validados';
        break;
      case 'review':
        productsToExport = processedProducts.filter(p => p.necessita_revisao && !p.validado);
        filenamePrefix = 'ultradata_revisar';
        break;
      case 'selected':
        productsToExport = processedProducts.filter((_, i) => selectedIds.has(i));
        filenamePrefix = 'ultradata_selecionados';
        break;
      default:
        productsToExport = processedProducts;
        filenamePrefix = 'ultradata_completo';
    }

    if (productsToExport.length === 0) {
      toast({
        title: "Nenhum produto para exportar",
        description: "Selecione produtos ou ajuste os filtros.",
        variant: "destructive",
      });
      return;
    }

    const enrichedData = buildExportData(productsToExport, exportOptions);

    const ws = XLSX.utils.json_to_sheet(enrichedData);
    
    // Auto-size columns
    const colWidths = Object.keys(enrichedData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    ws['!cols'] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos Enriquecidos');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const timestamp = new Date().toISOString().slice(0, 10);
    saveAs(blob, `${filenamePrefix}_${timestamp}.xlsx`);

    toast({
      title: "Exportação concluída!",
      description: `${productsToExport.length} produtos exportados com sucesso.`,
    });
  };

  const getProductDisplayName = (product: ProcessedProduct, index: number): string => {
    return (
      product.enriched.nome_padronizado ||
      product.original['nome']?.toString() ||
      product.original['Nome']?.toString() ||
      product.original['NOME']?.toString() ||
      product.original['descricao']?.toString()?.substring(0, 50) ||
      `Produto ${index + 1}`
    );
  };

  const getNcmBadgeVariant = (confianca: string | undefined) => {
    if (confianca === 'alta') return 'default';
    if (confianca === 'media') return 'secondary';
    return 'outline';
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Validação & Exportação</h2>
          <p className="text-muted-foreground">
            Revise os resultados lado a lado e exporte os dados enriquecidos.
          </p>
        </div>

        {/* Stats & Actions */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-sm py-1 px-3">
              {stats.total} total
            </Badge>
            <Badge variant="default" className="text-sm py-1 px-3">
              {stats.validated} validados
            </Badge>
            {stats.needsReview > 0 && (
              <Badge variant="destructive" className="text-sm py-1 px-3">
                {stats.needsReview} pendentes
              </Badge>
            )}
          </div>

          <div className="flex-1" />

          {/* Export Options & Button */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Opções de Exportação</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="includeOriginal" className="text-sm">Colunas originais</Label>
                      <Switch 
                        id="includeOriginal"
                        checked={exportOptions.includeOriginalColumns}
                        onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeOriginalColumns: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="includeEnriched" className="text-sm">Colunas enriquecidas (IA)</Label>
                      <Switch 
                        id="includeEnriched"
                        checked={exportOptions.includeEnrichedColumns}
                        onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeEnrichedColumns: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="includeNcm" className="text-sm">Detalhes NCM</Label>
                      <Switch 
                        id="includeNcm"
                        checked={exportOptions.includeNcmDetails}
                        onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeNcmDetails: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="includeStatus" className="text-sm">Colunas de status</Label>
                      <Switch 
                        id="includeStatus"
                        checked={exportOptions.includeStatusColumns}
                        onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeStatusColumns: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="includeMetadata" className="text-sm">Metadados de processamento</Label>
                      <Switch 
                        id="includeMetadata"
                        checked={exportOptions.includeProcessingMetadata}
                        onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeProcessingMetadata: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                  <FileDown className="h-4 w-4 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="end">
                <div className="space-y-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start" 
                    onClick={() => exportToExcel('all')}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Todos ({stats.total})
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-success" 
                    onClick={() => exportToExcel('validated')}
                    disabled={stats.validated === 0}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Apenas validados ({stats.validated})
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-warning" 
                    onClick={() => exportToExcel('review')}
                    disabled={stats.needsReview === 0}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Pendentes revisão ({stats.needsReview})
                  </Button>
                  {selectedIds.size > 0 && (
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-primary" 
                      onClick={() => exportToExcel('selected')}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Selecionados ({selectedIds.size})
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'review' | 'validated')}>
          <TabsList>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Todos ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Revisão ({stats.needsReview})
            </TabsTrigger>
            <TabsTrigger value="validated" className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Validados ({stats.validated})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-3 py-2 px-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selecionados
          </span>
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Selecionar todos
          </Button>
          <Button variant="ghost" size="sm" onClick={selectNone}>
            Limpar
          </Button>
          <div className="flex-1" />
          {selectedIds.size > 0 && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={validateSelected}
                className="text-success border-success/50"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Validar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={invalidateSelected}
                className="text-destructive border-destructive/50"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Invalidar
              </Button>
            </>
          )}
        </div>

        {/* Product List with Side-by-Side View */}
        <ScrollArea className="h-[500px] border rounded-lg">
          <div className="divide-y">
            {filteredProducts.map((product, idx) => {
              const globalIndex = processedProducts.indexOf(product);
              const isSelected = selectedIds.has(globalIndex);
              const ncm = product.enriched.ncm_sugerido;

              return (
                <div 
                  key={globalIndex}
                  className={`p-4 transition-colors ${
                    isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleProduct(globalIndex)}
                      className="mt-1"
                    />

                    {/* Content */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Original */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">Original</Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          <p className="font-medium text-foreground">
                            {getProductDisplayName(product, globalIndex)}
                          </p>
                          {Object.entries(product.original).slice(0, 3).map(([key, value]) => (
                            <p key={key} className="text-muted-foreground text-xs truncate">
                              <span className="font-medium">{key}:</span> {value?.toString() || '-'}
                            </p>
                          ))}
                        </div>
                      </div>

                      {/* Enriched */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="default" className="text-xs">Enriquecido</Badge>
                          {product.necessita_revisao && !product.validado && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Revisar
                            </Badge>
                          )}
                          {product.validado && (
                            <Badge variant="secondary" className="text-xs text-success border-success">
                              <Check className="h-3 w-3 mr-1" />
                              Validado
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm space-y-1">
                          {product.enriched.nome_padronizado && (
                            <p className="font-medium text-foreground">
                              {product.enriched.nome_padronizado}
                            </p>
                          )}
                          {product.enriched.categoria_inferida && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Categoria:</span> {product.enriched.categoria_inferida}
                            </p>
                          )}
                          {product.enriched.marca_inferida && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Marca:</span> {product.enriched.marca_inferida}
                            </p>
                          )}
                          {product.enriched.origem_inferida && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Origem:</span> {product.enriched.origem_inferida}
                            </p>
                          )}
                          
                          {/* NCM Sugerido */}
                          {ncm && (
                            <div className="mt-2 p-2 bg-muted/50 rounded border">
                              <div className="flex items-center gap-2">
                                <FileText className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs font-medium">NCM Sugerido:</span>
                                {ncm.codigo ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge 
                                        variant={getNcmBadgeVariant(ncm.confianca)} 
                                        className="text-xs cursor-help"
                                      >
                                        {ncm.codigo}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      <p className="font-medium">{ncm.descricao}</p>
                                      <p className="text-xs mt-1 text-muted-foreground">
                                        Confiança: {ncm.confianca}
                                      </p>
                                      {ncm.observacao && (
                                        <p className="text-xs mt-1">{ncm.observacao}</p>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    Não determinado
                                  </span>
                                )}
                              </div>
                              {ncm.confianca !== 'alta' && ncm.codigo && (
                                <p className="text-xs text-warning mt-1">
                                  ⚠️ Sugestão para pesquisa. Confirme com contador.
                                </p>
                              )}
                            </div>
                          )}
                          
                          {product.razao_revisao && (
                            <p className="text-xs text-warning mt-2">
                              ⚠️ {product.razao_revisao}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum produto encontrado com este filtro.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
};

export default UltraDataValidation;
