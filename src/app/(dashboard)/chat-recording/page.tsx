import ChatRecordingClient from './ChatRecordingClient'

function getServiceAccountEmail(): string | null {
  try {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    if (!raw) return null
    const parsed = JSON.parse(raw) as { client_email?: string }
    return parsed.client_email ?? null
  } catch {
    return null
  }
}

export default function ChatRecordingPage() {
  const serviceAccountEmail = getServiceAccountEmail()
  return <ChatRecordingClient serviceAccountEmail={serviceAccountEmail} />
}
