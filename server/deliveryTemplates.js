/**
 * Official Crextio Delivery Templates & Configuration
 */

export const DELIVERY_TEMPLATES = [
  {
    id: "ui-ux",
    name: "UI/UX Design",
    stack: "UI/UX",
    description: "Figma design delivery, organized app & admin feature lists, and Fiverr chat revision reminder.",
    requiredLinks: [
      { key: "figmaUrl", label: "Figma Link", placeholder: "https://www.figma.com/design/..." },
    ],
    template: `Hello [Client Name],
 
We have completed the UI/UX design for your project based on the requirements and ideas you shared with us.
This message serves as a formal delivery of the design. Once you accept the delivery request, we will continue working closely with you to make any updates you may need in Figma. Please feel free to request changes of any kind there is no need to worry, as we are happy to accommodate revisions according to your preferences.
 
Figma Link : [Insert Figma Link]
 
 
Feature List of [Project Name]:
 
App Feature:- 
- Authentication
- Onboarding
- Homepage
- Workout / Core Features
- Progress & Profile
- Support & Legal
- Privacy Policy & Terms
 
Admin Dashboard:
- Authentication & Login
- Dashboard Overview
- User Management
- Administrators & Roles
- Payment & Transactions
 
Please confirm the delivery by accepting the request. There’s no need to worry about changes or modifications—we’ll handle them at your convenience.
 
One small request: since we care about your satisfaction, if you need any changes, please do not use the Revision option (as it may affect our Fiverr profile). Instead, leave a message in the Fiverr Chatbox, and we will take care of it immediately.
Thank you so much, and we look forward to moving ahead!
 
Best regards,`,
  },

  {
    id: "frontend-app",
    name: "Frontend App (Mobile)",
    stack: "App Development",
    description: "Mobile app APK & Admin Dashboard delivery, User Side & Admin Panel feature breakdown, source code note.",
    requiredLinks: [
      { key: "driveUrl", label: "App Drive Link (APK)", placeholder: "https://drive.google.com/drive/folders/..." },
      { key: "adminUrl", label: "Admin Dashboard URL", placeholder: "https://admin.example.com" },
    ],
    template: `Hello [Client Name],
 
We have completed the frontend phase for your project — "[Project Name]" based on your requirements. Please find the APK and admin dashboard links below for your review:
 
App: [[Insert Drive Link]]
Admin Dashboard: [[Insert Admin Dashboard Link]]
 
We have also attached the source code in zip files.
 
 
Feature List of App:
 
User Side:
- Onboarding (walkthrough screens)
- User Authentication (Sign Up, Sign In, Forgot & Reset Password)
- Profile & Settings
- Core User Dashboard & Workflows
- Real-time features & notifications
- Progress Tracking & History
 
Admin Panel:
- Admin Login & Security
- Dashboard & Overview Metrics
- User Management (view, edit, filter users)
- Role Access Control
- Payment / Activity History
 
Please confirm the delivery by accepting the request. There's no need to worry about minor changes or modifications — we will handle them at your convenience.
 
Thank you very much, and we look forward to moving ahead!
 
Best regards,`,
  },

  {
    id: "frontend-web",
    name: "Frontend Web",
    stack: "Frontend",
    description: "Web frontend & portal delivery, live links for Landing Page, Buyer/Seller/Admin panels, and feedback prompt.",
    requiredLinks: [
      { key: "landingUrl", label: "Landing Page URL", placeholder: "https://example.com" },
      { key: "buyerUrl", label: "Buyer Panel URL", placeholder: "https://example.com/buyer" },
      { key: "sellerUrl", label: "Seller Panel URL", placeholder: "https://example.com/seller" },
      { key: "adminUrl", label: "Admin Panel URL", placeholder: "https://example.com/admin" },
    ],
    template: `Hello [Client Name],
Hope you are doing well.
We’re happy to share that we have completed the Frontend Phase of the project, including the Admin Dashboard.

In this phase, we completed:
- Landing Page
- Buyer Role / Panel
- Seller Role / Panel
- Admin Dashboard

You can review the completed work here:
Landing Page: [Insert Landing Page URL]
Buyer Panel: [Insert Buyer Panel URL]
Seller Panel: [Insert Seller Panel URL]
Admin Panel: [Insert Admin Panel URL]

The current frontend is now ready for review. Please take a look and share your feedback with us. Any feedback related to the current phase can be addressed before we move forward with the next phase.
Thank you, and we look forward to your feedback.

Best regards,`,
  },

  {
    id: "backend",
    name: "Backend & Integration",
    stack: "Backend",
    description: "Backend API and integration delivery, Google Drive APK/demo video link, testing instructions, and deployment plan.",
    requiredLinks: [
      { key: "driveUrl", label: "Google Drive Link (APK & Demo)", placeholder: "https://drive.google.com/drive/folders/..." },
      { key: "apiDocUrl", label: "API Docs / Staging URL (Optional)", placeholder: "https://api.example.com/docs" },
    ],
    template: `Hello [Client Name],
I hope you're doing well.
We're excited to let you know that we have successfully completed the backend and integration phase of your [Project Name] based on the requirements you provided.

The completed app includes:
- Authentication & Session Management
- Core Database Entities & Schemas
- API Endpoints & Business Logic
- External Services Integration
- Admin Management APIs
- Validation & Security Measures

Please find the attached screenshots and the Google Drive link below for your review:
Drive Link:
[Insert Drive Link]

The Drive folder contains the latest APK and a demo video of the application. Please install the APK on an Android device and test the app. We would greatly appreciate your feedback after you've had a chance to review it.
Once we receive your feedback and approval, we'll move forward with the next phase of deployment.

Thank you for your continued trust and collaboration. We look forward to hearing your feedback and continuing the project together.

Best regards,
Developer Team`,
  },

  {
    id: "general",
    name: "General / Other",
    stack: "Other",
    description: "Standard formal delivery message for Automation, QA, Deployment, or custom phases.",
    requiredLinks: [
      { key: "liveUrl", label: "Live / Preview URL", placeholder: "https://..." },
      { key: "driveUrl", label: "Deliverables / Drive URL", placeholder: "https://drive.google.com/..." },
    ],
    template: `Hello [Client Name],
Hope you are doing well.
We are pleased to inform you that we have completed the [Phase Name] for your project — "[Project Name]".

Here is a summary of what was completed:
- Core milestone requirements delivered
- Testing and quality verification
- Documentation and handoff preparation

Deliverable Links:
[Insert Deliverable Links]

Please take a look and review the deliverables. If you have any feedback or minor adjustments, please let us know and we will be glad to assist.
Thank you for your collaboration, and we look forward to hearing your thoughts!

Best regards,
Developer Team`,
  },
];

/**
 * Detect the best template for a phase based on stack and phase title
 */
export function detectTemplateForPhase(phase) {
  const stack = String(phase?.stack || "").toLowerCase();
  const phaseName = String(phase?.phase || phase?.name || "").toLowerCase();

  if (stack.includes("ui") || stack.includes("ux") || phaseName.includes("ui/ux") || phaseName.includes("ui ux") || phaseName.includes("figma") || phaseName.includes("design")) {
    return "ui-ux";
  }

  // App vs Web frontend
  if (stack.includes("app") || phaseName.includes("mobile") || phaseName.includes("flutter") || phaseName.includes("react native") || phaseName.includes("apk") || phaseName.includes("ios") || phaseName.includes("android")) {
    return "frontend-app";
  }

  if (stack.includes("backend") || phaseName.includes("backend") || phaseName.includes("api") || phaseName.includes("database")) {
    return "backend";
  }

  if (stack.includes("frontend") || phaseName.includes("frontend") || phaseName.includes("web") || phaseName.includes("website") || phaseName.includes("dashboard")) {
    return "frontend-web";
  }

  return "general";
}

/**
 * Retrieve clean pre-set template text by ID
 */
export function getPreSetTemplate(templateId) {
  const found = DELIVERY_TEMPLATES.find((t) => t.id === templateId);
  return found ? found.template : DELIVERY_TEMPLATES[DELIVERY_TEMPLATES.length - 1].template;
}
