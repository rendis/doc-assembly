import type { Variable } from '../../data/variables';
import type { InjectableFormValues, InjectableFormErrors } from '../../types/preview';
import { InjectableInput } from './InjectableInput';
import { INTERNAL_INJECTABLE_KEYS } from '../../types/injectable';

interface StandardInjectablesSectionProps {
  variables: Variable[];
  values: InjectableFormValues;
  errors: InjectableFormErrors;
  onChange: (variableId: string, value: any) => void;
}

export function StandardInjectablesSection({
  variables,
  values,
  errors,
  onChange,
}: StandardInjectablesSectionProps) {
  // Filtrar inyectables de sistema para que NO aparezcan en esta sección
  const nonSystemVariables = variables.filter(
    (v) => !INTERNAL_INJECTABLE_KEYS.includes(v.variableId as any)
  );

  if (nonSystemVariables.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {nonSystemVariables.map((variable) => (
        <InjectableInput
          key={variable.variableId}
          variableId={variable.variableId}
          label={variable.label}
          type={variable.type}
          value={values[variable.variableId]}
          error={errors[variable.variableId]}
          onChange={(value) => onChange(variable.variableId, value)}
          metadata={variable.metadata}
        />
      ))}
    </div>
  );
}
