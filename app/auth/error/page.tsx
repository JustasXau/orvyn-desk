'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Erreur d&apos;authentification</h1>
        <p className="text-muted-foreground mb-6">
          Une erreur s&apos;est produite lors de l&apos;authentification. 
          Veuillez reessayer ou contacter le support si le probleme persiste.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/login"
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Retour a la connexion
          </Link>
          <Link
            href="/"
            className="px-6 py-2.5 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
