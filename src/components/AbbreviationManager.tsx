import { useState } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getDefaultAbbreviations } from '@/utils/dataProcessors';
import { useToast } from '@/hooks/use-toast';

interface AbbreviationManagerProps {
  abbreviations: Record<string, string>;
  onAbbreviationsChange: (abbrevs: Record<string, string>) => void;
  onNext: () => void;
  onBack: () => void;
}

const AbbreviationManager = ({
  abbreviations,
  onAbbreviationsChange,
  onNext,
  onBack
}: AbbreviationManagerProps) => {
  const { toast } = useToast();
  const [newAbbr, setNewAbbr] = useState('');
  const [newFull, setNewFull] = useState('');

  const handleAdd = () => {
    if (!newAbbr.trim() || !newFull.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a abreviatura e o termo completo.",
        variant: "destructive"
      });
      return;
    }

    onAbbreviationsChange({
      ...abbreviations,
      [newAbbr.toLowerCase().trim()]: newFull.trim()
    });

    setNewAbbr('');
    setNewFull('');
    toast({
      title: "Abreviatura adicionada",
      description: `"${newAbbr}" será substituído por "${newFull}".`,
    });
  };

  const handleRemove = (abbr: string) => {
    const updated = { ...abbreviations };
    delete updated[abbr];
    onAbbreviationsChange(updated);
    toast({
      title: "Abreviatura removida",
      description: `A abreviatura "${abbr}" foi removida.`,
    });
  };

  const handleReset = () => {
    onAbbreviationsChange(getDefaultAbbreviations());
    toast({
      title: "Abreviaturas restauradas",
      description: "Lista de abreviaturas padrão foi restaurada.",
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Gerenciar Abreviaturas</h2>
          <p className="text-muted-foreground mt-2">
            Configure substituições automáticas de abreviaturas
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total de abreviaturas</p>
          <p className="text-2xl font-bold text-primary">{Object.keys(abbreviations).length}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Add New */}
        <div className="space-y-6">
          <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
            <h3 className="text-lg font-semibold text-foreground mb-4">Adicionar Nova</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Abreviatura</label>
                <Input
                  value={newAbbr}
                  onChange={(e) => setNewAbbr(e.target.value)}
                  placeholder="Ex: un, cx, pct"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Termo Completo</label>
                <Input
                  value={newFull}
                  onChange={(e) => setNewFull(e.target.value)}
                  placeholder="Ex: unidade, caixa, pacote"
                />
              </div>
              <Button onClick={handleAdd} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Abreviatura
              </Button>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Ações Rápidas</h3>
            <div className="space-y-3">
              <Button variant="outline" onClick={handleReset} className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar Padrões
              </Button>
            </div>
          </div>

          <div className="bg-info/5 rounded-xl p-6 border border-info/10">
            <h4 className="font-semibold text-foreground mb-2">Como funciona?</h4>
            <p className="text-sm text-muted-foreground">
              As abreviaturas serão substituídas automaticamente em todos os campos de texto
              durante o processamento. Por exemplo, "cx" será substituído por "caixa".
            </p>
          </div>
        </div>

        {/* Abbreviation List */}
        <div className="space-y-4">
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-muted px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-foreground">Lista de Abreviaturas</span>
              <span className="text-sm text-muted-foreground">{Object.keys(abbreviations).length} itens</span>
            </div>
            <div className="max-h-[450px] overflow-y-auto">
              {Object.entries(abbreviations).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>Nenhuma abreviatura configurada.</p>
                  <p className="text-sm mt-2">Adicione uma nova ou restaure os padrões.</p>
                </div>
              ) : (
                Object.entries(abbreviations).map(([abbr, full]) => (
                  <div
                    key={abbr}
                    className="px-4 py-3 border-b border-border flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg font-mono font-medium">
                        {abbr}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-foreground">{full}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(abbr)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-border">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={onNext}>
          Avançar para Duplicidades
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default AbbreviationManager;