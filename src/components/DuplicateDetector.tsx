import { useEffect, useState } from 'react';
import { Search, AlertTriangle, CheckCircle2, ChevronLeft, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { detectDuplicates, type ColumnConfig, type DuplicateResult } from '@/utils/dataProcessors';

interface DuplicateDetectorProps {
  data: Record<string, unknown>[];
  columnConfig: Record<string, ColumnConfig>;
  onDuplicatesFound: (duplicates: DuplicateResult[]) => void;
  onProcess: () => void;
  onBack: () => void;
  isProcessing: boolean;
}

const DuplicateDetector = ({
  data,
  columnConfig,
  onDuplicatesFound,
  onProcess,
  onBack,
  isProcessing
}: DuplicateDetectorProps) => {
  const [duplicates, setDuplicates] = useState<DuplicateResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    scanForDuplicates();
  }, []);

  const scanForDuplicates = async () => {
    setIsScanning(true);
    // Simulate async operation for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    const found = detectDuplicates(data, columnConfig);
    setDuplicates(found);
    onDuplicatesFound(found);
    setIsScanning(false);
  };

  const groupedDuplicates = duplicates.reduce((acc, dup) => {
    if (!acc[dup.tipo]) acc[dup.tipo] = [];
    acc[dup.tipo].push(dup);
    return acc;
  }, {} as Record<string, DuplicateResult[]>);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Detecção de Duplicidades</h2>
          <p className="text-muted-foreground mt-2">
            Análise de produtos potencialmente duplicados
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
          <p className="text-muted-foreground mt-2">Procurando por produtos duplicados</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Total Analisado</h3>
                <Search className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl font-bold text-foreground">{data.length}</p>
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
          </div>

          {/* Duplicates List */}
          {duplicates.length > 0 && (
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
                  <div className="max-h-[300px] overflow-y-auto">
                    {items.map((dup, index) => (
                      <div
                        key={index}
                        className="px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">
                              {dup.valor}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Linhas: {dup.linhas.map(l => l + 2).join(', ')} (na planilha)
                            </p>
                          </div>
                          <div className="text-right">
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

          {duplicates.length === 0 && (
            <div className="bg-success/5 rounded-xl p-8 border border-success/10 text-center">
              <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Nenhuma duplicidade encontrada
              </h3>
              <p className="text-muted-foreground">
                Sua planilha não contém produtos duplicados. Você pode prosseguir com o processamento.
              </p>
            </div>
          )}

          {/* Warning Notice */}
          {duplicates.length > 0 && (
            <div className="bg-warning/5 rounded-xl p-6 border border-warning/10">
              <div className="flex items-start">
                <AlertTriangle className="h-6 w-6 text-warning mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground">Atenção</h3>
                  <p className="text-muted-foreground mt-1">
                    Foram encontradas possíveis duplicidades na sua planilha. 
                    Recomendamos revisar esses itens antes de continuar. 
                    As duplicidades serão incluídas no relatório final para sua análise.
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