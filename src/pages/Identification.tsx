// =====================================================
// ULTRACLEAN - Product Identification Page (Categories & Tags)
// =====================================================

import { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Tag, 
  FolderTree, 
  Sparkles,
  Loader2,
  CheckCircle2,
  Upload,
  Search,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  findProductsWithoutCategory,
  findProductsWithoutTags,
  loadCategoryTree,
  saveCategoryTree,
  mergeTagsWithExisting,
  saveGeneratedTags,
  updateProductCategory,
  updateProductTags,
  parseFile,
  type ProductData 
} from '@/core';

interface IdentificationPageProps {
  data: ProductData[];
  onDataUpdate: (data: ProductData[]) => void;
  onNext: () => void;
  onBack: () => void;
  sessionId?: string;
}

const IdentificationPage = ({
  data,
  onDataUpdate,
  onNext,
  onBack,
  sessionId
}: IdentificationPageProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('categories');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryTree, setCategoryTree] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [tagsProgress, setTagsProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [tagStats, setTagStats] = useState<Map<string, number>>(new Map());
  const itemsPerPage = 10;

  // Find products without categories
  const productsWithoutCategory = useMemo(() => {
    return findProductsWithoutCategory(data);
  }, [data]);

  // Find products (for tag generation - all products can receive tags)
  const allProducts = useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(p => {
      const name = String(p['Nome'] || p['name'] || '').toLowerCase();
      const sku = String(p['SKU'] || p['sku'] || '').toLowerCase();
      return name.includes(term) || sku.includes(term);
    });
  }, [data, searchTerm]);

  // Filter categories for search
  const filteredCategories = useMemo(() => {
    if (!searchTerm || activeTab !== 'categories') return categoryTree;
    const term = searchTerm.toLowerCase();
    return categoryTree.filter(cat => cat.toLowerCase().includes(term));
  }, [categoryTree, searchTerm, activeTab]);

  // Pagination for products
  const totalPages = Math.ceil(
    (activeTab === 'categories' ? productsWithoutCategory : allProducts).length / itemsPerPage
  );
  const paginatedProducts = (activeTab === 'categories' ? productsWithoutCategory : allProducts).slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Load category tree on mount
  useEffect(() => {
    if (user) {
      loadCategoryTree(user.id).then(categories => {
        if (categories) {
          setCategoryTree(categories);
        }
      });
    }
  }, [user]);

  const getProductSku = (product: ProductData): string => {
    return String(product['SKU'] || product['sku'] || product['Código'] || '').trim();
  };

  const getProductName = (product: ProductData): string => {
    return String(product['Nome'] || product['name'] || product['Descrição'] || '').trim();
  };

  const getProductTags = (product: ProductData): string => {
    return String(product['Grupo de Tags/Tags'] || '').trim();
  };

  // Handle category file upload
  const handleCategoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingCategories(true);
    try {
      // Try to parse as JSON first
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const categories = Array.isArray(parsed) ? parsed : parsed.categories;
        setCategoryTree(categories);
        
        if (user) {
          await saveCategoryTree(user.id, file.name, categories);
        }
        
        toast({
          title: 'Categorias carregadas!',
          description: `${categories.length} categorias importadas.`,
        });
      } else {
        // Parse as Excel/CSV
        const { data: fileData } = await parseFile(file);
        const categories = fileData
          .map(row => String(Object.values(row)[0] || '').trim())
          .filter(cat => cat.length > 0);
        
        setCategoryTree(categories);
        
        if (user) {
          await saveCategoryTree(user.id, file.name, categories);
        }
        
        toast({
          title: 'Categorias carregadas!',
          description: `${categories.length} categorias importadas.`,
        });
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: 'Erro ao carregar',
        description: 'Verifique o formato do arquivo (JSON, CSV ou Excel).',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // Assign category to product
  const handleAssignCategory = (productSku: string, category: string) => {
    const updatedData = updateProductCategory(data, productSku, category);
    onDataUpdate(updatedData);
    
    toast({
      title: 'Categoria atribuída!',
      description: `Produto ${productSku} → ${category}`,
    });
  };

  // Generate tags with AI for selected products
  const handleGenerateTagsBatch = async () => {
    if (!user) {
      toast({
        title: 'Faça login',
        description: 'Você precisa estar logado para gerar tags.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingTags(true);
    setTagsProgress(0);
    const newTagStats = new Map<string, number>();
    let updatedData = [...data];
    let processedCount = 0;

    try {
      for (let i = 0; i < allProducts.length; i++) {
        const product = allProducts[i];
        const sku = getProductSku(product);
        const name = getProductName(product);
        const existingTags = getProductTags(product);
        const description = String(product['Descrição Curta'] || product['Descrição Completa'] || '');

        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-tags`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                productName: name,
                productDescription: description,
                existingTags,
                count: 10
              }),
            }
          );

          if (!response.ok) {
            const error = await response.json();
            console.error('Tag generation error:', error);
            continue;
          }

          const result = await response.json();
          const newTags = result.tags || [];

          if (newTags.length > 0) {
            // Merge with existing tags
            const combinedTags = mergeTagsWithExisting(existingTags, newTags, 'ULTRACLEAN');
            
            // Update data
            updatedData = updateProductTags(updatedData, sku, combinedTags);

            // Save to database
            await saveGeneratedTags(
              user.id,
              sessionId || null,
              sku,
              name,
              existingTags,
              newTags,
              'ULTRACLEAN',
              combinedTags,
              'gemini-3-flash',
              result.prompt || ''
            );

            // Update stats
            newTags.forEach((tag: string) => {
              newTagStats.set(tag, (newTagStats.get(tag) || 0) + 1);
            });

            processedCount++;
          }
        } catch (err) {
          console.error(`Error processing product ${sku}:`, err);
        }

        // Update progress
        setTagsProgress(Math.round(((i + 1) / allProducts.length) * 100));

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      }

      onDataUpdate(updatedData);
      setTagStats(newTagStats);

      toast({
        title: 'Tags geradas!',
        description: `${processedCount} produtos atualizados com tags ULTRACLEAN.`,
      });
    } catch (error) {
      console.error('Batch tag generation error:', error);
      toast({
        title: 'Erro ao gerar tags',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingTags(false);
      setTagsProgress(100);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Tag className="h-8 w-8 text-primary" />
            Identificação do Produto
          </h2>
          <p className="text-muted-foreground mt-2">
            Categorize produtos e gere tags SEO com inteligência artificial
          </p>
        </div>
        <div className="text-right space-y-1">
          <div>
            <span className="text-sm text-muted-foreground">Sem categoria: </span>
            <span className="font-bold text-warning">{productsWithoutCategory.length}</span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Total produtos: </span>
            <span className="font-bold text-primary">{data.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories" className="gap-2">
            <FolderTree className="h-4 w-4" />
            Categorização
          </TabsTrigger>
          <TabsTrigger value="tags" className="gap-2">
            <Tag className="h-4 w-4" />
            Tagueamento
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          {categoryTree.length === 0 ? (
            <div className="bg-muted/30 border border-dashed border-border rounded-xl p-8 text-center">
              <FolderTree className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Carregue sua Árvore de Categorias
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Faça upload de um arquivo JSON, CSV ou Excel com as categorias do Bling.
              </p>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="file"
                  accept=".json,.csv,.xlsx,.xls"
                  onChange={handleCategoryUpload}
                  className="hidden"
                />
                <Button disabled={isLoadingCategories}>
                  {isLoadingCategories ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Carregar Categorias
                </Button>
              </label>
            </div>
          ) : productsWithoutCategory.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-xl border border-border">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Todos os produtos estão categorizados!
              </h3>
              <p className="text-muted-foreground">
                Continue para a aba de Tagueamento ou avance para o próximo passo.
              </p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Product List */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produto..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-10"
                    />
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".json,.csv,.xlsx,.xls"
                      onChange={handleCategoryUpload}
                      className="hidden"
                    />
                    <Button variant="outline" size="icon" disabled={isLoadingCategories}>
                      {isLoadingCategories ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </label>
                </div>

                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted px-4 py-3 border-b border-border">
                    <span className="font-semibold text-foreground">
                      Produtos sem Categoria ({productsWithoutCategory.length})
                    </span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
                    {paginatedProducts.map((product, idx) => {
                      const sku = getProductSku(product);
                      const name = getProductName(product);

                      return (
                        <div key={`${sku}-${idx}`} className="p-4 space-y-3">
                          <div>
                            <p className="font-medium text-foreground truncate">
                              {name || 'Sem nome'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              SKU: {sku || 'N/A'}
                            </p>
                          </div>
                          <Select
                            onValueChange={(value) => handleAssignCategory(sku, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar categoria..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {filteredCategories.map((cat, i) => (
                                <SelectItem key={`${cat}-${i}`} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                        {currentPage} / {totalPages}
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

              {/* Category Info */}
              <div className="space-y-4">
                <div className="bg-info/5 border border-info/10 rounded-xl p-4">
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-info" />
                    Regra de Ouro
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    É <strong>VEDADO</strong> criar novas categorias. Apenas categorias 
                    previamente cadastradas no Bling podem ser utilizadas. O dropdown 
                    exibe somente categorias válidas da sua árvore.
                  </p>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                  <h4 className="font-semibold text-foreground mb-3">
                    Categorias Carregadas ({categoryTree.length})
                  </h4>
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {categoryTree.slice(0, 20).map((cat, i) => (
                      <Badge key={i} variant="outline" className="mr-1 mb-1">
                        {cat}
                      </Badge>
                    ))}
                    {categoryTree.length > 20 && (
                      <span className="text-sm text-muted-foreground">
                        ... e mais {categoryTree.length - 20} categorias
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tags Tab */}
        <TabsContent value="tags" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Tag Generation */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Gerar Tags com IA (Grupo ULTRACLEAN)
                </h3>
                <p className="text-sm text-muted-foreground">
                  A IA analisará nome, descrição e outras colunas para gerar 
                  pelo menos 10 palavras-chave relevantes por produto.
                </p>

                {isGeneratingTags ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Processando produtos...</span>
                      <span>{tagsProgress}%</span>
                    </div>
                    <Progress value={tagsProgress} />
                  </div>
                ) : (
                  <Button 
                    onClick={handleGenerateTagsBatch}
                    className="w-full"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Tags para Todos os Produtos ({allProducts.length})
                  </Button>
                )}
              </div>

              <div className="bg-warning/5 border border-warning/10 rounded-xl p-4">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  Regra de Preservação
                </h4>
                <p className="text-sm text-muted-foreground">
                  Tags existentes serão <strong>MANTIDAS INTACTAS</strong>. 
                  As novas tags serão adicionadas ao final no grupo "ULTRACLEAN".
                </p>
              </div>
            </div>

            {/* Tag Stats */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Estatísticas de Tags
                </h3>
                {tagStats.size > 0 ? (
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {Array.from(tagStats.entries())
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 20)
                      .map(([tag, count]) => (
                        <div key={tag} className="flex items-center justify-between">
                          <span className="text-sm truncate flex-1">{tag}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Gere tags para ver as estatísticas de distribuição.
                  </p>
                )}
              </div>

              {/* Sample Product Tags */}
              <div className="bg-muted/30 border border-border rounded-xl p-4">
                <h4 className="font-semibold text-foreground mb-3">
                  Exemplo de Formatação
                </h4>
                <code className="text-xs bg-background px-2 py-1 rounded block overflow-x-auto">
                  INTERBRASIL:peças náuticas, QUALIDADE:alta, ULTRACLEAN:motor, ULTRACLEAN:hélice
                </code>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-border">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={onNext}>
          Continuar para Duplicatas
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default IdentificationPage;
