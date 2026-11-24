# Host sign-in is Google plus an allowlist in the database

Hosting must be limited to approved people without involving a company IT department or managing passwords. We chose Google sign-in with an allowlist of verified emails stored at `/allowedHosts`, enforced by the security rules and edited in the Firebase console. We rejected filtering on an email domain (Google accounts for some company addresses hand off to another identity provider and fail with a 400 error, so the filter would block the people it should admit), Microsoft Entra sign-in (needs an app registration from company IT), and GitHub sign-in (private or personal emails make email and domain checks unreliable).

## Consequences

- Hosts need a Google account that signs in without a handoff to another identity provider, such as a personal Gmail address.
- Adding or removing a Host is a manual edit of the list in the console, with no deploy. The list is kept out of the public repository.
- Revisit this if a company-wide "anyone at the domain" rule becomes worth an IT request.
