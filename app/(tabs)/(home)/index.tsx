useEffect(() => {
  let isMounted = true

  const loadApprovedPublications = async () => {
    try {
      console.log('Seranova: Loading approved publications...')

      const { data, error } = await supabase
        .from('media_items')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (error) {
        console.log('Seranova: Supabase error while loading media_items:', error)
        if (isMounted) setApprovedPublications([])
        return
      }

      if (isMounted) {
        setApprovedPublications(data ?? [])
        console.log('Seranova: Loaded publications:', (data ?? []).length)
      }
    } catch (e) {
      console.log('Seranova: Fatal error while loading publications:', e)
      if (isMounted) setApprovedPublications([])
    } finally {
      if (isMounted) {
        setIsLoaded(true) // 🔴 CRITIQUE : débloque l’UI quoi qu’il arrive
        console.log('Seranova: isLoaded = true')
      }
    }
  }

  loadApprovedPublications()

  return () => {
    isMounted = false
  }
}, [])