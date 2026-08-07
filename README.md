<<<<<<< HEAD
# Arogya Relay

Arogya Relay is an offline-first disease-monitoring interface designed for
community health workers operating in remote and low-connectivity areas. The
prototype explores how field teams could record screenings, identify emerging
health signals, prioritize follow-ups, prepare referrals, and synchronize
reports when connectivity returns.

> [!IMPORTANT]
> Arogya Relay is a research and user-interface prototype. It is not a
> certified medical device, diagnostic product, or substitute for clinical
> judgment. All people, readings, locations, and case records shown in the
> application are fictional demonstration data.

## Current Prototype

The interface currently demonstrates:

- A field overview with screening and follow-up summaries
- Syndromic trend visualization for possible outbreak signals
- Priority case queues for urgent and routine review
- A guided screening form for symptoms and vital-sign readings
- Offline report status and simulated synchronization
- Referral summaries and follow-up tracking
- Battery, sensor, and local-storage diagnostics for a proposed field device
- Responsive layouts for desktop, tablet, and mobile screens
- Clear screening-support and non-diagnostic safety messaging

The current version is frontend-only. It does not connect to physical sensors,
store real patient records, perform clinical diagnosis, or send reports to a
health authority.

## Technology

- Next.js 16 and React 19
- TypeScript
- Tailwind CSS
- Vinext and Vite
- Cloudflare Workers-compatible build tooling
- Optional Drizzle ORM and Cloudflare D1 scaffolding for future development

## Requirements

- Node.js 22.13.0 or later
- npm

## Local Development

Clone the repository, install its dependencies, and start the development
server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser. The project
uses a cross-platform launcher, so the same commands work in PowerShell,
Command Prompt, macOS, and Linux terminals.

Create a production build with:

```bash
npm run build
```

Run the production build locally with:

```bash
npm run start
```

## Useful Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create and validate a production build |
| `npm run start` | Run the production build locally |
| `npm run lint` | Check the source with ESLint |
| `npm test` | Build and run the included rendered-output test |
| `npm run db:generate` | Generate Drizzle migrations after schema changes |

## Project Structure

```text
app/                    Application interface and global styling
build/                  Cross-platform Vinext launcher and Sites build support
db/                     Optional database connection and schema scaffolding
drizzle/                Database migration metadata
public/                 Static assets
tests/                  Rendered-output checks
worker/                 Cloudflare Worker entry point
.openai/hosting.json    Sites deployment configuration
```

## Security and Privacy

Do not collect or process real patient information with this prototype. A
production healthcare implementation should be designed and reviewed with
qualified clinical, security, privacy, legal, and regulatory specialists.

Before any real-world pilot, the project would need at least:

- Strong authentication, authorization, and role-based access controls
- Encryption in transit and at rest with managed key rotation
- Data minimization, consent handling, retention limits, and secure deletion
- Tamper-resistant audit logs and incident-response procedures
- Secret management with no credentials committed to source control
- Input validation, rate limiting, dependency scanning, and threat modeling
- Secure offline storage and conflict-safe synchronization
- Backup, recovery, availability, and device-loss procedures
- Compliance review for applicable health, privacy, and medical-device laws
- Independent penetration testing and clinical safety validation

Environment files are excluded by `.gitignore`. Never commit API keys,
credentials, access tokens, private certificates, or real patient data.

## Medical and Regulatory Limitations

The displayed alerts and thresholds are illustrative and must not be treated as
clinical rules. Any production scoring, triage, or referral logic must be
defined by qualified clinicians, validated for the intended population, and
approved under the regulations that apply in each deployment region.

## Suggested Next Steps

1. Review the threat model, privacy requirements, and intended users.
2. Define clinically approved screening and referral protocols.
3. Add authenticated, encrypted, and auditable data storage.
4. Develop secure offline synchronization and conflict resolution.
5. Integrate validated sensors through a documented hardware interface.
6. Conduct accessibility, usability, security, and clinical-safety testing.

## Contributing

Use a separate branch for each change. Run the build and lint checks before
opening a pull request, and never include sensitive health data in issues,
commits, screenshots, test fixtures, or example records.
=======
# Arogya-Relay
Arogya Relay is an offline-first disease-monitoring prototype for health workers in remote areas. It supports guided screenings, vital-sign capture, outbreak alerts, priority case queues, referrals, device diagnostics, and delayed report syncing. Built with Next.js, React, TypeScript, Vinext, and Cloudflare tooling.
>>>>>>> c20934c1141cf07d7c6dbc1f6e2e36645eb76bf4
