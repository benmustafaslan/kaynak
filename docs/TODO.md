# To-do for later

- [ ] **Format Templates** will be designed.

- [ ] **Invite by email** – Allow adding members by email: create an invite link and send it to their email. Backend: optional `email` on invite, email service (e.g. Nodemailer or Resend), extend `createInvite` to send when email provided. Frontend: email input in Invite modal + “Send invite”. Link handling is already in place: recipient clicks `/w/join?token=...` → login if needed → accept.
