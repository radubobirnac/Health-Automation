export const statusVocabulary = {
  operational: "Operational",
  inProgress: "In progress",
  planned: "Planned"
};

export const step1Callout = {
  icon: "🔒",
  title: "Credential handling is security-first.",
  body:
    "Your login details are used only for booking automation and handled with restricted access controls designed to reduce exposure risk.",
  linkLabel: "Learn how we protect your data",
  linkHref: "/security"
};

export const homepageSecurityBlocks = [
  {
    title: "Credential handling controls",
    body:
      "Credentials are handled through restricted automation workflows and are not intended for broad human access.",
    status: statusVocabulary.operational
  },
  {
    title: "Encryption and transport posture",
    body:
      "Security controls are continuously hardened. Public technical standard disclosure is in progress and tracked in our security documentation.",
    status: statusVocabulary.inProgress
  },
  {
    title: "Deletion and lifecycle clarity",
    body:
      "Expanded self-service retention and deletion transparency is planned as part of our trust roadmap.",
    status: statusVocabulary.planned
  }
];

export const securityFaq = [
  {
    id: "credential-handling",
    question: "How are my HealthRoster credentials handled?",
    answer:
      "Your credentials are used exclusively to carry out shift-booking automation on your behalf. Access is restricted through controlled internal workflows, and credentials are never used for any purpose beyond what you've authorised.",
    status: statusVocabulary.operational
  },
  {
    id: "encryption-transport",
    question: "What protections are used for storage and transmission?",
    answer:
      "We apply layered security controls across both storage and transmission. We're currently working to formalise our technical disclosures so these controls are clearly documented in a public-facing format. Standard-level attestation is in progress.",
    status: statusVocabulary.inProgress
  },
  {
    id: "patient-data-boundary",
    question: "Do you access patient records or clinical notes?",
    answer:
      "No. Our service is scoped entirely to roster management and booking workflow automation. We have no access to and do not interact with clinical notes or patient record systems.",
    status: statusVocabulary.operational
  },
  {
    id: "gdpr-rights",
    question: "What is your GDPR and data-rights posture?",
    answer:
      "We take our obligations under UK GDPR seriously and are actively improving how we communicate them. This includes developing clearer user-facing guidance on how your data is processed and how to exercise your rights.",
    status: statusVocabulary.inProgress
  },
  {
    id: "retention-deletion",
    question: "What happens to credentials when service stops?",
    answer:
      "We're expanding our credential lifecycle and deletion policy to give users clear timelines and expectations for what happens to their data when they leave the service. Updated guidance will be published shortly.",
    status: statusVocabulary.planned
  },
  {
    id: "incident-response",
    question: "What happens if there is a security incident?",
    answer:
      "We have incident response procedures in place. We have a formal, customer-facing notification policy so you know exactly what to expect and when in the event of an incident.",
    status: statusVocabulary.inProgress
  },
  {
    id: "nhs-policy",
    question: "Is this automatically approved by every NHS Trust policy?",
    answer:
      "No. Acceptable-use policies vary between Trusts, and no blanket approval should be assumed. Before sharing your credentials with any automation service, including ours, please confirm that doing so is permitted under your local Trust's policy.",
    status: statusVocabulary.operational
  }
];

export const globalCaveats = {
  nhsPolicyNote:
    "Always confirm your local NHS Trust policy and acceptable-use guidance before sharing credentials with any third-party automation service."
};

export const ukDataRightsTransparency = {
  title: "UK data-rights transparency",
  body:
    "We're always working to make our UK GDPR obligations clearer and more accessible. Our goal is for every user to understand precisely what data is processed, why it's processed, and how to request changes or deletion.",
  points: [
    "User-facing documentation for access, correction, and deletion requests is currently being written.",
    "Data processing is limited to roster and booking operations. Clinical record access is explicitly out of scope.",
    "Our public-facing policy documentation will continue to expand as this work matures."
  ]
};

export const ukGdprSection = {
  title: "General Data Protection Regulation (UK GDPR)",
  body:
    "UK data protection law is governed by the UK GDPR and the Data Protection Act 2018. We are committed to processing only the data necessary for roster and booking operations, and to maintaining clear accountability and appropriate security safeguards throughout.",
  points: [
    "You have the right to access, rectify, erase, or restrict the processing of your personal data in line with UK GDPR.",
    "If you have concerns about how your data is handled, you have the right to raise them with the Information Commissioner's Office (ICO).",
    "Controller and processor responsibilities under your local NHS Trust's policies should be confirmed before sharing credentials with any third-party service."
  ]
};

export const securityContact = {
  title: "Contact",
  body:
    "Have a question about our security practices before signing up? Reach out. We're happy to talk through any concerns.",
  email: "bobirnacr@gmail.com",
  phone: "+1 (503) 820-9110",
  finalNote:
    "Your credentials are never shared with third parties. All credentials are encrypted in transit and stored securely, used solely for the purpose of booking automation."
};
