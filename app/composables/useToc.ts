export interface TocItem {
  id: string
  text: string
  depth: number
}

export const useToc = () => useState<TocItem[]>('docs-toc', () => [])
