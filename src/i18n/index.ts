import { useCallback } from 'react';
import en from './en.json';
import vi from './vi.json';
import { useSettings } from '@/store/settings';

export type Lang = 'en' | 'vi';
export type StringKey = keyof typeof en;

const tables: Record<Lang, Record<string, string>> = { en, vi };

/** Supports Android-style positional args: %1$s, %2$d. */
export function format(template: string, args: (string | number)[]): string {
  return template.replace(/%(\d+)\$[sd]/g, (_, i) => String(args[Number(i) - 1] ?? ''));
}

export function translate(lang: Lang, key: StringKey, ...args: (string | number)[]): string {
  const raw = tables[lang][key] ?? tables.en[key] ?? key;
  return args.length ? format(raw, args) : raw;
}

export function useT() {
  const lang = useSettings((s) => s.language);
  return useCallback((key: StringKey, ...args: (string | number)[]) => translate(lang, key, ...args), [lang]);
}
