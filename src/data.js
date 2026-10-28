export const ROLES = {
  pm: { label: 'Product Lead', color: '#7c5cff' },
  research: { label: 'Researcher', color: '#2f80ed' },
  design: { label: 'Designer', color: '#e0457b' },
  eng: { label: 'Engineer', color: '#12a37f' },
  qa: { label: 'QA Tester', color: '#ef8a3c' },
};

// Order here is also the order of seats around the meeting table.
export const AGENTS = [
  { id: 'ada', name: 'Ada', role: 'pm', deskIndex: 0, look: { hair: '#a58be8', eyes: '#6a4cff', accessory: 'ribbon', trim: '#ff6f91' } },
  { id: 'rex', name: 'Rex', role: 'research', deskIndex: 1, look: { hair: '#46527f', eyes: '#2f80ed', accessory: 'glasses' } },
  { id: 'iris', name: 'Iris', role: 'design', deskIndex: 2, look: { hair: '#f59ac0', eyes: '#d63c78', accessory: 'catEars' } },
  { id: 'kai', name: 'Kai', role: 'eng', deskIndex: 3, look: { hair: '#34313f', eyes: '#12a37f', accessory: 'headphones' } },
  { id: 'nova', name: 'Nova', role: 'eng', deskIndex: 4, look: { hair: '#8fdcc0', eyes: '#0f8f6f', accessory: 'ahoge' } },
  { id: 'quinn', name: 'Quinn', role: 'qa', deskIndex: 5, look: { hair: '#f7b267', eyes: '#d9622b', accessory: 'twintails', trim: '#ffd84d' } },
];

// The pipeline every task flows through. Durations are in sim seconds.
export const STAGES = [
  {
    id: 'research', label: 'Research', role: 'research', verb: 'Researching', dur: [9, 13],
    thoughts: ['Reading user interviews…', 'Skimming 14 support tickets', 'Comparing competitors', 'Pulling usage data', 'Writing up findings'],
    doneLine: (t) => `Findings for “${t}” are in the doc!`,
  },
  {
    id: 'spec', label: 'Spec', role: 'pm', verb: 'Writing spec for', dur: [7, 10],
    thoughts: ['Defining acceptance criteria', 'Scoping the MVP', 'Writing user stories', 'Cutting scope…'],
    doneLine: (t) => `Spec for “${t}” is ready.`,
  },
  {
    id: 'design', label: 'Design', role: 'design', verb: 'Designing', dur: [9, 13],
    thoughts: ['Sketching wireframes', 'Picking spacing tokens', 'Prototyping the flow', 'Checking contrast'],
    doneLine: (t) => `Designs for “${t}” are final.`,
  },
  {
    id: 'build', label: 'Build', role: 'eng', verb: 'Building', dur: [14, 20],
    thoughts: ['Writing tests first', 'Refactoring a bit…', 'npm run dev', 'Fixing a type error', 'Wiring up the API'],
    doneLine: (t) => `“${t}” is ready for testing.`,
  },
  {
    id: 'test', label: 'Test', role: 'qa', verb: 'Testing', dur: [7, 10],
    thoughts: ['Running the e2e suite', 'Trying edge cases', 'Testing on mobile', 'Clicking everything'],
    doneLine: (t) => `“${t}” passed QA. Ready to ship!`,
  },
  {
    id: 'ship', label: 'Ship', role: 'pm', verb: 'Shipping', dur: [3, 5],
    thoughts: ['Writing release notes', 'Deploying to prod…'],
    doneLine: (t) => `Shipped “${t}”!`,
  },
];

export const STAGE = Object.fromEntries(STAGES.map((s) => [s.id, s]));

// `ui: false` tasks skip the design stage.
export const TASK_POOL = [
  { title: 'Google sign-in', ui: true },
  { title: 'Search API', ui: false },
  { title: 'Pricing page', ui: true },
  { title: 'CSV export', ui: false },
  { title: 'Dark mode', ui: true },
  { title: 'Rate limiting', ui: false },
  { title: 'Onboarding checklist', ui: true },
  { title: 'Webhook retries', ui: false },
  { title: 'Notification center', ui: true },
  { title: 'Audit log', ui: false },
  { title: 'Usage dashboard', ui: true },
  { title: 'Team invites', ui: true },
];

export const REPLIES = ['On it!', 'Thanks, picking it up.', 'Got it 👍', 'Nice, I’ll take a look.'];
export const BUG_LINES = [
  (t) => `Found a bug in “${t}”. Repro steps are in the ticket.`,
  (t) => `“${t}” breaks on mobile. Can you take a look?`,
  (t) => `“${t}” fails an edge case. Sending it back.`,
];
export const BUG_REPLIES = ['Oops, fixing now.', 'Good catch!', 'On it, sorry!'];
export const IDLE_THOUGHTS = ['Waiting for work…', 'Inbox zero ✨', 'Tidying my notes', 'Reading the docs'];
export const COFFEE_LINES = ['☕ Coffee time', 'Refuelling ☕', 'One espresso please'];
export const FREE_LINES = ['All clear. Send work my way!', 'Nothing on my plate right now.', 'Free to help anyone!'];

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const rand = (a, b) => a + Math.random() * (b - a);
