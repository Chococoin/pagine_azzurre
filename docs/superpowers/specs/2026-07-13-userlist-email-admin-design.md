# Gestione Utenti: numerazione, data iscrizione, email admin → utente

Data: 2026-07-13. Approvato in sessione.

## Obiettivo

Tre aggiunte alla tabella admin "Gestione Utenti" (`/userlist`):

1. Numero sequenziale per data di iscrizione (visuale, non persistito).
2. Colonna con la data di iscrizione.
3. Cliccando sull'email si apre una pagina, riservata all'admin, per inviare
   un'email a quell'utente.

## Decisioni

- **Numerazione**: la tabella viene ordinata per `createdAt` ascendente
  (utente più vecchio = #1); il numero è l'indice di riga calcolato al
  render. Nessuna migrazione DB; l'eliminazione di un utente rinumera i
  successivi.
- **UI email**: pagina dedicata `/user/[id]/email` (non modal), coerente con
  `/user/[id]/edit`.
- **Formato**: campo Oggetto + Messaggio in testo semplice; il server
  avvolge il contenuto nel template HTML standard (`createEmailTemplate`).

## Componenti

### 1. `src/app/userlist/page.tsx`

- Ordina gli utenti per `createdAt` asc dopo il fetch (l'API `/api/users`
  restituisce già `createdAt`: il `toJSON` del modello rimuove solo i campi
  segreti).
- Nuova colonna `#` in testa (indice + 1).
- Nuova colonna `Iscrizione` dopo Email: `toLocaleDateString('it-IT')`.
- La cella Email diventa un link a `/user/[id]/email`.

### 2. `src/app/user/[id]/email/page.tsx` (nuova, client)

- Guard admin identico a userlist (redirect `/signin`).
- Carica il destinatario via `GET /api/users/[id]` (username + email).
- Form: Oggetto (input), Messaggio (textarea), Invia / Annulla.
- Successo → messaggio di conferma e ritorno a `/userlist`.

### 3. `POST /api/users/[id]/email` (nuova route)

Segue il pattern hardening di `/api/orders/mailing`:

- 401 se la sessione non è admin.
- Rate limit con `enforceRateLimits`: bucket IP (20/h) + bucket sender (10/h).
- Validazione: id ObjectId valido; oggetto e corpo stringhe non vuote dopo
  trim; cap 200 (oggetto) / 2000 (corpo); strip dei tag HTML su entrambi.
- Destinatario caricato dal DB; 404 se assente, senza email o soft-deleted.
- Invio tramite nuova `sendAdminMessageEmail(to, recipientName, subject,
  body)` in `src/lib/services/email.ts` (usa `createEmailTemplate` +
  `sendEmailWithProvider`; in dev esce su Ethereal).
- Risposta 202 come il mailing esistente.

## Error handling

- Errori di invio → 500 con messaggio italiano, come il mailing ordini.
- Client: MessageBox danger su errore, disabilita Invia durante submit.

## Test / verifica

Il repo non ha test API esistenti; verifica end-to-end nel browser con i dati
seed locali (admin `mario@example.com`) e controllo dell'email su Ethereal.
