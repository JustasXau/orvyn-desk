'use client'

import { useState, useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Users, Shield, ShieldOff, Ban, CheckCircle, Trash2, 
  Search, RefreshCw, Clock, AlertTriangle, ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface User {
  id: string
  email: string
  full_name: string
  is_admin: boolean
  blocked: boolean
  blocked_at: string | null
  blocked_reason: string | null
  login_count: number
  last_login_at: string | null
  last_sign_in_at: string | null
  created_at: string
}

interface AdminLog {
  id: string
  admin_email: string
  action: string
  target_email: string | null
  details: { reason?: string } | null
  created_at: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function AdminDashboard() {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [blockReason, setBlockReason] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const { data: usersData, error: usersError } = useSWR('/api/admin/users', fetcher, {
    refreshInterval: 30000
  })
  const { data: logsData } = useSWR('/api/admin/logs', fetcher, {
    refreshInterval: 30000
  })

  const users: User[] = usersData?.users || []
  const logs: AdminLog[] = logsData?.logs || []

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const handleAction = async (action: string, userId: string, reason?: string) => {
    setLoading(userId + action)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, target_user_id: userId, reason })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      mutate('/api/admin/users')
      mutate('/api/admin/logs')
      setSelectedUser(null)
      setBlockReason('')
    } catch (err: any) {
      alert('Erreur: ' + err.message)
    } finally {
      setLoading(null)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Jamais'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'BLOCK_USER': 'Blocage',
      'UNBLOCK_USER': 'Deblocage',
      'MAKE_ADMIN': 'Promotion admin',
      'REMOVE_ADMIN': 'Retrait admin',
      'DELETE_USER': 'Suppression'
    }
    return labels[action] || action
  }

  const getActionColor = (action: string) => {
    if (action.includes('BLOCK') || action.includes('DELETE')) return 'text-red-500'
    if (action.includes('UNBLOCK')) return 'text-green-500'
    if (action.includes('ADMIN')) return 'text-purple-500'
    return 'text-muted-foreground'
  }

  if (usersError) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4 text-destructive">
          Erreur: {usersError.message || 'Acces refuse'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Administration</h1>
        <p className="text-muted-foreground text-sm">Gestion des utilisateurs et journal d'audit</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-xs text-muted-foreground">Total utilisateurs</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.filter(u => u.is_admin).length}</p>
              <p className="text-xs text-muted-foreground">Administrateurs</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.filter(u => u.blocked).length}</p>
              <p className="text-xs text-muted-foreground">Bloques</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.filter(u => !u.blocked).length}</p>
              <p className="text-xs text-muted-foreground">Actifs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            activeTab === 'users' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Utilisateurs
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            activeTab === 'logs' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Journal d'audit
        </button>
        <button
          onClick={() => {
            mutate('/api/admin/users')
            mutate('/api/admin/logs')
          }}
          className="ml-auto px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par email ou nom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Users Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Utilisateur</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Statut</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Role</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Derniere connexion</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{user.full_name || 'Sans nom'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      {user.blocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/10 text-red-500">
                          <Ban className="w-3 h-3" />
                          Bloque
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-500/10 text-green-500">
                          <CheckCircle className="w-3 h-3" />
                          Actif
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {user.is_admin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-500/10 text-purple-500">
                          <Shield className="w-3 h-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Utilisateur</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {formatDate(user.last_sign_in_at || user.last_login_at)}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        {user.blocked ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction('unblock', user.id)}
                            disabled={loading === user.id + 'unblock'}
                            className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Debloquer
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedUser(user)}
                            className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            Bloquer
                          </Button>
                        )}
                        
                        {user.is_admin ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction('remove_admin', user.id)}
                            disabled={loading === user.id + 'remove_admin'}
                            className="text-purple-500 border-purple-500/30 hover:bg-purple-500/10"
                          >
                            <ShieldOff className="w-4 h-4 mr-1" />
                            Retirer admin
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction('make_admin', user.id)}
                            disabled={loading === user.id + 'make_admin'}
                            className="text-purple-500 border-purple-500/30 hover:bg-purple-500/10"
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            Promouvoir admin
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm(`Supprimer definitivement ${user.email}?`)) {
                              handleAction('delete', user.id)
                            }
                          }}
                          disabled={loading === user.id + 'delete'}
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                Aucun utilisateur trouve
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'logs' && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Date</th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Admin</th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Action</th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Cible</th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-t border-border">
                  <td className="p-4 text-sm text-muted-foreground">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="p-4 text-sm">{log.admin_email}</td>
                  <td className="p-4">
                    <span className={cn('text-sm font-medium', getActionColor(log.action))}>
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="p-4 text-sm">{log.target_email || '-'}</td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {log.details?.reason || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {logs.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              Aucune action enregistree
            </div>
          )}
        </div>
      )}

      {/* Block Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Bloquer {selectedUser.email}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              L'utilisateur ne pourra plus se connecter. Vous pouvez le debloquer a tout moment.
            </p>
            <Input
              placeholder="Raison du blocage (optionnel)"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleAction('block', selectedUser.id, blockReason)}
                disabled={loading === selectedUser.id + 'block'}
              >
                {loading === selectedUser.id + 'block' ? 'Blocage...' : 'Confirmer le blocage'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
