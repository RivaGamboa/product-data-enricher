import { Download, FileSpreadsheet, RotateCcw, CheckCircle2, AlertTriangle, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportToExcel, exportDuplicatesReport, type ProcessingStats, type DuplicateResult, type ColumnConfig } from '@/utils/dataProcessors';
import { useToast } from '@/hooks/use-toast';

interface ResultsDownloaderProps {
  originalData: Record<string, unknown>[];
  enrichedData: Record<string, unknown>[];
  duplicatesReport: DuplicateResult[] | null;
  processingStats: ProcessingStats;
  columnConfig: Record<string, ColumnConfig>;
  onRestart: () => void;
}

const ResultsDownloader = ({
  originalData,
  enrichedData,
  duplicatesReport,
  processingStats,
  columnConfig,
  onRestart
}: ResultsDownloaderProps) => {
  const { toast } = useToast();

  const handleDownloadEnriched = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    exportToExcel(enrichedData, `produtos_enriquecidos_${timestamp}`);
    toast({
      title: "Download iniciado",
      description: "Sua planilha enriquecida está sendo baixada.",
    });
  };

  const handleDownloadDuplicates = () => {
    if (duplicatesReport && duplicatesReport.length > 0) {
      exportDuplicatesReport(duplicatesReport, originalData);
      toast({
        title: "Download iniciado",
        description: "Relatório de duplicidades está sendo baixado.",
      });
    }
  };

  const handleDownloadOriginal = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    exportToExcel(originalData, `produtos_original_backup_${timestamp}`);
    toast({
      title: "Download iniciado",
      description: "Backup da planilha original está sendo baixado.",
    });
  };

  const stats = [
    {
      label: 'Campos Preenchidos',
      value: processingStats.camposPreenchidos,
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      label: 'Abreviaturas Corrigidas',
      value: processingStats.abreviaturasCorrigidas,
      icon: FileSpreadsheet,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      label: 'Campos Protegidos',
      value: processingStats.camposProtegidos,
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    {
      label: 'Campos Ignorados',
      value: processingStats.camposIgnorados,
      icon: BarChart3,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h2 className="text-3xl font-bold text-foreground">Processamento Concluído!</h2>
        <p className="text-muted-foreground mt-2">
          Seus dados foram enriquecidos com sucesso
        </p>
      </div>

      {/* Statistics */}
      <div className="grid md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-card rounded-xl p-6 border border-border text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${stat.bgColor} mb-3`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Download Options */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Planilha Enriquecida</h3>
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Baixe a planilha com todos os dados enriquecidos e correções aplicadas.
          </p>
          <Button onClick={handleDownloadEnriched} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Baixar Planilha
          </Button>
        </div>

        <div className={`rounded-xl p-6 border ${
          duplicatesReport && duplicatesReport.length > 0 
            ? 'bg-warning/5 border-warning/10' 
            : 'bg-muted/30 border-border'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Relatório de Duplicidades</h3>
            <AlertTriangle className={`h-5 w-5 ${
              duplicatesReport && duplicatesReport.length > 0 ? 'text-warning' : 'text-muted-foreground'
            }`} />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {duplicatesReport && duplicatesReport.length > 0
              ? `${duplicatesReport.length} duplicidade(s) encontrada(s) para análise.`
              : 'Nenhuma duplicidade encontrada na planilha.'}
          </p>
          <Button
            variant="outline"
            onClick={handleDownloadDuplicates}
            disabled={!duplicatesReport || duplicatesReport.length === 0}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar Relatório
          </Button>
        </div>

        <div className="bg-muted/30 rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Backup Original</h3>
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Baixe uma cópia da planilha original como backup de segurança.
          </p>
          <Button variant="outline" onClick={handleDownloadOriginal} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Baixar Original
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-muted/30 rounded-xl p-6 border border-border">
        <h3 className="font-semibold text-foreground mb-4">Resumo do Processamento</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Total de produtos:</span> {originalData.length}
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Colunas processadas:</span> {Object.keys(columnConfig).length}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Colunas protegidas:</span>{' '}
              {Object.values(columnConfig).filter(c => c.isProtected).length}
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Data do processamento:</span>{' '}
              {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-info/5 rounded-xl p-6 border border-info/10">
        <div className="flex items-start">
          <CheckCircle2 className="h-6 w-6 text-info mt-1 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-foreground">Campos Protegidos</h3>
            <p className="text-muted-foreground mt-1">
              Conforme configurado, os seguintes campos <strong>não foram alterados</strong>: 
              Posição de Estoque, Preços, Valores Financeiros e outros campos marcados como protegidos.
              Esses dados permanecem exatamente como estavam na planilha original.
            </p>
          </div>
        </div>
      </div>

      {/* Restart Button */}
      <div className="flex justify-center pt-6 border-t border-border">
        <Button variant="outline" onClick={onRestart} size="lg">
          <RotateCcw className="h-4 w-4 mr-2" />
          Processar Nova Planilha
        </Button>
      </div>
    </div>
  );
};

export default ResultsDownloader;