import {
  auditEventSchema,
  automationRuleSchema,
  conversationMessageSchema,
  conversationPreviewSchema,
  currentUserSchema,
  dashboardMetricSchema,
  formSectionSchema,
  inboxItemSchema,
  notificationItemSchema,
  requestDetailSchema,
  requestTypeSchema,
  workflowTemplateSchema,
  workspaceAlertSchema,
} from "@/lib/workflow/types";

export const currentUser = currentUserSchema.parse({
  id: "11111111-1111-4111-8111-111111111111",
  fullName: "Julien A.",
  email: "julien.a@noria.internal",
  roleLabel: "Responsable opérations",
});

export const notificationInbox = notificationItemSchema.array().parse([
  {
    id: "99999999-9999-4999-8999-999999999901",
    userId: "11111111-1111-4111-8111-111111111111",
    title: "Validation attendue",
    body: "REQ-2026-000143 attend ton accord opérations avant 16:00.",
    createdAt: "11:14",
    isRead: false,
    channel: "in_app",
    category: "approval",
    requestReference: "REQ-2026-000143",
  },
  {
    id: "99999999-9999-4999-8999-999999999902",
    userId: "11111111-1111-4111-8111-111111111111",
    title: "Relance moteur",
    body: "Une relance automatique a été envoyée sur un dossier critique.",
    createdAt: "10:30",
    isRead: false,
    channel: "in_app",
    category: "sla",
    requestReference: "REQ-2026-000145",
  },
  {
    id: "99999999-9999-4999-8999-999999999903",
    userId: "11111111-1111-4111-8111-111111111111",
    title: "Message reçu",
    body: "Mina R. a ajouté un message dans le canal du groupe froid.",
    createdAt: "09:04",
    isRead: true,
    channel: "in_app",
    category: "message",
    requestReference: "REQ-2026-000143",
  },
]);

export const dashboardMetrics = dashboardMetricSchema.array().parse([
  {
    label: "Demandes ouvertes",
    value: "142",
    trend: "+18 cette semaine",
    tone: "neutral",
  },
  {
    label: "SLA respectés",
    value: "94%",
    trend: "+6 pts sur 30 jours",
    tone: "good",
  },
  {
    label: "Temps moyen d'approbation",
    value: "2,1 j",
    trend: "-7 h vs mois dernier",
    tone: "good",
  },
  {
    label: "Demandes à risque",
    value: "9",
    trend: "3 escalades aujourd'hui",
    tone: "warning",
  },
]);

export const requestTypes = requestTypeSchema.array().parse([
  {
    id: "budget-request",
    name: "Budget",
    department: "Finance",
    description:
      "Créer une demande budgétaire avec centre de coût, pièces jointes et validation multi-niveaux.",
    averageSlaHours: 48,
    accent: "teal",
  },
  {
    id: "repair-request",
    name: "Réparation",
    department: "Operations",
    description:
      "Centraliser les incidents site, gérer la priorité, les prestataires et les dates d'intervention.",
    averageSlaHours: 24,
    accent: "sand",
  },
  {
    id: "payment-request",
    name: "Paiement",
    department: "Finance",
    description:
      "Valider les paiements fournisseurs avec contrôle documentaire, piste d'audit et échéances.",
    averageSlaHours: 12,
    accent: "coral",
  },
  {
    id: "purchase-request",
    name: "Achat",
    department: "Procurement",
    description:
      "Gérer les achats internes, les approbateurs par montant et les justificatifs d'appel d'offres.",
    averageSlaHours: 36,
    accent: "ink",
  },
  {
    id: "it-request",
    name: "IT",
    department: "IT",
    description:
      "Traiter les demandes d'accès, de matériel ou d'intervention avec checklist et suivi de livraison.",
    averageSlaHours: 18,
    accent: "teal",
  },
  {
    id: "hr-request",
    name: "RH",
    department: "HR",
    description:
      "Suivre les dérogations, validations exceptionnelles et demandes sensibles avec historique complet.",
    averageSlaHours: 72,
    accent: "coral",
  },
]);

export const workflowTemplates = workflowTemplateSchema.array().parse([
  {
    id: "budget-above-5000",
    name: "Budget > 5 000 €",
    summary:
      "Manager, Finance puis Direction selon le montant et le département porteur.",
    coverage: "Budget, CAPEX, dépenses exceptionnelles",
    steps: [
      {
        id: "budget-manager",
        name: "Validation manager",
        type: "approval",
        assigneeLabel: "Manager du demandeur",
        rule: "Toujours",
        slaHours: 8,
      },
      {
        id: "budget-finance",
        name: "Contrôle budget",
        type: "review",
        assigneeLabel: "Finance business partner",
        rule: "Toujours",
        slaHours: 12,
      },
      {
        id: "budget-board",
        name: "Feu vert direction",
        type: "approval",
        assigneeLabel: "Directeur de département",
        rule: "Si montant >= 5 000 €",
        slaHours: 24,
      },
    ],
  },
  {
    id: "payment-vendor",
    name: "Paiement fournisseur",
    summary:
      "Validation documentaire, contrôle de budget puis émission du paiement.",
    coverage: "Factures, acomptes, règlements urgents",
    steps: [
      {
        id: "payment-docs",
        name: "Contrôle pièces",
        type: "review",
        assigneeLabel: "Comptabilité",
        rule: "Toujours",
        slaHours: 4,
      },
      {
        id: "payment-owner",
        name: "Visa responsable de budget",
        type: "approval",
        assigneeLabel: "Budget owner",
        rule: "Toujours",
        slaHours: 8,
      },
      {
        id: "payment-run",
        name: "Mise en paiement",
        type: "payment",
        assigneeLabel: "Trésorerie",
        rule: "Après approbation finale",
        slaHours: 4,
      },
    ],
  },
  {
    id: "repair-critical-site",
    name: "Incident critique site",
    summary:
      "Parcours express avec validation parallèle des opérations et de la sécurité.",
    coverage: "Bâtiment, maintenance, sécurité, urgence terrain",
    steps: [
      {
        id: "repair-triage",
        name: "Qualification",
        type: "task",
        assigneeLabel: "Office manager",
        rule: "Toujours",
        slaHours: 2,
      },
      {
        id: "repair-ops",
        name: "Accord opérations",
        type: "approval",
        assigneeLabel: "Responsable opérations",
        rule: "Parallèle",
        slaHours: 4,
      },
      {
        id: "repair-safety",
        name: "Accord sécurité",
        type: "approval",
        assigneeLabel: "Référent HSE",
        rule: "Parallèle si impact sécurité",
        slaHours: 4,
      },
    ],
  },
]);

export const approvalInbox = inboxItemSchema.array().parse([
  {
    id: "REQ-2026-000143",
    title: "Remplacement groupe froid du site Nord",
    typeName: "Réparation",
    requester: "Mina R.",
    department: "Operations",
    amount: "7 400 €",
    currentStep: "Accord opérations",
    dueLabel: "Dans 2 h",
    dueState: "soon",
    status: "in_review",
    priority: "critical",
  },
  {
    id: "REQ-2026-000144",
    title: "Paiement fournisseur Atlas Tech",
    typeName: "Paiement",
    requester: "Noah B.",
    department: "Finance",
    amount: "2 180 €",
    currentStep: "Contrôle pièces",
    dueLabel: "Aujourd'hui 17:00",
    dueState: "soon",
    status: "submitted",
    priority: "high",
  },
  {
    id: "REQ-2026-000145",
    title: "Extension budget formation Q2",
    typeName: "Budget",
    requester: "Sarah L.",
    department: "HR",
    amount: "11 000 €",
    currentStep: "Feu vert direction",
    dueLabel: "En retard 1 j",
    dueState: "overdue",
    status: "in_review",
    priority: "high",
  },
  {
    id: "REQ-2026-000146",
    title: "Achat de 24 laptops onboarding",
    typeName: "Achat",
    requester: "Mialy T.",
    department: "IT",
    amount: "18 960 €",
    currentStep: "Retour demandeur",
    dueLabel: "En attente demandeur",
    dueState: "on_track",
    status: "needs_changes",
    priority: "normal",
  },
]);

export const auditTimeline = auditEventSchema.array().parse([
  {
    id: "AUD-01",
    actor: "Workflow Engine",
    action: "Relance envoyée",
    at: "09:05",
    detail: "REQ-2026-000145 a dépassé son SLA et a déclenché une relance email + in-app.",
  },
  {
    id: "AUD-02",
    actor: "Camille D.",
    action: "Approbation",
    at: "10:14",
    detail: "Paiement Atlas Tech validé par le budget owner avec pièce jointe archivée.",
  },
  {
    id: "AUD-03",
    actor: "Nina F.",
    action: "Retour pour correction",
    at: "11:22",
    detail: "Demande achat renvoyée au demandeur pour justificatif fournisseur manquant.",
  },
  {
    id: "AUD-04",
    actor: "System",
    action: "Escalade N+1",
    at: "14:00",
    detail: "REQ-2026-000143 escaladée au directeur opérations après 2 relances sans action.",
  },
]);

export const automationRules = automationRuleSchema.array().parse([
  {
    id: "AUTO-01",
    name: "Escalade budget",
    trigger: "Montant >= 10 000 € et étape inactive depuis 6 h",
    action: "Notifier direction + déplacer dans la file prioritaire",
    status: "active",
  },
  {
    id: "AUTO-02",
    name: "Relance réparation urgente",
    trigger: "Demande critique sans prise en charge sous 30 min",
    action: "Ping Teams, email et création d'une alerte de supervision",
    status: "active",
  },
  {
    id: "AUTO-03",
    name: "Digest managers",
    trigger: "Chaque matin à 08:00",
    action: "Envoyer un résumé des validations en attente par manager",
    status: "draft",
  },
]);

export const workspaceAlerts = workspaceAlertSchema.array().parse([
  {
    id: "ALERT-01",
    title: "2 escalades planifiées avant 16:00",
    detail: "Les demandes budget supérieures à 10 000 € vont remonter au directeur si aucune action n'est prise.",
    tone: "critical",
  },
  {
    id: "ALERT-02",
    title: "Paiements bloqués par pièces jointes",
    detail: "4 demandes finance attendent un justificatif fournisseur. Le temps moyen perdu est de 6 h.",
    tone: "warning",
  },
  {
    id: "ALERT-03",
    title: "Charge équipe IT stabilisée",
    detail: "Les demandes onboarding sont revenues sous le seuil cible après l'automatisation des formulaires.",
    tone: "good",
  },
]);

export const requestCreationSections = formSectionSchema.array().parse([
  {
    title: "Contexte de la demande",
    description:
      "Les informations de base qui permettront de router la demande vers le bon workflow.",
    fields: [
      {
        label: "Type de demande",
        type: "select",
        helper: "Budget, paiement, réparation, achat, IT ou RH.",
        required: true,
      },
      {
        label: "Titre court",
        type: "text",
        helper: "Une formulation actionnable et compréhensible en un coup d'oeil.",
        required: true,
      },
      {
        label: "Description détaillée",
        type: "textarea",
        helper: "Explique le besoin, le contexte et l'impact business.",
        required: true,
      },
    ],
  },
  {
    title: "Données de décision",
    description:
      "Les champs qui conditionnent les approbateurs, le SLA et les contrôles.",
    fields: [
      {
        label: "Montant estimé",
        type: "currency",
        helper: "Déclenche les règles par seuil et les approbateurs additionnels.",
        required: false,
      },
      {
        label: "Date cible",
        type: "date",
        helper: "Permet de prioriser les demandes urgentes ou à échéance fixe.",
        required: false,
      },
      {
        label: "Niveau d'urgence",
        type: "select",
        helper: "Normal, élevé ou critique selon l'impact opérationnel.",
        required: true,
      },
    ],
  },
  {
    title: "Pièces et conformité",
    description:
      "Le socle de preuves et de contrôles avant passage dans le workflow d'approbation.",
    fields: [
      {
        label: "Pièces jointes",
        type: "file",
        helper: "Devis, facture, demande signée, justificatif ou rapport d'incident.",
        required: false,
      },
      {
        label: "Conditions réglementaires",
        type: "checkbox",
        helper: "Active les étapes sécurité, finance ou juridique selon les cas.",
        required: false,
      },
    ],
  },
]);

export const requestDetails = requestDetailSchema.array().parse([
  {
    id: "REQ-2026-000143",
    reference: "REQ-2026-000143",
    title: "Remplacement groupe froid du site Nord",
    typeName: "Réparation",
    requester: "Mina R.",
    requesterRole: "Office manager",
    department: "Operations",
    amount: "7 400 €",
    submittedAt: "23 mars 2026 · 08:42",
    dueLabel: "Échéance dans 2 h",
    dueState: "soon",
    priority: "critical",
    status: "in_review",
    currentStep: "Accord opérations",
    description:
      "Le groupe froid principal du site Nord est hors service depuis 06:20. La salle serveur secondaire monte en température et l'équipe locale demande une validation rapide du remplacement pour éviter un arrêt partiel d'activité.",
    businessRule:
      "Toute réparation critique > 5 000 € déclenche une validation opérations et une vérification sécurité.",
    templateName: "Incident critique site",
    participants: ["Mina R.", "Julien A.", "Nina F.", "Direction opérations"],
    steps: [
      {
        id: "STP-143-1",
        name: "Qualification",
        owner: "Office manager",
        status: "approved",
        deadline: "08:45",
        note: "Incident confirmé, devis prestataire reçu.",
      },
      {
        id: "STP-143-2",
        name: "Accord opérations",
        owner: "Julien A.",
        status: "active",
        deadline: "16:00",
        note: "Validation en attente avec engagement fournisseur.",
      },
      {
        id: "STP-143-3",
        name: "Accord sécurité",
        owner: "Nina F.",
        status: "pending",
        deadline: "16:00",
        note: "Contrôle d'impact HSE à initier après accord opérations.",
      },
    ],
    comments: [
      {
        id: "COM-143-1",
        author: "Mina R.",
        role: "Office manager",
        body: "Prestataire disponible sur site à 15:30 si validation avant 14:00.",
        createdAt: "09:04",
        kind: "comment",
      },
      {
        id: "COM-143-2",
        author: "Workflow Engine",
        role: "Automatisation",
        body: "Relance envoyée au responsable opérations après 90 minutes sans action.",
        createdAt: "10:30",
        kind: "system",
      },
      {
        id: "COM-143-3",
        author: "Julien A.",
        role: "Responsable opérations",
        body: "Je valide le remplacement sous réserve d'intervention aujourd'hui avant 18:00.",
        createdAt: "11:12",
        kind: "decision",
      },
    ],
    attachments: [
      {
        id: "ATT-143-1",
        name: "devis-atlas-cooling.pdf",
        size: "412 Ko",
        uploadedBy: "Mina R.",
        uploadedAt: "08:43",
      },
      {
        id: "ATT-143-2",
        name: "rapport-incident-site-nord.docx",
        size: "188 Ko",
        uploadedBy: "Mina R.",
        uploadedAt: "08:45",
      },
    ],
    conversationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0143",
  },
  {
    id: "REQ-2026-000144",
    reference: "REQ-2026-000144",
    title: "Paiement fournisseur Atlas Tech",
    typeName: "Paiement",
    requester: "Noah B.",
    requesterRole: "Comptable",
    department: "Finance",
    amount: "2 180 €",
    submittedAt: "23 mars 2026 · 09:13",
    dueLabel: "Aujourd'hui 17:00",
    dueState: "soon",
    priority: "high",
    status: "submitted",
    currentStep: "Contrôle pièces",
    description:
      "Demande de mise en paiement d'une facture Atlas Tech pour maintenance corrective de bornes réseau. La facture est exigible aujourd'hui et le fournisseur a déjà accordé un report de 48 h.",
    businessRule:
      "Toute demande de paiement doit passer par contrôle documentaire et visa du responsable budgétaire.",
    templateName: "Paiement fournisseur",
    participants: ["Noah B.", "Camille D.", "Budget owner finance"],
    steps: [
      {
        id: "STP-144-1",
        name: "Contrôle pièces",
        owner: "Camille D.",
        status: "active",
        deadline: "17:00",
        note: "Vérification du bon de commande et de la facture.",
      },
      {
        id: "STP-144-2",
        name: "Visa budget owner",
        owner: "Budget owner finance",
        status: "pending",
        deadline: "18:00",
        note: "Démarre après validation des pièces.",
      },
      {
        id: "STP-144-3",
        name: "Mise en paiement",
        owner: "Trésorerie",
        status: "pending",
        deadline: "Demain 10:00",
        note: "Création du run de paiement.",
      },
    ],
    comments: [
      {
        id: "COM-144-1",
        author: "Noah B.",
        role: "Comptable",
        body: "Le fournisseur a confirmé que le paiement avant demain matin évite les pénalités.",
        createdAt: "09:18",
        kind: "comment",
      },
      {
        id: "COM-144-2",
        author: "Camille D.",
        role: "Contrôle finance",
        body: "Pièces reçues. Il manque seulement le numéro de bon de réception dans l'ERP.",
        createdAt: "10:02",
        kind: "comment",
      },
    ],
    attachments: [
      {
        id: "ATT-144-1",
        name: "facture-atlas-tech-2203.pdf",
        size: "226 Ko",
        uploadedBy: "Noah B.",
        uploadedAt: "09:14",
      },
    ],
    conversationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0144",
  },
  {
    id: "REQ-2026-000145",
    reference: "REQ-2026-000145",
    title: "Extension budget formation Q2",
    typeName: "Budget",
    requester: "Sarah L.",
    requesterRole: "Responsable RH",
    department: "HR",
    amount: "11 000 €",
    submittedAt: "22 mars 2026 · 16:10",
    dueLabel: "En retard de 1 jour",
    dueState: "overdue",
    priority: "high",
    status: "in_review",
    currentStep: "Feu vert direction",
    description:
      "Le plan de formation Q2 doit intégrer un module réglementaire non prévu initialement. Sans rallonge budgétaire, 48 managers ne pourront pas suivre la formation obligatoire dans les temps.",
    businessRule:
      "Toute demande budget > 10 000 € déclenche un feu vert direction avec escalade automatique après 6 h.",
    templateName: "Budget > 5 000 €",
    participants: ["Sarah L.", "Finance BP", "Direction RH"],
    steps: [
      {
        id: "STP-145-1",
        name: "Validation manager",
        owner: "Direction RH",
        status: "approved",
        deadline: "22 mars · 18:00",
        note: "Validé dans l'heure.",
      },
      {
        id: "STP-145-2",
        name: "Contrôle budget",
        owner: "Finance BP",
        status: "approved",
        deadline: "22 mars · 20:00",
        note: "Budget disponible confirmé.",
      },
      {
        id: "STP-145-3",
        name: "Feu vert direction",
        owner: "Direction générale",
        status: "escalated",
        deadline: "23 mars · 09:00",
        note: "Escalade déclenchée faute de réponse dans le SLA.",
      },
    ],
    comments: [
      {
        id: "COM-145-1",
        author: "Workflow Engine",
        role: "Automatisation",
        body: "Escalade direction envoyée après 6 h sans décision finale.",
        createdAt: "09:05",
        kind: "system",
      },
      {
        id: "COM-145-2",
        author: "Sarah L.",
        role: "Responsable RH",
        body: "Le planning réglementaire ne peut pas être décalé après le 31 mars.",
        createdAt: "09:11",
        kind: "comment",
      },
    ],
    attachments: [
      {
        id: "ATT-145-1",
        name: "plan-formation-q2.xlsx",
        size: "98 Ko",
        uploadedBy: "Sarah L.",
        uploadedAt: "22 mars · 16:12",
      },
      {
        id: "ATT-145-2",
        name: "note-reglementaire.pdf",
        size: "154 Ko",
        uploadedBy: "Sarah L.",
        uploadedAt: "22 mars · 16:14",
      },
    ],
    conversationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0145",
  },
]);

export const conversationPreviews = conversationPreviewSchema.array().parse([
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0143",
    title: "REQ-2026-000143 · Groupe froid site Nord",
    context: "Canal lié à la demande de réparation critique",
    participants: ["Mina R.", "Julien A.", "Nina F."],
    unreadCount: 2,
    lastMessage: "Validation opérations donnée sous réserve d'intervention aujourd'hui.",
    lastAt: "11:12",
    tone: "request",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0144",
    title: "REQ-2026-000144 · Paiement Atlas Tech",
    context: "Conversation finance pour lever les blocages documentaires",
    participants: ["Noah B.", "Camille D."],
    unreadCount: 0,
    lastMessage: "Il manque le numéro de bon de réception dans l'ERP.",
    lastAt: "10:02",
    tone: "request",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0901",
    title: "War room Onboarding IT",
    context: "Coordination entre IT, RH et achats pour les arrivées de lundi",
    participants: ["Mialy T.", "Support IT", "HR Ops"],
    unreadCount: 5,
    lastMessage: "Les 24 laptops sont réservés si la demande achat repart aujourd'hui.",
    lastAt: "11:36",
    tone: "ops",
  },
]);

export const conversationMessages = conversationMessageSchema.array().parse([
  {
    id: "MSG-143-1",
    conversationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0143",
    author: "Mina R.",
    body: "Le technicien peut se déplacer à 15:30, mais j'ai besoin du feu vert avant 14:00.",
    createdAt: "09:04",
    kind: "text",
    isOwn: false,
  },
  {
    id: "MSG-143-2",
    conversationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0143",
    author: "Workflow Engine",
    body: "Relance automatique envoyée à Julien A. après 90 min sans action.",
    createdAt: "10:30",
    kind: "system",
    isOwn: false,
  },
  {
    id: "MSG-143-3",
    conversationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0143",
    author: "Julien A.",
    body: "Je valide le remplacement. Merci de confirmer l'heure exacte d'intervention et le temps d'arrêt estimé.",
    createdAt: "11:12",
    kind: "text",
    isOwn: true,
  },
  {
    id: "MSG-144-1",
    conversationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0144",
    author: "Noah B.",
    body: "Je pousse la facture aujourd'hui car Atlas Tech a déjà accepté un report exceptionnel.",
    createdAt: "09:18",
    kind: "text",
    isOwn: false,
  },
  {
    id: "MSG-144-2",
    conversationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0144",
    author: "Camille D.",
    body: "OK pour le contrôle, mais il faut le numéro de bon de réception pour débloquer la suite.",
    createdAt: "10:02",
    kind: "text",
    isOwn: true,
  },
  {
    id: "MSG-OPS-1",
    conversationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0901",
    author: "Support IT",
    body: "Les laptops sont en stock mais la demande achat doit repartir avant 15:00 pour garantir la livraison.",
    createdAt: "11:28",
    kind: "text",
    isOwn: false,
  },
  {
    id: "MSG-OPS-2",
    conversationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0901",
    author: "HR Ops",
    body: "Je synchronise les arrivées et je vous confirme les profils exacts dans 30 minutes.",
    createdAt: "11:36",
    kind: "text",
    isOwn: true,
  },
]);

export const platformModules = [
  {
    icon: "workflow",
    title: "Workflows personnalisables",
    description:
      "Étapes séquentielles ou parallèles, règles par montant, service, site et criticité.",
    detail: "Versions, délégations, remplaçants et retours pour correction inclus.",
  },
  {
    icon: "file-check",
    title: "Formulaires dynamiques",
    description:
      "Un catalogue de demandes métiers avec champs conditionnels, brouillons et duplication.",
    detail: "Budget, paiement, achat, réparation, IT, RH et futurs modules métier.",
  },
  {
    icon: "bell",
    title: "Alertes et relances",
    description:
      "Notifications in-app, emails, rappels, escalades N+1 et contrôles de SLA.",
    detail: "Le cron déclenche le moteur, la base décide quoi traiter et journalise tout.",
  },
  {
    icon: "chart",
    title: "Pilotage opérationnel",
    description:
      "Cockpit manager avec charge par approbateur, goulots, délais moyens et incidents.",
    detail: "Vues liste, kanban, agenda et tableaux de bord orientés décision.",
  },
  {
    icon: "fingerprint",
    title: "Audit complet",
    description:
      "Timeline lisible pour l'utilisateur et journal d'audit détaillé pour l'administration.",
    detail: "Qui a fait quoi, quand, sur quelle étape et avec quelle justification.",
  },
  {
    icon: "shield",
    title: "Sécurité interne",
    description:
      "Accès internes, rôles fins, séparation par département et base prête pour le SSO.",
    detail: "Supabase Auth aujourd'hui, fédération d'identité et RLS ensuite.",
  },
] as const;

export const stackChoices = [
  {
    icon: "layout",
    title: "Next.js sur Vercel",
    description:
      "Front rapide, previews, routes serveur et base idéale pour un produit interne moderne.",
  },
  {
    icon: "database",
    title: "Supabase",
    description:
      "Postgres, Auth, Storage, Realtime et politiques d'accès au même endroit.",
  },
  {
    icon: "mail",
    title: "Emails transactionnels",
    description:
      "Resend ou Postmark pour les approbations, relances et digests de production.",
  },
  {
    icon: "clock",
    title: "Cron + jobs idempotents",
    description:
      "Un endpoint unique réveille le moteur toutes les 5 minutes. Les règles restent en base.",
  },
] as const;

export const deliveryPhases = [
  {
    phase: "Phase 1",
    title: "Socle MVP interne",
    description:
      "Catalogue de demandes, moteur d'étapes, historique, notifications et files de travail.",
  },
  {
    phase: "Phase 2",
    title: "Industrialisation",
    description:
      "SSO, tableaux de bord avancés, exports, rôles fins et automatisations plus riches.",
  },
  {
    phase: "Phase 3",
    title: "Intégrations métier",
    description:
      "ERP, comptabilité, Teams/Slack, webhooks, connecteurs finance et achats.",
  },
] as const;

export function getRequestDetail(reference: string) {
  return requestDetails.find((item) => item.reference === reference);
}

export function getConversationPreview(conversationId: string) {
  return conversationPreviews.find((item) => item.id === conversationId);
}

export function getConversationMessages(conversationId: string) {
  return conversationMessages.filter((item) => item.conversationId === conversationId);
}
