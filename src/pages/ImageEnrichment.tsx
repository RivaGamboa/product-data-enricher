// =====================================================
// ULTRACLEAN - Image Enrichment Page Component
// =====================================================

import { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Image as ImageIcon, 
  Sparkles, 
  Search, 
  Upload, 
  CheckCircle2, 
  Loader2,
  X,
  Download,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  findProductsWithoutImages, 
  processAndSaveImages,
  updateProductImageUrls,
  type ProductData 
} from '@/core';

interface ImageEnrichmentPageProps {
  data: ProductData[];
  onDataUpdate: (data: ProductData[]) => void;
  onNext: () => void;
  onBack: () => void;
  sessionId?: string;
}

interface GeneratedImage {
  id: string;
  url: string;
  source: 'search' | 'ai_generated';
  selected: boolean;
}

const ImageEnrichmentPage = ({
  data,
  onDataUpdate,
  onNext,
  onBack,
  sessionId
}: ImageEnrichmentPageProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageStyle, setImageStyle] = useState<'catalog' | 'lifestyle' | 'minimal'>('catalog');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Find products without images
  const productsWithoutImages = useMemo(() => {
    return findProductsWithoutImages(data);
  }, [data]);

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return productsWithoutImages;
    const term = searchTerm.toLowerCase();
    return productsWithoutImages.filter(p => {
      const name = String(p['Nome'] || p['name'] || '').toLowerCase();
      const sku = String(p['SKU'] || p['sku'] || '').toLowerCase();
      return name.includes(term) || sku.includes(term);
    });
  }, [productsWithoutImages, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get current selected product
  const selectedProduct = selectedProductIndex !== null 
    ? filteredProducts[selectedProductIndex] 
    : null;

  const getProductSku = (product: ProductData): string => {
    return String(product['SKU'] || product['sku'] || product['Código'] || '').trim();
  };

  const getProductName = (product: ProductData): string => {
    return String(product['Nome'] || product['name'] || product['Descrição'] || '').trim();
  };

  // Generate images with AI
  const handleGenerateImages = async () => {
    if (!selectedProduct) return;

    setIsGenerating(true);
    setGeneratedImages([]);

    try {
      const productName = getProductName(selectedProduct);
      const productDescription = String(selectedProduct['Descrição Curta'] || selectedProduct['Descrição Completa'] || '');

      // Call the generate-image edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            productName,
            productDescription,
            style: imageStyle
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate image');
      }

      const result = await response.json();
      
      if (result.imageUrl) {
        setGeneratedImages([{
          id: `ai_${Date.now()}`,
          url: result.imageUrl,
          source: 'ai_generated',
          selected: false
        }]);

        toast({
          title: 'Imagem gerada!',
          description: 'Selecione a imagem para salvar no produto.',
        });
      }
    } catch (error) {
      console.error('Error generating images:', error);
      toast({
        title: 'Erro ao gerar imagem',
        description: error instanceof Error ? error.message : 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle image selection
  const toggleImageSelection = (imageId: string) => {
    setGeneratedImages(prev =>
      prev.map(img =>
        img.id === imageId ? { ...img, selected: !img.selected } : img
      )
    );
  };

  // Save selected images
  const handleSaveImages = async () => {
    if (!selectedProduct || !user) {
      toast({
        title: 'Faça login',
        description: 'Você precisa estar logado para salvar imagens.',
        variant: 'destructive',
      });
      return;
    }

    const selectedImages = generatedImages.filter(img => img.selected);
    if (selectedImages.length === 0) {
      toast({
        title: 'Selecione imagens',
        description: 'Selecione pelo menos uma imagem para salvar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const productSku = getProductSku(selectedProduct);
      const productName = getProductName(selectedProduct);

      // Process and save images to storage
      const savedUrls = await processAndSaveImages(
        user.id,
        sessionId || null,
        productSku,
        productName,
        selectedImages.map(img => ({ url: img.url, source: img.source }))
      );

      // Update product data with new image URLs
      const updatedData = updateProductImageUrls(data, productSku, savedUrls);
      onDataUpdate(updatedData);

      toast({
        title: 'Imagens salvas!',
        description: `${savedUrls.length} imagem(ns) adicionada(s) ao produto ${productSku}.`,
      });

      // Clear selection and move to next product
      setGeneratedImages([]);
      setSelectedProductIndex(null);
    } catch (error) {
      console.error('Error saving images:', error);
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ImageIcon className="h-8 w-8 text-primary" />
            Imagens dos Produtos
          </h2>
          <p className="text-muted-foreground mt-2">
            Busque ou gere imagens para produtos sem foto (1080x1080, WEBP, fundo branco)
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Produtos sem imagem</p>
          <p className="text-2xl font-bold text-warning">
            {productsWithoutImages.length}
          </p>
        </div>
      </div>

      {productsWithoutImages.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl border border-border">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Todos os produtos têm imagens!
          </h3>
          <p className="text-muted-foreground mb-6">
            Não há produtos sem imagem na sua planilha.
          </p>
          <Button onClick={onNext}>
            Continuar para Identificação
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Product List */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por SKU ou nome..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted px-4 py-3 border-b border-border">
                <span className="font-semibold text-foreground">
                  Produtos sem Imagem ({filteredProducts.length})
                </span>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {paginatedProducts.map((product, idx) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + idx;
                  const isSelected = selectedProductIndex === globalIndex;
                  const sku = getProductSku(product);
                  const name = getProductName(product);

                  return (
                    <div
                      key={`${sku}-${idx}`}
                      onClick={() => setSelectedProductIndex(globalIndex)}
                      className={`px-4 py-3 border-b border-border last:border-b-0 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-primary/10 border-l-4 border-l-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {name || 'Sem nome'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            SKU: {sku || 'N/A'}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Sem imagem
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Image Generation Panel */}
          <div className="space-y-4">
            {selectedProduct ? (
              <>
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-semibold text-foreground mb-2">
                    Produto Selecionado
                  </h3>
                  <p className="text-lg font-medium">{getProductName(selectedProduct)}</p>
                  <p className="text-sm text-muted-foreground">
                    SKU: {getProductSku(selectedProduct)}
                  </p>
                </div>

                <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                  <h3 className="font-semibold text-foreground">Gerar Imagem com IA</h3>
                  
                  <div className="flex items-center gap-4">
                    <Select value={imageStyle} onValueChange={(v: any) => setImageStyle(v)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Estilo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="catalog">Catálogo</SelectItem>
                        <SelectItem value="lifestyle">Lifestyle</SelectItem>
                        <SelectItem value="minimal">Minimalista</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button 
                      onClick={handleGenerateImages}
                      disabled={isGenerating}
                      className="flex-1"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      {isGenerating ? 'Gerando...' : 'Gerar Imagem com IA'}
                    </Button>
                  </div>
                </div>

                {/* Generated Images Grid */}
                {generatedImages.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                    <h3 className="font-semibold text-foreground">
                      Imagens Geradas
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {generatedImages.map((img) => (
                        <div
                          key={img.id}
                          onClick={() => toggleImageSelection(img.id)}
                          className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            img.selected 
                              ? 'border-primary ring-2 ring-primary/20' 
                              : 'border-transparent hover:border-muted-foreground/30'
                          }`}
                        >
                          <img
                            src={img.url}
                            alt="Generated product"
                            className="w-full h-full object-cover"
                          />
                          {img.selected && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                          )}
                          <Badge
                            className="absolute bottom-2 left-2"
                            variant="secondary"
                          >
                            {img.source === 'ai_generated' ? 'IA' : 'Busca'}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={handleSaveImages}
                      disabled={isSaving || !generatedImages.some(i => i.selected)}
                      className="w-full"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {isSaving ? 'Salvando...' : 'Salvar Imagens Selecionadas'}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-muted/30 border border-dashed border-border rounded-xl p-8 text-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Selecione um Produto
                </h3>
                <p className="text-sm text-muted-foreground">
                  Clique em um produto da lista para gerar ou buscar imagens.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-border">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={onNext}>
          Continuar
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ImageEnrichmentPage;
