// Calcul du RSI (Relative Strength Index) — periode 14 par defaut

export function calcRSI(closes: number[], period = 14): number[] {
  if (closes.length < period + 1) return []

  const gains: number[] = []
  const losses: number[] = []

  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    gains.push(diff > 0 ? diff : 0)
    losses.push(diff < 0 ? Math.abs(diff) : 0)
  }

  // Premiere moyenne (SMA)
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period

  const result: number[] = []

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    result.push(100 - 100 / (1 + rs))
  }

  return result
}

export function getLatestRSI(closes: number[], period = 14): number | null {
  const rsis = calcRSI(closes, period)
  return rsis.length > 0 ? Math.round(rsis[rsis.length - 1] * 10) / 10 : null
}

export function interpretRSI(rsi: number): string {
  if (rsi >= 80) return `RSI ${rsi} — fortement surachete, risque de retournement eleve`
  if (rsi >= 70) return `RSI ${rsi} — zone de surachat, prudence`
  if (rsi >= 60) return `RSI ${rsi} — momentum haussier fort, pas encore surachete`
  if (rsi >= 45) return `RSI ${rsi} — zone neutre haussiere`
  if (rsi >= 35) return `RSI ${rsi} — zone neutre baissiere`
  if (rsi >= 30) return `RSI ${rsi} — zone de survente, potentiel rebond`
  return `RSI ${rsi} — fortement survendu, signal de retournement possible`
}
