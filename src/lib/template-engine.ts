export function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '')
}
export function extractVariables(tpl: string): string[] {
  return [...new Set([...tpl.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))]
}
