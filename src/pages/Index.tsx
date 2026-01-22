import { useState, useEffect } from 'react';
import { Shield, Database, User, LogOut, Save, Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserConfig } from '@/hooks/useUserConfig';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/AuthModal';
import StepIndicator from '@/components/StepIndicator';
import UploadSection from '@/components/UploadSection';
import ColumnMapper from '@/components/ColumnMapper';
import AbbreviationManager from '@/components/AbbreviationManager';
import DuplicateDetector from '@/components/DuplicateDetector';
import ResultsDownloader from '@/components/ResultsDownloader';
import {
  processData,
  getDefaultAbbreviations,
  type ColumnConfig,
  type DuplicateResult,
  type ProcessingResult
} from '@/utils/dataProcessors';

const Index = () => {
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const { config, loading: configLoading, saving, saveConfig, logProcessing } = useUserConfig();
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnConfig, setColumnConfig] = useState<Record<string, ColumnConfig>>({});
  const [abbreviations, setAbbreviations] = useState<Record<string, string>>(getDefaultAbbreviations());
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [duplicatesReport, setDuplicatesReport] = useState<DuplicateResult[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load user config when available
  useEffect(() => {
    if (!configLoading && config) {
      if (Object.keys(config.abbreviations).length > 0) {
        setAbbreviations(config.abbreviations);
      }
    }
  }, [config, configLoading]);

  const handleFileUpload = (file: File, parsedData: Record<string, unknown>[], columnsList: string[]) => {
    setUploadedFile(file);
    setData(parsedData);
    setColumns(columnsList);

    // Initialize column configurations
    const initialConfig: Record<string, ColumnConfig> = {};
    columnsList.forEach(col => {
      const isProtected = /estoque|preço|preco|custo|price|stock|valor/i.test(col);
      initialConfig[col] = {
        action: isProtected ? 'ignore' : 'analyze',
        defaultValue: '',
        isProtected: isProtected
      };
    });
    setColumnConfig(initialConfig);

    setCurrentStep(2);
  };

  const handleSaveConfig = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    await saveConfig(abbreviations, columnConfig);
  };

  const handleProcessData = async () => {
    setIsProcessing(true);

    try {
      // Process data
      await new Promise(resolve => setTimeout(resolve, 800)); // UX delay
      const result = processData(data, columnConfig, abbreviations);
      setProcessingResult(result);

      // Log processing if user is authenticated
      if (user && uploadedFile) {
        await logProcessing(
          uploadedFile.name,
          data.length,
          duplicatesReport?.length || 0,
          result.stats.abreviaturasCorrigidas,
          columns,
          Object.keys(result.enrichedData[0] || {})
        );
      }

      setCurrentStep(5);
      toast({
        title: "Processamento concluído!",
        description: `${result.stats.camposPreenchidos} campos foram enriquecidos.`,
      });
    } catch (error) {
      toast({
        title: "Erro no processamento",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestart = () => {
    setCurrentStep(1);
    setData([]);
    setColumns([]);
    setColumnConfig({});
    setProcessingResult(null);
    setDuplicatesReport(null);
    setUploadedFile(null);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Até logo!",
      description: "Você saiu da sua conta."
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />

      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Enriquecimento de Produtos
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Otimize sua base de dados com inteligência
                </p>
              </div>
            </div>

            {/* Auth Section */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveConfig}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline ml-2">Salvar</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Sair</span>
                  </Button>
                </>
              ) : (
                <Button onClick={() => setShowAuthModal(true)}>
                  <User className="h-4 w-4 mr-2" />
                  Entrar
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} />

        {/* Main Content */}
        <div className="bg-card rounded-2xl shadow-elevated border border-border p-6 md:p-8">
          {currentStep === 1 && (
            <UploadSection onFileUpload={handleFileUpload} />
          )}

          {currentStep === 2 && (
            <ColumnMapper
              data={data}
              columns={columns}
              columnConfig={columnConfig}
              onConfigChange={setColumnConfig}
              onNext={() => setCurrentStep(3)}
              onBack={() => setCurrentStep(1)}
            />
          )}

          {currentStep === 3 && (
            <AbbreviationManager
              abbreviations={abbreviations}
              onAbbreviationsChange={setAbbreviations}
              onNext={() => setCurrentStep(4)}
              onBack={() => setCurrentStep(2)}
            />
          )}

          {currentStep === 4 && (
            <DuplicateDetector
              data={data}
              columnConfig={columnConfig}
              onDuplicatesFound={setDuplicatesReport}
              onProcess={handleProcessData}
              onBack={() => setCurrentStep(3)}
              isProcessing={isProcessing}
            />
          )}

          {currentStep === 5 && processingResult && (
            <ResultsDownloader
              originalData={data}
              enrichedData={processingResult.enrichedData}
              duplicatesReport={duplicatesReport}
              processingStats={processingResult.stats}
              columnConfig={columnConfig}
              onRestart={handleRestart}
            />
          )}
        </div>

        {/* Important Notice */}
        <div className="mt-8 bg-warning/5 border border-warning/10 rounded-xl p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Shield className="h-6 w-6 text-warning" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-foreground">
                ⚠️ IMPORTANTE
              </h3>
              <div className="mt-2 text-sm text-muted-foreground">
                <p>Este aplicativo <strong>NUNCA</strong> altera:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Posição de Estoque</li>
                  <li>Preços e Valores Financeiros</li>
                  <li>Campos protegidos configurados pelo usuário</li>
                </ul>
                <p className="mt-4">
                  Todas as alterações são registradas e podem ser revertidas.
                  Sempre verifique os resultados antes de usar em produção.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 border-t border-border pt-8 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-muted-foreground text-sm">
            <p>App de Enriquecimento de Produtos v1.0 • Compatível com Planilha Bling (54 colunas)</p>
            <p className="mt-2">Processamento seguro • Dados preservados • Resultados auditáveis</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
