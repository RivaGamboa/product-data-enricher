import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Settings2, FileJson } from 'lucide-react';
import type { ColumnConfig } from '@/utils/dataProcessors';

interface ConfigPreset {
  name: string;
  version: string;
  exportedAt: string;
  abbreviations: Record<string, string>;
  columnConfig: Record<string, ColumnConfig>;
}

interface ConfigPresetManagerProps {
  abbreviations: Record<string, string>;
  columnConfig: Record<string, ColumnConfig>;
  onImport: (abbreviations: Record<string, string>, columnConfig: Record<string, ColumnConfig>) => void;
}

export function ConfigPresetManager({ 
  abbreviations, 
  columnConfig, 
  onImport 
}: ConfigPresetManagerProps) {
  const [open, setOpen] = useState(false);
  const [presetName, setPresetName] = useState('Minha Configuração');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExport = () => {
    const preset: ConfigPreset = {
      name: presetName || 'Configuração Exportada',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      abbreviations,
      columnConfig
    };

    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${presetName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || 'config'}_preset.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Configuração exportada',
      description: `O preset "${presetName}" foi salvo como arquivo JSON.`
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const preset = JSON.parse(content) as ConfigPreset;

        // Validate preset structure
        if (!preset.abbreviations || typeof preset.abbreviations !== 'object') {
          throw new Error('Arquivo inválido: abreviações não encontradas');
        }

        if (!preset.columnConfig || typeof preset.columnConfig !== 'object') {
          // Column config is optional, use empty object if not present
          preset.columnConfig = {};
        }

        onImport(preset.abbreviations, preset.columnConfig);
        
        toast({
          title: 'Configuração importada',
          description: `O preset "${preset.name || 'Importado'}" foi aplicado com sucesso.`
        });

        setOpen(false);
      } catch (error) {
        toast({
          title: 'Erro ao importar',
          description: error instanceof Error ? error.message : 'Arquivo JSON inválido.',
          variant: 'destructive'
        });
      }
    };

    reader.readAsText(file);
    
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const abbreviationCount = Object.keys(abbreviations).length;
  const columnConfigCount = Object.keys(columnConfig).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Presets
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Gerenciar Presets
          </DialogTitle>
          <DialogDescription>
            Exporte suas configurações para compartilhar ou importe presets de outros usuários.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Section */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Exportar Configuração</h4>
            <div className="space-y-2">
              <Label htmlFor="preset-name">Nome do Preset</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Ex: Padrão Bling"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Será exportado: {abbreviationCount} abreviações, {columnConfigCount} configurações de coluna
            </div>
            <Button onClick={handleExport} className="w-full gap-2">
              <Download className="h-4 w-4" />
              Exportar como JSON
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Import Section */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Importar Configuração</h4>
            <p className="text-xs text-muted-foreground">
              Selecione um arquivo JSON exportado anteriormente para aplicar as configurações.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="preset-file"
            />
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Selecionar Arquivo JSON
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
