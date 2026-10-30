# Custo Certo - Sistema Inteligente de Gestão Gastronômica

O **Custo Certo** é uma plataforma ERP (Enterprise Resource Planning) e de BI (Business Intelligence) especializada para restaurantes, com foco em operações multi-unidades (redes de franquias ou lojas próprias). O sistema une gestão financeira, controle de estoque em tempo real e automação via Inteligência Artificial para garantir a saúde financeira e a padronização operacional.

## 1. Objetivo Central
O objetivo primordial do sistema é o **Controle do CMV (Custo de Mercadoria Vendida)**. Através do monitoramento preciso de entradas (compras) e saídas (vendas e produção), o Custo Certo permite que o proprietário identifique desvios, desperdícios e flutuações de preços que afetam a lucratividade do negócio.

## 2. Personas e Permissões
O sistema opera com três níveis de acesso distintos para garantir a segurança dos dados:
*   **Master (Proprietário/Administrador)**: Acesso total a todas as lojas, relatórios consolidados, gestão de usuários, configuração de metas globais e exclusão de registros sensíveis.
*   **Gerente**: Responsável por uma unidade específica. Gerencia faturamento, compras, contas a pagar, fichas técnicas e equipe da sua loja.
*   **Colaborador**: Foco operacional. Registra saídas de estoque, realiza balanço físico, executa checklists de abertura/fechamento e imprime etiquetas de validade.

## 3. Principais Módulos e Funções

### A. Gestão Financeira e Estratégica
*   **Faturamento Diário**: Registro das receitas da loja com gráficos de flutuação mensal.
*   **Lançamento de Compras**: Entrada de notas fiscais com upload de anexo (foto/PDF). O sistema atualiza automaticamente o custo unitário e o custo médio dos insumos.
*   **Contas a Pagar**: Gestão de boletos com leitor de código de barras via câmera (IA). Permite acompanhar vencimentos, agendamentos (PIX) e histórico de pagamentos.
*   **Análise de CMV Mensal**: Ferramenta de fechamento que cruza estoque inicial, compras, estoque final e faturamento para entregar o percentual de CMV real do mês.
*   **Projeção de Vendas (IA)**: Assistente que utiliza dados históricos e **previsão do tempo (OpenWeather)** para distribuir metas diárias de faturamento, ajudando o gerente a planejar compras e escalas.

### B. Gestão de Estoque e Produção
*   **Catálogo de Insumos**: Gestão por categoria (Alimentos, Bebidas, etc.) com unidades de medida e histórico de preços.
*   **Produção e Desmembramento**: 
    *   *Desmembramento*: Transforma um insumo bruto em vários processados (ex: 1 Peça de Alcatra -> Bife, Carne de Panela e Gordura).
    *   *Via Receita*: Produz itens compostos (ex: Maionese da Casa) baixando automaticamente os ingredientes do estoque com base na Ficha Técnica.
*   **Assistente de Compras**: Analisa o consumo das últimas 4 semanas e o estoque atual para sugerir o que precisa ser comprado.
*   **Balanço de Estoque**: Ferramenta para contagem física que gera ajustes automáticos no sistema e relatórios de perdas/ganhos em PDF.

### C. Padronização Operacional (Qualidade)
*   **Fichas Técnicas (Technical Sheets)**: Detalhamento completo de pratos com custo de produção, preço de venda sugerido, cálculo automático de CMV e análise de alergênicos via IA.
*   **Checklists e POPs**: Criação e execução de checklists digitais (Abertura, Fechamento, Limpeza). Permite gerar Manuais de Procedimento (SOPs) via IA para auditorias sanitárias.
*   **Gerador de Etiquetas**: Emissão de etiquetas de validade (Resfriado/Congelado) seguindo as normas da vigilância sanitária, com informações de lote, responsável e ingredientes.

## 4. Integração com Inteligência Artificial (Genkit)
O Custo Certo utiliza modelos avançados de IA (Gemini 2.0 Flash) para automatizar tarefas complexas:
1.  **Leitura de Boletos (OCR)**: Extração de números de códigos de barras a partir de fotos.
2.  **Nutricionista Virtual**: Analisa ingredientes das receitas para gerar tabelas nutricionais e identificar alergênicos comuns.
3.  **Consultoria de Processos**: Gera checklists detalhados e manuais técnicos (Markdown) sobre qualquer tópico operacional de cozinha.
4.  **Estrategista de Vendas**: Calcula metas diárias considerando feriados e clima (ex: aumenta meta de bebidas se a previsão for de sol intenso).

## 5. Stack Tecnológica
*   **Frontend**: Next.js 15 (App Router), React, Tailwind CSS.
*   **Componentes**: Shadcn/UI (Radix UI) e Lucide Icons.
*   **Backend & Database**: Firebase (Firestore, Authentication, Storage).
*   **IA**: Google Genkit com modelos Gemini.
*   **Relatórios**: Recharts (Gráficos) e jsPDF (Documentos).

---
*Este sistema é uma propriedade intelectual dedicada à excelência na gestão gastronômica.*
