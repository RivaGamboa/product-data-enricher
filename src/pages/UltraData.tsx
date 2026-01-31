import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, Settings2, Sparkles, CheckCircle, SpellCheck, BookA } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from '@/components/AuthModal';
import UltraDataUpload from '@/components/ultradata/UltraDataUpload';
import UltraDataFieldConfig from '@/components/ultradata/UltraDataFieldConfig';
import UltraDataProcessing from '@/components/ultradata/UltraDataProcessing';
import UltraDataValidation from '@/components/ultradata/UltraDataValidation';
import UltraDataTextCorrection from '@/components/ultradata/UltraDataTextCorrection';
import UltraDataAbbreviations from '@/components/ultradata/UltraDataAbbreviations';

export interface ProductRow {
  [key: string]: string | number | null;
}

export interface FieldConfig {
  column: string;
  action: 'ignore' | 'analyze' | 'fill_empty' | 'use_default';
  defaultValue?: string;
  isLocked: boolean;
}

export interface NcmSugerido {
  codigo: string;
  descricao: string;
  confianca: 'alta' | 'media' | 'baixa';
  observacao: string;
}

export interface ProcessedProduct {
  original: ProductRow;
  enriched: {
    nome_padronizado?: string;
    descricao_enriquecida?: string;
    categoria_inferida?: string;
    marca_inferida?: string;
    origem_inferida?: string;
    ncm_sugerido?: NcmSugerido;
  };
  necessita_revisao: boolean;
  razao_revisao?: string;
  validado: boolean;
  tempo_processamento_ms?: number;
}

const UltraData = () => {
  const { user, loading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Data state
  const [rawData, setRawData] = useState<ProductRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [processedProducts, setProcessedProducts] = useState<ProcessedProduct[]>([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('upload');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDataLoaded = (data: ProductRow[], cols: string[]) => {
    setRawData(data);
    setColumns(cols);
    
    // Initialize field configs
    const configs: FieldConfig[] = cols.map(col => {
      const isLocked = /estoque|preço|preco|custo|price|stock|valor|quantidade/i.test(col);
      return {
        column: col,
        action: isLocked ? 'ignore' : 'analyze',
        isLocked,
      };
    });
    setFieldConfigs(configs);
    setActiveTab('config');
  };

  const handleProcessingComplete = (products: ProcessedProduct[]) => {
    setProcessedProducts(products);
    setActiveTab('validation');
  };

  const handleValidationComplete = (validatedProducts: ProcessedProduct[]) => {
    setProcessedProducts(validatedProducts);
  };

  const handleDataUpdate = (updatedData: ProductRow[]) => {
    setRawData(updatedData);
  };

  const canProceedToProcessing = rawData.length > 0 && fieldConfigs.some(f => f.action !== 'ignore');
  const canProceedToValidation = processedProducts.length > 0;

  // Require auth for processing
  const requireAuth = () => {
    if (!user) {
      setShowAuthModal(true);
      return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />

      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">UltraData</h1>
                  <p className="text-xs text-muted-foreground">
                    Enriquecimento inteligente com DeepSeek AI
                  </p>
                </div>
              </div>
            </div>

            {!user && (
              <Button onClick={() => setShowAuthModal(true)} variant="outline" size="sm">
                Entrar para salvar
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 h-auto p-1">
            <TabsTrigger 
              value="upload" 
              className="flex items-center gap-2 py-3"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Upload</span>
            </TabsTrigger>
            <TabsTrigger 
              value="config" 
              disabled={rawData.length === 0}
              className="flex items-center gap-2 py-3"
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Configurar</span>
            </TabsTrigger>
            <TabsTrigger 
              value="abbreviations" 
              className="flex items-center gap-2 py-3"
            >
              <BookA className="h-4 w-4" />
              <span className="hidden sm:inline">Abreviações</span>
            </TabsTrigger>
            <TabsTrigger 
              value="text-correction" 
              disabled={!canProceedToProcessing}
              className="flex items-center gap-2 py-3"
            >
              <SpellCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Corrigir</span>
            </TabsTrigger>
            <TabsTrigger 
              value="processing" 
              disabled={!canProceedToProcessing}
              className="flex items-center gap-2 py-3"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Processar IA</span>
            </TabsTrigger>
            <TabsTrigger 
              value="validation" 
              disabled={!canProceedToValidation}
              className="flex items-center gap-2 py-3"
            >
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Validar</span>
            </TabsTrigger>
          </TabsList>

          <div className="bg-card rounded-2xl shadow-elevated border border-border p-6 md:p-8">
            <TabsContent value="upload" className="mt-0">
              <UltraDataUpload onDataLoaded={handleDataLoaded} />
            </TabsContent>

            <TabsContent value="config" className="mt-0">
              <UltraDataFieldConfig
                columns={columns}
                fieldConfigs={fieldConfigs}
                onConfigChange={setFieldConfigs}
                sampleData={rawData.slice(0, 5)}
                onNext={() => {
                  if (requireAuth()) {
                    setActiveTab('text-correction');
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="abbreviations" className="mt-0">
              <UltraDataAbbreviations />
            </TabsContent>

            <TabsContent value="text-correction" className="mt-0">
              <UltraDataTextCorrection
                rawData={rawData}
                columns={columns}
                fieldConfigs={fieldConfigs}
                onDataUpdate={handleDataUpdate}
              />
            </TabsContent>

            <TabsContent value="processing" className="mt-0">
              <UltraDataProcessing
                rawData={rawData}
                fieldConfigs={fieldConfigs}
                userId={user?.id}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
                onComplete={handleProcessingComplete}
              />
            </TabsContent>

            <TabsContent value="validation" className="mt-0">
              <UltraDataValidation
                processedProducts={processedProducts}
                columns={columns}
                onValidationChange={handleValidationComplete}
              />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
};

export default UltraData;
