import { useEffect, useState, useMemo } from 'react';
import { Search, AlertTriangle, CheckCircle2, ChevronLeft, Play, Loader2, Files, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { detectDuplicates, exportToExcel, type ColumnConfig, type DuplicateResult } from '@/utils/dataProcessors';

interface DuplicateDetectorProps {
  data: Record<string, unknown>[];
  columnConfig: Record<string, ColumnConfig>;
  onDuplicatesFound: (duplicates: DuplicateResult[]) => void;
  onProcess: () => void;
  onBack: () => void;
  isProcessing: boolean;
}

interface EnhancedDuplicateResult extends DuplicateResult {
  isCrossFile: boolean;
  sourceFiles: string[];
}

const DuplicateDetector = ({
  data,
  columnConfig,
  onDuplicatesFound,
  onProcess,
  onBack,
  isProcessing
}: DuplicateDetectorProps) => {
  const { toast } = useToast();
  const [duplicates, setDuplicates] = useState<EnhancedDuplicateResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showOnlyCrossFile, setShowOnlyCrossFile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Check if data has source file info (batch upload)
  const hasBatchData = useMemo(() => {
    return data.length > 0 && '__source_file' in data[0];
  }, [data]);

  // Get unique source files
  const sourceFiles = useMemo(() => {
    if (!hasBatchData) return [];
    const files = new Set<string>();
    data.forEach(row => {
      if (row.__source_file) files.add(String(row.__source_file));
    });
    return Array.from(files);
  }, [data, hasBatchData]);

  useEffect(() => {
    scanForDuplicates();
  }, []);

  const scanForDuplicates = async () => {
    setIsScanning(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const found = detectDuplicates(data, columnConfig);
    
    // Enhance duplicates with cross-file info
    const enhanced: EnhancedDuplicateResult[] = found.map(dup => {
      const filesInvolved = new Set<string>();
      dup.linhas.forEach(lineIndex => {
        const sourceFile = data[lineIndex]?.__source_file;
        if (sourceFile) filesInvolved.add(String(sourceFile));
      });
      
      return {
        ...dup,
        isCrossFile: filesInvolved.size > 1,
        sourceFiles: Array.from(filesInvolved)
      };
    });
    
    setDuplicates(enhanced);
    onDuplicatesFound(found);
    setIsScanning(false);
  };

  // Filter duplicates based on toggle
  const filteredDuplicates = useMemo(() => {
    if (!showOnlyCrossFile) return duplicates;
    return duplicates.filter(d => d.isCrossFile);
  }, [duplicates, showOnlyCrossFile]);

  const crossFileCount = useMemo(() => {
    return duplicates.filter(d => d.isCrossFile).length;
  }, [duplicates]);

  const groupedDuplicates = filteredDuplicates.reduce((acc, dup) => {
    if (!acc[dup.tipo]) acc[dup.tipo] = [];
    acc[dup.tipo].push(dup);
    return acc;
  }, {} as Record<string, EnhancedDuplicateResult[]>);

  // Get file name display (truncate if too long)
  const getFileName = (fullName: string) => {
    if (fullName.length <= 20) return fullName;
    return fullName.substring(0, 17) + '...';
  };

  // Export merged data as backup
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      // Remove internal metadata columns for export
      const cleanData = data.map(row => {
        const cleaned: Record<string, unknown> = {};
        Object.entries(row).forEach(([key, value]) => {
          if (!key.startsWith('__')) {
            cleaned[key] = value;
          }
        });
        // Add source file as a visible column if batch data
        if (hasBatchData && row.__source_file) {
          cleaned['_Arquivo_Origem'] = row.__source_file;
        }
        return cleaned;
      });

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = hasBatchData && sourceFiles.length > 1 
        ? `backup_mesclado_${sourceFiles.length}_arquivos_${timestamp}`
        : `backup_dados_${timestamp}`;
      
      exportToExcel(cleanData, filename);
      
      toast({
        title: 'Backup exportado!',
        description: `${data.length.toLocaleString()} itens salvos em ${filename}.xlsx`
      });
    } catch (error) {
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar o arquivo de backup.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Detecção de Duplicidades</h2>
          <p className="text-muted-foreground mt-2">
            Análise de produtos potencialmente duplicados
            {hasBatchData && sourceFiles.length > 1 && (
              <span className="ml-2">
                <Badge variant="secondary" className="gap-1">
                  <Files className="h-3 w-3" />
                  {sourceFiles.length} arquivos
                </Badge>
              </span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Duplicidades encontradas</p>
          <p className={`text-2xl font-bold ${duplicates.length > 0 ? 'text-warning' : 'text-success'}`}>
            {duplicates.length}
          </p>
        </div>
      </div>

      {isScanning ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-pulse-soft">
            <Search className="h-16 w-16 text-primary mb-4" />
          </div>
          <p className="text-lg font-medium text-foreground">Analisando dados...</p>
          <p className="text-muted-foreground mt-2">
            Procurando por produtos duplicados
            {hasBatchData && sourceFiles.length > 1 && ' entre todos os arquivos'}
          </p>
        </div>
      ) : (
        <>
          {/* Backup Export Button */}
          <div className="bg-muted/50 rounded-xl p-4 border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Backup dos Dados Mesclados</p>
                <p className="text-sm text-muted-foreground">
                  Exporte todos os {data.length.toLocaleString()} itens antes do processamento
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleExportBackup}
              disabled={isExporting}
              className="gap-2"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Exportar Backup
            </Button>
          </div>

          {/* Summary */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Total Analisado</h3>
                <Search className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl font-bold text-foreground">{data.length.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">produtos</p>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Duplicidades</h3>
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <p className={`text-3xl font-bold ${duplicates.length > 0 ? 'text-warning' : 'text-success'}`}>
                {duplicates.length}
              </p>
              <p className="text-sm text-muted-foreground mt-1">casos encontrados</p>
            </div>

            {hasBatchData && sourceFiles.length > 1 && (
              <div className="bg-card rounded-xl p-6 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Entre Arquivos</h3>
                  <Files className="h-5 w-5 text-primary" />
                </div>
                <p className={`text-3xl font-bold ${crossFileCount > 0 ? 'text-destructive' : 'text-success'}`}>
                  {crossFileCount}
                </p>
                <p className="text-sm text-muted-foreground mt-1">duplicatas cross-file</p>
              </div>
            )}

            {(!hasBatchData || sourceFiles.length <= 1) && (
              <div className="bg-card rounded-xl p-6 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Status</h3>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <p className="text-lg font-semibold text-success">
                  {duplicates.length === 0 ? 'Nenhuma duplicidade' : 'Requer atenção'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {duplicates.length === 0 ? 'Pronto para processar' : 'Revise antes de continuar'}
                </p>
              </div>
            )}
          </div>

          {/* Cross-file Filter Toggle */}
          {hasBatchData && sourceFiles.length > 1 && duplicates.length > 0 && (
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Filter className="h-5 w-5 text-primary" />
                  <div>
                    <Label htmlFor="cross-file-filter" className="font-medium cursor-pointer">
                      Mostrar apenas duplicatas entre arquivos diferentes
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Filtra para exibir somente itens duplicados que aparecem em arquivos distintos
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={showOnlyCrossFile ? "default" : "secondary"}>
                    {showOnlyCrossFile ? crossFileCount : duplicates.length} resultados
                  </Badge>
                  <Switch
                    id="cross-file-filter"
                    checked={showOnlyCrossFile}
                    onCheckedChange={setShowOnlyCrossFile}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Duplicates List */}
          {filteredDuplicates.length > 0 && (
            <div className="space-y-6">
              {Object.entries(groupedDuplicates).map(([tipo, items]) => (
                <div key={tipo} className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-warning/10 px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                      <span className="font-semibold text-foreground">{tipo}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{items.length} casos</span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {items.map((dup, index) => (
                      <div
                        key={index}
                        className={`px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors ${
                          dup.isCrossFile ? 'bg-destructive/5' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-foreground">
                                {dup.valor}
                              </p>
                              {dup.isCrossFile && (
                                <Badge variant="destructive" className="gap-1 text-xs">
                                  <Files className="h-3 w-3" />
                                  Cross-file
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Linhas: {dup.linhas.map(l => l + 2).join(', ')} (na planilha mesclada)
                            </p>
                            {hasBatchData && dup.sourceFiles.length > 0 && (
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className="text-xs text-muted-foreground">Arquivos:</span>
                                {dup.sourceFiles.map((file, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {getFileName(file)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              dup.similaridade === 1
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-warning/10 text-warning'
                            }`}>
                              {Math.round(dup.similaridade * 100)}% similar
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredDuplicates.length === 0 && duplicates.length > 0 && showOnlyCrossFile && (
            <div className="bg-success/5 rounded-xl p-8 border border-success/10 text-center">
              <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Nenhuma duplicidade entre arquivos
              </h3>
              <p className="text-muted-foreground">
                Todas as duplicidades encontradas estão dentro do mesmo arquivo.
                <br />
                <Button 
                  variant="link" 
                  className="p-0 h-auto" 
                  onClick={() => setShowOnlyCrossFile(false)}
                >
                  Ver todas as {duplicates.length} duplicidades
                </Button>
              </p>
            </div>
          )}

          {duplicates.length === 0 && (
            <div className="bg-success/5 rounded-xl p-8 border border-success/10 text-center">
              <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Nenhuma duplicidade encontrada
              </h3>
              <p className="text-muted-foreground">
                {hasBatchData && sourceFiles.length > 1 
                  ? `Seus ${sourceFiles.length} arquivos não contêm produtos duplicados.`
                  : 'Sua planilha não contém produtos duplicados.'
                } Você pode prosseguir com o processamento.
              </p>
            </div>
          )}

          {/* Warning Notice */}
          {duplicates.length > 0 && !showOnlyCrossFile && (
            <div className="bg-warning/5 rounded-xl p-6 border border-warning/10">
              <div className="flex items-start">
                <AlertTriangle className="h-6 w-6 text-warning mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground">Atenção</h3>
                  <p className="text-muted-foreground mt-1">
                    Foram encontradas possíveis duplicidades
                    {hasBatchData && crossFileCount > 0 && (
                      <strong className="text-destructive"> ({crossFileCount} entre arquivos diferentes)</strong>
                    )}
                    . Recomendamos revisar esses itens antes de continuar. 
                    As duplicidades serão incluídas no relatório final para sua análise.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cross-file specific warning */}
          {showOnlyCrossFile && crossFileCount > 0 && (
            <div className="bg-destructive/5 rounded-xl p-6 border border-destructive/10">
              <div className="flex items-start">
                <Files className="h-6 w-6 text-destructive mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground">Duplicidades Entre Arquivos</h3>
                  <p className="text-muted-foreground mt-1">
                    Estas duplicidades aparecem em arquivos diferentes, o que pode indicar 
                    registros duplicados no seu banco de dados do Bling. Recomendamos resolver 
                    estas duplicidades antes de fazer upload para o sistema.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t border-border">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={onProcess} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Processar Dados
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default DuplicateDetector;
