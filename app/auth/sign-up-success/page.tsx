'use client'

import Link from 'next/link'
import { Mail, CheckCircle } from 'lucide-react'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-success" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Verifiez votre email</h1>
        <p className="text-muted-foreground mb-6">
          Nous vous avons envoye un email de confirmation. 
          Cliquez sur le lien dans l&apos;email pour activer votre compte.
        </p>
        <div className="p-4 bg-muted rounded-lg mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4 text-success" />
            <span>Email envoye avec succes</span>
          </div>
        </div>
        <Link
          href="/auth/login"
          className="inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Retour a la connexion
        </Link>
      </div>
    </div>
  )
}
