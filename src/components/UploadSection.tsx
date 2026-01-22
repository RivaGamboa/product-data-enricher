import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Files, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { parseFile } from '@/utils/dataProcessors';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface UploadSectionProps {
  onFileUpload: (file: File, data: Record<string, unknown>[], columns: string[]) => void;
}

interface FileWithData {
  file: File;
  data: Record<string, unknown>[];
  columns: string[];
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

const MAX_ITEMS_PER_FILE = 1000;
const MAX_FILES = 20;
const MAX_TOTAL_ITEMS = 20000;

const UploadSection = ({ onFileUpload }: UploadSectionProps) => {
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<FileWithData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // Check max files limit
    const totalFiles = uploadedFiles.length + files.length;
    if (totalFiles > MAX_FILES) {
      toast({
        title: "Limite de arquivos",
        description: `Máximo de ${MAX_FILES} arquivos permitidos. Você já tem ${uploadedFiles.length}.`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    const newFiles: FileWithData[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProcessingProgress(Math.round(((i + 0.5) / files.length) * 100));
      
      try {
        const { data, columns } = await parseFile(file);
        
        if (data.length === 0) {
          newFiles.push({
            file,
            data: [],
            columns: [],
            status: 'error',
            error: 'Arquivo vazio'
          });
          continue;
        }

        if (data.length > MAX_ITEMS_PER_FILE) {
          toast({
            title: `Aviso: ${file.name}`,
            description: `Arquivo contém ${data.length} itens. Usando apenas os primeiros ${MAX_ITEMS_PER_FILE}.`,
          });
          newFiles.push({
            file,
            data: data.slice(0, MAX_ITEMS_PER_FILE),
            columns,
            status: 'done'
          });
        } else {
          newFiles.push({
            file,
            data,
            columns,
            status: 'done'
          });
        }
      } catch (error) {
        newFiles.push({
          file,
          data: [],
          columns: [],
          status: 'error',
          error: 'Erro ao processar'
        });
      }
      
      setProcessingProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setIsProcessing(false);
    
    const successCount = newFiles.filter(f => f.status === 'done').length;
    const totalItems = newFiles.reduce((acc, f) => acc + f.data.length, 0);
    
    if (successCount > 0) {
      toast({
        title: "Arquivos carregados!",
        description: `${successCount} arquivo(s) processado(s) com ${totalItems.toLocaleString()} itens.`,
      });
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    await processFiles(acceptedFiles);
  }, [uploadedFiles]);

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
  };

  const handleContinue = () => {
    const validFiles = uploadedFiles.filter(f => f.status === 'done' && f.data.length > 0);
    
    if (validFiles.length === 0) {
      toast({
        title: "Nenhum arquivo válido",
        description: "Por favor, envie pelo menos um arquivo com dados.",
        variant: "destructive"
      });
      return;
    }

    // Merge all data
    const allData: Record<string, unknown>[] = [];
    const allColumnsSet = new Set<string>();
    
    validFiles.forEach(f => {
      f.columns.forEach(col => allColumnsSet.add(col));
    });
    
    const allColumns = Array.from(allColumnsSet);
    
    validFiles.forEach((f, fileIndex) => {
      f.data.forEach((row, rowIndex) => {
        // Add source file info and normalize columns
        const normalizedRow: Record<string, unknown> = {
          __source_file: f.file.name,
          __source_row: rowIndex + 1,
          __batch_index: fileIndex
        };
        
        allColumns.forEach(col => {
          normalizedRow[col] = row[col] ?? '';
        });
        
        allData.push(normalizedRow);
      });
    });

    // Check total items limit
    if (allData.length > MAX_TOTAL_ITEMS) {
      toast({
        title: "Limite total excedido",
        description: `Máximo de ${MAX_TOTAL_ITEMS.toLocaleString()} itens. Você tem ${allData.length.toLocaleString()}.`,
        variant: "destructive"
      });
      return;
    }

    // Create a synthetic merged file for the interface
    const mergedFileName = validFiles.length === 1 
      ? validFiles[0].file.name 
      : `${validFiles.length}_arquivos_mesclados.xlsx`;
    
    const syntheticFile = new File([], mergedFileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    onFileUpload(syntheticFile, allData, allColumns);
    
    toast({
      title: "Dados mesclados!",
      description: `${allData.length.toLocaleString()} produtos de ${validFiles.length} arquivo(s) prontos para processamento.`,
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    maxFiles: MAX_FILES,
    disabled: isProcessing
  });

  const totalItems = uploadedFiles.reduce((acc, f) => acc + f.data.length, 0);
  const validFilesCount = uploadedFiles.filter(f => f.status === 'done').length;

  const steps = [
    { icon: Upload, text: 'Upload da planilha' },
    { icon: FileSpreadsheet, text: 'Configuração por coluna' },
    { icon: AlertCircle, text: 'Correção de abreviaturas' },
    { icon: CheckCircle2, text: 'Detecção de duplicidades' },
    { icon: CheckCircle2, text: 'Download dos resultados' }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Upload de Planilhas
        </h2>
        <p className="text-lg text-muted-foreground">
          Envie suas planilhas de produtos para enriquecimento automático
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          <Files className="inline h-4 w-4 mr-1" />
          Suporte a upload em lote: até {MAX_FILES} arquivos com {MAX_ITEMS_PER_FILE.toLocaleString()} itens cada
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload Area */}
        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
              transition-all duration-300 ease-out
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
              ${isDragActive
                ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className={`p-4 rounded-full transition-colors ${isDragActive ? 'bg-primary/20' : 'bg-primary/10'}`}>
                {isProcessing ? (
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                ) : (
                  <Upload className={`h-10 w-10 ${isDragActive ? 'text-primary' : 'text-primary/70'}`} />
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground mb-2">
                  {isProcessing 
                    ? 'Processando arquivos...' 
                    : isDragActive 
                      ? 'Solte os arquivos aqui' 
                      : 'Arraste e solte suas planilhas'}
                </p>
                <p className="text-muted-foreground mb-4">ou clique para selecionar</p>
                {!isProcessing && (
                  <button className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-card hover:shadow-card-hover">
                    Selecionar Arquivos
                  </button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Suporta: .xlsx, .xls, .csv
              </p>
            </div>
          </div>

          {/* Processing Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={processingProgress} />
              <p className="text-sm text-center text-muted-foreground">
                Processando... {processingProgress}%
              </p>
            </div>
          )}

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">
                  Arquivos ({uploadedFiles.length}/{MAX_FILES})
                </h4>
                <Button variant="ghost" size="sm" onClick={clearAllFiles}>
                  Limpar todos
                </Button>
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {uploadedFiles.map((f, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      f.status === 'error' 
                        ? 'bg-destructive/5 border-destructive/20' 
                        : 'bg-muted/50 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileSpreadsheet className={`h-5 w-5 flex-shrink-0 ${
                        f.status === 'error' ? 'text-destructive' : 'text-primary'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{f.file.name}</p>
                        <p className={`text-xs ${f.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {f.status === 'error' ? f.error : `${f.data.length.toLocaleString()} itens`}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Summary and Continue */}
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total de itens:</span>
                  <span className="font-semibold">{totalItems.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Arquivos válidos:</span>
                  <span className="font-semibold">{validFilesCount} de {uploadedFiles.length}</span>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleContinue}
                  disabled={validFilesCount === 0}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Continuar com {totalItems.toLocaleString()} itens
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="space-y-6">
          <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
            <div className="flex items-start mb-4">
              <Files className="h-6 w-6 text-primary mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">Upload em Lote</h3>
                <p className="text-muted-foreground mt-1">
                  Envie múltiplas planilhas do Bling de uma vez. Os dados serão 
                  mesclados automaticamente para detecção de duplicidades entre arquivos.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-success/5 rounded-xl p-6 border border-success/10">
            <div className="flex items-start">
              <FileSpreadsheet className="h-6 w-6 text-success mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">Capacidade</h3>
                <ul className="mt-2 space-y-2 text-muted-foreground">
                  <li>• Até <strong>{MAX_FILES}</strong> arquivos por upload</li>
                  <li>• Até <strong>{MAX_ITEMS_PER_FILE.toLocaleString()}</strong> itens por arquivo</li>
                  <li>• Total máximo: <strong>{MAX_TOTAL_ITEMS.toLocaleString()}</strong> itens</li>
                  <li>• Formatos: XLSX, XLS, CSV</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-warning/5 rounded-xl p-6 border border-warning/10">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 text-warning mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">Recomendações</h3>
                <ul className="mt-2 space-y-2 text-muted-foreground">
                  <li>• Mantenha backup das planilhas originais</li>
                  <li>• Estoque e preços nunca são alterados</li>
                  <li>• Verifique sempre os resultados finais</li>
                  <li>• Arquivos do Bling são detectados automaticamente</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-6 border border-border">
            <h4 className="font-semibold text-foreground mb-3">Próximos Passos</h4>
            <ol className="space-y-3">
              {steps.map((step, index) => (
                <li key={index} className="flex items-center text-muted-foreground">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-sm font-bold mr-3 flex-shrink-0">
                    {index + 1}
                  </span>
                  <span>{step.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadSection;
