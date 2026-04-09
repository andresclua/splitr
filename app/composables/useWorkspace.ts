export interface Workspace {
  id: string
  name: string
  slug: string
  plan: string
  domain: string | null
  auto_join_domain: boolean
  role: string
}

export const useWorkspace = () => {
  const workspaces = useState<Workspace[]>('workspaces', () => [])
  const loading = useState<boolean>('workspaces.loading', () => false)

  const fetchWorkspaces = async () => {
    loading.value = true
    const data = await $fetch<Workspace[]>('/api/workspaces')
    workspaces.value = data
    loading.value = false
  }

  const currentWorkspace = computed(() => {
    const route = useRoute()
    const slug = route.params.slug as string | undefined
    if (!slug) return workspaces.value[0] ?? null
    return workspaces.value.find(w => w.slug === slug) ?? null
  })

  return { workspaces, currentWorkspace, loading, fetchWorkspaces }
}
