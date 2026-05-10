'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle } from 'lucide-react'

export default function AdminSetupPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handlePromoteAdmin = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/promote-self', {
        method: 'POST',
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ 
          type: 'success', 
          text: 'Promoted to admin! Refresh the page to see the Admin panel.' 
        })
      } else {
        setMessage({ 
          type: 'error', 
          text: data.error || 'Failed to promote to admin' 
        })
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Error: ' + (error as Error).message 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-foreground mb-2">Admin Setup</h1>
        <p className="text-muted-foreground mb-6">
          Click the button below to promote your account to admin and access the administration panel.
        </p>

        <Button
          onClick={handlePromoteAdmin}
          disabled={loading}
          className="w-full mb-6"
        >
          {loading ? 'Promoting...' : 'Promote to Admin'}
        </Button>

        {message && (
          <div className={`flex items-start gap-3 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">
            After promotion, you can access the admin panel from the sidebar menu in the dashboard.
          </p>
          <a
            href="/"
            className="text-primary hover:underline text-sm"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
