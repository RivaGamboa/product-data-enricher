import { useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { parseFile } from '@/utils/dataProcessors';
import { useToast } from '@/hooks/use-toast';

interface UploadSectionProps {
  onFileUpload: (file: File, data: Record<string, unknown>[], columns: string[]) => void;
}

const UploadSection = ({ onFileUpload }: UploadSectionProps) => {
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      const { data, columns } = await parseFile(file);
      
      if (data.length === 0) {
        toast({
          title: "Arquivo vazio",
          description: "O arquivo não contém dados para processar.",
          variant: "destructive"
        });
        return;
      }

      if (data.length > 100) {
        toast({
          title: "Limite excedido",
          description: "Por favor, envie uma planilha com no máximo 100 linhas.",
          variant: "destructive"
        });
        return;
      }

      onFileUpload(file, data, columns);
      toast({
        title: "Arquivo carregado!",
        description: `${data.length} produtos encontrados em ${columns.length} colunas.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao processar arquivo",
        description: "Verifique se o arquivo está no formato correto.",
        variant: "destructive"
      });
    }
  }, [onFileUpload, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

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
          Upload da Planilha
        </h2>
        <p className="text-lg text-muted-foreground">
          Envie sua planilha de produtos para enriquecimento automático
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
            transition-all duration-300 ease-out
            ${isDragActive
              ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg'
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className={`p-4 rounded-full transition-colors ${isDragActive ? 'bg-primary/20' : 'bg-primary/10'}`}>
              <Upload className={`h-12 w-12 ${isDragActive ? 'text-primary' : 'text-primary/70'}`} />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground mb-2">
                {isDragActive ? 'Solte o arquivo aqui' : 'Arraste e solte sua planilha'}
              </p>
              <p className="text-muted-foreground mb-4">ou clique para selecionar</p>
              <button className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-card hover:shadow-card-hover">
                Selecionar Arquivo
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Suporta: .xlsx, .xls, .csv (até 100 itens)
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="space-y-6">
          <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
            <div className="flex items-start mb-4">
              <FileSpreadsheet className="h-6 w-6 text-primary mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">Compatibilidade</h3>
                <p className="text-muted-foreground mt-1">
                  Otimizado para a planilha de upload do Bling (54 colunas),
                  mas funciona com qualquer estrutura de produtos.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-warning/5 rounded-xl p-6 border border-warning/10">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 text-warning mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">Recomendações</h3>
                <ul className="mt-2 space-y-2 text-muted-foreground">
                  <li>• Limite de 100 itens por processamento</li>
                  <li>• Mantenha backup da planilha original</li>
                  <li>• Estoque e preços nunca são alterados</li>
                  <li>• Verifique sempre os resultados finais</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-success/5 rounded-xl p-6 border border-success/10">
            <h4 className="font-semibold text-foreground mb-3">Próximos Passos</h4>
            <ol className="space-y-3">
              {steps.map((step, index) => (
                <li key={index} className="flex items-center text-muted-foreground">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-success/10 text-success text-sm font-bold mr-3 flex-shrink-0">
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