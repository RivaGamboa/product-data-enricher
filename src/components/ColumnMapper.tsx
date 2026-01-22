import { useState } from 'react';
import { Settings, Eye, EyeOff, Lock, Unlock, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ColumnConfig } from '@/utils/dataProcessors';

interface ColumnMapperProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnConfig: Record<string, ColumnConfig>;
  onConfigChange: (config: Record<string, ColumnConfig>) => void;
  onNext: () => void;
  onBack: () => void;
}

const ColumnMapper = ({
  data,
  columns,
  columnConfig,
  onConfigChange,
  onNext,
  onBack
}: ColumnMapperProps) => {
  const [selectedColumn, setSelectedColumn] = useState(columns[0] || '');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredColumns = columns.filter(col =>
    col.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleActionChange = (column: string, action: ColumnConfig['action']) => {
    onConfigChange({
      ...columnConfig,
      [column]: {
        ...columnConfig[column],
        action
      }
    });
  };

  const handleDefaultValueChange = (column: string, value: string) => {
    onConfigChange({
      ...columnConfig,
      [column]: {
        ...columnConfig[column],
        defaultValue: value
      }
    });
  };

  const toggleProtection = (column: string) => {
    onConfigChange({
      ...columnConfig,
      [column]: {
        ...columnConfig[column],
        isProtected: !columnConfig[column]?.isProtected
      }
    });
  };

  const currentConfig = columnConfig[selectedColumn] || { action: 'analyze', defaultValue: '', isProtected: false };
  const columnData = data.map(row => row[selectedColumn]);
  const totalValues = columnData.length;
  const emptyValues = columnData.filter(v => !v || String(v).trim() === '').length;
  const uniqueValues = new Set(columnData.filter(v => v && String(v).trim() !== '')).size;

  const actionOptions = [
    { value: 'ignore' as const, label: 'Ignorar', description: 'Não processar esta coluna' },
    { value: 'analyze' as const, label: 'Analisar', description: 'Analisar e enriquecer campos' },
    { value: 'default_all' as const, label: 'Default Todos', description: 'Usar valor padrão para todos' },
    { value: 'default_empty' as const, label: 'Default Vazios', description: 'Usar valor padrão só para vazios' }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Configuração por Coluna</h2>
          <p className="text-muted-foreground mt-2">
            Configure como cada coluna deve ser processada
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Colunas mapeadas</p>
          <p className="text-2xl font-bold text-primary">{columns.length}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Column List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar coluna..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-muted px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Colunas</span>
                <span className="text-sm text-muted-foreground">{filteredColumns.length} itens</span>
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {filteredColumns.map((column) => {
                const config = columnConfig[column] || { action: 'analyze', defaultValue: '', isProtected: false };
                const isSelected = selectedColumn === column;

                return (
                  <div
                    key={column}
                    onClick={() => setSelectedColumn(column)}
                    className={`
                      px-4 py-3 border-b border-border cursor-pointer transition-colors
                      ${isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/50'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {config.isProtected ? (
                          <Lock className="h-4 w-4 text-destructive" />
                        ) : config.action === 'ignore' ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-success" />
                        )}
                        <span className={`font-medium truncate max-w-[150px] ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {column}
                        </span>
                      </div>
                    </div>
                    {config.isProtected && (
                      <div className="mt-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                          Protegido
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {selectedColumn ? (
            <>
              <div className="bg-muted/30 rounded-xl p-6 border border-border">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">{selectedColumn}</h3>
                    <p className="text-muted-foreground mt-1">
                      Configure como esta coluna será processada
                    </p>
                  </div>
                  <Button
                    onClick={() => toggleProtection(selectedColumn)}
                    variant={currentConfig.isProtected ? "destructive" : "outline"}
                    size="sm"
                  >
                    {currentConfig.isProtected ? (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Desproteger
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4 mr-2" />
                        Proteger
                      </>
                    )}
                  </Button>
                </div>

                {currentConfig.isProtected ? (
                  <div className="bg-card rounded-lg p-6 border border-destructive/20">
                    <div className="flex items-center justify-center space-x-3 text-destructive">
                      <Lock className="h-6 w-6" />
                      <div>
                        <p className="font-semibold">Coluna Protegida</p>
                        <p className="text-sm mt-1 text-muted-foreground">Esta coluna não será alterada em nenhum momento</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Statistics */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-card rounded-lg p-4 border border-border text-center">
                        <p className="text-2xl font-bold text-foreground">{totalValues}</p>
                        <p className="text-sm text-muted-foreground">Total</p>
                      </div>
                      <div className="bg-card rounded-lg p-4 border border-border text-center">
                        <p className="text-2xl font-bold text-warning">{emptyValues}</p>
                        <p className="text-sm text-muted-foreground">Vazios</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {totalValues > 0 ? ((emptyValues / totalValues) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                      <div className="bg-card rounded-lg p-4 border border-border text-center">
                        <p className="text-2xl font-bold text-success">{uniqueValues}</p>
                        <p className="text-sm text-muted-foreground">Únicos</p>
                      </div>
                    </div>

                    {/* Action Selection */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-foreground">Ação para esta coluna</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {actionOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleActionChange(selectedColumn, option.value)}
                            className={`
                              p-4 rounded-xl border-2 text-left transition-all
                              ${currentConfig.action === option.value
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/30'
                              }
                            `}
                          >
                            <div className="font-medium text-foreground">{option.label}</div>
                            <div className="text-sm text-muted-foreground mt-1">{option.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Default Value */}
                    {(currentConfig.action === 'default_all' || currentConfig.action === 'default_empty') && (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-foreground">Valor Default</h4>
                        <Input
                          type="text"
                          value={currentConfig.defaultValue || ''}
                          onChange={(e) => handleDefaultValueChange(selectedColumn, e.target.value)}
                          placeholder="Digite o valor padrão para esta coluna"
                        />
                        <p className="text-sm text-muted-foreground">
                          {currentConfig.action === 'default_all'
                            ? 'Todos os valores serão substituídos por este termo'
                            : 'Apenas campos vazios serão preenchidos com este termo'}
                        </p>
                      </div>
                    )}

                    {/* Data Examples */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-foreground">Exemplos de Dados</h4>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="text-sm text-muted-foreground mb-2">Valores encontrados:</div>
                        <div className="space-y-1">
                          {columnData
                            .filter(v => v && String(v).trim() !== '')
                            .slice(0, 5)
                            .map((value, index) => (
                              <div key={index} className="px-3 py-2 bg-card rounded border border-border text-sm">
                                {String(value).substring(0, 60)}
                                {String(value).length > 60 ? '...' : ''}
                              </div>
                            ))}
                        </div>
                        {emptyValues > 0 && (
                          <div className="mt-4 text-sm text-warning">
                            ⚠️ {emptyValues} campo(s) vazio(s) encontrado(s)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center bg-muted/30 rounded-xl min-h-[400px]">
              <div className="text-center">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Selecione uma coluna para configurar</p>
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
              Avançar para Abreviaturas
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColumnMapper;