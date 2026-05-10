import { COTReport } from "@/components/cot-report"

export const metadata = {
  title: "Rapport COT | Trading Dashboard",
  description: "Analyse des positions des opérateurs - Commitment of Traders Report",
}

export default function COTPage() {
  return <COTReport />
}
