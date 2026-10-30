# Custo Certo

**Restaurant operations and cost visibility | Next.js · TypeScript · Firebase**

Custo Certo is a web application prototype for restaurant operations, focused on organizing purchasing, expenses, inventory, recipe costs, and CMV (food cost) across one or more locations.

**Project status:** active development. The modules and AI flows below are present in the source tree; this repository snapshot does not claim that every workflow is complete or production-validated.

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

- The repository contains Firestore rules that scope access by user role and store. The rules were updated in this snapshot, but have **not** been deployed to Firebase or validated with the Rules Simulator as part of this GitHub sync.
- Storage rules are managed separately and are not included in this repository snapshot.
- The live Firebase preview currently opens at the login screen; authenticated workflows and production readiness have not been independently verified.

## Resumo em português

Protótipo de gestão para restaurantes com módulos de compras, despesas, estoque, receitas, produção, CMV, relatórios, checklists e fluxos de IA. O projeto está em desenvolvimento; as funções e regras descritas refletem o código versionado e não equivalem a uma validação completa em produção.
