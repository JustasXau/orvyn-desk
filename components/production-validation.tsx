/**
 * Production Validation Component
 * Affiche l'état des env vars et permet de lancer les tests audit
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react'
import { runAuditAllEndpoints } from '@/lib/production-audit'

interface EnvVar {
  key: string
  status: 'configured' | 'missing' | 'empty'
  value?: string
}

const REQUIRED_ENV_VARS = [
  'GROQ_API_KEY',
  'FINNHUB_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'GNEWS_API_KEY',
  'NEWSAPI_KEY',
]

export function ProductionValidation() {
  const [envVars, setEnvVars] = useState<EnvVar[]>([])
  const [auditResults, setAuditResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [auditRunning, setAuditRunning] = useState(false)

  useEffect(() => {
    // Check env vars on client side
    const vars: EnvVar[] = REQUIRED_ENV_VARS.map(key => {
      // Client can only see NEXT_PUBLIC_* vars
      if (key.startsWith('NEXT_PUBLIC_')) {
        const value = (globalThis as any)[`process`]?.env?.[key]
        return {
          key,
          status: value ? 'configured' : 'missing',
          value: value ? '***' : undefined,
        }
      }
      // Server-side vars cannot be checked from client
      return {
        key,
        status: 'empty', // Unknown from client
      }
    })
    setEnvVars(vars)
  }, [])

  const handleRunAudit = async () => {
    setAuditRunning(true)
    try {
      const results = await runAuditAllEndpoints()
      setAuditResults(results)
    } catch (error) {
      console.error('Audit failed:', error)
    } finally {
      setAuditRunning(false)
    }
  }

  const passedCount = auditResults.filter(r => r.status === 200).length
  const failedCount = auditResults.filter(r => r.status !== 200 && r.status !== null).length

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      {/* Environment Variables Status */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables Status</CardTitle>
          <CardDescription>Vérification des variables requises en production</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {envVars.map(({ key, status }) => (
            <div key={key} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <span className="font-mono text-sm">{key}</span>
              <div className="flex items-center gap-2">
                {status === 'configured' && (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-xs text-green-600">Configured</span>
                  </>
                )}
                {status === 'missing' && (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-xs text-red-600">Missing</span>
                  </>
                )}
                {status === 'empty' && (
                  <>
                    <Clock className="w-5 h-5 text-yellow-500" />
                    <span className="text-xs text-yellow-600">Server-only (check Vercel)</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Audit Button */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoints Audit</CardTitle>
          <CardDescription>Test tous les 25 endpoints en production</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleRunAudit}
            disabled={auditRunning}
            className="w-full"
          >
            {auditRunning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Running Audit...
              </>
            ) : (
              'Run Production Audit'
            )}
          </Button>

          {auditResults.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{passedCount}</div>
                      <div className="text-xs text-muted-foreground">Passed</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{auditResults.length}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Results */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {auditResults.map((result, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${
                      result.status === 200
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono text-sm">{result.path}</div>
                        <div className="text-xs text-muted-foreground">{result.method}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${result.status === 200 ? 'text-green-600' : 'text-red-600'}`}>
                          {result.status || 'Timeout'}
                        </div>
                        <div className="text-xs text-muted-foreground">{result.responseTime}ms</div>
                      </div>
                    </div>
                    {result.error && (
                      <div className="text-xs text-red-600 mt-1">{result.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
