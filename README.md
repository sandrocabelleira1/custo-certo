# Custo Certo

**Restaurant operations and cost visibility | Next.js · TypeScript · Firebase**

Custo Certo is a web application for restaurant operations, focused on organizing purchasing, expenses, inventory, recipe costs, and CMV (food cost) across one or more locations.

**Operational history:** the project owner reports one year of use in Bruxas Burger stores. Current maintenance focuses on security, reproducible builds, and regression checks. This report of real-world use does not imply that every feature or current revision has been independently verified.

## What is represented in the code

- **Finance:** purchases, suppliers, expenses, accounts payable, revenue, dashboards, and monthly closing reports.
- **Inventory and production:** ingredient catalog, stock adjustments, inventory counts, recipes, production, and purchase suggestions.
- **Operations:** store and user management, checklists, procedure manuals (POPs), and shelf-life labels.
- **AI flows (Genkit):** financial and recipe analysis, checklist and manual generation, sales projections with weather data, and barcode reading.

## Technology

- Next.js 15, React 18, TypeScript, Tailwind CSS
- Firebase Authentication, Cloud Firestore, Firebase Storage, and Firebase App Hosting configuration
- Genkit with Google AI
- Radix UI / shadcn-style components, Lucide, Recharts, and jsPDF

## Run locally

Requirements: Node.js, npm, and a Firebase project configured for the services used by the app. AI flows also require Google AI credentials.

```bash
npm ci
npm run dev
```

The development server uses port 9002. Configure Firebase and AI access for your own environment before using those features. Environment files are excluded from Git; never commit credentials.

## Security and deployment notes

- The repository contains Firestore rules that scope access by user role and store. Firebase API verification on 2026-10-31 confirmed a Firestore rules release updated on 2026-10-30. The Rules API passed 24 unauthenticated-access denial tests and 12 role/store authorization tests.
- Storage rules are versioned in `storage.rules` and were deployed on 2026-10-31. Sixteen Rules API tests passed for role/store boundaries, denied anonymous access, file types, and size limits.
- The Firebase backend is connected to this repository, branch `main`. Rollout `rollout-2026-10-30-000` succeeded for commit `e53bc54`; the public login returned HTTP 200. Maintenance changes on this branch are not deployed yet.

## Resumo em português

Aplicação de gestão para restaurantes com módulos de compras, despesas, estoque, receitas, produção, CMV, relatórios, checklists e fluxos de IA. O responsável relata um ano de uso nas lojas da rede Bruxas Burger. As verificações desta manutenção cobrem a revisão atual; não substituem esse histórico operacional.
