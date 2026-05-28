const add = (d: number) => new Date(Date.now() + d * 86400000).toISOString();

export const DEMO_TASKS = [
  {
    _id: 'dt1', title: 'Redesign Landing Page', description: 'Complete overhaul of the marketing landing page with new branding',
    owner: { _id: 'demo_u2', name: 'Priya Patel', email: 'priya@taskflow.com', department: 'Design', phone: '+919876543211' },
    priority: 'high', status: 'in_progress', startDate: add(-5), endDate: add(3), milestone: 'Q1 Launch',
    createdAt: add(-10), updatedAt: add(-1),
  },
  {
    _id: 'dt2', title: 'Backend API v2.0', description: 'Build REST APIs for the new platform release',
    owner: { _id: 'demo_admin', name: 'Arjun Sharma', email: 'admin@taskflow.com', department: 'Engineering', phone: '+919876543210' },
    priority: 'high', status: 'in_progress', startDate: add(-7), endDate: add(7), milestone: 'Q1 Launch',
    createdAt: add(-12), updatedAt: add(-2),
  },
  {
    _id: 'dt3', title: 'Q1 Marketing Campaign', description: 'Plan and execute the Q1 digital marketing campaign',
    owner: { _id: 'demo_u3', name: 'Rahul Gupta', email: 'rahul@taskflow.com', department: 'Marketing', phone: '+919876543212' },
    priority: 'medium', status: 'not_started', startDate: add(1), endDate: add(14), milestone: 'Q1 Marketing',
    createdAt: add(-3), updatedAt: add(-1),
  },
  {
    _id: 'dt4', title: 'Mobile App QA Testing', description: 'Comprehensive testing for the mobile application v2.0',
    owner: { _id: 'demo_u4', name: 'Sneha Mehta', email: 'sneha@taskflow.com', department: 'Product', phone: '+919876543213' },
    priority: 'high', status: 'blocked', startDate: add(-2), endDate: add(2), milestone: 'Mobile Release',
    createdAt: add(-8), updatedAt: add(0),
  },
  {
    _id: 'dt5', title: 'Database Migration', description: 'Migrate legacy database to new MongoDB Atlas cluster',
    owner: { _id: 'demo_admin', name: 'Arjun Sharma', email: 'admin@taskflow.com', department: 'Engineering', phone: '+919876543210' },
    priority: 'high', status: 'delayed', startDate: add(-12), endDate: add(-3), milestone: 'Infrastructure',
    createdAt: add(-20), updatedAt: add(-4),
  },
  {
    _id: 'dt6', title: 'User Onboarding Flow', description: 'Redesign onboarding experience to improve activation rates',
    owner: { _id: 'demo_u2', name: 'Priya Patel', email: 'priya@taskflow.com', department: 'Design', phone: '+919876543211' },
    priority: 'medium', status: 'completed', startDate: add(-20), endDate: add(-5), milestone: 'Q1 Launch',
    createdAt: add(-25), updatedAt: add(-5),
  },
  {
    _id: 'dt7', title: 'SEO Audit & Strategy', description: 'Comprehensive SEO audit and content strategy for Q2',
    owner: { _id: 'demo_u3', name: 'Rahul Gupta', email: 'rahul@taskflow.com', department: 'Marketing', phone: '+919876543212' },
    priority: 'low', status: 'not_started', startDate: add(5), endDate: add(20), milestone: 'Q2 Growth',
    createdAt: add(-1), updatedAt: add(-1),
  },
  {
    _id: 'dt8', title: 'Security Compliance Audit', description: 'Complete SOC 2 compliance audit for enterprise customers',
    owner: { _id: 'demo_admin', name: 'Arjun Sharma', email: 'admin@taskflow.com', department: 'Engineering', phone: '+919876543210' },
    priority: 'high', status: 'in_progress', startDate: add(-8), endDate: add(5), milestone: 'Enterprise Launch',
    createdAt: add(-15), updatedAt: add(0),
  },
];

const genLink = () => {
  const s = () => Array.from({ length: 3 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('');
  return `https://meet.google.com/${s()}-${s()}-${s()}`;
};

export const DEMO_MEETINGS = [
  {
    _id: 'dm1', title: 'Q1 Sprint Planning',
    description: 'Weekly sprint planning for Q1 product roadmap', date: add(1),
    startTime: '10:00', endTime: '11:30',
    participants: [
      { _id: 'demo_admin', name: 'Arjun Sharma', email: 'admin@taskflow.com', phone: '+919876543210' },
      { _id: 'demo_u2', name: 'Priya Patel', email: 'priya@taskflow.com', phone: '+919876543211' },
      { _id: 'demo_u4', name: 'Sneha Mehta', email: 'sneha@taskflow.com', phone: '+919876543213' },
    ],
    googleMeetLink: 'https://meet.google.com/abc-defg-hij',
    organizer: { _id: 'demo_admin', name: 'Arjun Sharma', email: 'admin@taskflow.com' },
    reminderSent: false, createdAt: add(-2), updatedAt: add(-2),
  },
  {
    _id: 'dm2', title: 'Design Review: Landing Page',
    description: 'Review new landing page designs with stakeholders', date: new Date().toISOString(),
    startTime: '14:00', endTime: '15:00',
    participants: [
      { _id: 'demo_admin', name: 'Arjun Sharma', email: 'admin@taskflow.com', phone: '+919876543210' },
      { _id: 'demo_u2', name: 'Priya Patel', email: 'priya@taskflow.com', phone: '+919876543211' },
    ],
    googleMeetLink: 'https://meet.google.com/xyz-abcd-efg',
    organizer: { _id: 'demo_u2', name: 'Priya Patel', email: 'priya@taskflow.com' },
    reminderSent: true, createdAt: add(-3), updatedAt: add(-1),
  },
  {
    _id: 'dm3', title: 'Investor Update Call',
    description: 'Monthly investor update and Q1 metrics review', date: add(3),
    startTime: '16:00', endTime: '17:00',
    participants: [
      { _id: 'demo_admin', name: 'Arjun Sharma', email: 'admin@taskflow.com', phone: '+919876543210' },
    ],
    googleMeetLink: 'https://meet.google.com/inv-update-call',
    organizer: { _id: 'demo_admin', name: 'Arjun Sharma', email: 'admin@taskflow.com' },
    reminderSent: false, createdAt: add(-1), updatedAt: add(-1),
  },
];

export const DEMO_USERS = [
  { _id: 'demo_admin', name: 'Arjun Sharma', email: 'admin@taskflow.com', role: 'admin', department: 'Engineering', phone: '+919876543210', createdAt: add(-30) },
  { _id: 'demo_u2', name: 'Priya Patel', email: 'priya@taskflow.com', role: 'member', department: 'Design', phone: '+919876543211', createdAt: add(-25) },
  { _id: 'demo_u3', name: 'Rahul Gupta', email: 'rahul@taskflow.com', role: 'member', department: 'Marketing', phone: '+919876543212', createdAt: add(-20) },
  { _id: 'demo_u4', name: 'Sneha Mehta', email: 'sneha@taskflow.com', role: 'member', department: 'Product', phone: '+919876543213', createdAt: add(-15) },
];
