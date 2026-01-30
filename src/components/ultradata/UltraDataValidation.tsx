import { useState, useMemo } from 'react';
import { Check, AlertTriangle, Download, Filter, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { ProcessedProduct } from '@/pages/UltraData';

interface UltraDataValidationProps {
  processedProducts: ProcessedProduct[];
  columns: string[];
  onValidationChange: (products: ProcessedProduct[]) => void;
}

const UltraDataValidation = ({
  processedProducts,
  columns,
  onValidationChange,
}: UltraDataValidationProps) => {
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'review' | 'validated'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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

  const exportToExcel = () => {
    // Build enriched data
    const enrichedData = processedProducts.map(p => {
      const row: Record<string, any> = { ...p.original };
      
      // Add enriched fields
      if (p.enriched.nome_padronizado) row['Nome Padronizado (IA)'] = p.enriched.nome_padronizado;
      if (p.enriched.descricao_enriquecida) row['Descrição Enriquecida (IA)'] = p.enriched.descricao_enriquecida;
      if (p.enriched.categoria_inferida) row['Categoria Inferida (IA)'] = p.enriched.categoria_inferida;
      if (p.enriched.marca_inferida) row['Marca Inferida (IA)'] = p.enriched.marca_inferida;
      if (p.enriched.origem_inferida) row['Origem Inferida (IA)'] = p.enriched.origem_inferida;
      
      // NCM Sugerido
      if (p.enriched.ncm_sugerido?.codigo) {
        row['NCM Sugerido (IA)'] = p.enriched.ncm_sugerido.codigo;
        row['NCM Descrição'] = p.enriched.ncm_sugerido.descricao;
        row['NCM Confiança'] = p.enriched.ncm_sugerido.confianca;
        row['NCM Observação'] = p.enriched.ncm_sugerido.observacao;
      }
      
      // Add status columns
      row['Validado'] = p.validado ? 'Sim' : 'Não';
      row['Necessita Revisão'] = p.necessita_revisao ? 'Sim' : 'Não';
      if (p.razao_revisao) row['Razão Revisão'] = p.razao_revisao;
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(enrichedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos Enriquecidos');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const timestamp = new Date().toISOString().slice(0, 10);
    saveAs(blob, `ultradata_enriquecido_${timestamp}.xlsx`);

    toast({
      title: "Exportação concluída!",
      description: "Arquivo Excel salvo com sucesso.",
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

          <Button onClick={exportToExcel} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
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

        {/* Bulk Actions */}
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
