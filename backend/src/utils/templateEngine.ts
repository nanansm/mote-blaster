export function renderTemplate(template: string, variables: Record<string, string | undefined>): string {
  let rendered = template;

  // Replace {{variable}} with actual values
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    }
  });

  // Clean up any remaining empty variables
  rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');

  return rendered;
}

export function extractVariables(template: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    const varName = match[1].trim();
    if (!variables.includes(varName)) {
      variables.push(varName);
    }
  }

  return variables;
}
