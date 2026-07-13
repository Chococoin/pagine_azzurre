# Profilo: sezione wallet Valazco come "sperimentale" in fondo alla pagina

Data: 2026-07-13. Approvato in sessione (opzione A).

## Obiettivo

Il blocco wallet del Profilo Personale (Valazco account, Saldo, QR code,
"Integration with Metamask", Connetti Wallet, Secret/Reveal) non è ancora
pienamente funzionante. Invece di nasconderlo, lo spostiamo in fondo al
profilo e lo presentiamo come sezione sperimentale in cerca di beta tester.

## Decisioni

- **Posizione**: dopo il bottone "Aggiorna Profilo", in fondo al form.
- **CTA**: solo testo informativo — nessun endpoint, nessun campo DB.
- **Implementazione**: wrapper inline in `src/app/profile/page.tsx`
  (opzione A); la logica esistente (stati, handler, ConnectWallet) non si
  sposta né cambia.
- **Visibilità**: invariata — solo utenti verificati.

## Modifica (un solo file: `src/app/profile/page.tsx`)

1. Nuovi styled-components nel file: `ExperimentalSection` (card con bordo
   tratteggiato, sfondo ambra tenue, margine superiore), `ExperimentalBadge`
   ("🧪 SPERIMENTALE") e `ExperimentalIntro` (testo introduttivo).
2. Il blocco JSX del wallet viene tagliato dalla posizione attuale (subito
   dopo Username) e incollato dopo `SubmitButton`, avvolto in
   `ExperimentalSection` con titolo "Portafoglio Valazco (Beta)" e testo:
   "Questa sezione è in fase di test e non è ancora pienamente funzionante.
   Stiamo cercando beta tester: se vuoi aiutarci a provarla, scrivici!".

## Verifica

Browser locale come utente verificato: il wallet non appare più in cima,
appare in fondo dentro la card sperimentale; Reveal e QR continuano a
funzionare.
