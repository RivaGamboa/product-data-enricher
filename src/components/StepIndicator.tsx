import { Upload, Settings, Database, Image, Tag, Search, Download, LucideIcon } from 'lucide-react';

interface Step {
  id: number;
  name: string;
  icon: LucideIcon;
}

interface StepIndicatorProps {
  currentStep: number;
}

const steps: Step[] = [
  { id: 1, name: 'Upload', icon: Upload },
  { id: 2, name: 'Colunas', icon: Settings },
  { id: 3, name: 'Abreviaturas', icon: Database },
  { id: 4, name: 'Imagens', icon: Image },
  { id: 5, name: 'Identificação', icon: Tag },
  { id: 6, name: 'Duplicidades', icon: Search },
  { id: 7, name: 'Resultados', icon: Download }
];

const StepIndicator = ({ currentStep }: StepIndicatorProps) => {
  return (
    <nav className="flex items-center justify-center mb-12 overflow-x-auto px-2">
      <ol className="flex items-center space-x-1 md:space-x-4">
        {steps.map((stepItem, index) => {
          const StepIcon = stepItem.icon;
          const isActive = currentStep === stepItem.id;
          const isCompleted = currentStep > stepItem.id;

          return (
            <li key={stepItem.id} className="flex items-center">
              <div className="relative flex flex-col items-center">
                <div
                  className={`
                    step-indicator transition-all duration-300
                    ${isActive ? 'step-indicator-active scale-110' : ''}
                    ${isCompleted ? 'step-indicator-completed' : ''}
                    ${!isActive && !isCompleted ? 'step-indicator-pending' : ''}
                  `}
                >
                  <StepIcon
                    className={`
                      h-5 w-5 md:h-6 md:w-6 transition-colors
                      ${isActive ? 'text-primary' : ''}
                      ${isCompleted ? 'text-success' : ''}
                      ${!isActive && !isCompleted ? 'text-muted-foreground' : ''}
                    `}
                  />
                </div>
                <span
                  className={`
                    absolute top-full mt-2 text-xs md:text-sm font-medium whitespace-nowrap
                    ${isActive ? 'text-primary' : ''}
                    ${isCompleted ? 'text-success' : ''}
                    ${!isActive && !isCompleted ? 'text-muted-foreground' : ''}
                  `}
                >
                  {stepItem.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`
                    h-0.5 w-4 md:w-10 mx-1 transition-colors duration-300
                    ${isCompleted ? 'bg-success' : 'bg-border'}
                  `}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default StepIndicator;