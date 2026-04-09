'use client'
import { useEffect, useState } from 'react'

export interface CampaignProgress {
  status:     string
  sentCount:  number
  failedCount: number
  totalCount: number
  sent:       number
  failed:     number
  pending:    number
}

export function useCampaignProgress(campaignId: string, enabled = true) {
  const [progress, setProgress] = useState<CampaignProgress | null>(null)

  useEffect(() => {
    if (!enabled) return
    const es = new EventSource(`/api/campaigns/${campaignId}/progress`)
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as CampaignProgress
        setProgress(data)
        if (['completed', 'failed'].includes(data.status)) es.close()
      } catch {}
    }
    es.onerror = () => es.close()
    return () => es.close()
  }, [campaignId, enabled])

  return progress
}
