import { useState, useMemo, Fragment, useCallback, useEffect } from "react";

const T = {
  primary:"#FF6B35", primaryLight:"#FFF0EA", bg:"#FFF8F0",
  card:"#FFFFFF", border:"#E5E7EB", borderLight:"#F0E8DF",
  text:"#111827", muted:"#6B7280",
  green:"#10B981", greenLight:"#ECFDF5",
  red:"#EF4444", redLight:"#FEF2F2",
  yellow:"#F59E0B", yellowLight:"#FFFBEB",
  cyan:"#06B6D4", cyanLight:"#ECFEFF",
  purple:"#8B5CF6", purpleLight:"#F5F3FF",
  blue:"#4F46E5", blueLight:"#EEF2FF",
  gold:"#D97706", goldLight:"#FEF3C7",
};
const FONT = "'Plus Jakarta Sans','Nunito','Inter',sans-serif";

const PLANS = {
  basic:   { name:"Basic",   price:49,  color:T.cyan,   features:["Attendance","Photos","Incidents","Billing","Messages"] },
  plus:    { name:"Plus",    price:79,  color:T.primary, features:["Everything in Basic","🎓 Classroom Board","📺 Video Library","📝 Activity Creator","❓ Live Q&A"] },
  premium: { name:"Premium", price:129, color:T.gold,   features:["Everything in Plus","🤖 AI Lesson Plans","🏠 Parent Home Access","📊 Analytics","🎨 Custom Branding"] },
};

// ══════════════════════════════════════════════════════════════════════════════
// STRIPE CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════
//
// HOW TO GO LIVE IN 4 STEPS:
//
// 1. Get your Publishable Key:
//    dashboard.stripe.com → Developers → API Keys → copy "Publishable key"
//    (starts with pk_live_...)
//
// 2. Create 3 Products (one per plan) with Monthly Recurring pricing:
//    dashboard.stripe.com → Products → + Add product
//    Name: "BrightDays Basic" | Price: $49/month recurring | Save
//    Repeat for Plus ($79) and Premium ($129)
//
// 3. Create a Buy Button for each product:
//    Open each product → click "Create payment link" → click "Buy button" tab
//    → set Success URL to: https://YOUR-DOMAIN.com/app?payment=success&plan=basic
//    → set Cancel URL to:  https://YOUR-DOMAIN.com/app?payment=cancel
//    → Copy the buy-button-id (looks like: buy_btn_1ABC...)
//
// 4. Paste everything below and set  live: true
//
const STRIPE = {
  // ── Paste your Publishable Key here ─────────────────────────────────────────
  publishableKey: "pk_live_REPLACE_YOUR_PUBLISHABLE_KEY",

  // ── Per-plan config ──────────────────────────────────────────────────────────
  plans: {
    basic: {
      buyButtonId:  "buy_btn_REPLACE_BASIC_BTN_ID",   // from Stripe Buy Button
      paymentLink:  "https://buy.stripe.com/REPLACE_BASIC_LINK", // fallback redirect
      price: 49,
    },
    plus: {
      buyButtonId:  "buy_btn_REPLACE_PLUS_BTN_ID",
      paymentLink:  "https://buy.stripe.com/REPLACE_PLUS_LINK",
      price: 79,
    },
    premium: {
      buyButtonId:  "buy_btn_REPLACE_PREMIUM_BTN_ID",
      paymentLink:  "https://buy.stripe.com/REPLACE_PREMIUM_LINK",
      price: 129,
    },
  },

  // ── Flip to true once all IDs above are filled in ───────────────────────────
  live: false,

  // Helper: check if a specific plan is configured
  isReady: (planKey) => {
    const p = STRIPE.plans[planKey];
    return STRIPE.live && p &&
      !p.buyButtonId.includes("REPLACE_") &&
      !p.paymentLink.includes("REPLACE_") &&
      !STRIPE.publishableKey.includes("REPLACE_");
  },
};

// ── DATABASE ─────────────────────────────────────────────────────────────────
const INIT_USERS = [
  { id:"super1",  role:"super",   name:"Platform Owner", email:"super@brightdays.com",  password:"demo", avatar:"🎯" },
  { id:"d_admin", role:"d_admin", name:"Director Kim",   email:"daycare@demo.com",       password:"demo", orgId:"d_org1", avatar:"👑" },
  { id:"d_staff", role:"d_staff", name:"Ms. Rachel",     email:"staff@demo.com",         password:"demo", orgId:"d_org1", room:"Butterfly", avatar:"👩‍🏫" },
  { id:"d_staff2",role:"d_staff", name:"Mr. Carlos",     email:"staff2@demo.com",        password:"demo", orgId:"d_org1", room:"Sunflower", avatar:"👨‍🏫" },
  { id:"d_parent",role:"d_parent",name:"Sarah Wilson",   email:"parent@demo.com",        password:"demo", orgId:"d_org1", childId:"dc1", avatar:"👩" },
  { id:"d_child", role:"d_child", name:"Emma Wilson",    email:"kid@demo.com",           password:"demo", orgId:"d_org1", childId:"dc1", avatar:"🌸" },
];

const INIT_ORGS = [
  { id:"d_org1", name:"BrightDays Daycare",   plan:"plus",    students:5,  monthlyFee:79 },
  { id:"d_org2", name:"Sunshine Kids Center", plan:"basic",   students:8,  monthlyFee:49 },
  { id:"d_org3", name:"Little Stars Academy", plan:"premium", students:12, monthlyFee:129 },
];

const INIT_CHILDREN = [
  { id:"dc1", name:"Emma Wilson",  age:"4y 4m", room:"Butterfly", parentId:"d_parent", avatar:"🌸", allergies:"Peanuts", status:"checked-in",  checkIn:"7:45 AM", xp:240, level:3, streak:5, badges:["first_play","color_master","streak_3"], dob:"2021-11-12", notes:"Loves butterflies and painting." },
  { id:"dc2", name:"Liam Chen",    age:"3y 1m", room:"Sunflower", parentId:"p2",       avatar:"🦁", allergies:"None",    status:"checked-in",  checkIn:"8:10 AM", xp:120, level:2, streak:2, badges:["first_play"], dob:"2023-01-05", notes:"Very energetic. Loves trucks." },
  { id:"dc3", name:"Mia Johnson",  age:"3y 8m", room:"Rainbow",   parentId:"p3",       avatar:"🌈", allergies:"Dairy",   status:"checked-out", checkIn:"8:00 AM", xp:340, level:4, streak:8, badges:["first_play","shape_pro","streak_3"], dob:"2022-05-20", notes:"Quiet and creative. Check dairy." },
  { id:"dc4", name:"Noah Garcia",  age:"4y 2m", room:"Butterfly", parentId:"p4",       avatar:"🚀", allergies:"None",    status:"checked-in",  checkIn:"8:30 AM", xp:180, level:2, streak:3, badges:["first_play","number_ninja"], dob:"2021-12-30", notes:"Has a lot of energy in the afternoons." },
];

const INIT_CONSENTS = {
  d_parent:{ accountCreation:true, photoSharing:true, dailyReports:true, healthInfo:true, communication:true, signedDate:"Apr 1, 2026", parentName:"Sarah Wilson", email:"sarah.wilson@email.com", phone:"(555) 234-5678", address:"412 Oak Lane, Rolling Meadows, IL", emergencyContact:"David Wilson (husband)", emergencyPhone:"(555) 234-9012" },
  p2:{ accountCreation:true, photoSharing:true, dailyReports:true, healthInfo:false, communication:true, signedDate:"Mar 15, 2026", parentName:"Jennifer Chen", email:"jen.chen@email.com", phone:"(555) 345-6789", address:"88 Maple St, Rolling Meadows, IL", emergencyContact:"Michael Chen (husband)", emergencyPhone:"(555) 345-0123" },
  p3:{ accountCreation:true, photoSharing:false, dailyReports:true, healthInfo:true, communication:true, signedDate:"Feb 20, 2026", parentName:"Marcus Johnson", email:"m.johnson@email.com", phone:"(555) 456-7890", address:"23 Pine Ct, Rolling Meadows, IL", emergencyContact:"Lisa Johnson (wife)", emergencyPhone:"(555) 456-1234" },
};

const INIT_PHOTOS = [
  { id:1, childId:"dc1", childName:"Emma Wilson", time:"9:42 AM", caption:"Circle time was so fun! 📖", emoji:"📖", gradient:"linear-gradient(135deg,#FFD93D,#FF6B35)", imageData:null, staff:"Ms. Rachel", likes:2, liked:false, comments:["So adorable!","She loves books!"] },
  { id:2, childId:"dc1", childName:"Emma Wilson", time:"10:15 AM", caption:"Beautiful butterfly painting! 🎨", emoji:"🎨", gradient:"linear-gradient(135deg,#A78BFA,#FF6B35)", imageData:null, staff:"Ms. Rachel", likes:5, liked:true, comments:[] },
];

const INIT_INCIDENTS = [
  { id:1, childId:"dc1", childName:"Emma Wilson", date:"Today, 10:45 AM", category:"Boo-Boo", bodyPart:"Right knee", what:"Emma tripped on the playground.", action:"Cleaned scrape, applied bandage, gave a hug.", staff:"Ms. Rachel", acknowledged:false, severity:"Minor", comments:[] },
];

const INIT_MESSAGES = [
  { id:1, senderId:"d_staff", senderName:"Ms. Rachel", senderAvatar:"👩‍🏫", recipientId:"d_parent", recipientName:"Sarah Wilson", time:"9:15 AM", text:"Good morning! Emma had a great start today 😊", read:true, childId:"dc1" },
  { id:2, senderId:"d_parent", senderName:"Sarah Wilson", senderAvatar:"👩", recipientId:"d_staff", recipientName:"Ms. Rachel", time:"9:20 AM", text:"That's wonderful! She was excited to come in today.", read:true, childId:"dc1" },
];

const INIT_DAILY_REPORTS = {
  "dc1": {
    date: new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}),
    mood:"happy", moodNote:"Emma was in a great mood all morning! Loved circle time.",
    naps:[{ start:"12:30 PM", end:"1:45 PM", quality:"good" }],
    meals:[
      { meal:"Breakfast", time:"8:15 AM", food:"Oatmeal with berries, milk", amount:"all" },
      { meal:"Snack",     time:"10:00 AM",food:"Apple slices and crackers",  amount:"most" },
      { meal:"Lunch",     time:"12:00 PM",food:"Turkey sandwich, carrots",   amount:"all" },
      { meal:"Snack",     time:"3:00 PM", food:"Goldfish crackers",          amount:"some" },
    ],
    bathroom:[{time:"9:00 AM",type:"potty"},{time:"11:30 AM",type:"potty"},{time:"2:30 PM",type:"potty"}],
    activities:["Circle time","Painting butterflies","Outdoor play","Music time"],
    learning:"Practiced colors and counting to 10. Identified red, blue, green, yellow!",
    socialNotes:"Played nicely with Liam during free play. Shared toys without being asked.",
    teacherNote:"Emma had a fantastic day! She's really opening up with the other kids. 💛",
    completedBy:"Ms. Rachel", submittedAt:"3:30 PM",
  },
};

const INVOICES = [
  { id:"INV-001", family:"Wilson Family", child:"Emma Wilson", amount:850, status:"paid",     issueDate:"Apr 1, 2026", dueDate:"Apr 5, 2026", paidDate:"Apr 3, 2026", method:"Auto-pay (Visa ****4321)" },
  { id:"INV-002", family:"Chen Family",   child:"Liam Chen",   amount:850, status:"pending",  issueDate:"Apr 1, 2026", dueDate:"May 5, 2026", paidDate:null, method:null },
  { id:"INV-003", family:"Johnson Family",child:"Mia Johnson", amount:900, status:"overdue",  issueDate:"Mar 1, 2026", dueDate:"Mar 5, 2026", paidDate:null, method:null, daysOverdue:58 },
  { id:"INV-004", family:"Garcia Family", child:"Noah Garcia", amount:850, status:"paid",     issueDate:"Apr 1, 2026", dueDate:"Apr 5, 2026", paidDate:"Apr 4, 2026", method:"ACH Bank Transfer" },
];

const VIDEO_LIBRARY = [
  { id:"v1",  title:"ABC Song for Kids",          channel:"Cocomelon",          category:"Letters",  duration:"3:24", thumb:"🔤", color:"#10B981" },
  { id:"v2",  title:"Counting 1-10 with Animals", channel:"Super Simple Songs", category:"Numbers",  duration:"2:48", thumb:"🔢", color:"#8B5CF6" },
  { id:"v3",  title:"Colors of the Rainbow",      channel:"Pinkfong",           category:"Colors",   duration:"3:12", thumb:"🌈", color:"#EF4444" },
  { id:"v4",  title:"Shape Songs Compilation",    channel:"Little Baby Bum",    category:"Shapes",   duration:"5:30", thumb:"⭐", color:"#3B82F6" },
  { id:"v5",  title:"The Wheels on the Bus",      channel:"Cocomelon",          category:"Music",    duration:"3:45", thumb:"🚌", color:"#F59E0B" },
  { id:"v6",  title:"Animal Sounds for Kids",     channel:"Super Simple Songs", category:"Animals",  duration:"4:15", thumb:"🐘", color:"#06B6D4" },
  { id:"v7",  title:"Twinkle Twinkle Little Star",channel:"Cocomelon",          category:"Music",    duration:"3:18", thumb:"⭐", color:"#F59E0B" },
  { id:"v8",  title:"Number Train 1-20",          channel:"Pinkfong",           category:"Numbers",  duration:"4:22", thumb:"🚂", color:"#8B5CF6" },
  { id:"v9",  title:"Old MacDonald Had a Farm",   channel:"Super Simple Songs", category:"Animals",  duration:"3:55", thumb:"🐄", color:"#06B6D4" },
  { id:"v10", title:"Phonics Song A-Z",           channel:"ABCmouse",           category:"Letters",  duration:"5:00", thumb:"📝", color:"#10B981" },
  { id:"v11", title:"Color Mixing Magic",         channel:"Sesame Street",      category:"Colors",   duration:"4:08", thumb:"🎨", color:"#EF4444" },
  { id:"v12", title:"Shapes Around Us",           channel:"Little Baby Bum",    category:"Shapes",   duration:"3:33", thumb:"🔷", color:"#3B82F6" },
  { id:"v13", title:"Days of the Week Song",      channel:"Cocomelon",          category:"Letters",  duration:"2:55", thumb:"📅", color:"#10B981" },
  { id:"v14", title:"Five Little Ducks",          channel:"Super Simple Songs", category:"Numbers",  duration:"3:40", thumb:"🦆", color:"#8B5CF6" },
];

const ACTIVITY_TEMPLATES = [
  { id:"a1",  title:"Color Hunt!",              category:"Colors",  icon:"🔍", description:"Find 5 things in the room that are RED. Then BLUE. Then YELLOW.",           duration:"10 min", durationMin:10, ageRange:"3-5", ageMin:3, steps:["Find a RED object","Find a BLUE object","Find a YELLOW object","Tell us your favorites!"] },
  { id:"a2",  title:"Number Stomp",             category:"Numbers", icon:"👟", description:"Stomp your feet 3 times! Then 5! Then 7! Count out loud.",                  duration:"5 min",  durationMin:5,  ageRange:"2-4", ageMin:2, steps:["Stomp 3 times","Stomp 5 times","Stomp 7 times","Clap and count to 10!"] },
  { id:"a3",  title:"Animal Charades",          category:"Animals", icon:"🦁", description:"Act like an animal — friends guess what you are!",                          duration:"10 min", durationMin:10, ageRange:"3-5", ageMin:3, steps:["Pick an animal","Act it out","Make the sound","Can your friends guess?"] },
  { id:"a4",  title:"Letter Sound Game",        category:"Letters", icon:"🔊", description:"Say a word that starts with the letter A. Then B. Then C.",                 duration:"10 min", durationMin:10, ageRange:"4-5", ageMin:4, steps:["Say a word that starts with A","Say a word that starts with B","Say a word that starts with C","Draw your favorite letter!"] },
  { id:"a5",  title:"Shape Drawing",            category:"Shapes",  icon:"✏️", description:"Draw a circle, square, and triangle. Color them in!",                       duration:"15 min", durationMin:15, ageRange:"4-5", ageMin:4, steps:["Draw a circle","Draw a square","Draw a triangle","Color them all in!"] },
  { id:"a6",  title:"Music Freeze Dance",       category:"Music",   icon:"🎵", description:"Dance when music plays, freeze when it stops!",                             duration:"15 min", durationMin:15, ageRange:"2-5", ageMin:2, steps:["Start dancing!","Freeze when music stops","Dance again","Take a bow!"] },
  { id:"a7",  title:"Counting with Toys",       category:"Numbers", icon:"🧸", description:"Count toys together up to 10. Sort by color!",                              duration:"15 min", durationMin:15, ageRange:"3-5", ageMin:3, steps:["Count all your toys","Sort by color","Count each group","Which group is biggest?"] },
  { id:"a8",  title:"Story Circle",             category:"Letters", icon:"📚", description:"Read a book together, ask kids what letter words start with.",              duration:"20 min", durationMin:20, ageRange:"3-5", ageMin:3, steps:["Listen to the story","Find a word that starts with A","What happened first?","Draw your favorite part!"] },
  { id:"a9",  title:"Art & Colors Workshop",    category:"Colors",  icon:"🎨", description:"Mix paint colors. What happens when red+yellow combine?",                  duration:"30 min", durationMin:30, ageRange:"4-5", ageMin:4, steps:["Mix red + yellow","Mix blue + red","Mix yellow + blue","Paint a rainbow!"] },
  { id:"a10", title:"Animal Habitat Builder",   category:"Animals", icon:"🏞️", description:"Build a zoo with toys. Where does each animal live?",                      duration:"30 min", durationMin:30, ageRange:"4-5", ageMin:4, steps:["Choose 3 animals","Build their homes","Sort by habitat","Name each animal!"] },
];

const QUICK_QUESTIONS = [
  { id:"q1", question:"What color is the sun?",               answer:"Yellow", emoji:"☀️" },
  { id:"q2", question:"How many fingers on one hand?",        answer:"5",      emoji:"🖐️" },
  { id:"q3", question:"What shape is a wheel?",              answer:"Circle",  emoji:"⚪" },
  { id:"q4", question:"What sound does a dog make?",         answer:"Woof",    emoji:"🐶" },
  { id:"q5", question:"What color is the grass?",            answer:"Green",   emoji:"🌱" },
  { id:"q6", question:"How many sides does a triangle have?",answer:"3",       emoji:"🔺" },
];

const LEARNING = {
  colors_topic: { label:"Colors", icon:"🎨", color:"#EF4444", questions:[
    { q:"What color is this strawberry?", visual:"🍓", o:["Red","Blue","Green","Yellow"], a:"Red" },
    { q:"What color is the sky?", visual:"☁️", o:["Pink","Blue","Black","Orange"], a:"Blue" },
    { q:"What color is grass?", visual:"🌱", o:["Purple","Yellow","Green","Red"], a:"Green" },
  ]},
  shapes: { label:"Shapes", icon:"⭐", color:"#3B82F6", questions:[
    { q:"What shape is this?", visual:"⚫", o:["Circle","Square","Triangle","Star"], a:"Circle" },
    { q:"What shape is this?", visual:"⭐", o:["Circle","Star","Heart","Square"], a:"Star" },
    { q:"How many sides does a triangle have?", visual:"🔺", o:["2","3","4","5"], a:"3" },
  ]},
  numbers: { label:"Numbers", icon:"🔢", color:"#8B5CF6", questions:[
    { q:"How many apples?", visual:"🍎🍎🍎", o:["2","3","4","5"], a:"3" },
    { q:"What comes after 5?", visual:"5️⃣", o:["4","6","7","8"], a:"6" },
    { q:"How many fingers on one hand?", visual:"🖐️", o:["3","4","5","6"], a:"5" },
  ]},
  letters: { label:"Letters", icon:"🔤", color:"#10B981", questions:[
    { q:"What letter does APPLE start with?", visual:"🍎", o:["A","B","P","E"], a:"A" },
    { q:"What letter does CAT start with?", visual:"🐱", o:["C","A","T","K"], a:"C" },
    { q:"What letter comes after B?", visual:"🅱️", o:["A","C","D","E"], a:"C" },
  ]},
};

const ROOMS = [
  { id:"r1", name:"Sunflower", ageRange:"2–3 yrs", capacity:8,  enrolled:5, color:"#FFD93D", icon:"🌻" },
  { id:"r2", name:"Rainbow",   ageRange:"3–4 yrs", capacity:10, enrolled:7, color:"#4ECDC4", icon:"🌈" },
  { id:"r3", name:"Butterfly", ageRange:"4–5 yrs", capacity:12, enrolled:9, color:"#A78BFA", icon:"🦋" },
];

const ALL_BADGES = [
  { id:"first_play",    name:"First Play",     icon:"🎯", desc:"Played your first game" },
  { id:"color_master",  name:"Color Master",   icon:"🎨", desc:"Got 100% on Colors" },
  { id:"shape_pro",     name:"Shape Pro",      icon:"⭐", desc:"Got 100% on Shapes" },
  { id:"number_ninja",  name:"Number Ninja",   icon:"🔢", desc:"Got 100% on Numbers" },
  { id:"streak_3",      name:"3-Day Streak",   icon:"🔥", desc:"Played 3 days in a row" },
  { id:"activity_star", name:"Activity Star",  icon:"🌟", desc:"Completed 5 activities" },
  { id:"helper",        name:"Helper",         icon:"🤝", desc:"Completed a group activity" },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
const card = { background:T.card, borderRadius:14, border:`1px solid ${T.borderLight}`, boxShadow:"0 2px 12px rgba(255,107,53,0.06)" };

const btn = (variant="primary", size="md") => {
  const sizes = { sm:{padding:"6px 14px",fontSize:12}, md:{padding:"10px 20px",fontSize:14}, lg:{padding:"13px 26px",fontSize:15} };
  const vars = {
    primary:  {background:T.primary,color:"#fff"},
    secondary:{background:T.cyan,color:"#fff"},
    ghost:    {background:"transparent",color:T.muted,border:`1px solid ${T.border}`},
    danger:   {background:T.red,color:"#fff"},
    success:  {background:T.green,color:"#fff"},
    gold:     {background:T.gold,color:"#fff"},
    warning:  {background:T.yellow,color:"#fff"},
  };
  return { border:"none", cursor:"pointer", fontWeight:700, borderRadius:10, transition:"all 0.15s", fontFamily:FONT, ...sizes[size], ...vars[variant] };
};

const bdg = (color, bg) => ({ background:bg, color, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700, display:"inline-block" });

const inputStyle = { width:"100%", padding:"11px 14px", border:`1.5px solid ${T.border}`, borderRadius:10, fontSize:14, fontFamily:FONT, outline:"none", boxSizing:"border-box" };
const selectStyle = { ...inputStyle, background:"#fff", cursor:"pointer" };
const textareaStyle = { ...inputStyle, resize:"vertical", minHeight:70 };

// ════════════════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════════════════

export default function App() {
  // Auth
  const [user, setUser]   = useState(null);
  const [emailInput, setEmailInput] = useState("");
  const [pwInput, setPwInput]       = useState("");
  const [loginErr, setLoginErr]     = useState("");

  // Core data
  const [dbUsers, setDbUsers]           = useState(INIT_USERS);
  const [orgs, setOrgs]                 = useState(INIT_ORGS);
  const [children, setChildren]         = useState(INIT_CHILDREN);
  const [consents, setConsents]         = useState(INIT_CONSENTS);
  const [photos, setPhotos]             = useState(INIT_PHOTOS);
  const [incidents, setIncidents]       = useState(INIT_INCIDENTS);
  const [messages, setMessages]         = useState(INIT_MESSAGES);
  const [dailyReports, setDailyReports] = useState(INIT_DAILY_REPORTS);
  const [invoices, setInvoices]         = useState(INVOICES);

  // Classroom
  const [activities, setActivities] = useState([
    { id:1, title:"Color Hunt: Find Red Things", category:"Colors", icon:"🔍", description:"Look around the room and find 5 RED items!", duration:"10 min", durationMin:10, postedBy:"Ms. Rachel", time:"9:30 AM", completed:3,
      steps:["Find a RED object","Find a BLUE object","Find a YELLOW object","Tell us your favorites!"],
      submissions:{ dc1:{ completedSteps:[0,1,2], response:"I found a red ball, blue cup, and yellow pencil!", submittedAt:"9:50 AM", emoji:"🌟" } }
    },
    { id:2, title:"Number Stomp Game", category:"Numbers", icon:"👟", description:"Let's stomp our feet to count!", duration:"5 min", durationMin:5, postedBy:"Ms. Rachel", time:"10:00 AM", completed:5,
      steps:["Stomp 3 times","Stomp 5 times","Count to 10 out loud"],
      submissions:{}
    },
  ]);
  const [activeQuestion, setActiveQuestion] = useState(null);

  // UI state
  const [tab, setTab]                           = useState("dashboard");
  const [toast, setToast]                       = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen]     = useState(false);
  const [searchQuery, setSearchQuery]           = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Modals
  const [showPhotoModal, setShowPhotoModal]         = useState(false);
  const [showIncidentModal, setShowIncidentModal]   = useState(false);
  const [showPrivacyModal, setShowPrivacyModal]     = useState(false);
  const [showVideoModal, setShowVideoModal]         = useState(null);
  const [showActivityModal, setShowActivityModal]   = useState(false);
  const [showQuestionModal, setShowQuestionModal]   = useState(false);
  const [showUpgradeModal, setShowUpgradeModal]     = useState(false);
  const [showAvatarModal, setShowAvatarModal]       = useState(false);
  const [showNotifModal, setShowNotifModal]         = useState(false);
  const [showAddChildModal, setShowAddChildModal]   = useState(false);
  const [showAddStaffModal, setShowAddStaffModal]   = useState(false);
  const [showEditChildModal, setShowEditChildModal] = useState(null);
  const [showEditConsentModal, setShowEditConsentModal] = useState(null);

  // Game state
  const [game, setGame]         = useState(null);
  const [gameScore, setGameScore] = useState(0);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const currentOrg  = user ? orgs.find(o=>o.id===user.orgId) : null;
  const hasClassroom = currentOrg?.plan === "plus" || currentOrg?.plan === "premium";

  // ── GLOBAL SEARCH ──────────────────────────────────────────────────────────
  const searchResults = useMemo(()=>{
    const q = searchQuery.trim().toLowerCase();
    if(q.length < 2) return [];
    const results = [];
    children.forEach(c=>{
      if(c.name.toLowerCase().includes(q)) results.push({type:"child",icon:c.avatar,label:c.name,sub:c.room,action:"children",id:c.id});
    });
    photos.forEach(p=>{
      if(p.caption.toLowerCase().includes(q)||p.childName.toLowerCase().includes(q)) results.push({type:"photo",icon:"📸",label:p.caption,sub:`Photo of ${p.childName}`,action:"photos",id:p.id});
    });
    incidents.forEach(i=>{
      if(i.childName.toLowerCase().includes(q)||i.category.toLowerCase().includes(q)||i.what.toLowerCase().includes(q)) results.push({type:"incident",icon:"🩹",label:i.category+" — "+i.childName,sub:i.what.slice(0,50),action:"incidents",id:i.id});
    });
    return results.slice(0,8);
  },[searchQuery,children,photos,incidents]);

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  const notifications = useMemo(()=>{
    const notifs = [];
    if(user?.role === "d_parent"){
      photos.filter(p=>p.childId===user.childId).slice(0,3).forEach(p=>{
        notifs.push({id:`p${p.id}`,icon:"📸",color:T.purple,title:"New photo posted",message:`${p.staff}: "${p.caption.slice(0,40)}"`,time:p.time,read:p.liked,goTo:"photos"});
      });
      incidents.filter(i=>i.childId===user.childId).forEach(i=>{
        notifs.push({id:`i${i.id}`,icon:"🩹",color:T.red,title:`${i.severity} incident`,message:i.what.slice(0,60),time:i.date,read:i.acknowledged,urgent:true,goTo:"incidents"});
      });
      if(dailyReports[user.childId]?.submittedAt){
        notifs.push({id:"dr1",icon:"📋",color:T.primary,title:"Daily report ready",message:`Sent by ${dailyReports[user.childId].completedBy}`,time:"Today",read:false,goTo:"daily"});
      }
    } else if(user?.role==="d_staff"||user?.role==="d_admin"){
      incidents.filter(i=>!i.acknowledged).forEach(i=>{
        notifs.push({id:`i${i.id}`,icon:"🩹",color:T.red,title:"Incident needs acknowledgement",message:`${i.childName} — ${i.category}`,time:i.date,read:false,goTo:"incidents"});
      });
      if(user?.role==="d_admin"){
        const noConsent = children.filter(c=>!consents[c.parentId]?.signedDate).length;
        if(noConsent>0) notifs.push({id:"comp1",icon:"🛡️",color:T.yellow,title:`${noConsent} families need consent`,message:"View Compliance dashboard",time:"Action required",read:false,urgent:true,goTo:"compliance"});
        const overdueInvoices = invoices.filter(i=>i.status==="overdue");
        if(overdueInvoices.length>0) notifs.push({id:"bill1",icon:"💳",color:T.red,title:`${overdueInvoices.length} overdue invoices`,message:`$${overdueInvoices.reduce((s,i)=>s+i.amount,0)} pending`,time:"Today",read:false,urgent:true,goTo:"billing"});
      }
    }
    return notifs;
  },[user,photos,incidents,dailyReports,children,consents,invoices]);

  const unreadCount = notifications.filter(n=>!n.read).length;
  const unreadIncidents = user?.role==="d_parent" ? incidents.filter(i=>!i.acknowledged&&i.childId===user.childId).length : 0;

  // ── HANDLERS ──────────────────────────────────────────────────────────────
  const login = () => {
    const u = dbUsers.find(u=>u.email===emailInput&&u.password===pwInput);
    if(!u){setLoginErr("Wrong credentials. Try a demo account."); return;}
    setUser(u); setLoginErr(""); setTab("dashboard");
  };

  const upgradeOrg = (orgId, newPlan) => {
    setOrgs(p=>p.map(o=>o.id===orgId?{...o,plan:newPlan,monthlyFee:PLANS[newPlan].price}:o));
    showToast(`Upgraded to ${PLANS[newPlan].name}!`);
    setShowUpgradeModal(false);
  };

  // ── Stripe redirect handler ──────────────────────────────────────────────────
  // Fires when Stripe sends the user back after checkout
  // Success URL format: https://your-domain.com/app?payment=success&plan=plus
  // Cancel  URL format: https://your-domain.com/app?payment=cancel
  useEffect(()=>{
    const params  = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const plan    = params.get("plan");

    if(payment==="success" && plan && PLANS[plan]){
      const price = STRIPE.plans[plan]?.price ?? PLANS[plan].price;
      if(user?.orgId){
        // Activate the paid plan for this org
        setOrgs(p=>p.map(o=>o.id===user.orgId
          ? {...o, plan, monthlyFee:price, stripeActive:true}
          : o
        ));
        showToast(`🎉 Payment confirmed! Welcome to ${PLANS[plan].name}!`);
      }
      window.history.replaceState({},"",window.location.pathname);
    }

    if(payment==="cancel"){
      showToast("Checkout cancelled — no charge was made.","warn");
      window.history.replaceState({},"",window.location.pathname);
    }
  },[user]);

  const toggleChild = (id) => {
    setChildren(p=>p.map(c=>{
      if(c.id!==id)return c;
      const s = c.status==="checked-in"?"checked-out":"checked-in";
      return {...c,status:s,checkIn:s==="checked-in"?new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):c.checkIn};
    }));
    showToast("Attendance updated!");
  };

  const bulkCheckIn = () => {
    setChildren(p=>p.map(c=>c.status==="checked-out"?{...c,status:"checked-in",checkIn:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}:c));
    showToast("All children checked in!");
  };

  const addChild = (data) => {
    const id = "dc"+Date.now();
    setChildren(p=>[...p,{id,...data,status:"checked-out",checkIn:null,xp:0,level:1,streak:0,badges:[]}]);
    showToast(`${data.name} added!`);
    setShowAddChildModal(false);
  };

  const updateChild = (id, data) => {
    setChildren(p=>p.map(c=>c.id===id?{...c,...data}:c));
    showToast("Child profile updated!");
    setShowEditChildModal(null);
  };

  const removeChild = (id) => {
    const c = children.find(c=>c.id===id);
    if(!window.confirm(`Remove ${c?.name} from the daycare?`)) return;
    setChildren(p=>p.filter(c=>c.id!==id));
    showToast("Child removed.");
  };

  const addStaff = (data) => {
    const id = "s"+Date.now();
    setDbUsers(p=>[...p,{id,...data,role:"d_staff",orgId:user.orgId,password:"demo",avatar:"👩‍🏫"}]);
    showToast(`${data.name} added to staff!`);
    setShowAddStaffModal(false);
  };

  const removeStaff = (id) => {
    const s = dbUsers.find(u=>u.id===id);
    if(!window.confirm(`Remove ${s?.name} from staff?`)) return;
    setDbUsers(p=>p.filter(u=>u.id!==id));
    showToast("Staff member removed.");
  };

  const updateConsent = (parentId, data) => {
    setConsents(p=>({...p,[parentId]:{...p[parentId],...data}}));
    showToast("Profile updated!");
    setShowEditConsentModal(null);
  };

  const toggleLike = (id) => setPhotos(p=>p.map(ph=>ph.id===id?{...ph,liked:!ph.liked,likes:ph.liked?ph.likes-1:ph.likes+1}:ph));

  const addPhoto = (childId, caption, emoji, gradient, imageData) => {
    const child = children.find(c=>c.id===childId);
    if(!child)return;
    setPhotos(p=>[{id:Date.now(),childId,childName:child.name,time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),caption,emoji,gradient,imageData,staff:user.name,likes:0,liked:false,comments:[]},...p]);
    setShowPhotoModal(false);
    showToast("Photo posted! Parent notified 📸");
  };

  const editPhoto = (id, caption) => {
    setPhotos(p=>p.map(ph=>ph.id===id?{...ph,caption}:ph));
    showToast("Photo updated!");
  };

  const deletePhoto = (id) => {
    if(!window.confirm("Delete this photo?")) return;
    setPhotos(p=>p.filter(ph=>ph.id!==id));
    showToast("Photo deleted.");
  };

  const addPhotoComment = (id, comment) => {
    setPhotos(p=>p.map(ph=>ph.id===id?{...ph,comments:[...(ph.comments||[]),comment]}:ph));
    showToast("Comment added!");
  };

  const addIncident = (childId, category, bodyPart, what, action, severity) => {
    const child = children.find(c=>c.id===childId);
    if(!child)return;
    setIncidents(p=>[{id:Date.now(),childId,childName:child.name,date:`Today, ${new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`,category,bodyPart:bodyPart||"-",what,action,staff:user.name,acknowledged:false,severity,comments:[]},...p]);
    setShowIncidentModal(false);
    showToast("Incident logged. Parent notified 🔔");
  };

  const editIncident = (id, data) => {
    setIncidents(p=>p.map(i=>i.id===id?{...i,...data}:i));
    showToast("Incident updated!");
  };

  const deleteIncident = (id) => {
    if(!window.confirm("Delete this incident report?")) return;
    setIncidents(p=>p.filter(i=>i.id!==id));
    showToast("Incident deleted.");
  };

  const addIncidentComment = (id, comment) => {
    setIncidents(p=>p.map(i=>i.id===id?{...i,comments:[...(i.comments||[]),comment]}:i));
    showToast("Comment added!");
  };

  const acknowledgeIncident = (id) => { setIncidents(p=>p.map(i=>i.id===id?{...i,acknowledged:true}:i)); showToast("Acknowledged!"); };

  const sendMessage = (recipientId, text, childId) => {
    if(!text.trim())return;
    const recipient = dbUsers.find(u=>u.id===recipientId);
    setMessages(p=>[...p,{id:Date.now(),senderId:user.id,senderName:user.name,senderAvatar:user.avatar||"👤",recipientId,recipientName:recipient?.name||"",time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),text,read:false,childId:childId||null}]);
    showToast("Message sent! 💬");
  };

  const deleteMessage = (id) => {
    setMessages(p=>p.filter(m=>m.id!==id));
    showToast("Message deleted.");
  };

  const submitActivityResponse = (activityId, completedSteps, response, emoji) => {
    setActivities(p=>p.map(a=>a.id===activityId?{...a,
      submissions:{...a.submissions,[user.childId]:{completedSteps,response,submittedAt:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),emoji}},
      completed:(a.completed||0)+1
    }:a));
    const child = children.find(c=>c.id===user.childId);
    if(child){setChildren(p=>p.map(c=>c.id===user.childId?{...c,xp:(c.xp||0)+20}:c));}
    showToast("Activity submitted! +20 XP 🌟");
  };

  const addActivity = (title, category, description, duration, steps) => {
    setActivities(p=>[{id:Date.now(),title,category,description,duration,durationMin:parseInt(duration),postedBy:user.name,time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),completed:0,steps:steps||[],submissions:{}},...p]);
    setShowActivityModal(false);
    showToast("Activity posted to classroom! 🎓");
  };

  const editActivity = (id, data) => {
    setActivities(p=>p.map(a=>a.id===id?{...a,...data}:a));
    showToast("Activity updated!");
  };

  const deleteActivity = (id) => {
    if(!window.confirm("Delete this activity?")) return;
    setActivities(p=>p.filter(a=>a.id!==id));
    showToast("Activity deleted.");
  };

  const pushQuestion = (question) => {
    setActiveQuestion({...question,pushedAt:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})});
    setShowQuestionModal(false);
    showToast("Question pushed to all kids! 📲");
  };

  const exportQuestions = () => {
    const blob = new Blob([JSON.stringify(QUICK_QUESTIONS,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="BrightDays-Questions.json"; a.click();
    URL.revokeObjectURL(url);
    showToast("Questions exported! 📤");
  };

  const importQuestions = () => {
    const input = document.createElement("input"); input.type="file"; input.accept=".json";
    input.onchange=(e)=>{
      const reader = new FileReader();
      reader.onload=(ev)=>{ try{ const imported=JSON.parse(ev.target.result); if(Array.isArray(imported)&&imported.length>0){ showToast(`${imported.length} questions imported! 📥`); } else { showToast("No valid questions found","error"); } }catch{ showToast("Invalid JSON file","error"); } };
      reader.readAsText(e.target.files[0]);
    };
    input.click();
  };

  const aiGenerateActivity = () => {
    const ideas = [
      { title:"Rainbow Sorting Adventure",category:"Colors",description:"Sort colored objects into baskets. Talk about each color!",duration:"15 min",steps:["Get the colored objects","Sort into groups","Count each group","Which is your favorite color?"] },
      { title:"Dance Like an Animal",category:"Animals",description:"Each kid picks an animal and shows how it moves!",duration:"10 min",steps:["Pick your animal","Move like that animal","Make its sound","Friends guess what you are!"] },
      { title:"Letter Treasure Hunt",category:"Letters",description:"Find letter cards hidden around the room, shout the sound!",duration:"15 min",steps:["Search the room for letters","Find the letter A","Find the letter B","Shout the sound for each!"] },
    ];
    const r = ideas[Math.floor(Math.random()*ideas.length)];
    setActivities(p=>[{id:Date.now(),...r,durationMin:15,postedBy:"🤖 AI",time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),completed:0,submissions:{}},...p]);
    showToast(`AI generated: "${r.title}" 🤖`);
  };

  const startGame = (subjectId) => {
    const lesson = LEARNING[subjectId];
    if(!lesson)return;
    setGame({subjectId,questions:lesson.questions,currentQ:0,hearts:3,picked:null,showResult:false});
    setGameScore(0);
  };

  const answerGame = (option) => {
    setGame(q=>({...q,picked:option,showResult:true}));
    if(option===game.questions[game.currentQ].a){
      setGameScore(s=>s+10);
      setChildren(p=>p.map(c=>c.id===user.childId?{...c,xp:(c.xp||0)+10}:c));
    } else {
      setGame(q=>({...q,hearts:q.hearts-1}));
    }
  };

  const nextQuestion = () => {
    if(game.currentQ+1>=game.questions.length||game.hearts<=0){
      showToast(`Game done! +${gameScore} XP 🎉`);
      setGame(null); return;
    }
    setGame(q=>({...q,currentQ:q.currentQ+1,picked:null,showResult:false}));
  };

  const updateAvatar = (newAvatar) => {
    if(user.role==="d_child") setChildren(p=>p.map(c=>c.id===user.childId?{...c,avatar:newAvatar}:c));
    setDbUsers(p=>p.map(u=>u.id===user.id?{...u,avatar:newAvatar}:u));
    setUser(u=>({...u,avatar:newAvatar}));
    showToast("Profile updated! 🎨");
    setShowAvatarModal(false);
  };

  // ── LOGIN GATE ────────────────────────────────────────────────────────────
  if(!user) return (
    <LoginScreen
      email={emailInput} setEmail={setEmailInput}
      pw={pwInput} setPw={setPwInput}
      onLogin={login} err={loginErr}
      onShowPrivacy={()=>setShowPrivacyModal(true)}
      showPrivacyModal={showPrivacyModal}
      closePrivacy={()=>setShowPrivacyModal(false)}
    />
  );

  const isSuper = user.role==="super";
  const brand = isSuper ? {name:"BrightDays",sub:"Platform Admin",emoji:"🎯"} : {name:"BrightDays",sub:"Daycare",emoji:"🌟"};

  // ── TABS ─────────────────────────────────────────────────────────────────
  const buildTabs = () => {
    const base = {
      super:    [{id:"dashboard",label:"Platform",icon:"🎯"},{id:"orgs",label:"Customers",icon:"🏢"},{id:"revenue",label:"Revenue",icon:"💰"},{id:"plans",label:"Plans",icon:"💎"},{id:"users",label:"Users",icon:"👤"}],
      d_admin:  [{id:"dashboard",label:"Dashboard",icon:"🏠"},{id:"timeline",label:"Timeline",icon:"📅"},{id:"compliance",label:"Compliance",icon:"📋"},{id:"children",label:"Children",icon:"👶"},{id:"staff",label:"Staff",icon:"👩‍🏫"},{id:"photos",label:"Photos",icon:"📸"},{id:"incidents",label:"Incidents",icon:"🩹"},{id:"billing",label:"Billing",icon:"💳"},{id:"messages",label:"Messages",icon:"💬"}],
      d_staff:  [{id:"dashboard",label:"Dashboard",icon:"🏠"},{id:"timeline",label:"Timeline",icon:"📅"},{id:"daily",label:"Daily Reports",icon:"📋"},{id:"photos",label:"Photos",icon:"📸"},{id:"incidents",label:"Incidents",icon:"🩹"},{id:"attendance",label:"Attendance",icon:"✅"},{id:"messages",label:"Messages",icon:"💬"}],
      d_parent: [{id:"dashboard",label:"My Child",icon:"🏠"},{id:"daily",label:"Today's Report",icon:"📋"},{id:"photos",label:"Photos",icon:"📸"},{id:"incidents",label:"Incidents",icon:"🩹"},{id:"messages",label:"Messages",icon:"💬"},{id:"privacy",label:"Privacy",icon:"🔒"}],
      d_child:  [{id:"dashboard",label:"Home",icon:"🏠"},{id:"classroom",label:"Classroom",icon:"🎓"},{id:"learn",label:"Play & Learn",icon:"🎮"},{id:"badges",label:"My Badges",icon:"🏆"},{id:"leaderboard",label:"Top Kids",icon:"🌟"}],
    }[user.role]||[];

    if(hasClassroom&&(user.role==="d_staff"||user.role==="d_admin")){
      const idx = user.role==="d_admin"?2:3;
      base.splice(idx,0,{id:"classroom",label:"Classroom",icon:"🎓",premium:true});
    }
    return base;
  };
  const TABS = buildTabs();

  const staffMembers = dbUsers.filter(u=>u.role==="d_staff"&&u.orgId===user.orgId);

  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:FONT,color:T.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box;}
        button:hover{opacity:0.9;transform:translateY(-1px);}
        input,select,textarea{box-sizing:border-box;}
        @keyframes pop{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .heartbeat{animation:pulse 1.4s ease-in-out infinite}
        .bouncy{animation:bounce 1s ease-in-out infinite}
        .shimmer{background:linear-gradient(90deg,#FFD93D,#FF6B35,#FFD93D);background-size:200% 100%;animation:shimmer 3s linear infinite;}
        .mobile-only{display:none !important;}
        @media(max-width:768px){
          .desktop-tabs{display:none !important;}
          .mobile-only{display:flex !important;}
          h1{font-size:26px !important;}
          h2{font-size:20px !important;}
        }
      `}</style>

      <div style={{background:"linear-gradient(90deg,#FFD93D,#FF6B35)",color:"#fff",padding:"6px 16px",textAlign:"center",fontSize:11,fontWeight:800}}>
        🚧 BETA DEMO — All features unlocked · No real data is saved
      </div>

      {/* Toast */}
      {toast&&<div style={{position:"fixed",top:30,right:20,zIndex:9999,background:toast.type==="success"?T.green:T.red,color:"#fff",padding:"12px 20px",borderRadius:12,fontWeight:700,fontSize:14,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",animation:"pop 0.3s",maxWidth:340}}>{toast.type==="success"?"✅":"⚠️"} {toast.msg}</div>}

      {/* Modals */}
      {showPhotoModal&&<PhotoModal children={children} onClose={()=>setShowPhotoModal(false)} onPost={addPhoto}/>}
      {showIncidentModal&&<IncidentModal children={children} onClose={()=>setShowIncidentModal(false)} onSave={addIncident}/>}
      {showPrivacyModal&&<PrivacyModal onClose={()=>setShowPrivacyModal(false)}/>}
      {showVideoModal&&<VideoModal video={showVideoModal} onClose={()=>setShowVideoModal(null)}/>}
      {showActivityModal&&<ActivityModal onClose={()=>setShowActivityModal(false)} onSave={addActivity}/>}
      {showQuestionModal&&<QuestionModal onClose={()=>setShowQuestionModal(false)} onPush={pushQuestion}/>}
      {showUpgradeModal&&<UpgradeModal currentPlan={currentOrg?.plan||"basic"} userEmail={user?.email||""} onUpgrade={(plan)=>upgradeOrg(user.orgId,plan)} onClose={()=>setShowUpgradeModal(false)}/>}
      {showAvatarModal&&<AvatarModal currentAvatar={user.avatar||"👤"} onSave={updateAvatar} onClose={()=>setShowAvatarModal(false)}/>}
      {showNotifModal&&<NotificationsPanel notifications={notifications} onClose={()=>setShowNotifModal(false)} onNavigate={(g)=>{setTab(g);setShowNotifModal(false);}}/>}
      {showAddChildModal&&<AddChildModal onClose={()=>setShowAddChildModal(false)} onSave={addChild}/>}
      {showAddStaffModal&&<AddStaffModal onClose={()=>setShowAddStaffModal(false)} onSave={addStaff}/>}
      {showEditChildModal&&<EditChildModal child={children.find(c=>c.id===showEditChildModal)} onClose={()=>setShowEditChildModal(null)} onSave={updateChild}/>}
      {showEditConsentModal&&<EditConsentModal parentId={showEditConsentModal} consent={consents[showEditConsentModal]||{}} onClose={()=>setShowEditConsentModal(null)} onSave={updateConsent}/>}
      {game&&<GameModal game={game} onAnswer={answerGame} onNext={nextQuestion} onClose={()=>setGame(null)} score={gameScore}/>}

      {/* NAV */}
      <nav style={{background:"#fff",borderBottom:`1px solid ${T.border}`,padding:"0 16px",display:"flex",alignItems:"center",gap:6,minHeight:60,position:"sticky",top:0,zIndex:100,flexWrap:"wrap"}}>
        <span style={{fontSize:24}}>{brand.emoji}</span>
        <div style={{marginRight:"auto"}}>
          <div style={{fontWeight:900,fontSize:18,color:T.primary}}>{brand.name} <span style={{color:T.text,fontSize:12,fontWeight:600}}>{brand.sub}</span></div>
          {currentOrg&&!isSuper&&<div style={{fontSize:10,color:T.muted,fontWeight:600}}>{currentOrg.name} · <span style={{color:PLANS[currentOrg.plan]?.color,fontWeight:800}}>{PLANS[currentOrg.plan]?.name} Plan</span></div>}
        </div>

        {/* Search */}
        {!isSuper&&(
          <div style={{position:"relative"}}>
            <input
              value={searchQuery}
              onChange={e=>{setSearchQuery(e.target.value);setShowSearchResults(e.target.value.length>=2);}}
              onBlur={()=>setTimeout(()=>setShowSearchResults(false),200)}
              placeholder="🔍 Search children, photos..."
              style={{padding:"8px 14px",border:`1.5px solid ${T.border}`,borderRadius:20,fontSize:13,fontFamily:FONT,width:220,outline:"none"}}
            />
            {showSearchResults&&searchResults.length>0&&(
              <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:`1px solid ${T.border}`,borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:200,marginTop:4,maxHeight:300,overflowY:"auto"}}>
                {searchResults.map(r=>(
                  <button key={r.id} onClick={()=>{setTab(r.action);setShowSearchResults(false);setSearchQuery("");}} style={{width:"100%",border:"none",background:"transparent",padding:"10px 14px",cursor:"pointer",display:"flex",gap:10,alignItems:"center",fontFamily:FONT,textAlign:"left"}}>
                    <span style={{fontSize:18}}>{r.icon}</span>
                    <div>
                      <div style={{fontWeight:700,fontSize:13}}>{r.label}</div>
                      <div style={{fontSize:11,color:T.muted}}>{r.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Desktop tabs */}
        <div className="desktop-tabs" style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
          {TABS.map(t=>{
            const badge = t.id==="incidents"&&unreadIncidents>0;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{...btn(tab===t.id?"primary":"ghost","sm"),display:"flex",alignItems:"center",gap:3,position:"relative"}}>
                {t.icon} {t.label}
                {t.premium&&<span style={{fontSize:9}}>✨</span>}
                {badge&&<span style={{position:"absolute",top:-4,right:-4,background:T.red,color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>{unreadIncidents}</span>}
              </button>
            );
          })}
        </div>

        {/* Bell + user pill */}
        {!isSuper&&(
          <button onClick={()=>setShowNotifModal(true)} style={{position:"relative",background:unreadCount>0?T.primaryLight:"transparent",border:"none",borderRadius:10,padding:"8px",cursor:"pointer",fontSize:18}}>
            🔔{unreadCount>0&&<span style={{position:"absolute",top:-2,right:-2,background:T.red,color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>{unreadCount}</span>}
          </button>
        )}

        <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:T.primaryLight,borderRadius:10}}>
          <button onClick={()=>setShowAvatarModal(true)} style={{fontSize:18,background:"none",border:"none",cursor:"pointer",padding:0}}>{user.avatar||"👤"}</button>
          <div>
            <div style={{fontWeight:800,fontSize:11,color:T.primary,maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
            <div style={{fontSize:9,color:T.muted,textTransform:"capitalize"}}>{user.role.replace("d_","")}</div>
          </div>
          <button onClick={()=>setUser(null)} style={{...btn("ghost","sm"),fontSize:10,padding:"3px 8px"}}>Out</button>
        </div>

        {/* Mobile hamburger */}
        <button className="mobile-only" onClick={()=>setMobileMenuOpen(!mobileMenuOpen)} style={{background:T.primary,color:"#fff",border:"none",borderRadius:10,padding:"8px 12px",fontSize:18,cursor:"pointer"}}>
          {mobileMenuOpen?"✕":"☰"}
        </button>

        {/* Mobile menu */}
        {mobileMenuOpen&&(
          <div className="mobile-only" style={{width:"100%",padding:"8px 0",borderTop:`1px solid ${T.border}`,flexDirection:"column",gap:4}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>{setTab(t.id);setMobileMenuOpen(false);}} style={{...btn(tab===t.id?"primary":"ghost","md"),display:"flex",alignItems:"center",gap:8,width:"100%"}}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      <main style={{padding:"24px 16px",maxWidth:1100,margin:"0 auto"}}>
        {/* SUPER ADMIN */}
        {isSuper&&tab==="dashboard"&&<SuperDash orgs={orgs}/>}
        {isSuper&&tab==="orgs"&&<SuperOrgs orgs={orgs} setOrgs={setOrgs}/>}
        {isSuper&&tab==="revenue"&&<SuperRevenue orgs={orgs}/>}
        {isSuper&&tab==="plans"&&<SuperPlans/>}
        {isSuper&&tab==="users"&&<SuperUsers dbUsers={dbUsers} orgs={orgs} onRemove={(id)=>{if(window.confirm("Remove user?"))setDbUsers(p=>p.filter(u=>u.id!==id));}} />}

        {/* DIRECTOR */}
        {user.role==="d_admin"&&tab==="dashboard"&&<DaycareAdminDash children={children} incidents={incidents} photos={photos} consents={consents} hasClassroom={hasClassroom} onUpgrade={()=>setShowUpgradeModal(true)} setTab={setTab} currentOrg={currentOrg}/>}
        {user.role==="d_admin"&&tab==="timeline"&&<TodayTimeline user={user} children={children} photos={photos} incidents={incidents} dailyReports={dailyReports} activities={activities}/>}
        {user.role==="d_admin"&&tab==="compliance"&&<ComplianceDashboard children={children} consents={consents} showToast={showToast} onEditConsent={setShowEditConsentModal} onEditChild={(id)=>setShowEditChildModal(id)}/>}
        {user.role==="d_admin"&&tab==="children"&&<ChildrenManager children={children} photos={photos} incidents={incidents} consents={consents} onToggle={toggleChild} onBulkCheckIn={bulkCheckIn} onAdd={()=>setShowAddChildModal(true)} onEdit={(id)=>setShowEditChildModal(id)} onRemove={removeChild}/>}
        {user.role==="d_admin"&&tab==="staff"&&<StaffManager dbUsers={dbUsers} staffMembers={staffMembers} onAdd={()=>setShowAddStaffModal(true)} onRemove={removeStaff} showToast={showToast}/>}
        {user.role==="d_admin"&&tab==="billing"&&<BillingView invoices={invoices} setInvoices={setInvoices} showToast={showToast}/>}

        {/* STAFF */}
        {user.role==="d_staff"&&tab==="dashboard"&&<StaffDash user={user} children={children} hasClassroom={hasClassroom} activities={activities} photos={photos} incidents={incidents} setTab={setTab}/>}
        {user.role==="d_staff"&&tab==="timeline"&&<TodayTimeline user={user} children={children} photos={photos} incidents={incidents} dailyReports={dailyReports} activities={activities}/>}
        {user.role==="d_staff"&&tab==="daily"&&<DailyReportView user={user} children={children} dailyReports={dailyReports} setDailyReports={setDailyReports} showToast={showToast}/>}
        {user.role==="d_staff"&&tab==="attendance"&&<ChildrenManager children={children} photos={photos} incidents={incidents} consents={consents} onToggle={toggleChild} onBulkCheckIn={bulkCheckIn}/>}

        {/* PARENT */}
        {user.role==="d_parent"&&tab==="dashboard"&&<ParentDash user={user} children={children} photos={photos} incidents={incidents} consents={consents} dailyReports={dailyReports} setTab={setTab}/>}
        {user.role==="d_parent"&&tab==="daily"&&<DailyReportView user={user} children={children} dailyReports={dailyReports} setDailyReports={setDailyReports} showToast={showToast}/>}
        {user.role==="d_parent"&&tab==="privacy"&&<ParentPrivacyCenter user={user} consents={consents} onShowPrivacy={()=>setShowPrivacyModal(true)}/>}

        {/* KID */}
        {user.role==="d_child"&&tab==="dashboard"&&<KidDash user={user} children={children} setTab={setTab} onChangeAvatar={()=>setShowAvatarModal(true)}/>}
        {user.role==="d_child"&&tab==="classroom"&&<KidClassroom user={user} activities={activities} activeQuestion={activeQuestion} onSubmit={submitActivityResponse} showToast={showToast}/>}
        {user.role==="d_child"&&tab==="learn"&&<LearnView onStart={startGame}/>}
        {user.role==="d_child"&&tab==="badges"&&<BadgesView user={user} children={children}/>}
        {user.role==="d_child"&&tab==="leaderboard"&&<Leaderboard children={children}/>}

        {/* CLASSROOM (staff/admin plus) */}
        {(user.role==="d_staff"||user.role==="d_admin")&&tab==="classroom"&&(
          hasClassroom
            ? <ClassroomBoard user={user} activities={activities} setActivities={setActivities} activeQuestion={activeQuestion} onWatchVideo={setShowVideoModal} onAddActivity={()=>setShowActivityModal(true)} onAskQuestion={()=>setShowQuestionModal(true)} onClearQuestion={()=>setActiveQuestion(null)} onImport={importQuestions} onExport={exportQuestions} onExportActivity={(a)=>{ const b=new Blob([JSON.stringify(a,null,2)],{type:"application/json"}); const u2=URL.createObjectURL(b); const a2=document.createElement("a"); a2.href=u2; a2.download=`Activity-${a.title}.json`; a2.click(); showToast("Exported!"); }} onAI={aiGenerateActivity} onEdit={editActivity} onDelete={deleteActivity} showToast={showToast}/>
            : <UpgradePrompt onUpgrade={()=>setShowUpgradeModal(true)}/>
        )}

        {/* SHARED */}
        {(user.role==="d_admin"||user.role==="d_staff"||user.role==="d_parent")&&tab==="photos"&&<PhotosFeed user={user} photos={photos} onLike={toggleLike} onAddPhoto={()=>setShowPhotoModal(true)} onEdit={editPhoto} onDelete={deletePhoto} onComment={addPhotoComment}/>}
        {(user.role==="d_admin"||user.role==="d_staff"||user.role==="d_parent")&&tab==="incidents"&&<IncidentsView user={user} incidents={incidents} onAdd={()=>setShowIncidentModal(true)} onAck={acknowledgeIncident} onEdit={editIncident} onDelete={deleteIncident} onComment={addIncidentComment}/>}
        {(user.role==="d_admin"||user.role==="d_staff"||user.role==="d_parent")&&tab==="messages"&&<MessagesView user={user} messages={messages} dbUsers={dbUsers} children={children} onSend={sendMessage} onDelete={deleteMessage}/>}
      </main>

      <footer style={{borderTop:`1px solid ${T.border}`,background:"#fff",padding:"14px 20px",marginTop:40,textAlign:"center",fontSize:11,color:T.muted}}>
        © 2026 BrightDays · <button onClick={()=>setShowPrivacyModal(true)} style={{background:"none",border:"none",color:T.primary,fontWeight:700,cursor:"pointer",fontSize:11}}>Privacy Policy</button> · COPPA-compliant
      </footer>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SUPER ADMIN
// ════════════════════════════════════════════════════════════════════════

function SuperDash({orgs}){
  const totalRev = orgs.reduce((s,o)=>s+o.monthlyFee,0);
  return(
    <div>
      <h2 style={{fontWeight:900,fontSize:24,margin:"0 0 4px"}}>🎯 Platform Overview</h2>
      <p style={{color:T.muted,margin:"0 0 20px",fontWeight:600}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:22}}>
        {[
          {l:"Customers",v:orgs.length,i:"🌟",c:T.primary,bg:T.primaryLight},
          {l:"Monthly Revenue",v:`$${totalRev}`,i:"💰",c:T.green,bg:T.greenLight},
          {l:"Annual Run Rate",v:`$${totalRev*12}`,i:"📈",c:T.purple,bg:T.purpleLight},
          {l:"Total Children",v:orgs.reduce((s,o)=>s+o.students,0),i:"👶",c:T.cyan,bg:T.cyanLight},
        ].map(s=>(
          <div key={s.l} style={{...card,padding:18,display:"flex",gap:12,alignItems:"center"}}>
            <div style={{width:46,height:46,borderRadius:12,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{s.i}</div>
            <div><div style={{fontSize:22,fontWeight:900,color:s.c}}>{s.v}</div><div style={{fontSize:11,color:T.muted,fontWeight:600}}>{s.l}</div></div>
          </div>
        ))}
      </div>
      <div style={{...card,padding:20}}>
        <h3 style={{margin:"0 0 12px",fontWeight:800}}>📋 Customer List</h3>
        {orgs.map(o=>(
          <div key={o.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
            <span style={{fontSize:22}}>🌟</span>
            <div style={{flex:1}}><div style={{fontWeight:700}}>{o.name}</div><div style={{fontSize:11,color:T.muted}}><span style={{color:PLANS[o.plan].color,fontWeight:700}}>{PLANS[o.plan].name}</span> · {o.students} children</div></div>
            <span style={{fontWeight:800,color:T.green}}>${o.monthlyFee}/mo</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuperOrgs({orgs,setOrgs}){
  const BLANK = {name:"",plan:"basic",students:0,status:"active"};
  const [modal, setModal] = useState(null); // null | {mode:"add"|"edit", org:{...}}
  const [confirmDel, setConfirmDel] = useState(null); // org id to delete

  const openAdd  = ()=>setModal({mode:"add",  org:{...BLANK}});
  const openEdit = (o)=>setModal({mode:"edit", org:{...o}});
  const closeModal = ()=>setModal(null);

  const saveOrg = ()=>{
    if(!modal.org.name.trim()) return;
    const fee = PLANS[modal.org.plan]?.price ?? 49;
    if(modal.mode==="add"){
      const newOrg = {...modal.org, id:"org_"+Date.now(), monthlyFee:fee, students:Number(modal.org.students)||0};
      setOrgs(p=>[...p, newOrg]);
    } else {
      setOrgs(p=>p.map(o=>o.id===modal.org.id ? {...modal.org, monthlyFee:fee, students:Number(modal.org.students)||0} : o));
    }
    closeModal();
  };

  const deleteOrg = (id)=>{
    setOrgs(p=>p.filter(o=>o.id!==id));
    setConfirmDel(null);
  };

  const field = (label,key,type="text",opts=null)=>(
    <div style={{marginBottom:14}}>
      <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:4,textTransform:"uppercase"}}>{label}</div>
      {opts
        ? <select value={modal.org[key]} onChange={e=>setModal(m=>({...m,org:{...m.org,[key]:e.target.value}}))} style={{width:"100%",padding:"9px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,background:"#fff"}}>
            {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
        : <input type={type} value={modal.org[key]} onChange={e=>setModal(m=>({...m,org:{...m.org,[key]:e.target.value}}))} style={{width:"100%",padding:"9px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,boxSizing:"border-box"}} />
      }
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h2 style={{fontWeight:900,fontSize:22,margin:0}}>🏢 All Customers</h2>
        <button onClick={openAdd} style={btn("primary")}>+ Add Customer</button>
      </div>

      <div style={{...card,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:640}}>
          <thead>
            <tr style={{background:"#F9FAFB"}}>
              {["Org Name","Plan","Children","Monthly","Status","Actions"].map(h=>(
                <th key={h} style={{padding:"12px 14px",textAlign:"left",fontWeight:800,fontSize:11,color:T.muted,textTransform:"uppercase"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orgs.length===0&&(
              <tr><td colSpan={6} style={{padding:"32px",textAlign:"center",color:T.muted}}>No customers yet. Click "+ Add Customer" to get started.</td></tr>
            )}
            {orgs.map((o,i)=>(
              <tr key={o.id} style={{borderTop:`1px solid ${T.border}`,background:i%2===0?"#fff":"#FAFBFC"}}>
                <td style={{padding:"12px 14px",fontWeight:700}}>🌟 {o.name}</td>
                <td style={{padding:"12px 14px"}}>
                  <span style={bdg(PLANS[o.plan]?.color??T.muted,(PLANS[o.plan]?.color??T.muted)+"22")}>{PLANS[o.plan]?.name??o.plan}</span>
                </td>
                <td style={{padding:"12px 14px",color:T.muted}}>{o.students}</td>
                <td style={{padding:"12px 14px",fontWeight:800,color:T.green}}>${o.monthlyFee}</td>
                <td style={{padding:"12px 14px"}}>
                  {o.status==="inactive"
                    ? <span style={bdg(T.muted,"#F3F4F6")}>⏸ Inactive</span>
                    : <span style={bdg(T.green,T.greenLight)}>✅ Active</span>}
                </td>
                <td style={{padding:"12px 14px"}}>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>openEdit(o)} style={btn("secondary","sm")}>✏️ Edit</button>
                    <button onClick={()=>setConfirmDel(o.id)} style={btn("danger","sm")}>🗑 Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{...card,padding:28,width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto"}}>
            <h3 style={{fontWeight:900,fontSize:18,marginBottom:20}}>{modal.mode==="add"?"➕ Add New Customer":"✏️ Edit Customer"}</h3>
            {field("Daycare Name","name")}
            {field("Plan","plan","text",[["basic","Basic — $49/mo"],["plus","Plus — $79/mo"],["premium","Premium — $129/mo"]])}
            {field("Number of Children","students","number")}
            {field("Status","status","text",[["active","Active"],["inactive","Inactive"]])}
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <button onClick={saveOrg} style={{...btn("primary"),flex:1}}>{modal.mode==="add"?"Add Customer":"Save Changes"}</button>
              <button onClick={closeModal} style={{...btn("secondary"),flex:1}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDel&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{...card,padding:28,width:"100%",maxWidth:380,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
            <h3 style={{fontWeight:900,fontSize:17,marginBottom:8}}>Delete this customer?</h3>
            <p style={{color:T.muted,fontSize:14,marginBottom:20}}>This cannot be undone. The org and all its data will be removed.</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>deleteOrg(confirmDel)} style={{...btn("danger"),flex:1}}>Yes, Delete</button>
              <button onClick={()=>setConfirmDel(null)} style={{...btn("secondary"),flex:1}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SuperRevenue({orgs}){
  const [histView,  setHistView]  = useState("mrr");   // "mrr" | "customers"
  const [planFilter,setPlanFilter]= useState(null);     // null | plan key
  const [kpiPanel,  setKpiPanel]  = useState(null);     // null | "arr" | "avg"
  const [selectedBar,setSelectedBar]=useState(null);    // null | {i,month,mrr,cust}
  const [selectedRow,setSelectedRow]=useState(null);    // null | payment row object
  const [sortCol,   setSortCol]   = useState("date");
  const [sortDir,   setSortDir]   = useState("desc");

  const activeOrgs = orgs.filter(o=>o.status!=="inactive");
  const mrr  = activeOrgs.reduce((s,o)=>s+o.monthlyFee,0);
  const arr  = mrr*12;
  const avgRev = activeOrgs.length ? Math.round(mrr/activeOrgs.length) : 0;

  const planBreak = Object.entries(PLANS).map(([key,plan])=>{
    const matched = activeOrgs.filter(o=>o.plan===key);
    return {key, plan, count:matched.length, rev:matched.reduce((s,o)=>s+o.monthlyFee,0)};
  });

  const MONTHS_FULL = ["Dec 2025","Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026"];
  const MONTHS_SHORT = ["Dec","Jan","Feb","Mar","Apr","May"];
  const growthFactors = [0.38,0.52,0.63,0.75,0.88,1.0];
  const historyMRR  = growthFactors.map(f=>Math.round(mrr*f));
  const historyCust = growthFactors.map(f=>Math.max(1,Math.round(activeOrgs.length*f)));

  const histData   = histView==="mrr" ? historyMRR : historyCust;
  const histMax    = Math.max(...histData,1);
  const chartH=130, chartW=420, barW=44;
  const gap = (chartW - barW*6)/7;
  const fmtVal   = v => histView==="mrr" ? `$${v}` : `${v}`;
  const chartColor = histView==="mrr" ? T.green : T.primary;

  const payHistory = useMemo(()=>{
    const rows=[];
    const now=new Date(2026,4,11);
    activeOrgs.forEach((o,oi)=>{
      for(let m=0;m<5;m++){
        const d=new Date(now.getFullYear(),now.getMonth()-m,1);
        rows.push({
          org:o.name, plan:o.plan, amount:o.monthlyFee,
          date:`${d.toLocaleString("default",{month:"short"})} 1, ${d.getFullYear()}`,
          status: m===0&&oi%2===0 ? "pending":"paid",
          invoice:`BD-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(oi+1).padStart(3,"0")}`,
          _sort:d.getTime()
        });
      }
    });
    return rows;
  },[orgs]);

  // Filtered + sorted rows
  const visibleRows = useMemo(()=>{
    let rows = planFilter ? payHistory.filter(r=>r.plan===planFilter) : payHistory;
    const dir = sortDir==="asc" ? 1:-1;
    return [...rows].sort((a,b)=>{
      if(sortCol==="date")   return (a._sort-b._sort)*dir;
      if(sortCol==="amount") return (a.amount-b.amount)*dir;
      if(sortCol==="org")    return a.org.localeCompare(b.org)*dir;
      if(sortCol==="plan")   return a.plan.localeCompare(b.plan)*dir;
      if(sortCol==="status") return a.status.localeCompare(b.status)*dir;
      return 0;
    });
  },[payHistory,planFilter,sortCol,sortDir]);

  const handleSort = col=>{
    if(sortCol===col) setSortDir(d=>d==="asc"?"desc":"asc");
    else { setSortCol(col); setSortDir("desc"); }
  };
  const sortArrow = col=> sortCol===col ? (sortDir==="asc"?" ↑":" ↓") : " ↕";

  // KPI card — clickable
  const kpi=(label,val,sub,color,emoji,kpiKey,chartMode)=>{
    const active = kpiPanel===kpiKey || (chartMode&&histView===chartMode&&!kpiPanel);
    return(
      <div onClick={()=>{
            if(chartMode){setHistView(chartMode); setKpiPanel(null);}
            else setKpiPanel(p=>p===kpiKey?null:kpiKey);
          }}
        style={{...card,padding:20,flex:1,minWidth:140,cursor:"pointer",
          border:`2px solid ${active?color:T.border}`,
          background:active?color+"11":"#fff",
          transform:active?"translateY(-2px)":"none",
          transition:"all .15s"}}>
        <div style={{fontSize:11,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{emoji} {label}</div>
        <div style={{fontSize:30,fontWeight:900,color}}>{val}</div>
        {sub&&<div style={{fontSize:12,color:T.muted,fontWeight:600,marginTop:2}}>{sub}</div>}
        <div style={{fontSize:10,color,marginTop:6,fontWeight:700}}>{active?"▲ Hide details":"▼ Click to expand"}</div>
      </div>
    );
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <h2 style={{fontWeight:900,fontSize:22,margin:0}}>💰 Revenue Dashboard</h2>

      {/* KPI Row */}
      <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
        {kpi("MRR",`$${mrr}`,"Monthly Recurring",T.green,"💵",null,"mrr")}
        {kpi("ARR",`$${arr.toLocaleString()}`,"Annual Run Rate",T.cyan,"📈","arr",null)}
        {kpi("Customers",activeOrgs.length,`${orgs.length-activeOrgs.length} inactive`,T.primary,"🏢",null,"customers")}
        {kpi("Avg / Org",`$${avgRev}`,"/month",T.yellow,"⭐","avg",null)}
      </div>

      {/* KPI Detail Panels */}
      {kpiPanel==="arr"&&(
        <div style={{...card,padding:20}}>
          <div style={{fontWeight:800,fontSize:14,marginBottom:14}}>📈 12-Month ARR Projection</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:"#F9FAFB"}}>
                {["Month","Projected MRR","Projected ARR","Cumulative"].map(h=>(
                  <th key={h} style={{padding:"8px 14px",textAlign:"left",fontWeight:800,fontSize:11,color:T.muted,textTransform:"uppercase"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {Array.from({length:12},(_,i)=>{
                  const month = new Date(2026,4+i,1).toLocaleString("default",{month:"long",year:"numeric"});
                  const projMRR = Math.round(mrr*(1+i*0.08));
                  return(
                    <tr key={i} style={{borderTop:`1px solid ${T.border}`,background:i%2===0?"#fff":"#FAFBFC"}}>
                      <td style={{padding:"8px 14px",fontWeight:600}}>{month}</td>
                      <td style={{padding:"8px 14px",fontWeight:800,color:T.green}}>${projMRR}</td>
                      <td style={{padding:"8px 14px",color:T.cyan,fontWeight:700}}>${(projMRR*12).toLocaleString()}</td>
                      <td style={{padding:"8px 14px",color:T.muted}}>${Array.from({length:i+1},(_,j)=>Math.round(mrr*(1+j*0.08))).reduce((s,v)=>s+v,0).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {kpiPanel==="avg"&&(
        <div style={{...card,padding:20}}>
          <div style={{fontWeight:800,fontSize:14,marginBottom:14}}>⭐ Revenue per Customer — Ranked</div>
          {activeOrgs.length===0
            ? <div style={{color:T.muted,textAlign:"center",padding:24}}>No active customers.</div>
            : [...activeOrgs].sort((a,b)=>b.monthlyFee-a.monthlyFee).map((o,i)=>(
              <div key={o.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
                <div style={{fontWeight:900,color:T.muted,fontSize:13,width:20}}>#{i+1}</div>
                <div style={{flex:1,fontWeight:700}}>🌟 {o.name}</div>
                <span style={bdg(PLANS[o.plan]?.color??T.muted,(PLANS[o.plan]?.color??T.muted)+"22")}>{PLANS[o.plan]?.name??o.plan}</span>
                <div style={{fontWeight:900,color:T.green,fontSize:15,minWidth:60,textAlign:"right"}}>${o.monthlyFee}/mo</div>
                <div style={{width:100,height:6,borderRadius:4,background:T.border,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:4,background:T.green,width:`${(o.monthlyFee/Math.max(...activeOrgs.map(x=>x.monthlyFee)))*100}%`}}/>
                </div>
              </div>
          ))}
        </div>
      )}

      {/* Chart + Plan breakdown */}
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:16}}>

        {/* Chart */}
        <div style={{...card,padding:20,minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:14}}>📊 6-Month History <span style={{fontWeight:600,fontSize:12,color:T.muted}}>(click a bar for details)</span></div>
            <div style={{display:"flex",gap:6}}>
              {[["mrr","Revenue"],["customers","Customers"]].map(([v,l])=>(
                <button key={v} onClick={()=>{setHistView(v);setSelectedBar(null);}} style={{...btn(histView===v?"primary":"secondary","sm"),minWidth:80}}>{l}</button>
              ))}
            </div>
          </div>
          <svg viewBox={`0 0 ${chartW} ${chartH+40}`} style={{width:"100%",maxWidth:chartW,display:"block"}}>
            {[0,0.25,0.5,0.75,1].map(f=>{
              const y=chartH-f*chartH;
              return <line key={f} x1={0} y1={y} x2={chartW} y2={y} stroke={T.border} strokeWidth={1}/>;
            })}
            {histData.map((v,i)=>{
              const x=gap+i*(barW+gap);
              const bH=Math.max(4,(v/histMax)*chartH);
              const y=chartH-bH;
              const isLast=i===histData.length-1;
              const isSel=selectedBar?.i===i;
              return(
                <Fragment key={i}>
                  <rect x={x} y={y} width={barW} height={bH} rx={6}
                    fill={isSel?"#FF6B35":isLast?chartColor:chartColor+"55"}
                    style={{cursor:"pointer"}}
                    onClick={()=>setSelectedBar(isSel?null:{i,month:MONTHS_FULL[i],mrr:historyMRR[i],cust:historyCust[i]})}/>
                  {isSel&&<rect x={x-2} y={y-2} width={barW+4} height={bH+2} rx={7} fill="none" stroke={T.primary} strokeWidth={2}/>}
                  <text x={x+barW/2} y={chartH+16} textAnchor="middle" fontSize={10} fill={isSel?T.primary:T.muted} fontWeight={isSel||isLast?800:600}>{MONTHS_SHORT[i]}</text>
                  <text x={x+barW/2} y={y-5} textAnchor="middle" fontSize={9} fill={isSel?T.primary:isLast?chartColor:T.muted} fontWeight={800}>{fmtVal(v)}</text>
                </Fragment>
              );
            })}
          </svg>
          {selectedBar ? (
            <div style={{background:T.primaryLight,borderRadius:10,padding:"12px 16px",marginTop:8,border:`1px solid ${T.primary}33`}}>
              <div style={{fontWeight:800,fontSize:13,color:T.primary,marginBottom:6}}>📅 {selectedBar.month}</div>
              <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
                <div><div style={{fontSize:10,color:T.muted,fontWeight:700,textTransform:"uppercase"}}>MRR</div><div style={{fontWeight:900,color:T.green,fontSize:18}}>${selectedBar.mrr}</div></div>
                <div><div style={{fontSize:10,color:T.muted,fontWeight:700,textTransform:"uppercase"}}>Customers</div><div style={{fontWeight:900,color:T.primary,fontSize:18}}>{selectedBar.cust}</div></div>
                <div><div style={{fontSize:10,color:T.muted,fontWeight:700,textTransform:"uppercase"}}>ARR Pace</div><div style={{fontWeight:900,color:T.cyan,fontSize:18}}>${(selectedBar.mrr*12).toLocaleString()}</div></div>
                {selectedBar.i>0&&<div><div style={{fontSize:10,color:T.muted,fontWeight:700,textTransform:"uppercase"}}>MoM Δ</div><div style={{fontWeight:900,color:T.green,fontSize:18}}>+{Math.round((historyMRR[selectedBar.i]/Math.max(historyMRR[selectedBar.i-1],1)-1)*100)}%</div></div>}
              </div>
              <button onClick={()=>setSelectedBar(null)} style={{...btn("secondary","sm"),marginTop:8}}>✕ Close</button>
            </div>
          ):(
            <div style={{fontSize:11,color:T.muted,marginTop:4,textAlign:"right"}}>
              MoM growth: <strong style={{color:T.green}}>+{Math.round((histData[5]/Math.max(histData[4],1)-1)*100)}%</strong> vs last month
            </div>
          )}
        </div>

        {/* Plan Breakdown — clickable filter */}
        <div style={{...card,padding:20,minWidth:200}}>
          <div style={{fontWeight:800,fontSize:14,marginBottom:4}}>🎯 By Plan</div>
          <div style={{fontSize:11,color:T.muted,marginBottom:12}}>Click to filter history ↓</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {planBreak.map(({key,plan,count,rev:planRev})=>{
              const active=planFilter===key;
              return(
                <div key={key} onClick={()=>setPlanFilter(p=>p===key?null:key)}
                  style={{cursor:"pointer",padding:"8px 10px",borderRadius:8,border:`2px solid ${active?plan.color:T.border}`,background:active?plan.color+"11":"transparent",transition:"all .15s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={bdg(plan.color,plan.color+"22")}>{plan.name}</span>
                    <span style={{fontWeight:800,color:T.green,fontSize:13}}>${planRev}/mo</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,height:6,borderRadius:4,background:T.border,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:4,background:plan.color,width:mrr?`${(planRev/mrr)*100}%`:"0%",transition:"width .4s"}}/>
                    </div>
                    <span style={{fontSize:11,color:T.muted,width:60,textAlign:"right"}}>{count} org{count!==1?"s":""} · {mrr?Math.round((planRev/mrr)*100):0}%</span>
                  </div>
                </div>
              );
            })}
            <div style={{borderTop:`1px solid ${T.border}`,paddingTop:12,marginTop:4}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontWeight:700,fontSize:13}}>Total MRR</span>
                <span style={{fontWeight:900,color:T.green}}>${mrr}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History Table */}
      <div style={{...card,overflow:"auto"}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div style={{fontWeight:800,fontSize:14}}>🧾 Payment History <span style={{fontWeight:600,fontSize:12,color:T.muted}}>({visibleRows.length} records — click row for receipt)</span></div>
          {planFilter&&(
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={bdg(PLANS[planFilter]?.color??T.muted,(PLANS[planFilter]?.color??T.muted)+"22")}>
                Filtered: {PLANS[planFilter]?.name}
              </span>
              <button onClick={()=>setPlanFilter(null)} style={{...btn("secondary","sm")}}>✕ Clear</button>
            </div>
          )}
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:560}}>
          <thead>
            <tr style={{background:"#F9FAFB"}}>
              {[["date","Date"],["org","Customer"],["plan","Plan"],["amount","Amount"],["status","Status"]].map(([col,label])=>(
                <th key={col} onClick={()=>handleSort(col)}
                  style={{padding:"10px 16px",textAlign:"left",fontWeight:800,fontSize:11,color:sortCol===col?T.primary:T.muted,
                    textTransform:"uppercase",cursor:"pointer",userSelect:"none",
                    background:sortCol===col?"#FFF0EA":"transparent",transition:"background .1s"}}>
                  {label}{sortArrow(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length===0&&(
              <tr><td colSpan={5} style={{padding:32,textAlign:"center",color:T.muted}}>No records match the current filter.</td></tr>
            )}
            {visibleRows.map((row,i)=>(
              <tr key={i} onClick={()=>setSelectedRow(row)}
                style={{borderTop:`1px solid ${T.border}`,background:i%2===0?"#fff":"#FAFBFC",
                  cursor:"pointer",transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=T.primaryLight}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#FAFBFC"}>
                <td style={{padding:"10px 16px",color:T.muted,fontWeight:600}}>{row.date}</td>
                <td style={{padding:"10px 16px",fontWeight:700}}>🌟 {row.org}</td>
                <td style={{padding:"10px 16px"}}>
                  <span style={bdg(PLANS[row.plan]?.color??T.muted,(PLANS[row.plan]?.color??T.muted)+"22")}>{PLANS[row.plan]?.name??row.plan}</span>
                </td>
                <td style={{padding:"10px 16px",fontWeight:800,color:T.green}}>${row.amount}</td>
                <td style={{padding:"10px 16px"}}>
                  {row.status==="pending"
                    ?<span style={bdg(T.yellow,T.yellowLight)}>⏳ Pending</span>
                    :<span style={bdg(T.green,T.greenLight)}>✅ Paid</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Receipt Modal */}
      {selectedRow&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{...card,padding:32,width:"100%",maxWidth:400}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:36,marginBottom:8}}>🧾</div>
              <div style={{fontWeight:900,fontSize:18}}>Payment Receipt</div>
              <div style={{fontSize:12,color:T.muted,marginTop:4}}>Invoice #{selectedRow.invoice}</div>
            </div>
            <div style={{borderTop:`2px dashed ${T.border}`,borderBottom:`2px dashed ${T.border}`,padding:"16px 0",margin:"16px 0",display:"flex",flexDirection:"column",gap:10}}>
              {[
                ["Customer",`🌟 ${selectedRow.org}`],
                ["Date",selectedRow.date],
                ["Plan",PLANS[selectedRow.plan]?.name??selectedRow.plan],
                ["Billing","Monthly Subscription"],
                ["Amount",`$${selectedRow.amount}`],
                ["Status",selectedRow.status==="pending"?"⏳ Pending":"✅ Paid"],
              ].map(([label,val])=>(
                <div key={label} style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
                  <span style={{color:T.muted,fontWeight:600}}>{label}</span>
                  <span style={{fontWeight:800}}>{val}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:16,fontWeight:900,marginBottom:20}}>
              <span>Total</span>
              <span style={{color:T.green}}>${selectedRow.amount}</span>
            </div>
            {selectedRow.status==="pending"&&(
              <div style={{background:T.yellowLight,border:`1px solid ${T.yellow}44`,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:T.yellow,fontWeight:700}}>
                ⏳ This payment is pending. Follow up with the customer if overdue.
              </div>
            )}
            <button onClick={()=>setSelectedRow(null)} style={{...btn("primary"),width:"100%"}}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SuperPlans(){
  return(
    <div>
      <h2 style={{fontWeight:900,fontSize:22,margin:"0 0 18px"}}>💎 Pricing Plans</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16}}>
        {Object.entries(PLANS).map(([key,plan])=>(
          <div key={key} style={{...card,padding:24,borderTop:`5px solid ${plan.color}`,position:"relative"}}>
            {key==="plus"&&<div style={{position:"absolute",top:-12,right:14,...bdg(T.primary,"#fff"),fontSize:10,padding:"4px 12px"}}>⭐ POPULAR</div>}
            <div style={{fontSize:11,fontWeight:800,color:plan.color,textTransform:"uppercase"}}>{plan.name}</div>
            <div style={{fontSize:36,fontWeight:900,margin:"4px 0"}}>${plan.price}<span style={{fontSize:14,color:T.muted,fontWeight:600}}>/mo</span></div>
            {plan.features.map(f=><div key={f} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontSize:13}}><span style={{color:T.green}}>✓</span>{f}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
}

function SuperUsers({dbUsers,orgs,onRemove}){
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({name:"",email:"",role:"d_admin",orgId:"d_org1"});
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h2 style={{fontWeight:900,fontSize:22,margin:0}}>👤 Platform Users</h2>
        <button onClick={()=>setAdding(!adding)} style={btn("primary","sm")}>+ Add User</button>
      </div>
      {adding&&(
        <div style={{...card,padding:20,marginBottom:14,background:T.primaryLight}}>
          <h3 style={{margin:"0 0 12px",fontWeight:800,fontSize:15}}>New User</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Full name" style={{...inputStyle}}/>
            <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="Email" style={{...inputStyle}}/>
            <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} style={{...selectStyle}}>
              <option value="d_admin">Director</option><option value="d_staff">Staff</option><option value="d_parent">Parent</option>
            </select>
            <select value={form.orgId} onChange={e=>setForm(f=>({...f,orgId:e.target.value}))} style={{...selectStyle}}>
              {orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setAdding(false)} style={btn("ghost","sm")}>Cancel</button>
            <button onClick={()=>{if(!form.name||!form.email)return; setAdding(false);}} style={btn("primary","sm")}>Add User</button>
          </div>
        </div>
      )}
      <div style={{...card,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:600}}>
          <thead><tr style={{background:"#F9FAFB"}}>{["Avatar","Name","Email","Role","Org","Action"].map(h=><th key={h} style={{padding:"12px 14px",textAlign:"left",fontWeight:800,fontSize:11,color:T.muted,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
          <tbody>{dbUsers.filter(u=>u.role!=="super").map((u,i)=>{
            const org = orgs.find(o=>o.id===u.orgId);
            return(
              <tr key={u.id} style={{borderTop:`1px solid ${T.border}`,background:i%2===0?"#fff":"#FAFBFC"}}>
                <td style={{padding:"12px 14px",fontSize:22}}>{u.avatar||"👤"}</td>
                <td style={{padding:"12px 14px",fontWeight:700}}>{u.name}</td>
                <td style={{padding:"12px 14px",color:T.muted,fontSize:12}}>{u.email}</td>
                <td style={{padding:"12px 14px"}}><span style={bdg(T.cyan,T.cyanLight)}>{u.role.replace("d_","")}</span></td>
                <td style={{padding:"12px 14px",fontSize:12,color:T.muted}}>{org?.name||"—"}</td>
                <td style={{padding:"12px 14px"}}><button onClick={()=>onRemove(u.id)} style={btn("danger","sm")}>Remove</button></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// TODAY'S TIMELINE (shared director + staff)
// ════════════════════════════════════════════════════════════════════════

function TodayTimeline({user,children,photos,incidents,dailyReports,activities}){
  const events = useMemo(()=>{
    const list = [];
    photos.forEach(p=>list.push({time:p.time,icon:"📸",color:T.purple,bg:T.purpleLight,title:`Photo: ${p.childName}`,sub:p.caption,type:"photo"}));
    incidents.forEach(i=>list.push({time:i.date.replace("Today, ",""),icon:"🩹",color:T.red,bg:T.redLight,title:`Incident: ${i.childName}`,sub:`${i.category} — ${i.severity}`,type:"incident",urgent:true}));
    activities.forEach(a=>list.push({time:a.time,icon:"🎓",color:T.primary,bg:T.primaryLight,title:`Activity posted: ${a.title}`,sub:`By ${a.postedBy} · ${a.completed} kids completed`,type:"activity"}));
    children.filter(c=>c.status==="checked-in").forEach(c=>list.push({time:c.checkIn,icon:"✅",color:T.green,bg:T.greenLight,title:`${c.name} checked in`,sub:`${c.room} Room`,type:"checkin"}));
    Object.entries(dailyReports).forEach(([childId,r])=>{
      const child = children.find(c=>c.id===childId);
      if(r.submittedAt){
        list.push({time:r.submittedAt,icon:"📋",color:T.cyan,bg:T.cyanLight,title:`Daily report sent: ${child?.name}`,sub:`By ${r.completedBy}`,type:"report"});
      }
      (r.meals||[]).forEach(m=>list.push({time:m.time,icon:"🍽️",color:T.yellow,bg:T.yellowLight,title:`${m.meal} — ${child?.name||""}`,sub:`${m.food} · Ate ${m.amount}`,type:"meal"}));
      (r.naps||[]).forEach(n=>list.push({time:n.start,icon:"😴",color:T.muted,bg:"#F3F4F6",title:`Nap: ${child?.name||""}`,sub:`${n.start} – ${n.end}`,type:"nap"}));
    });
    list.sort((a,b)=>a.time?.localeCompare(b.time||"")||0);
    return list;
  },[photos,incidents,activities,children,dailyReports]);

  return(
    <div>
      <h2 style={{fontWeight:900,fontSize:24,margin:"0 0 4px"}}>📅 Today's Timeline</h2>
      <p style={{color:T.muted,margin:"0 0 20px",fontWeight:600,fontSize:13}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})} · {events.length} events</p>
      {events.length===0?(
        <div style={{...card,padding:40,textAlign:"center"}}><div style={{fontSize:48,marginBottom:8}}>🌅</div><p style={{color:T.muted,fontWeight:600}}>No events yet today. Check back throughout the day!</p></div>
      ):(
        <div style={{position:"relative",paddingLeft:32}}>
          <div style={{position:"absolute",left:14,top:0,bottom:0,width:2,background:T.border}}/>
          {events.map((e,i)=>(
            <div key={i} style={{position:"relative",marginBottom:16}}>
              <div style={{position:"absolute",left:-24,top:10,width:20,height:20,borderRadius:"50%",background:e.bg,border:`2px solid ${e.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>{e.icon}</div>
              <div style={{...card,padding:14,marginLeft:4,borderLeft:e.urgent?`4px solid ${T.red}`:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontWeight:800,fontSize:13}}>{e.title}</span>
                  {e.urgent&&<span style={bdg(T.red,T.redLight)}>⚠️ Urgent</span>}
                </div>
                <div style={{fontSize:12,color:T.muted,marginTop:2}}>{e.time} · {e.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// DIRECTOR DASHBOARD
// ════════════════════════════════════════════════════════════════════════

function DaycareAdminDash({children,incidents,photos,consents,hasClassroom,onUpgrade,setTab,currentOrg}){
  const counts={in:children.filter(c=>c.status==="checked-in").length, out:children.filter(c=>c.status==="checked-out").length};
  const noConsent=children.filter(c=>!consents[c.parentId]?.signedDate).length;
  return(
    <div>
      <h2 style={{fontWeight:900,fontSize:24,margin:"0 0 4px"}}>Good morning, Director! ☀️</h2>
      <p style={{color:T.muted,margin:"0 0 20px",fontWeight:600}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p>
      {!hasClassroom&&<div style={{...card,padding:16,marginBottom:14,background:T.primaryLight,borderLeft:`5px solid ${T.primary}`}}><div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><span style={{fontSize:28}}>🎓</span><div style={{flex:1}}><div style={{fontWeight:900}}>Unlock the Classroom Board!</div><div style={{fontSize:12,color:T.muted}}>+$30/month</div></div><button onClick={onUpgrade} style={btn("primary","sm")}>Upgrade →</button></div></div>}
      {noConsent>0&&<button onClick={()=>setTab("compliance")} style={{width:"100%",border:"none",cursor:"pointer",fontFamily:FONT,...card,padding:14,marginBottom:14,background:T.redLight,borderLeft:`5px solid ${T.red}`,textAlign:"left"}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:22}}>🛡️</span><div style={{flex:1}}><div style={{fontWeight:900,color:T.red}}>⚠️ {noConsent} families need consent forms</div><div style={{fontSize:11,color:T.muted}}>Tap to view Compliance →</div></div></div></button>}
      <p style={{fontSize:11,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1,margin:"0 0 10px"}}>📊 Today's Snapshot · Tap any card</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
        {[
          {l:"Checked In",v:counts.in,i:"✅",c:T.green,bg:T.greenLight,go:"children"},
          {l:"Checked Out",v:counts.out,i:"🏠",c:T.cyan,bg:T.cyanLight,go:"children"},
          {l:"Photos Today",v:photos.length,i:"📸",c:T.purple,bg:T.purpleLight,go:"photos"},
          {l:"Incidents",v:incidents.length,i:"🩹",c:T.yellow,bg:T.yellowLight,go:"incidents"},
        ].map(s=>(
          <button key={s.l} onClick={()=>setTab(s.go)} style={{...card,padding:14,display:"flex",gap:8,alignItems:"center",border:"none",cursor:"pointer",textAlign:"left",fontFamily:FONT}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
            <div style={{width:38,height:38,borderRadius:12,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{s.i}</div>
            <div style={{flex:1}}><div style={{fontSize:18,fontWeight:900,color:s.c}}>{s.v}</div><div style={{fontSize:10,color:T.muted,fontWeight:600}}>{s.l}</div></div>
            <span style={{fontSize:12,color:T.muted,opacity:0.5}}>→</span>
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{...card,padding:18}}>
          <h3 style={{margin:"0 0 12px",fontWeight:800,fontSize:14}}>🏫 Rooms</h3>
          {ROOMS.map(r=>(
            <div key={r.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <span style={{fontSize:16}}>{r.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:12}}>{r.name} <span style={{color:T.muted,fontWeight:400,fontSize:11}}>({r.ageRange})</span></div>
                <div style={{height:5,background:T.border,borderRadius:4,marginTop:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${(r.enrolled/r.capacity)*100}%`,background:r.color,borderRadius:4}}/>
                </div>
              </div>
              <span style={{fontSize:10,fontWeight:700,color:T.muted}}>{r.enrolled}/{r.capacity}</span>
            </div>
          ))}
        </div>
        <div style={{...card,padding:18}}>
          <h3 style={{margin:"0 0 12px",fontWeight:800,fontSize:14}}>⚡ Quick Actions</h3>
          {[{l:"View Timeline",i:"📅",g:"timeline"},{l:"Compliance",i:"📋",g:"compliance"},{l:"Add Child",i:"👶",g:"children"},{l:"Billing",i:"💳",g:"billing"}].map(a=>(
            <button key={a.l} onClick={()=>setTab(a.g)} style={{...btn("ghost","sm"),width:"100%",marginBottom:6,display:"flex",gap:6,alignItems:"center",justifyContent:"flex-start"}}>{a.i} {a.l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// CHILDREN MANAGER (full CRUD)
// ════════════════════════════════════════════════════════════════════════

function ChildrenManager({children,photos,incidents,consents,onToggle,onBulkCheckIn,onAdd,onEdit,onRemove}){
  const [selected, setSelected] = useState(null);
  const stMap={"checked-in":{c:T.green,bg:T.greenLight,l:"✅ In"},"checked-out":{c:T.cyan,bg:T.cyanLight,l:"🏠 Out"},"absent":{c:T.red,bg:T.redLight,l:"😔 Absent"}};

  if(selected){
    const child = children.find(c=>c.id===selected);
    if(!child) return null;
    const childPhotos = photos?.filter(p=>p.childId===child.id)||[];
    const childIncidents = incidents?.filter(i=>i.childId===child.id)||[];
    const cs = consents?.[child.parentId]||{};
    const st = stMap[child.status];
    return(
      <div>
        <button onClick={()=>setSelected(null)} style={{...btn("ghost","sm"),marginBottom:14}}>← Back to all children</button>
        <div style={{...card,padding:24,marginBottom:14,background:`linear-gradient(135deg,${T.primaryLight},${T.yellowLight})`}}>
          <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
            <div style={{width:80,height:80,borderRadius:24,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:48,boxShadow:"0 4px 12px rgba(0,0,0,0.08)"}}>{child.avatar}</div>
            <div style={{flex:1}}>
              <h2 style={{margin:"0 0 4px",fontWeight:900,fontSize:24}}>{child.name}</h2>
              <p style={{margin:"0 0 8px",fontSize:13,color:T.muted}}>🚪 {child.room} · 🎂 {child.age}</p>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <span style={{...bdg(st.c,st.bg),fontSize:12}}>{st.l}</span>
                {child.status==="checked-in"&&<span style={bdg(T.muted,"#F3F4F6")}>Since {child.checkIn}</span>}
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {onEdit&&<button onClick={()=>onEdit(child.id)} style={btn("primary","sm")}>✏️ Edit Profile</button>}
              {onRemove&&<button onClick={()=>onRemove(child.id)} style={btn("danger","sm")}>🗑️ Remove</button>}
              {child.status!=="absent"&&<button onClick={()=>onToggle(child.id)} style={btn(child.status==="checked-in"?"secondary":"success","sm")}>{child.status==="checked-in"?"Check Out":"Check In"}</button>}
            </div>
          </div>
        </div>
        {child.allergies!=="None"&&<div style={{...card,padding:14,marginBottom:14,background:T.redLight,borderLeft:`5px solid ${T.red}`,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:22}}>⚠️</span><div><div style={{fontWeight:900,color:T.red}}>ALLERGY ALERT</div><div style={{fontWeight:700}}>{child.allergies}</div></div></div>}
        {child.notes&&<div style={{...card,padding:14,marginBottom:14,borderLeft:`4px solid ${T.cyan}`}}><div style={{fontSize:10,fontWeight:800,color:T.cyan,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Staff Notes</div><p style={{margin:0,fontSize:13}}>{child.notes}</p></div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:14}}>
          {[{l:"Photos",v:childPhotos.length,i:"📸",c:T.purple,bg:T.purpleLight},{l:"Incidents",v:childIncidents.length,i:"🩹",c:T.yellow,bg:T.yellowLight},{l:"XP",v:child.xp||0,i:"⭐",c:T.gold,bg:T.goldLight},{l:"Streak",v:child.streak||0,i:"🔥",c:T.red,bg:T.redLight}].map(s=>(
            <div key={s.l} style={{...card,padding:12,display:"flex",gap:8,alignItems:"center"}}>
              <div style={{width:34,height:34,borderRadius:10,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{s.i}</div>
              <div><div style={{fontSize:16,fontWeight:900,color:s.c}}>{s.v}</div><div style={{fontSize:10,color:T.muted,fontWeight:600}}>{s.l}</div></div>
            </div>
          ))}
        </div>
        <div style={{...card,padding:18,marginBottom:14}}>
          <h3 style={{margin:"0 0 12px",fontWeight:800,fontSize:14}}>👨‍👩‍👧 Parent Info</h3>
          {cs.parentName?(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
              {[["Name",cs.parentName],["📧 Email",cs.email||"—"],["📱 Phone",cs.phone||"—"],["🏠 Address",cs.address||"—"],["🚨 Emergency",cs.emergencyContact||"—"]].map(([l,v])=>(
                <div key={l}><div style={{fontSize:10,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>{l}</div><div style={{fontWeight:600,fontSize:13}}>{v}</div></div>
              ))}
            </div>
          ):<p style={{margin:0,color:T.red,fontWeight:600,fontSize:13}}>⚠️ No parent contact info on file.</p>}
        </div>
        {childPhotos.length>0&&(
          <div style={{...card,padding:18}}>
            <h3 style={{margin:"0 0 12px",fontWeight:800,fontSize:14}}>📸 Recent Photos</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
              {childPhotos.slice(0,4).map(p=>(
                <div key={p.id} style={{borderRadius:10,overflow:"hidden",border:`1px solid ${T.border}`}}>
                  <div style={{background:p.imageData?"#000":p.gradient,height:90,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,overflow:"hidden"}}>
                    {p.imageData?<img src={p.imageData} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:p.emoji}
                  </div>
                  <div style={{padding:6,fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.caption}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const checkedIn = children.filter(c=>c.status==="checked-in").length;
  const checkedOut = children.filter(c=>c.status==="checked-out").length;

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{fontWeight:900,fontSize:22,margin:"0 0 4px"}}>👶 Children</h2>
          <p style={{color:T.muted,margin:0,fontSize:13}}>{children.length} enrolled · <span style={{color:T.green,fontWeight:700}}>{checkedIn} in</span> · <span style={{color:T.cyan,fontWeight:700}}>{checkedOut} out</span></p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {onBulkCheckIn&&<button onClick={onBulkCheckIn} style={btn("success","sm")}>✅ Check In All</button>}
          {onAdd&&<button onClick={onAdd} style={btn("primary","sm")}>+ Add Child</button>}
        </div>
      </div>
      <div style={{display:"grid",gap:10}}>
        {children.map(c=>{
          const st=stMap[c.status];
          return(
            <div key={c.id} style={{...card,padding:14,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <button onClick={()=>setSelected(c.id)} style={{display:"flex",alignItems:"center",gap:12,flex:1,border:"none",background:"transparent",cursor:"pointer",fontFamily:FONT,textAlign:"left",padding:0}}>
                <div style={{width:44,height:44,borderRadius:12,background:T.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{c.avatar}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:14}}>{c.name}</div>
                  <div style={{fontSize:11,color:T.muted}}>🚪 {c.room} · 🎂 {c.age}{c.allergies!=="None"&&<span style={{color:T.red}}> · ⚠️ {c.allergies}</span>}</div>
                </div>
              </button>
              <span style={bdg(st.c,st.bg)}>{st.l}</span>
              {onEdit&&<button onClick={()=>onEdit(c.id)} style={btn("ghost","sm")}>✏️</button>}
              <button onClick={()=>onToggle(c.id)} style={btn(c.status==="checked-in"?"secondary":"primary","sm")}>{c.status==="checked-in"?"Out":"In"}</button>
              {onRemove&&<button onClick={()=>onRemove(c.id)} style={btn("danger","sm")}>🗑️</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// STAFF MANAGER
// ════════════════════════════════════════════════════════════════════════

function StaffManager({dbUsers,staffMembers,onAdd,onRemove,showToast}){
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{fontWeight:900,fontSize:22,margin:"0 0 4px"}}>👩‍🏫 Staff & Teachers</h2>
          <p style={{color:T.muted,margin:0,fontSize:13}}>{staffMembers.length} staff members</p>
        </div>
        <button onClick={onAdd} style={btn("primary","sm")}>+ Add Staff</button>
      </div>
      <div style={{display:"grid",gap:10}}>
        {staffMembers.map(s=>(
          <div key={s.id} style={{...card,padding:16,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
            <div style={{width:50,height:50,borderRadius:14,background:T.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>{s.avatar||"👩‍🏫"}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:15}}>{s.name}</div>
              <div style={{fontSize:12,color:T.muted,marginTop:2}}>📧 {s.email}{s.room&&` · 🚪 ${s.room} Room`}</div>
            </div>
            <span style={bdg(T.cyan,T.cyanLight)}>{s.role.replace("d_","")}</span>
            <button onClick={()=>showToast("Edit staff coming in production!")} style={btn("ghost","sm")}>✏️ Edit</button>
            <button onClick={()=>onRemove(s.id)} style={btn("danger","sm")}>🗑️ Remove</button>
          </div>
        ))}
        {staffMembers.length===0&&<div style={{...card,padding:40,textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>👩‍🏫</div><p style={{color:T.muted,fontWeight:600}}>No staff added yet. Click "+ Add Staff" to get started.</p></div>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// COMPLIANCE DASHBOARD (with edit capabilities)
// ════════════════════════════════════════════════════════════════════════

function ComplianceDashboard({children,consents,showToast,onEditConsent,onEditChild}){
  const [expandedRow, setExpandedRow] = useState(null);
  const stats = useMemo(()=>{
    const full = children.filter(c=>consents[c.parentId]?.signedDate).length;
    return {full, missing:children.length-full};
  },[children,consents]);

  return(
    <div>
      <h2 style={{fontWeight:900,fontSize:24,margin:"0 0 4px"}}>📋 Compliance Dashboard</h2>
      <p style={{color:T.muted,margin:"0 0 18px",fontSize:13}}>Manage COPPA compliance · Tap any row to expand · Edit child and parent profiles</p>
      <div style={{...card,padding:18,marginBottom:16,background:`linear-gradient(135deg,${T.greenLight},${T.cyanLight})`,borderLeft:`4px solid ${T.green}`}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:26}}>🛡️</span><div><div style={{fontWeight:900,fontSize:15}}>COPPA School-Authorized Consent</div><div style={{fontSize:12,color:T.muted}}>Daycare obtains parent consent before adding children</div></div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:18}}>
        {[{l:"Total Children",v:children.length,c:T.primary,bg:T.primaryLight,i:"👶"},{l:"Full Consent",v:stats.full,c:T.green,bg:T.greenLight,i:"✅"},{l:"Missing Consent",v:stats.missing,c:T.red,bg:T.redLight,i:"🔴"}].map(s=>(
          <div key={s.l} style={{...card,padding:14,display:"flex",gap:8,alignItems:"center"}}>
            <div style={{width:38,height:38,borderRadius:10,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{s.i}</div>
            <div><div style={{fontSize:20,fontWeight:900,color:s.c}}>{s.v}</div><div style={{fontSize:10,color:T.muted,fontWeight:600}}>{s.l}</div></div>
          </div>
        ))}
      </div>
      <div style={{...card,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700}}>
          <thead><tr style={{background:"#F9FAFB"}}>{["","Child","Parent","Email","Phone","Signed","Actions"].map((h,i)=><th key={i} style={{padding:"12px 14px",textAlign:"left",fontWeight:800,fontSize:11,color:T.muted,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
          <tbody>
            {children.map((c,i)=>{
              const cs = consents[c.parentId]||{};
              const isOpen = expandedRow===c.id;
              return(
                <Fragment key={c.id}>
                  <tr onClick={()=>setExpandedRow(isOpen?null:c.id)} style={{borderTop:`1px solid ${T.border}`,background:i%2===0?"#fff":"#FAFBFC",cursor:"pointer"}}>
                    <td style={{padding:"12px 14px",width:30}}><span style={{color:T.muted,fontSize:12,display:"inline-block",transform:isOpen?"rotate(90deg)":"rotate(0)",transition:"transform 0.2s"}}>▶</span></td>
                    <td style={{padding:"12px 14px",fontWeight:700}}>{c.avatar} {c.name}</td>
                    <td style={{padding:"12px 14px",fontWeight:600}}>{cs.parentName||<span style={{color:T.red}}>⚠️ Missing</span>}</td>
                    <td style={{padding:"12px 14px",fontSize:12,color:T.muted}}>{cs.email||"—"}</td>
                    <td style={{padding:"12px 14px",fontSize:12,color:T.muted}}>{cs.phone||"—"}</td>
                    <td style={{padding:"12px 14px"}}>{cs.signedDate?<span style={bdg(T.green,T.greenLight)}>{cs.signedDate}</span>:<span style={bdg(T.red,T.redLight)}>Not Signed</span>}</td>
                    <td style={{padding:"12px 14px"}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:"flex",gap:6}}>
                        {onEditChild&&<button onClick={()=>onEditChild(c.id)} style={btn("ghost","sm")}>✏️ Child</button>}
                        {onEditConsent&&<button onClick={()=>onEditConsent(c.parentId)} style={btn("ghost","sm")}>✏️ Parent</button>}
                        {!cs.signedDate&&<button onClick={()=>showToast(`Consent form sent!`)} style={btn("primary","sm")}>📧 Send</button>}
                      </div>
                    </td>
                  </tr>
                  {isOpen&&(
                    <tr style={{background:T.primaryLight}}>
                      <td colSpan={7} style={{padding:"16px 20px"}}>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:12}}>
                          {[["👤 Parent",cs.parentName||"—"],["📧 Email",cs.email||"—"],["📱 Phone",cs.phone||"—"],["🏠 Address",cs.address||"—"],["🚨 Emergency",cs.emergencyContact||"—"],["⚠️ Allergies",c.allergies]].map(([l,v])=>(
                            <div key={l}><div style={{fontSize:10,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>{l}</div><div style={{fontWeight:600,fontSize:13,color:v==="None"||v==="—"?T.muted:l.includes("Allerg")&&v!=="None"?T.red:T.text}}>{v}</div></div>
                          ))}
                        </div>
                        {cs.signedDate&&(
                          <div style={{padding:12,background:"#fff",borderRadius:10,marginBottom:10}}>
                            <div style={{fontSize:10,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>🛡️ Consent Permissions</div>
                            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                              {[["accountCreation","Account"],["photoSharing","Photos"],["dailyReports","Reports"],["healthInfo","Health"],["communication","Messages"]].map(([k,l])=>(
                                <span key={k} style={cs[k]?bdg(T.green,T.greenLight):bdg(T.red,T.redLight)}>{cs[k]?"✓":"✗"} {l}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {onEditConsent&&<button onClick={()=>onEditConsent(c.parentId)} style={btn("primary","sm")}>✏️ Edit Parent Info</button>}
                          {onEditChild&&<button onClick={()=>onEditChild(c.id)} style={btn("secondary","sm")}>✏️ Edit Child Profile</button>}
                          <button onClick={()=>showToast("Consent PDF downloading...")} style={btn("ghost","sm")}>📄 Download PDF</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{...card,padding:12,marginTop:12,background:T.yellowLight,borderLeft:`3px solid ${T.yellow}`,fontSize:12}}>
        💡 <strong>Tip:</strong> State inspections require consent forms on file for at least 3 years. Download PDFs after each family signs.
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// STAFF DASHBOARD
// ════════════════════════════════════════════════════════════════════════

function StaffDash({user,children,hasClassroom,activities,photos,incidents,setTab}){
  const checkedIn = children.filter(c=>c.status==="checked-in").length;
  return(
    <div>
      <h2 style={{fontWeight:900,fontSize:22,margin:"0 0 4px"}}>Welcome, {user.name}! 👩‍🏫</h2>
      <p style={{color:T.muted,margin:"0 0 18px",fontWeight:600}}>{user.room} Room · {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p>
      <p style={{fontSize:11,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1,margin:"0 0 8px"}}>📊 Today · Tap to navigate</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:18}}>
        {[{l:"Kids Here",v:checkedIn,i:"👶",c:T.green,bg:T.greenLight,go:"attendance"},{l:"Photos",v:photos.length,i:"📸",c:T.purple,bg:T.purpleLight,go:"photos"},{l:"Incidents",v:incidents.length,i:"🩹",c:T.yellow,bg:T.yellowLight,go:"incidents"},{l:"Activities",v:activities.length,i:"🎓",c:T.primary,bg:T.primaryLight,go:"classroom"}].map(s=>(
          <button key={s.l} onClick={()=>setTab(s.go)} style={{...card,padding:12,display:"flex",gap:8,alignItems:"center",border:"none",cursor:"pointer",fontFamily:FONT,textAlign:"left"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
            <div style={{width:36,height:36,borderRadius:10,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{s.i}</div>
            <div style={{flex:1}}><div style={{fontSize:16,fontWeight:900,color:s.c}}>{s.v}</div><div style={{fontSize:10,color:T.muted,fontWeight:600}}>{s.l}</div></div>
          </button>
        ))}
      </div>
      <p style={{fontSize:11,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1,margin:"0 0 8px"}}>⚡ Quick Actions</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8,marginBottom:18}}>
        {[{l:"Check In Kids",i:"✅",c:T.green,go:"attendance"},{l:"Post Photo",i:"📸",c:T.purple,go:"photos"},{l:"Log Incident",i:"🩹",c:T.red,go:"incidents"},{l:"Message Parent",i:"💬",c:T.cyan,go:"messages"},{l:"Daily Report",i:"📋",c:T.primary,go:"daily"},{l:"Timeline",i:"📅",c:T.gold,go:"timeline"}].map(a=>(
          <button key={a.l} onClick={()=>setTab(a.go)} style={{padding:"12px 10px",border:`2px solid ${a.c}`,background:"#fff",color:a.c,borderRadius:12,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:FONT,display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background=a.c;e.currentTarget.style.color="#fff";}} onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.color=a.c;}}>
            <span style={{fontSize:22}}>{a.i}</span>{a.l}
          </button>
        ))}
      </div>
      <div style={{...card,padding:18}}>
        <h3 style={{margin:"0 0 12px",fontWeight:800,fontSize:14}}>👶 Children Today</h3>
        {children.map(c=>(
          <div key={c.id} style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:16}}>{c.avatar}</span>
            <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{c.name}</div>{c.allergies!=="None"&&<div style={{fontSize:11,color:T.red}}>⚠️ {c.allergies}</div>}</div>
            <span style={{...bdg(c.status==="checked-in"?T.green:T.muted,c.status==="checked-in"?T.greenLight:T.border),fontSize:10}}>{c.status==="checked-in"?"In":"Out"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// PHOTOS FEED (full CRUD + comments)
// ════════════════════════════════════════════════════════════════════════

function PhotosFeed({user,photos,onLike,onAddPhoto,onEdit,onDelete,onComment}){
  const [editingId, setEditingId] = useState(null);
  const [editCaption, setEditCaption] = useState("");
  const [commentText, setCommentText] = useState({});
  const isStaff = user.role==="d_staff"||user.role==="d_admin";
  const visible = user.role==="d_parent" ? photos.filter(p=>p.childId===user.childId) : photos;

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{fontWeight:900,fontSize:22,margin:"0 0 4px"}}>📸 Photo Feed</h2>
          <p style={{color:T.muted,margin:0,fontSize:13}}>{visible.length} photos</p>
        </div>
        {isStaff&&<button onClick={onAddPhoto} style={btn("primary","md")}>+ Upload Photo</button>}
      </div>
      {visible.length===0?(
        <div style={{...card,padding:40,textAlign:"center"}}><div style={{fontSize:48,marginBottom:8}}>📷</div><p style={{color:T.muted,fontWeight:600}}>No photos yet. {isStaff?"Upload the first one!":""}</p></div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
          {visible.map(p=>(
            <div key={p.id} style={{...card,overflow:"hidden"}}>
              <div style={{background:p.imageData?"#000":p.gradient,height:200,display:"flex",alignItems:"center",justifyContent:"center",fontSize:80,position:"relative",overflow:"hidden"}}>
                {p.imageData?<img src={p.imageData} alt={p.caption} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:p.emoji}
                <div style={{position:"absolute",top:8,left:8,background:"rgba(0,0,0,0.5)",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>📍 {p.childName}</div>
                <div style={{position:"absolute",top:8,right:8,background:"rgba(255,255,255,0.95)",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{p.time}</div>
              </div>
              <div style={{padding:14}}>
                {editingId===p.id?(
                  <div style={{marginBottom:10}}>
                    <input value={editCaption} onChange={e=>setEditCaption(e.target.value)} style={{...inputStyle,marginBottom:6}}/>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{onEdit(p.id,editCaption);setEditingId(null);}} style={btn("success","sm")}>Save</button>
                      <button onClick={()=>setEditingId(null)} style={btn("ghost","sm")}>Cancel</button>
                    </div>
                  </div>
                ):(
                  <p style={{margin:"0 0 8px",fontSize:14,fontWeight:600}}>{p.caption}</p>
                )}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,color:T.muted,marginBottom:8}}>
                  <span>📷 {p.staff}</span>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <button onClick={()=>onLike(p.id)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:3,fontWeight:700,fontSize:13,color:p.liked?T.red:T.muted}}>
                      <span className={p.liked?"heartbeat":""}>{p.liked?"❤️":"🤍"}</span>{p.likes}
                    </button>
                    {isStaff&&(
                      <>
                        <button onClick={()=>{setEditingId(p.id);setEditCaption(p.caption);}} style={{...btn("ghost","sm"),padding:"3px 8px",fontSize:11}}>✏️</button>
                        <button onClick={()=>onDelete(p.id)} style={{...btn("danger","sm"),padding:"3px 8px",fontSize:11}}>🗑️</button>
                      </>
                    )}
                  </div>
                </div>
                {/* Comments */}
                {(p.comments||[]).length>0&&(
                  <div style={{borderTop:`1px solid ${T.border}`,paddingTop:8,marginBottom:6}}>
                    {p.comments.map((c,i)=><div key={i} style={{fontSize:11,color:T.muted,padding:"2px 0"}}>💬 {c}</div>)}
                  </div>
                )}
                <div style={{display:"flex",gap:6}}>
                  <input value={commentText[p.id]||""} onChange={e=>setCommentText(prev=>({...prev,[p.id]:e.target.value}))} placeholder="Add a comment..." style={{...inputStyle,fontSize:12,padding:"6px 10px"}}/>
                  <button onClick={()=>{if((commentText[p.id]||"").trim()){onComment(p.id,commentText[p.id]);setCommentText(prev=>({...prev,[p.id]:""}));}}} style={btn("primary","sm")}>Post</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// INCIDENTS VIEW (full CRUD + comments)
// ════════════════════════════════════════════════════════════════════════

function IncidentsView({user,incidents,onAdd,onAck,onEdit,onDelete,onComment}){
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [commentText, setCommentText] = useState({});
  const canCreate = user.role==="d_staff"||user.role==="d_admin";
  const canEdit   = user.role==="d_staff"||user.role==="d_admin";
  const visible = user.role==="d_parent" ? incidents.filter(i=>i.childId===user.childId) : incidents;
  const sevColor = s=>({Minor:{c:T.green,bg:T.greenLight,i:"🩹"},Significant:{c:T.red,bg:T.redLight,i:"⚠️"},Note:{c:T.purple,bg:T.purpleLight,i:"📝"},Routine:{c:T.cyan,bg:T.cyanLight,i:"💊"}}[s]||{c:T.muted,bg:T.border,i:"📋"});

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <h2 style={{fontWeight:900,fontSize:22,margin:0}}>🩹 Incident Reports</h2>
        {canCreate&&<button onClick={onAdd} style={btn("danger","md")}>+ New Report</button>}
      </div>
      {visible.length===0?(
        <div style={{...card,padding:40,textAlign:"center"}}><div style={{fontSize:48,marginBottom:8}}>✨</div><p style={{color:T.muted,fontWeight:600}}>All good! No incidents.</p></div>
      ):(
        <div style={{display:"grid",gap:14}}>
          {visible.map(i=>{
            const sv=sevColor(i.severity);
            const isEditing=editingId===i.id;
            return(
              <div key={i.id} style={{...card,padding:18,borderLeft:`5px solid ${sv.c}`,opacity:i.acknowledged?0.9:1}}>
                {isEditing?(
                  <div>
                    <h4 style={{margin:"0 0 10px",fontWeight:800}}>Edit Incident</h4>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                      <input value={editData.category||""} onChange={e=>setEditData(d=>({...d,category:e.target.value}))} placeholder="Category" style={{...inputStyle}}/>
                      <input value={editData.bodyPart||""} onChange={e=>setEditData(d=>({...d,bodyPart:e.target.value}))} placeholder="Body part" style={{...inputStyle}}/>
                    </div>
                    <textarea value={editData.what||""} onChange={e=>setEditData(d=>({...d,what:e.target.value}))} placeholder="What happened?" style={{...textareaStyle,marginBottom:6}}/>
                    <textarea value={editData.action||""} onChange={e=>setEditData(d=>({...d,action:e.target.value}))} placeholder="Action taken?" style={{...textareaStyle,marginBottom:8}}/>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{onEdit(i.id,editData);setEditingId(null);}} style={btn("success","sm")}>Save</button>
                      <button onClick={()=>setEditingId(null)} style={btn("ghost","sm")}>Cancel</button>
                    </div>
                  </div>
                ):(
                  <>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap"}}>
                      <span style={{fontSize:22}}>{sv.i}</span>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:2}}>
                          <span style={{fontWeight:900,fontSize:14}}>{i.category}</span>
                          <span style={bdg(sv.c,sv.bg)}>{i.severity}</span>
                          {!i.acknowledged&&user.role==="d_parent"&&<span style={bdg(T.red,T.redLight)}>🔔 NEW</span>}
                        </div>
                        <div style={{fontSize:11,color:T.muted}}>👶 {i.childName} · {i.date}</div>
                      </div>
                      {canEdit&&(
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>{setEditingId(i.id);setEditData({category:i.category,bodyPart:i.bodyPart,what:i.what,action:i.action});}} style={btn("ghost","sm")}>✏️</button>
                          <button onClick={()=>onDelete(i.id)} style={btn("danger","sm")}>🗑️</button>
                        </div>
                      )}
                    </div>
                    {i.bodyPart&&i.bodyPart!=="-"&&<div style={{background:T.bg,borderRadius:6,padding:"4px 10px",marginBottom:8,fontSize:11,fontWeight:700,display:"inline-block"}}>📍 {i.bodyPart}</div>}
                    <div style={{marginBottom:8}}><div style={{fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",marginBottom:2}}>What happened</div><p style={{margin:0,fontSize:13,lineHeight:1.6}}>{i.what}</p></div>
                    <div style={{marginBottom:10}}><div style={{fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",marginBottom:2}}>Action taken</div><p style={{margin:0,fontSize:13,lineHeight:1.6}}>{i.action}</p></div>
                    {(i.comments||[]).length>0&&<div style={{borderTop:`1px solid ${T.border}`,paddingTop:8,marginBottom:8}}>{i.comments.map((c,idx)=><div key={idx} style={{fontSize:11,color:T.muted,padding:"2px 0"}}>💬 {c}</div>)}</div>}
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {user.role==="d_parent"&&!i.acknowledged&&<button onClick={()=>onAck(i.id)} style={btn("primary","sm")}>I've Read This ✓</button>}
                      <input value={commentText[i.id]||""} onChange={e=>setCommentText(prev=>({...prev,[i.id]:e.target.value}))} placeholder="Add comment..." style={{...inputStyle,fontSize:12,padding:"6px 10px",flex:1,minWidth:120}}/>
                      <button onClick={()=>{if((commentText[i.id]||"").trim()){onComment(i.id,commentText[i.id]);setCommentText(prev=>({...prev,[i.id]:""}));}}} style={btn("secondary","sm")}>Post</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// MESSAGES (threaded per child, two-way staff ↔ parent)
// ════════════════════════════════════════════════════════════════════════

function MessagesView({user,messages,dbUsers,children,onSend,onDelete}){
  const [activeConvo, setActiveConvo] = useState(null);
  const [newMsg, setNewMsg] = useState("");

  // Build conversation list (unique threads by partner+child)
  const conversations = useMemo(()=>{
    const threads = {};
    messages.forEach(m=>{
      const partnerId = m.senderId===user.id ? m.recipientId : m.senderId;
      const key = `${partnerId}_${m.childId||"general"}`;
      if(!threads[key]){
        const partner = dbUsers.find(u=>u.id===partnerId);
        const child = children.find(c=>c.id===m.childId);
        threads[key]={partnerId,partnerName:partner?.name||"Unknown",partnerAvatar:partner?.avatar||"👤",childId:m.childId,childName:child?.name||null,messages:[],unread:0};
      }
      threads[key].messages.push(m);
      if(m.recipientId===user.id&&!m.read) threads[key].unread++;
    });
    return Object.values(threads).sort((a,b)=>b.messages[b.messages.length-1]?.id - a.messages[a.messages.length-1]?.id);
  },[messages,user,dbUsers,children]);

  // Available recipients for new conversations
  const availableRecipients = useMemo(()=>{
    if(user.role==="d_parent"){
      return dbUsers.filter(u=>(u.role==="d_staff"||u.role==="d_admin")&&u.orgId===user.orgId);
    }
    return dbUsers.filter(u=>u.role==="d_parent"&&u.orgId===user.orgId);
  },[user,dbUsers]);

  const [newRecipient, setNewRecipient] = useState("");
  const [newChildId, setNewChildId] = useState("");

  const currentThread = conversations.find(c=>c.partnerId===activeConvo?.partnerId&&c.childId===activeConvo?.childId);

  const handleSend = () => {
    if(!newMsg.trim()||!activeConvo) return;
    onSend(activeConvo.partnerId, newMsg, activeConvo.childId);
    setNewMsg("");
  };

  return(
    <div>
      <h2 style={{fontWeight:900,fontSize:22,margin:"0 0 18px"}}>💬 Messages</h2>
      <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:16,minHeight:500}}>
        {/* Sidebar */}
        <div style={{...card,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}>
            <div style={{fontSize:11,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Conversations</div>
            <div style={{display:"flex",gap:6}}>
              <select value={newRecipient} onChange={e=>setNewRecipient(e.target.value)} style={{...selectStyle,fontSize:12,padding:"6px 10px",flex:1}}>
                <option value="">New conversation...</option>
                {availableRecipients.map(r=><option key={r.id} value={r.id}>{r.avatar} {r.name}</option>)}
              </select>
              {newRecipient&&(
                <button onClick={()=>{const r=dbUsers.find(u=>u.id===newRecipient);const childId=r?.role==="d_parent"?r.childId:user.childId;setActiveConvo({partnerId:newRecipient,childId:childId||null,partnerName:r?.name,partnerAvatar:r?.avatar||"👤",childName:children.find(c=>c.id===childId)?.name});setNewRecipient("");}} style={btn("primary","sm")}>Start</button>
              )}
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto"}}>
            {conversations.length===0&&<div style={{padding:20,textAlign:"center",color:T.muted,fontSize:13}}>No messages yet</div>}
            {conversations.map(c=>(
              <button key={`${c.partnerId}_${c.childId}`} onClick={()=>setActiveConvo(c)} style={{width:"100%",border:"none",background:activeConvo?.partnerId===c.partnerId&&activeConvo?.childId===c.childId?T.primaryLight:"transparent",padding:"12px 14px",cursor:"pointer",display:"flex",gap:10,alignItems:"center",fontFamily:FONT,textAlign:"left",borderBottom:`1px solid ${T.border}`}}>
                <div style={{fontSize:26}}>{c.partnerAvatar}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
                    {c.partnerName}
                    {c.unread>0&&<span style={{background:T.red,color:"#fff",borderRadius:20,padding:"1px 6px",fontSize:10,fontWeight:900}}>{c.unread}</span>}
                  </div>
                  {c.childName&&<div style={{fontSize:11,color:T.muted}}>Re: {c.childName}</div>}
                  <div style={{fontSize:11,color:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.messages[c.messages.length-1]?.text}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        {/* Chat pane */}
        {activeConvo?(
          <div style={{...card,overflow:"hidden",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:24}}>{activeConvo.partnerAvatar}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:14}}>{activeConvo.partnerName}</div>
                {activeConvo.childName&&<div style={{fontSize:11,color:T.muted}}>About: {activeConvo.childName}</div>}
              </div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10,maxHeight:380}}>
              {(currentThread?.messages||[]).map(m=>{
                const mine=m.senderId===user.id;
                return(
                  <div key={m.id} style={{display:"flex",flexDirection:mine?"row-reverse":"row",gap:8,alignItems:"flex-start"}}>
                    <span style={{fontSize:20}}>{m.senderAvatar}</span>
                    <div style={{maxWidth:"70%"}}>
                      <div style={{fontSize:10,color:T.muted,marginBottom:2,textAlign:mine?"right":"left"}}>{m.senderName} · {m.time}</div>
                      <div style={{background:mine?T.primary:"#fff",color:mine?"#fff":T.text,padding:"10px 13px",borderRadius:mine?"14px 14px 4px 14px":"14px 14px 14px 4px",fontSize:13,fontWeight:600,border:mine?"none":`1px solid ${T.border}`}}>
                        {m.text}
                      </div>
                      {mine&&<button onClick={()=>onDelete(m.id)} style={{fontSize:10,color:T.muted,background:"none",border:"none",cursor:"pointer",marginTop:2,float:"right"}}>🗑️ Delete</button>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{padding:"10px 14px",borderTop:`1px solid ${T.border}`,display:"flex",gap:8}}>
              <input value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSend()} placeholder="Type a message..." style={{...inputStyle,flex:1}}/>
              <button onClick={handleSend} style={btn("primary","md")}>Send 📨</button>
            </div>
          </div>
        ):(
          <div style={{...card,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
            <div style={{fontSize:48}}>💬</div>
            <p style={{color:T.muted,fontWeight:600,textAlign:"center"}}>Select a conversation or start a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// DAILY REPORTS (full CRUD for staff)
// ════════════════════════════════════════════════════════════════════════

function DailyReportView({user,children,dailyReports,setDailyReports,showToast}){
  const isStaff = user.role==="d_staff"||user.role==="d_admin";
  const [selectedChildId, setSelectedChildId] = useState(user.role==="d_parent"?user.childId:children[0]?.id);
  const [editing, setEditing] = useState(false);
  const [addingMeal, setAddingMeal] = useState(false);
  const [newMeal, setNewMeal] = useState({meal:"Snack",time:"",food:"",amount:"all"});
  const [addingNap, setAddingNap] = useState(false);
  const [newNap, setNewNap] = useState({start:"",end:"",quality:"good"});

  const child = children.find(c=>c.id===selectedChildId)||children[0];
  const report = dailyReports[child?.id];
  const moodEmoji={happy:"😊",calm:"😌",tired:"😴",fussy:"😢",sick:"🤒",excited:"🤩"};
  const moodLabel={happy:"Happy",calm:"Calm",tired:"Tired",fussy:"Fussy",sick:"Not well",excited:"Excited"};
  const amountLabel={none:"Refused",some:"Some",most:"Most",all:"All"};
  const amountColor={none:T.red,some:T.yellow,most:T.cyan,all:T.green};

  const upd = (field,value) => setDailyReports(p=>({...p,[child.id]:{...p[child.id],[field]:value}}));
  const updNested = (field,idx,key,val) => setDailyReports(p=>({...p,[child.id]:{...p[child.id],[field]:p[child.id][field].map((item,i)=>i===idx?{...item,[key]:val}:item)}}));
  const removeItem = (field,idx) => setDailyReports(p=>({...p,[child.id]:{...p[child.id],[field]:p[child.id][field].filter((_,i)=>i!==idx)}}));

  const submitReport = () => {
    setDailyReports(p=>({...p,[child.id]:{...p[child.id],submittedAt:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),completedBy:user.name}}));
    setEditing(false);
    showToast(`Daily report sent to ${child.name}'s parent! 💛`);
  };

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{fontWeight:900,fontSize:24,margin:"0 0 4px"}}>📋 {user.role==="d_parent"?"Today's Report":"Daily Reports"}</h2>
          <p style={{color:T.muted,margin:0,fontSize:13}}>{user.role==="d_parent"?"Your child's day":"Document each child's day"}</p>
        </div>
        {isStaff&&(!editing?<button onClick={()=>setEditing(true)} style={btn("primary","md")}>✏️ Edit Report</button>:<button onClick={submitReport} style={btn("success","md")}>✅ Send to Parent</button>)}
      </div>
      {isStaff&&(
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {children.map(c=>(
              <button key={c.id} onClick={()=>{setSelectedChildId(c.id);setEditing(false);}} style={{padding:"7px 14px",borderRadius:20,border:c.id===selectedChildId?`2px solid ${T.primary}`:`1.5px solid ${T.border}`,background:c.id===selectedChildId?T.primaryLight:"#fff",color:c.id===selectedChildId?T.primary:T.text,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:FONT,display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:16}}>{c.avatar}</span>{c.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      )}
      {!report?(
        <div style={{...card,padding:40,textAlign:"center"}}><div style={{fontSize:54,marginBottom:8}}>📋</div><h3 style={{fontWeight:900,margin:"0 0 6px"}}>No report yet</h3><p style={{color:T.muted,fontSize:13}}>{isStaff?"Click 'Edit Report' to start":"Report coming later today"}</p></div>
      ):(
        <>
          <div style={{...card,padding:20,marginBottom:12,background:`linear-gradient(135deg,${T.primaryLight},${T.yellowLight})`}}>
            <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
              <div style={{fontSize:50}}>{child.avatar}</div>
              <div style={{flex:1}}><h3 style={{margin:"0 0 2px",fontWeight:900,fontSize:20}}>{child.name}'s Day</h3><p style={{margin:0,fontSize:12,color:T.muted}}>{report.date}{report.completedBy?` · By ${report.completedBy} at ${report.submittedAt}`:""}</p></div>
              <div style={{textAlign:"center"}}><div style={{fontSize:44}}>{moodEmoji[report.mood]||"😊"}</div><div style={{fontSize:11,fontWeight:800,color:T.primary,textTransform:"uppercase"}}>{moodLabel[report.mood]}</div></div>
            </div>
          </div>

          {/* Mood */}
          <div style={{...card,padding:16,marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>😊 Mood</div>
            {editing?(
              <>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{Object.entries(moodEmoji).map(([k,e])=><button key={k} onClick={()=>upd("mood",k)} style={{padding:"7px 12px",borderRadius:20,border:report.mood===k?`2px solid ${T.primary}`:`1.5px solid ${T.border}`,background:report.mood===k?T.primaryLight:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:FONT,display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:16}}>{e}</span>{moodLabel[k]}</button>)}</div>
                <textarea value={report.moodNote||""} onChange={e=>upd("moodNote",e.target.value)} placeholder="Mood note..." style={{...textareaStyle,minHeight:50}}/>
              </>
            ):<p style={{margin:0,fontSize:13,lineHeight:1.6}}>{report.moodNote}</p>}
          </div>

          {/* Meals */}
          <div style={{...card,padding:16,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1}}>🍽️ Meals</div>
              {editing&&<button onClick={()=>setAddingMeal(!addingMeal)} style={btn("ghost","sm")}>+ Add</button>}
            </div>
            {report.meals.map((m,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<report.meals.length-1?`1px solid ${T.border}`:"none"}}>
                <span style={{fontSize:18}}>{m.meal==="Breakfast"?"🥣":m.meal==="Lunch"?"🥪":"🍎"}</span>
                <div style={{flex:1}}>
                  {editing?(
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <input value={m.meal} onChange={e=>updNested("meals",i,"meal",e.target.value)} style={{...inputStyle,padding:"4px 8px",fontSize:12,width:90}}/>
                      <input value={m.food} onChange={e=>updNested("meals",i,"food",e.target.value)} style={{...inputStyle,padding:"4px 8px",fontSize:12,flex:1}}/>
                      <input value={m.time} onChange={e=>updNested("meals",i,"time",e.target.value)} style={{...inputStyle,padding:"4px 8px",fontSize:12,width:80}}/>
                    </div>
                  ):(
                    <div><strong style={{fontSize:13}}>{m.meal}</strong> <span style={{fontSize:11,color:T.muted}}>{m.time}</span><div style={{fontSize:12,color:T.muted}}>{m.food}</div></div>
                  )}
                </div>
                {editing?(
                  <select value={m.amount} onChange={e=>updNested("meals",i,"amount",e.target.value)} style={{...selectStyle,padding:"4px 8px",fontSize:11,width:80}}>
                    {["none","some","most","all"].map(a=><option key={a} value={a}>{amountLabel[a]}</option>)}
                  </select>
                ):<span style={bdg(amountColor[m.amount],amountColor[m.amount]+"22")}>{amountLabel[m.amount]}</span>}
                {editing&&<button onClick={()=>removeItem("meals",i)} style={{...btn("danger","sm"),padding:"3px 8px"}}>✕</button>}
              </div>
            ))}
            {editing&&addingMeal&&(
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10,padding:10,background:T.bg,borderRadius:8}}>
                <input value={newMeal.meal} onChange={e=>setNewMeal(m=>({...m,meal:e.target.value}))} placeholder="Meal name" style={{...inputStyle,padding:"5px 8px",fontSize:12,width:90}}/>
                <input value={newMeal.food} onChange={e=>setNewMeal(m=>({...m,food:e.target.value}))} placeholder="Food description" style={{...inputStyle,padding:"5px 8px",fontSize:12,flex:1}}/>
                <input value={newMeal.time} onChange={e=>setNewMeal(m=>({...m,time:e.target.value}))} placeholder="Time (e.g. 12:00 PM)" style={{...inputStyle,padding:"5px 8px",fontSize:12,width:110}}/>
                <button onClick={()=>{setDailyReports(p=>({...p,[child.id]:{...p[child.id],meals:[...p[child.id].meals,{...newMeal}]}}));setNewMeal({meal:"Snack",time:"",food:"",amount:"all"});setAddingMeal(false);}} style={btn("success","sm")}>Add</button>
              </div>
            )}
          </div>

          {/* Naps */}
          <div style={{...card,padding:16,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontSize:10,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1}}>😴 Naps</div>
              {editing&&<button onClick={()=>setAddingNap(!addingNap)} style={btn("ghost","sm")}>+ Add</button>}
            </div>
            {report.naps.length===0&&<p style={{margin:0,fontSize:13,color:T.muted}}>No naps today</p>}
            {report.naps.map((n,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                <span style={{fontSize:20}}>💤</span>
                {editing?(
                  <div style={{display:"flex",gap:6,flex:1,flexWrap:"wrap"}}>
                    <input value={n.start} onChange={e=>updNested("naps",i,"start",e.target.value)} placeholder="Start" style={{...inputStyle,padding:"4px 8px",fontSize:12,width:100}}/>
                    <input value={n.end} onChange={e=>updNested("naps",i,"end",e.target.value)} placeholder="End" style={{...inputStyle,padding:"4px 8px",fontSize:12,width:100}}/>
                    <button onClick={()=>removeItem("naps",i)} style={{...btn("danger","sm"),padding:"3px 8px"}}>✕</button>
                  </div>
                ):<div style={{flex:1}}><strong style={{fontSize:13}}>{n.start} → {n.end}</strong> <span style={{fontSize:11,color:T.muted}}>· {n.quality}</span></div>}
              </div>
            ))}
            {editing&&addingNap&&(
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6,padding:10,background:T.bg,borderRadius:8}}>
                <input value={newNap.start} onChange={e=>setNewNap(n=>({...n,start:e.target.value}))} placeholder="Start time" style={{...inputStyle,padding:"5px 8px",fontSize:12,width:110}}/>
                <input value={newNap.end} onChange={e=>setNewNap(n=>({...n,end:e.target.value}))} placeholder="End time" style={{...inputStyle,padding:"5px 8px",fontSize:12,width:110}}/>
                <button onClick={()=>{setDailyReports(p=>({...p,[child.id]:{...p[child.id],naps:[...p[child.id].naps,{...newNap}]}}));setNewNap({start:"",end:"",quality:"good"});setAddingNap(false);}} style={btn("success","sm")}>Add</button>
              </div>
            )}
          </div>

          {/* Activities + Learning + Social */}
          {["activities","learning","socialNotes","teacherNote"].map(field=>{
            const labels={activities:"🎨 Activities",learning:"📚 Learning Highlights",socialNotes:"👫 Social Notes",teacherNote:"💌 Teacher Note"};
            const val = report[field];
            if(!editing&&!val) return null;
            return(
              <div key={field} style={{...card,padding:16,marginBottom:10,borderLeft:field==="teacherNote"?`4px solid ${T.primary}`:field==="learning"?`4px solid ${T.green}`:field==="socialNotes"?`4px solid ${T.cyan}`:"none"}}>
                <div style={{fontSize:10,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>{labels[field]}</div>
                {editing?(
                  field==="activities"?(
                    <input value={(val||[]).join(", ")} onChange={e=>upd(field,e.target.value.split(",").map(s=>s.trim()).filter(Boolean))} placeholder="Activity 1, Activity 2, ..." style={{...inputStyle}}/>
                  ):(
                    <textarea value={val||""} onChange={e=>upd(field,e.target.value)} placeholder={`Enter ${labels[field].split(" ").slice(1).join(" ")}...`} style={{...textareaStyle}}/>
                  )
                ):(
                  field==="activities"?(
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(val||[]).map((a,i)=><span key={i} style={bdg(T.purple,T.purpleLight)}>✨ {a}</span>)}</div>
                  ):(
                    <p style={{margin:0,fontSize:13,lineHeight:1.6,fontStyle:field==="teacherNote"?"italic":"normal"}}>{val}</p>
                  )
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// PARENT VIEWS
// ════════════════════════════════════════════════════════════════════════

function ParentDash({user,children,photos,incidents,consents,dailyReports,setTab}){
  const child = children.find(c=>c.id===user.childId)||children[0];
  const stMap={"checked-in":{label:"✅ At Daycare",c:T.green,bg:T.greenLight},"checked-out":{label:"🏠 Picked Up",c:T.cyan,bg:T.cyanLight},"absent":{label:"😔 Absent",c:T.red,bg:T.redLight}};
  const st = stMap[child.status];
  const myPhotos = photos.filter(p=>p.childId===child.id).slice(0,4);
  const newIncidents = incidents.filter(i=>i.childId===child.id&&!i.acknowledged).length;
  const myConsent = consents[user.id];
  const todaysReport = dailyReports?.[child.id];

  return(
    <div>
      <h2 style={{fontWeight:900,fontSize:22,margin:"0 0 16px"}}>Your Child 💛</h2>
      <div style={{...card,padding:22,marginBottom:12,display:"flex",gap:18,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{width:70,height:70,borderRadius:20,background:T.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40}}>{child.avatar}</div>
        <div style={{flex:1}}>
          <h3 style={{margin:"0 0 4px",fontWeight:900,fontSize:22}}>{child.name}</h3>
          <p style={{margin:"0 0 8px",color:T.muted,fontWeight:600}}>🚪 {child.room} · 🎂 {child.age}</p>
          <span style={{...bdg(st.c,st.bg),fontSize:12,padding:"5px 12px"}}>{st.label}</span>
        </div>
      </div>
      {todaysReport&&(
        <button onClick={()=>setTab("daily")} style={{...card,padding:18,marginBottom:10,background:`linear-gradient(135deg,${T.primary},${T.yellow})`,color:"#fff",border:"none",cursor:"pointer",width:"100%",fontFamily:FONT,textAlign:"left",display:"flex",alignItems:"center",gap:14}}>
          <div style={{fontSize:38}}>📋</div>
          <div style={{flex:1}}><div style={{fontSize:11,fontWeight:800,opacity:0.9,textTransform:"uppercase",letterSpacing:1}}>TODAY'S DAILY REPORT</div><h3 style={{margin:"4px 0 2px",fontWeight:900,fontSize:17,color:"#fff"}}>How {child.name.split(" ")[0]}'s Day Went</h3><p style={{margin:0,fontSize:12,opacity:0.95}}>By {todaysReport.completedBy} · Tap to see full report</p></div>
          <span style={{fontSize:22,opacity:0.9}}>→</span>
        </button>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8,marginBottom:14}}>
        {[{l:"📸 Photos",c:T.purple,g:"photos"},{l:"💬 Messages",c:T.cyan,g:"messages"},{l:"🩹 Reports",c:T.red,g:"incidents"}].map(a=>(
          <button key={a.l} onClick={()=>setTab(a.g)} style={{padding:"11px 8px",border:`2px solid ${a.c}`,background:"#fff",color:a.c,borderRadius:12,fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:FONT,transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background=a.c;e.currentTarget.style.color="#fff";}} onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.color=a.c;}}>
            {a.l}
          </button>
        ))}
      </div>
      {child.xp!==undefined&&(
        <div style={{...card,padding:16,marginBottom:12,background:`linear-gradient(135deg,${T.yellowLight},${T.primaryLight})`}}>
          <h3 style={{margin:"0 0 8px",fontWeight:800,fontSize:14}}>🎮 Learning Progress</h3>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[{l:`⭐ ${child.xp} XP`,c:T.yellow},{l:`🏆 Level ${child.level||1}`,c:T.purple},{l:`🔥 ${child.streak||0} streak`,c:T.red},{l:`🎖️ ${child.badges?.length||0} badges`,c:T.green}].map(b=><span key={b.l} style={{...bdg(b.c,"#fff"),fontSize:12,padding:"5px 11px"}}>{b.l}</span>)}
          </div>
        </div>
      )}
      {myConsent?.signedDate&&<div style={{...card,padding:12,marginBottom:12,background:T.greenLight,borderLeft:`4px solid ${T.green}`,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>🛡️</span><div style={{fontSize:12,fontWeight:600}}>COPPA Consent signed · {myConsent.signedDate}</div></div>}
      {newIncidents>0&&<button onClick={()=>setTab("incidents")} style={{width:"100%",border:"none",cursor:"pointer",fontFamily:FONT,...card,padding:16,marginBottom:12,background:T.redLight,borderLeft:`5px solid ${T.red}`,textAlign:"left"}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:22}} className="heartbeat">🔔</span><div style={{flex:1}}><div style={{fontWeight:900,fontSize:14,color:T.red}}>{newIncidents} new incident report{newIncidents>1?"s":""}</div><div style={{fontSize:11,color:T.muted}}>Tap to view →</div></div></div></button>}
      {myPhotos.length>0&&(
        <div>
          <h3 style={{margin:"0 0 10px",fontWeight:800,fontSize:15}}>📸 Latest Photos</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
            {myPhotos.map(p=>(
              <div key={p.id} style={{...card,overflow:"hidden"}}>
                <div style={{background:p.imageData?"#000":p.gradient,height:110,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,overflow:"hidden"}}>
                  {p.imageData?<img src={p.imageData} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:p.emoji}
                </div>
                <div style={{padding:8}}><p style={{margin:0,fontSize:11,fontWeight:600}}>{p.caption}</p><div style={{fontSize:10,color:T.muted,marginTop:3}}>{p.time}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ParentPrivacyCenter({user,consents,onShowPrivacy}){
  const mc = consents[user.id]||{};
  return(
    <div>
      <h2 style={{fontWeight:900,fontSize:22,margin:"0 0 18px"}}>🔒 Privacy Center</h2>
      <div style={{...card,padding:20,marginBottom:12}}>
        <h3 style={{margin:"0 0 10px",fontWeight:800,fontSize:15}}>✍️ Consent Settings</h3>
        <p style={{fontSize:12,color:T.muted,marginBottom:14}}>Last signed: {mc.signedDate||"Not signed"}</p>
        {[{k:"accountCreation",l:"Account Creation",i:"👤"},{k:"photoSharing",l:"Photo Sharing",i:"📸"},{k:"dailyReports",l:"Daily Reports",i:"📋"},{k:"healthInfo",l:"Health Info",i:"🩹"},{k:"communication",l:"Communication",i:"💬"}].map(item=>(
          <div key={item.k} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
            <span style={{fontSize:18}}>{item.i}</span>
            <span style={{flex:1,fontWeight:600,fontSize:13}}>{item.l}</span>
            {mc[item.k]?<span style={bdg(T.green,T.greenLight)}>✅ Allowed</span>:<span style={bdg(T.red,T.redLight)}>❌ Denied</span>}
          </div>
        ))}
      </div>
      <div style={{...card,padding:16,marginBottom:10,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <span style={{fontSize:24}}>📜</span>
        <div style={{flex:1}}><h4 style={{margin:0,fontSize:13,fontWeight:800}}>Privacy Policy</h4><p style={{margin:0,fontSize:11,color:T.muted}}>What data we collect</p></div>
        <button onClick={onShowPrivacy} style={btn("ghost","sm")}>View →</button>
      </div>
      <div style={{...card,padding:16,borderLeft:`4px solid ${T.red}`,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <span style={{fontSize:24}}>🗑️</span>
        <div style={{flex:1}}><h4 style={{margin:0,fontSize:13,fontWeight:800,color:T.red}}>Delete My Data</h4><p style={{margin:0,fontSize:11,color:T.muted}}>Remove all data within 30 days</p></div>
        <button onClick={()=>showToast("Data deletion request submitted. You'll hear back within 30 days.")} style={btn("danger","sm")}>Request</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// CLASSROOM BOARD (staff/admin)
// ════════════════════════════════════════════════════════════════════════

function ClassroomBoard({user,activities,setActivities,activeQuestion,onWatchVideo,onAddActivity,onAskQuestion,onClearQuestion,onImport,onExport,onExportActivity,onAI,onEdit,onDelete,showToast}){
  const isStaff = user.role==="d_staff"||user.role==="d_admin";
  const [aiTimeRange, setAiTimeRange] = useState("medium");
  const [aiAge, setAiAge] = useState("3-5");
  const [showAI, setShowAI] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const todaysVideos = useMemo(()=>{
    const day = Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0))/86400000);
    return Array.from({length:6},(_,i)=>VIDEO_LIBRARY[(day+i)%VIDEO_LIBRARY.length]);
  },[]);

  const filtered = useMemo(()=>{
    const ranges={short:[5,10],medium:[15,20],long:[30,60]};
    const [min,max]=ranges[aiTimeRange];
    const [amin,amax]=aiAge.split("-").map(Number);
    return ACTIVITY_TEMPLATES.filter(a=>a.durationMin>=min&&a.durationMin<=max&&a.ageMin>=amin&&a.ageMin<=amax);
  },[aiTimeRange,aiAge]);

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{fontWeight:900,fontSize:22,margin:"0 0 4px",display:"flex",alignItems:"center",gap:8}}>🎓 Classroom Board <span style={bdg(T.primary,T.primaryLight)}>✨ PLUS</span></h2>
          <p style={{color:T.muted,margin:0,fontSize:13}}>Teach kids, push questions, share videos</p>
        </div>
        {isStaff&&(
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <button onClick={onImport} style={btn("ghost","sm")}>📥 Import</button>
            <button onClick={onExport} style={btn("ghost","sm")}>📤 Export</button>
            <button onClick={onAskQuestion} style={btn("secondary","sm")}>❓ Ask Question</button>
            <button onClick={onAddActivity} style={btn("primary","sm")}>+ Activity</button>
          </div>
        )}
      </div>

      {/* Live question */}
      {activeQuestion&&(
        <div style={{...card,padding:20,marginBottom:16,background:`linear-gradient(135deg,${T.purpleLight},${T.primaryLight})`,borderLeft:`5px solid ${T.purple}`,position:"relative"}}>
          <div style={{position:"absolute",top:10,right:10,fontSize:10,fontWeight:800,color:T.purple,background:"#fff",padding:"3px 8px",borderRadius:20}}>🔴 LIVE</div>
          <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
            <div style={{fontSize:50}} className="bouncy">{activeQuestion.emoji}</div>
            <div style={{flex:1}}><div style={{fontSize:11,fontWeight:800,color:T.purple,textTransform:"uppercase",letterSpacing:1}}>📲 Live Question · {activeQuestion.pushedAt}</div><h3 style={{margin:"4px 0",fontWeight:900,fontSize:20}}>{activeQuestion.question}</h3><p style={{margin:0,fontSize:13,color:T.muted}}>Answer: <strong style={{color:T.green}}>{activeQuestion.answer}</strong></p></div>
            {isStaff&&<button onClick={onClearQuestion} style={btn("ghost","sm")}>✕ End</button>}
          </div>
        </div>
      )}

      {/* Activities */}
      <h3 style={{fontWeight:900,fontSize:16,margin:"0 0 10px"}}>📝 Today's Activities</h3>
      <div style={{display:"grid",gap:10,marginBottom:20}}>
        {activities.map(a=>{
          const isEditing=editingId===a.id;
          return(
            <div key={a.id} style={{...card,padding:16}}>
              {isEditing?(
                <div>
                  <input value={editData.title||""} onChange={e=>setEditData(d=>({...d,title:e.target.value}))} style={{...inputStyle,marginBottom:6}}/>
                  <textarea value={editData.description||""} onChange={e=>setEditData(d=>({...d,description:e.target.value}))} style={{...textareaStyle,marginBottom:8}}/>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>{onEdit(a.id,editData);setEditingId(null);}} style={btn("success","sm")}>Save</button>
                    <button onClick={()=>setEditingId(null)} style={btn("ghost","sm")}>Cancel</button>
                  </div>
                </div>
              ):(
                <div style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
                  <div style={{width:46,height:46,borderRadius:12,background:T.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{a.icon||"📋"}</div>
                  <div style={{flex:1,minWidth:160}}>
                    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                      <h4 style={{margin:0,fontWeight:900,fontSize:14}}>{a.title}</h4>
                      <span style={bdg(T.cyan,T.cyanLight)}>{a.category}</span>
                      <span style={bdg(T.muted,"#F3F4F6")}>⏱️ {a.duration}</span>
                    </div>
                    <p style={{margin:"0 0 6px",fontSize:12,color:T.text}}>{a.description}</p>
                    {/* Steps */}
                    {(a.steps||[]).length>0&&(
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        {a.steps.map((s,i)=><span key={i} style={{fontSize:10,fontWeight:700,color:T.purple,background:T.purpleLight,padding:"2px 8px",borderRadius:20}}>{i+1}. {s}</span>)}
                      </div>
                    )}
                    <div style={{fontSize:11,color:T.muted,marginTop:6}}>By {a.postedBy} · {a.time} · ✅ {a.completed||0} completed</div>
                    {/* Submission count */}
                    {Object.keys(a.submissions||{}).length>0&&(
                      <div style={{marginTop:6,fontSize:11,color:T.green,fontWeight:700}}>🌟 {Object.keys(a.submissions).length} kid{Object.keys(a.submissions).length>1?"s":""} submitted!</div>
                    )}
                  </div>
                  {isStaff&&(
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={()=>{setEditingId(a.id);setEditData({title:a.title,description:a.description});}} style={btn("ghost","sm")}>✏️</button>
                      <button onClick={()=>onExportActivity(a)} style={btn("ghost","sm")}>📤</button>
                      <button onClick={()=>onDelete(a.id)} style={btn("danger","sm")}>🗑️</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* AI Suggestions */}
      {isStaff&&(
        <div style={{...card,padding:18,marginBottom:18,background:`linear-gradient(135deg,${T.purpleLight},${T.primaryLight})`,border:`2px solid ${T.purple}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:showAI?14:0,flexWrap:"wrap"}}>
            <div style={{width:40,height:40,borderRadius:12,background:T.purple,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🤖</div>
            <div style={{flex:1}}><h3 style={{margin:0,fontWeight:900,fontSize:15}}>AI Activity Suggestions</h3><p style={{margin:0,fontSize:11,color:T.muted}}>Filter by time + age</p></div>
            <button onClick={()=>setShowAI(!showAI)} style={btn(showAI?"ghost":"primary","sm")}>{showAI?"Hide":"Show"}</button>
          </div>
          {showAI&&(
            <>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:10}}>
                <div>
                  <div style={{fontSize:10,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>⏱️ Time</div>
                  <div style={{display:"flex",gap:4}}>{[{v:"short",l:"5-10 min"},{v:"medium",l:"15-20 min"},{v:"long",l:"30+ min"}].map(t=><button key={t.v} onClick={()=>setAiTimeRange(t.v)} style={{padding:"5px 10px",borderRadius:20,border:aiTimeRange===t.v?`2px solid ${T.purple}`:`1.5px solid ${T.border}`,background:aiTimeRange===t.v?T.purpleLight:"#fff",color:aiTimeRange===t.v?T.purple:T.muted,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:FONT}}>{t.l}</button>)}</div>
                </div>
                <div>
                  <div style={{fontSize:10,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>👶 Age</div>
                  <div style={{display:"flex",gap:4}}>{["2-3","3-4","4-5","2-5"].map(age=><button key={age} onClick={()=>setAiAge(age)} style={{padding:"5px 10px",borderRadius:20,border:aiAge===age?`2px solid ${T.purple}`:`1.5px solid ${T.border}`,background:aiAge===age?T.purpleLight:"#fff",color:aiAge===age?T.purple:T.muted,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:FONT}}>{age} yrs</button>)}</div>
                </div>
              </div>
              <button onClick={onAI} style={{...btn("primary","sm"),background:T.purple,marginBottom:12}}>✨ Generate with AI</button>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:8}}>
                {filtered.length===0?<p style={{color:T.muted,fontSize:12}}>No matches. Try different filters.</p>:filtered.map(t=>(
                  <div key={t.id} style={{...card,padding:12}}>
                    <div style={{fontSize:26,marginBottom:4}}>{t.icon}</div>
                    <h4 style={{margin:"0 0 4px",fontWeight:800,fontSize:13}}>{t.title}</h4>
                    <p style={{margin:"0 0 6px",fontSize:11,color:T.muted,lineHeight:1.4}}>{t.description}</p>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap",fontSize:10,marginBottom:8}}>
                      <span style={bdg(T.cyan,T.cyanLight)}>{t.category}</span>
                      <span style={bdg(T.muted,"#F3F4F6")}>⏱️ {t.duration}</span>
                    </div>
                    <button onClick={()=>{setActivities(p=>[{id:Date.now(),title:t.title,category:t.category,icon:t.icon,description:t.description,duration:t.duration,durationMin:t.durationMin,postedBy:user.name,time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),completed:0,steps:t.steps||[],submissions:{}},...p]);showToast(`"${t.title}" added to classroom! 🎓`);}} style={{...btn("primary","sm"),width:"100%",fontSize:11}}>+ Add to Classroom</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Daily Videos */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
        <h3 style={{fontWeight:900,fontSize:16,margin:0}}>📺 Today's Videos</h3>
        <span style={bdg(T.green,T.greenLight)}>🔄 Rotates daily</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
        {todaysVideos.map(v=>(
          <button key={v.id} onClick={()=>onWatchVideo(v)} style={{...card,padding:0,border:"none",cursor:"pointer",overflow:"hidden",textAlign:"left",fontFamily:FONT}}>
            <div style={{background:`linear-gradient(135deg,${v.color},${v.color}88)`,height:120,display:"flex",alignItems:"center",justifyContent:"center",fontSize:60,position:"relative"}}>
              {v.thumb}
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.15)"}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(255,255,255,0.95)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>▶️</div>
              </div>
              <div style={{position:"absolute",bottom:6,right:6,background:"rgba(0,0,0,0.7)",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:4}}>{v.duration}</div>
            </div>
            <div style={{padding:12}}><h4 style={{margin:"0 0 3px",fontWeight:800,fontSize:13,lineHeight:1.3}}>{v.title}</h4><p style={{margin:0,fontSize:11,color:T.muted}}>{v.channel} · {v.category}</p></div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// KID CLASSROOM (interactive activities)
// ════════════════════════════════════════════════════════════════════════

function KidClassroom({user,activities,activeQuestion,onSubmit,showToast}){
  const [activeActivity, setActiveActivity] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [response, setResponse] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("🌟");
  const [kidAnswer, setKidAnswer] = useState("");
  const [questionAnswered, setQuestionAnswered] = useState(false);

  const startActivity = (a) => {
    if(a.submissions?.[user.childId]) { showToast("You already completed this one! ⭐"); return; }
    setActiveActivity(a);
    setCompletedSteps([]);
    setResponse("");
  };

  const toggleStep = (idx) => {
    setCompletedSteps(prev=>prev.includes(idx)?prev.filter(i=>i!==idx):[...prev,idx]);
  };

  const submitActivity = () => {
    if(!activeActivity) return;
    onSubmit(activeActivity.id, completedSteps, response, selectedEmoji);
    setActiveActivity(null);
  };

  const MOOD_EMOJIS = ["🌟","😊","🎉","😄","💪","🤩","🥳"];

  if(activeActivity){
    const steps = activeActivity.steps||[];
    const allDone = steps.length===0||completedSteps.length>=steps.length;
    return(
      <div>
        <button onClick={()=>setActiveActivity(null)} style={{...btn("ghost","sm"),marginBottom:14}}>← Back to Classroom</button>
        <div style={{...card,padding:24,marginBottom:14,background:`linear-gradient(135deg,${T.primaryLight},${T.yellowLight})`}}>
          <div style={{fontSize:52,marginBottom:8}} className="bouncy">{activeActivity.icon||"📋"}</div>
          <h2 style={{margin:"0 0 6px",fontWeight:900,fontSize:22}}>{activeActivity.title}</h2>
          <p style={{margin:"0 0 8px",fontSize:14,color:T.text}}>{activeActivity.description}</p>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <span style={bdg(T.cyan,T.cyanLight)}>{activeActivity.category}</span>
            <span style={bdg(T.muted,"#F3F4F6")}>⏱️ {activeActivity.duration}</span>
          </div>
        </div>

        {/* Step checklist */}
        {steps.length>0&&(
          <div style={{...card,padding:18,marginBottom:14}}>
            <h3 style={{margin:"0 0 12px",fontWeight:900,fontSize:16}}>📋 Steps to Complete</h3>
            {steps.map((step,i)=>(
              <button key={i} onClick={()=>toggleStep(i)} style={{width:"100%",border:"none",background:"transparent",cursor:"pointer",fontFamily:FONT,display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<steps.length-1?`1px solid ${T.border}`:"none"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:completedSteps.includes(i)?T.green:"#fff",border:`2px solid ${completedSteps.includes(i)?T.green:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,transition:"all 0.2s"}}>
                  {completedSteps.includes(i)?"✓":<span style={{fontWeight:800,color:T.muted,fontSize:13}}>{i+1}</span>}
                </div>
                <span style={{fontSize:15,fontWeight:600,color:completedSteps.includes(i)?T.green:T.text,textDecoration:completedSteps.includes(i)?"line-through":"none"}}>{step}</span>
              </button>
            ))}
            <div style={{marginTop:10,display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1,height:8,background:T.border,borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${steps.length>0?(completedSteps.length/steps.length)*100:0}%`,background:T.green,borderRadius:4,transition:"width 0.3s"}}/>
              </div>
              <span style={{fontSize:12,fontWeight:700,color:T.green}}>{completedSteps.length}/{steps.length}</span>
            </div>
          </div>
        )}

        {/* Response */}
        <div style={{...card,padding:18,marginBottom:14}}>
          <h3 style={{margin:"0 0 10px",fontWeight:900,fontSize:15}}>💬 Tell your teacher what you did!</h3>
          <textarea value={response} onChange={e=>setResponse(e.target.value)} placeholder="Write about what you did... (optional)" style={{...textareaStyle,marginBottom:10}}/>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>How are you feeling? Pick an emoji!</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {MOOD_EMOJIS.map(e=><button key={e} onClick={()=>setSelectedEmoji(e)} style={{width:44,height:44,borderRadius:12,border:selectedEmoji===e?`2px solid ${T.primary}`:`1.5px solid ${T.border}`,background:selectedEmoji===e?T.primaryLight:"#fff",fontSize:24,cursor:"pointer"}}>{e}</button>)}
            </div>
          </div>
        </div>
        <button onClick={submitActivity} disabled={steps.length>0&&!allDone} style={{...btn("primary","lg"),width:"100%",opacity:steps.length>0&&!allDone?0.5:1}}>
          {steps.length>0&&!allDone?`Complete all ${steps.length} steps first!`:`🌟 Submit Activity! (+20 XP)`}
        </button>
      </div>
    );
  }

  return(
    <div>
      <h2 style={{fontWeight:900,fontSize:26,margin:"0 0 4px"}}>🎓 Today's Classroom!</h2>
      <p style={{color:T.muted,margin:"0 0 18px",fontWeight:600,fontSize:14}}>Do your activities and earn XP stars! ⭐</p>

      {/* Live question */}
      {activeQuestion&&(
        <div style={{...card,padding:20,marginBottom:16,background:`linear-gradient(135deg,${T.purpleLight},${T.primaryLight})`,borderLeft:`5px solid ${T.purple}`}}>
          <div style={{fontSize:10,fontWeight:800,color:T.purple,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>🔴 LIVE QUESTION FROM YOUR TEACHER!</div>
          <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <div style={{fontSize:50}} className="bouncy">{activeQuestion.emoji}</div>
            <div style={{flex:1}}><h3 style={{margin:0,fontWeight:900,fontSize:22}}>{activeQuestion.question}</h3></div>
          </div>
          {!questionAnswered?(
            <div style={{marginTop:12}}>
              <input value={kidAnswer} onChange={e=>setKidAnswer(e.target.value)} placeholder="Type your answer here!" style={{...inputStyle,fontSize:16,marginBottom:8}}/>
              <button onClick={()=>{if(kidAnswer.trim()){setQuestionAnswered(true);showToast(`Great answer! "${kidAnswer}" 🌟`);setKidAnswer("");}}} style={btn("primary","md")}>Submit My Answer! 🙋</button>
            </div>
          ):(
            <div style={{marginTop:10,padding:12,background:"#fff",borderRadius:10,fontWeight:700,color:T.green,fontSize:14}}>✅ You answered the question! Great job! 🌟</div>
          )}
        </div>
      )}

      {/* Activity grid */}
      <h3 style={{fontWeight:900,fontSize:16,margin:"0 0 10px"}}>📋 Activities</h3>
      <div style={{display:"grid",gap:12}}>
        {activities.map(a=>{
          const done = !!a.submissions?.[user.childId];
          return(
            <div key={a.id} style={{...card,padding:16,borderLeft:`5px solid ${done?T.green:T.primary}`,opacity:done?0.85:1}}>
              <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <div style={{width:50,height:50,borderRadius:14,background:done?T.greenLight:T.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{done?"✅":a.icon||"📋"}</div>
                <div style={{flex:1,minWidth:150}}>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                    <h4 style={{margin:0,fontWeight:900,fontSize:15}}>{a.title}</h4>
                    <span style={bdg(T.cyan,T.cyanLight)}>{a.category}</span>
                    {done&&<span style={bdg(T.green,T.greenLight)}>Done! ⭐</span>}
                  </div>
                  <p style={{margin:"0 0 4px",fontSize:12,color:T.muted}}>{a.description}</p>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    {(a.steps||[]).map((s,i)=><span key={i} style={{fontSize:10,fontWeight:700,color:T.purple,background:T.purpleLight,padding:"2px 6px",borderRadius:20}}>{i+1}. {s}</span>)}
                  </div>
                  {done&&a.submissions?.[user.childId]&&(
                    <div style={{marginTop:6,fontSize:12,color:T.green,fontWeight:700}}>Your answer: "{a.submissions[user.childId].response||"Completed!"}" {a.submissions[user.childId].emoji}</div>
                  )}
                </div>
                {!done&&<button onClick={()=>startActivity(a)} style={btn("primary","sm")}>Start! 🚀</button>}
              </div>
            </div>
          );
        })}
        {activities.length===0&&<div style={{...card,padding:40,textAlign:"center"}}><div style={{fontSize:48,marginBottom:8}}>📋</div><p style={{color:T.muted,fontWeight:600}}>No activities yet. Check back soon!</p></div>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// KID VIEWS
// ════════════════════════════════════════════════════════════════════════

function KidDash({user,children,setTab,onChangeAvatar}){
  const me = children.find(c=>c.id===user.childId)||children[0];
  const FUN_FACTS=[{f:"Baby giraffes are 6 feet tall when born!",e:"🦒"},{f:"Octopuses have THREE hearts!",e:"🐙"},{f:"Butterflies taste with their feet!",e:"🦋"},{f:"Honey never spoils — ever!",e:"🍯"},{f:"Sharks are older than trees!",e:"🦈"},{f:"A group of flamingos is called a flamboyance!",e:"🦩"},{f:"Stars look tiny but are actually huge suns!",e:"⭐"}];
  const CHALLENGES=[{t:"Color Champion",d:"Get 3 colors right!",r:"+50 XP",i:"🎨"},{t:"Number Hero",d:"Play Numbers game!",r:"+30 XP",i:"🔢"},{t:"Activity Star",d:"Complete today's activity!",r:"+40 XP",i:"🌟"},{t:"Classroom Pro",d:"Answer the live question!",r:"+60 XP",i:"🎓"}];
  const day=new Date();
  const fact=FUN_FACTS[day.getDate()%FUN_FACTS.length];
  const challenge=CHALLENGES[day.getDate()%CHALLENGES.length];
  const xpForNext=(me.level||1)*100;
  const xpPct=Math.min(100,((me.xp||0)/xpForNext)*100);

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
        <h2 style={{fontWeight:900,fontSize:26,margin:0}}>Hi {me.name.split(" ")[0]}! {me.avatar}</h2>
        <button onClick={onChangeAvatar} style={{...btn("ghost","sm"),fontSize:11}}>✏️ Change Look</button>
      </div>
      <p style={{color:T.muted,margin:"0 0 18px",fontWeight:600}}>Ready to learn and play? 🎉</p>
      <div style={{...card,padding:20,marginBottom:14,background:`linear-gradient(135deg,${T.primaryLight},${T.yellowLight})`,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <div style={{fontSize:64}} className="bouncy">{me.avatar}</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:900,fontSize:22,color:T.primary}}>Level {me.level||1}</div>
          <div style={{marginTop:6,marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,fontWeight:700,marginBottom:3}}>
              <span style={{color:T.muted}}>To Level {(me.level||1)+1}:</span>
              <span style={{color:T.primary}}>{me.xp||0}/{xpForNext} XP</span>
            </div>
            <div style={{height:10,background:"#fff",borderRadius:6,overflow:"hidden",border:`1px solid ${T.border}`}}>
              <div style={{height:"100%",width:`${xpPct}%`,background:`linear-gradient(90deg,${T.yellow},${T.primary})`,borderRadius:6,transition:"width 0.5s"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[{l:`⭐ ${me.xp||0} XP`,c:T.yellow},{l:`🔥 ${me.streak||0} streak`,c:T.red},{l:`🏆 ${me.badges?.length||0} badges`,c:T.purple}].map(b=><span key={b.l} style={{...bdg(b.c,"#fff"),fontSize:12,padding:"4px 10px"}}>{b.l}</span>)}
          </div>
        </div>
      </div>
      <button onClick={()=>setTab("classroom")} style={{width:"100%",...card,padding:18,marginBottom:12,background:`linear-gradient(135deg,${T.purple},${T.primary})`,color:"#fff",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:12,fontFamily:FONT,textAlign:"left"}}>
        <div style={{fontSize:40}} className="bouncy">{challenge.i}</div>
        <div style={{flex:1}}><div style={{fontSize:11,fontWeight:800,opacity:0.9,textTransform:"uppercase",letterSpacing:1}}>🎯 TODAY'S CHALLENGE</div><h3 style={{margin:"3px 0",fontWeight:900,fontSize:18,color:"#fff"}}>{challenge.t}</h3><p style={{margin:0,fontSize:12,opacity:0.95}}>{challenge.d}</p></div>
        <div style={{...bdg("#fff","rgba(255,255,255,0.2)"),border:"2px solid #fff",fontSize:13,padding:"5px 12px"}}>{challenge.r}</div>
      </button>
      <div style={{...card,padding:16,marginBottom:14,background:T.cyanLight,borderLeft:`4px solid ${T.cyan}`,display:"flex",alignItems:"center",gap:12}}>
        <div style={{fontSize:38}}>{fact.e}</div>
        <div><div style={{fontSize:11,fontWeight:800,color:T.cyan,textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>🤓 Did You Know?</div><p style={{margin:0,fontSize:13,fontWeight:700}}>{fact.f}</p></div>
      </div>
      <p style={{fontSize:11,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1,margin:"0 0 8px"}}>⚡ Tap to Play!</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10}}>
        {[{l:"🎓 Classroom",c:T.primary,g:"classroom"},{l:"🎮 Play Games",c:T.purple,g:"learn"},{l:"🏆 My Badges",c:T.yellow,g:"badges"},{l:"🌟 Top Kids",c:T.cyan,g:"leaderboard"}].map(a=>(
          <button key={a.l} onClick={()=>setTab(a.g)} style={{padding:"14px 8px",border:"none",background:a.c,color:"#fff",borderRadius:14,fontWeight:900,fontSize:13,cursor:"pointer",fontFamily:FONT,boxShadow:`0 4px 12px ${a.c}40`}}>{a.l}</button>
        ))}
      </div>
    </div>
  );
}

function LearnView({onStart}){
  return(
    <div>
      <h2 style={{fontWeight:900,fontSize:26,margin:"0 0 4px"}}>🎮 Pick a Game!</h2>
      <p style={{color:T.muted,margin:"0 0 20px",fontWeight:600}}>Earn XP by answering correctly!</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14}}>
        {Object.entries(LEARNING).map(([key,sub])=>(
          <button key={key} onClick={()=>onStart(key)} style={{...card,padding:22,border:"none",cursor:"pointer",textAlign:"center",fontFamily:FONT,borderTop:`5px solid ${sub.color}`}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.03)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
            <div style={{fontSize:52,marginBottom:6}}>{sub.icon}</div>
            <div style={{fontWeight:900,fontSize:17,color:sub.color}}>{sub.label}</div>
            <div style={{fontSize:11,color:T.muted,fontWeight:600,marginTop:4}}>+10 XP per correct answer ⭐</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function BadgesView({user,children}){
  const me = children.find(c=>c.id===user.childId)||children[0];
  const earned = me.badges||[];
  return(
    <div>
      <h2 style={{fontWeight:900,fontSize:26,margin:"0 0 4px"}}>🏆 My Badges</h2>
      <p style={{color:T.muted,margin:"0 0 20px",fontWeight:600}}>{earned.length} of {ALL_BADGES.length} earned!</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
        {ALL_BADGES.map(b=>{
          const has=earned.includes(b.id);
          return(
            <div key={b.id} style={{...card,padding:16,textAlign:"center",opacity:has?1:0.4,filter:has?"none":"grayscale(80%)"}}>
              <div style={{fontSize:48,marginBottom:4}} className={has?"bouncy":""}>{b.icon}</div>
              <div style={{fontWeight:900,fontSize:13}}>{b.name}</div>
              <div style={{fontSize:11,color:T.muted,marginTop:3,lineHeight:1.4}}>{b.desc}</div>
              {has&&<div style={{...bdg(T.green,T.greenLight),fontSize:9,marginTop:6}}>✅ EARNED</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Leaderboard({children}){
  const sorted=[...children].sort((a,b)=>(b.xp||0)-(a.xp||0));
  const medals=["🥇","🥈","🥉"];
  return(
    <div>
      <h2 style={{fontWeight:900,fontSize:26,margin:"0 0 4px"}}>🌟 Top Kids</h2>
      <p style={{color:T.muted,margin:"0 0 18px",fontWeight:600}}>Who's earning the most stars?</p>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        {sorted.map((s,i)=>(
          <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderBottom:i<sorted.length-1?`1px solid ${T.border}`:"none",background:i===0?`linear-gradient(90deg,${T.yellowLight},transparent)`:"#fff"}}>
            <span style={{fontSize:24,width:38,textAlign:"center",fontWeight:900}}>{medals[i]||`#${i+1}`}</span>
            <span style={{fontSize:34}} className={i===0?"bouncy":""}>{s.avatar}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:900,fontSize:15}}>{s.name}</div>
              <div style={{fontSize:11,color:T.muted}}>🚪 {s.room} · Level {s.level||1}</div>
            </div>
            <span style={bdg(T.yellow,T.yellowLight)}>⭐ {s.xp||0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// BILLING
// ════════════════════════════════════════════════════════════════════════

function BillingView({invoices,setInvoices,showToast}){
  const [showHow, setShowHow] = useState(false);
  const [selected, setSelected] = useState(null);
  const stMap={paid:{c:T.green,bg:T.greenLight,l:"✅ Paid"},pending:{c:T.yellow,bg:T.yellowLight,l:"⏳ Pending"},overdue:{c:T.red,bg:T.redLight,l:"🔴 Overdue"}};
  const collected=invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+i.amount,0);
  const pending=invoices.filter(i=>i.status==="pending").reduce((s,i)=>s+i.amount,0);
  const overdue=invoices.filter(i=>i.status==="overdue").reduce((s,i)=>s+i.amount,0);
  const rate=Math.round((collected/(collected+pending+overdue))*100)||0;
  const markPaid=(id)=>{setInvoices(p=>p.map(i=>i.id===id?{...i,status:"paid",paidDate:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),method:"Manual entry"}:i));showToast("Marked paid! 💰");};

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <div><h2 style={{fontWeight:900,fontSize:22,margin:"0 0 4px"}}>💳 Billing & Tuition</h2><p style={{color:T.muted,margin:0,fontSize:13}}>Track tuition payments</p></div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setShowHow(true)} style={btn("ghost","sm")}>❓ How It Works</button>
          <button onClick={()=>showToast("New invoice created!")} style={btn("primary","sm")}>+ New Invoice</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:16}}>
        {[{l:"Collected",v:`$${collected}`,i:"💰",c:T.green,bg:T.greenLight},{l:"Pending",v:`$${pending}`,i:"⏳",c:T.yellow,bg:T.yellowLight},{l:"Overdue",v:`$${overdue}`,i:"🔴",c:T.red,bg:T.redLight},{l:"Collection Rate",v:`${rate}%`,i:"📊",c:T.cyan,bg:T.cyanLight}].map(s=>(
          <div key={s.l} style={{...card,padding:14,display:"flex",gap:8,alignItems:"center"}}>
            <div style={{width:38,height:38,borderRadius:10,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{s.i}</div>
            <div><div style={{fontSize:18,fontWeight:900,color:s.c}}>{s.v}</div><div style={{fontSize:10,color:T.muted,fontWeight:600}}>{s.l}</div></div>
          </div>
        ))}
      </div>
      {overdue>0&&<div style={{...card,padding:14,marginBottom:14,background:T.redLight,borderLeft:`5px solid ${T.red}`}}><div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><span style={{fontSize:20}}>⚠️</span><div style={{flex:1}}><div style={{fontWeight:900,color:T.red}}>${overdue} overdue</div></div><button onClick={()=>showToast("Reminders sent! 📧📱")} style={btn("danger","sm")}>Send Reminders</button></div></div>}
      <div style={{...card,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700}}>
          <thead><tr style={{background:"#F9FAFB"}}>{["Invoice","Family","Amount","Issued","Due","Status","Action"].map(h=><th key={h} style={{padding:"12px 14px",textAlign:"left",fontWeight:800,fontSize:11,color:T.muted,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
          <tbody>{invoices.map((inv,i)=>{
            const st=stMap[inv.status];
            return(
              <tr key={inv.id} style={{borderTop:`1px solid ${T.border}`,background:i%2===0?"#fff":"#FAFBFC",cursor:"pointer"}} onClick={()=>setSelected(inv)}>
                <td style={{padding:"12px 14px",fontWeight:700,color:T.primary}}>{inv.id}</td>
                <td style={{padding:"12px 14px",fontWeight:600}}>{inv.family}</td>
                <td style={{padding:"12px 14px",fontWeight:800}}>${inv.amount}</td>
                <td style={{padding:"12px 14px",fontSize:11,color:T.muted}}>{inv.issueDate}</td>
                <td style={{padding:"12px 14px",fontSize:11,color:inv.status==="overdue"?T.red:T.muted,fontWeight:inv.status==="overdue"?700:400}}>{inv.dueDate}</td>
                <td style={{padding:"12px 14px"}}><span style={bdg(st.c,st.bg)}>{st.l}</span></td>
                <td style={{padding:"12px 14px"}} onClick={e=>e.stopPropagation()}>{inv.status!=="paid"&&<button onClick={()=>markPaid(inv.id)} style={btn("success","sm")}>Mark Paid</button>}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <p style={{fontSize:11,color:T.muted,marginTop:8,fontStyle:"italic"}}>💡 Tap any row for invoice details</p>

      {showHow&&(
        <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.6)",zIndex:10001,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{...card,width:520,maxWidth:"100%",padding:24,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <h2 style={{margin:0,fontWeight:900,fontSize:20}}>💳 How Billing Works</h2>
              <button onClick={()=>setShowHow(false)} style={{...btn("ghost","sm"),fontSize:16}}>✕</button>
            </div>
            <div style={{background:T.greenLight,borderRadius:10,padding:14,marginBottom:14,borderLeft:`4px solid ${T.green}`,fontSize:12,lineHeight:1.6}}><strong style={{color:T.green}}>✅ Powered by Stripe</strong> — the same payment system used by Amazon and Shopify. Bank-level security.</div>
            {[["1","Setup","Connect your bank account to Stripe (5 minutes). Free."],["2","Auto-Invoices","On the 1st of each month, invoices are auto-generated for every enrolled child."],["3","Parents Pay","Parents get an email + SMS with a secure payment link."],["4","Auto-Pay","Parents can save their card for automatic monthly billing."],["5","Reminders","Late invoices get reminders at 3, 7, and 14 days automatically."],["6","You Get Paid","Stripe deposits to your bank in 2 business days. Takes 2.9% + 30¢."]].map(([n,t,d])=>(
              <div key={n} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:T.primary,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:12,flexShrink:0}}>{n}</div>
                <div><div style={{fontWeight:800,fontSize:13,marginBottom:2}}>{t}</div><div style={{fontSize:12,color:T.muted,lineHeight:1.5}}>{d}</div></div>
              </div>
            ))}
            <div style={{background:T.yellowLight,borderRadius:8,padding:12,marginTop:12,fontSize:11,lineHeight:1.6,borderLeft:`3px solid ${T.yellow}`}}>📌 <strong>Demo Note:</strong> In production, real Stripe integration handles payments. This demo shows the workflow.</div>
            <button onClick={()=>setShowHow(false)} style={{...btn("primary","lg"),width:"100%",marginTop:14}}>Got It! ✓</button>
          </div>
        </div>
      )}

      {selected&&(
        <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.6)",zIndex:10001,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{...card,width:480,maxWidth:"100%",padding:0,overflow:"hidden"}}>
            <div style={{background:T.primary,color:"#fff",padding:"20px 24px",borderRadius:"14px 14px 0 0"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:11,fontWeight:800,opacity:0.9}}>INVOICE {selected.id}</span><button onClick={()=>setSelected(null)} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",width:26,height:26,borderRadius:"50%",fontSize:13,cursor:"pointer"}}>✕</button></div>
              <div style={{fontSize:32,fontWeight:900}}>${selected.amount}.00</div>
              <div style={{fontSize:13,opacity:0.9}}>{selected.family}</div>
            </div>
            <div style={{padding:22}}>
              {[["Family",selected.family],["Child",selected.child],["Issued",selected.issueDate],["Due",selected.dueDate],["Status",stMap[selected.status].l],...(selected.paidDate?[["Paid On",selected.paidDate]]:[]),(selected.method?[["Method",selected.method]]:[])].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}`,fontSize:13}}>
                  <span style={{color:T.muted,fontWeight:600}}>{l}</span>
                  <span style={{fontWeight:700}}>{v}</span>
                </div>
              ))}
              <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
                {selected.status!=="paid"&&<button onClick={()=>{markPaid(selected.id);setSelected(null);}} style={{...btn("success","md"),flex:1}}>Mark Paid</button>}
                {selected.status!=="paid"&&<button onClick={()=>{showToast("Reminder sent! 📧📱");setSelected(null);}} style={{...btn("primary","md"),flex:1}}>Send Reminder</button>}
                <button onClick={()=>showToast("PDF downloading...")} style={{...btn("ghost","md"),flex:1}}>📄 PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// MODALS
// ════════════════════════════════════════════════════════════════════════

function AddChildModal({onClose,onSave}){
  const [form,setForm]=useState({name:"",dob:"",room:"Butterfly",allergies:"None",notes:"",avatar:"🌸",parentName:"",parentEmail:"",parentPhone:""});
  const AVATS=["🌸","🦁","🌈","🚀","🦋","🐱","🐶","🐰","🐼","🦄","⭐","🎨","🍎","🌻","🐢"];
  const valid=form.name.trim()&&form.dob&&form.room;
  const calcAge=(dob)=>{const d=new Date(dob),n=new Date();const y=n.getFullYear()-d.getFullYear(),m=n.getMonth()-d.getMonth();return`${y}y ${((m+12)%12)}m`;};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.6)",zIndex:10001,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{...card,width:540,maxWidth:"100%",padding:24,maxHeight:"95vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{margin:0,fontWeight:900,fontSize:20}}>👶 Add New Child</h3>
          <button onClick={onClose} style={{...btn("ghost","sm"),fontSize:16}}>✕</button>
        </div>
        <div style={{fontSize:10,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Pick Avatar</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
          {AVATS.map(a=><button key={a} onClick={()=>setForm(f=>({...f,avatar:a}))} style={{width:40,height:40,borderRadius:10,border:form.avatar===a?`2px solid ${T.primary}`:`1.5px solid ${T.border}`,background:form.avatar===a?T.primaryLight:"#fff",fontSize:22,cursor:"pointer"}}>{a}</button>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Full Name *</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Child's full name" style={{...inputStyle}}/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Date of Birth *</label>
            <input type="date" value={form.dob} onChange={e=>setForm(f=>({...f,dob:e.target.value}))} style={{...inputStyle}}/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Room *</label>
            <select value={form.room} onChange={e=>setForm(f=>({...f,room:e.target.value}))} style={{...selectStyle}}>
              {ROOMS.map(r=><option key={r.id} value={r.name}>{r.icon} {r.name} ({r.ageRange})</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Allergies</label>
            <input value={form.allergies} onChange={e=>setForm(f=>({...f,allergies:e.target.value}))} placeholder="None, Peanuts, Dairy..." style={{...inputStyle}}/>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Staff Notes</label>
            <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any important notes for staff..." style={{...textareaStyle,minHeight:50}}/>
          </div>
        </div>
        <div style={{background:T.primaryLight,borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:800,color:T.primary,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>👨‍👩‍👧 Parent / Guardian (optional — can add later in Compliance)</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <input value={form.parentName} onChange={e=>setForm(f=>({...f,parentName:e.target.value}))} placeholder="Parent name" style={{...inputStyle}}/>
            <input value={form.parentEmail} onChange={e=>setForm(f=>({...f,parentEmail:e.target.value}))} placeholder="Email" style={{...inputStyle}}/>
            <input value={form.parentPhone} onChange={e=>setForm(f=>({...f,parentPhone:e.target.value}))} placeholder="Phone" style={{...inputStyle}}/>
          </div>
        </div>
        {form.dob&&<div style={{background:T.greenLight,borderRadius:8,padding:10,marginBottom:10,fontSize:12,fontWeight:600,color:T.green}}>🎂 Age: {calcAge(form.dob)}</div>}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={btn("ghost","md")}>Cancel</button>
          <button onClick={()=>valid&&onSave({...form,age:form.dob?calcAge(form.dob):"",parentId:"p_"+Date.now()})} style={btn("primary","md")} disabled={!valid}>Add Child 👶</button>
        </div>
      </div>
    </div>
  );
}

function AddStaffModal({onClose,onSave}){
  const [form,setForm]=useState({name:"",email:"",room:"Butterfly",role:"d_staff",avatar:"👩‍🏫"});
  const AVATS=["👩‍🏫","👨‍🏫","👩‍💼","👨‍💼","🧑‍🎓","👸","🤴","🦸‍♀️","🦸‍♂️"];
  const valid=form.name.trim()&&form.email.trim();
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.6)",zIndex:10001,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{...card,width:480,maxWidth:"100%",padding:24,maxHeight:"95vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{margin:0,fontWeight:900,fontSize:20}}>👩‍🏫 Add Staff Member</h3>
          <button onClick={onClose} style={{...btn("ghost","sm"),fontSize:16}}>✕</button>
        </div>
        <div style={{fontSize:10,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Pick Avatar</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
          {AVATS.map(a=><button key={a} onClick={()=>setForm(f=>({...f,avatar:a}))} style={{width:42,height:42,borderRadius:10,border:form.avatar===a?`2px solid ${T.primary}`:`1.5px solid ${T.border}`,background:form.avatar===a?T.primaryLight:"#fff",fontSize:24,cursor:"pointer"}}>{a}</button>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Full Name *</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Staff member's name" style={{...inputStyle}}/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Email *</label>
            <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="work@email.com" style={{...inputStyle}}/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Role</label>
            <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} style={{...selectStyle}}>
              <option value="d_staff">Teacher / Staff</option>
              <option value="d_admin">Director / Admin</option>
            </select>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Assigned Room</label>
            <select value={form.room} onChange={e=>setForm(f=>({...f,room:e.target.value}))} style={{...selectStyle}}>
              {ROOMS.map(r=><option key={r.id} value={r.name}>{r.icon} {r.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{background:T.yellowLight,borderRadius:8,padding:10,marginBottom:14,fontSize:11,lineHeight:1.5,borderLeft:`3px solid ${T.yellow}`}}>
          📌 A welcome email with login instructions will be sent automatically. Temporary password: <strong>demo</strong>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={btn("ghost","md")}>Cancel</button>
          <button onClick={()=>valid&&onSave(form)} style={btn("primary","md")} disabled={!valid}>Add Staff 👩‍🏫</button>
        </div>
      </div>
    </div>
  );
}

function EditChildModal({child,onClose,onSave}){
  const [form,setForm]=useState(child?{name:child.name,room:child.room,allergies:child.allergies,notes:child.notes||"",avatar:child.avatar,dob:child.dob||""}:{});
  if(!child) return null;
  const AVATS=["🌸","🦁","🌈","🚀","🦋","🐱","🐶","🐰","🐼","🦄","⭐","🎨","🍎","🌻","🐢"];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.6)",zIndex:10001,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{...card,width:520,maxWidth:"100%",padding:24,maxHeight:"95vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{margin:0,fontWeight:900,fontSize:20}}>✏️ Edit Child Profile</h3>
          <button onClick={onClose} style={{...btn("ghost","sm"),fontSize:16}}>✕</button>
        </div>
        <div style={{fontSize:10,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Avatar</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
          {AVATS.map(a=><button key={a} onClick={()=>setForm(f=>({...f,avatar:a}))} style={{width:40,height:40,borderRadius:10,border:form.avatar===a?`2px solid ${T.primary}`:`1.5px solid ${T.border}`,background:form.avatar===a?T.primaryLight:"#fff",fontSize:22,cursor:"pointer"}}>{a}</button>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Full Name</label>
            <input value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={{...inputStyle}}/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Room</label>
            <select value={form.room||""} onChange={e=>setForm(f=>({...f,room:e.target.value}))} style={{...selectStyle}}>
              {ROOMS.map(r=><option key={r.id} value={r.name}>{r.icon} {r.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Allergies</label>
            <input value={form.allergies||""} onChange={e=>setForm(f=>({...f,allergies:e.target.value}))} placeholder="None, Peanuts, Dairy..." style={{...inputStyle}}/>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Staff Notes</label>
            <textarea value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any notes for staff..." style={{...textareaStyle,minHeight:60}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={btn("ghost","md")}>Cancel</button>
          <button onClick={()=>onSave(child.id,form)} style={btn("primary","md")}>Save Changes ✓</button>
        </div>
      </div>
    </div>
  );
}

function EditConsentModal({parentId,consent,onClose,onSave}){
  const [form,setForm]=useState({parentName:consent.parentName||"",email:consent.email||"",phone:consent.phone||"",address:consent.address||"",emergencyContact:consent.emergencyContact||"",emergencyPhone:consent.emergencyPhone||"",accountCreation:consent.accountCreation||false,photoSharing:consent.photoSharing||false,dailyReports:consent.dailyReports||false,healthInfo:consent.healthInfo||false,communication:consent.communication||false,signedDate:consent.signedDate||""});
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.6)",zIndex:10001,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{...card,width:560,maxWidth:"100%",padding:24,maxHeight:"95vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{margin:0,fontWeight:900,fontSize:20}}>✏️ Edit Parent Profile</h3>
          <button onClick={onClose} style={{...btn("ghost","sm"),fontSize:16}}>✕</button>
        </div>
        <div style={{fontSize:11,fontWeight:800,color:T.primary,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>👤 Contact Information</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          {[["parentName","Full Name","Jane Smith"],["email","Email","jane@email.com"],["phone","Phone","(555) 123-4567"],["address","Address","123 Main St, City, IL"],["emergencyContact","Emergency Contact","John Smith (husband)"],["emergencyPhone","Emergency Phone","(555) 987-6543"],["signedDate","Date Signed","Apr 1, 2026"]].map(([k,l,ph])=>(
            <div key={k} style={k==="address"||k==="signedDate"?{gridColumn:"1/-1"}:{}}>
              <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>{l}</label>
              <input value={form[k]||""} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} style={{...inputStyle}}/>
            </div>
          ))}
        </div>
        <div style={{fontSize:11,fontWeight:800,color:T.primary,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>🛡️ COPPA Consent Permissions</div>
        <div style={{...card,padding:14,marginBottom:14,background:T.primaryLight}}>
          {[["accountCreation","Account Creation","Required to use the platform","👤"],["photoSharing","Photo Sharing","Receive photos of their child","📸"],["dailyReports","Daily Reports","Receive end-of-day summaries","📋"],["healthInfo","Health Information","Track health and incidents","🩹"],["communication","Communication","Message staff directly","💬"]].map(([k,l,d,ic])=>(
            <div key={k} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
              <span style={{fontSize:20}}>{ic}</span>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{l}</div><div style={{fontSize:11,color:T.muted}}>{d}</div></div>
              <button onClick={()=>setForm(f=>({...f,[k]:!f[k]}))} style={{padding:"6px 14px",borderRadius:20,border:"none",background:form[k]?T.green:T.red,color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",minWidth:70}}>{form[k]?"✓ On":"✗ Off"}</button>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={btn("ghost","md")}>Cancel</button>
          <button onClick={()=>onSave(parentId,form)} style={btn("primary","md")}>Save Profile ✓</button>
        </div>
      </div>
    </div>
  );
}

function PhotoModal({children,onClose,onPost}){
  const [childId,setChildId]=useState(children[0]?.id||"");
  const [caption,setCaption]=useState("");
  const [mode,setMode]=useState("upload");
  const [imageData,setImageData]=useState(null);
  const [emoji,setEmoji]=useState("🎨");
  const [gradient,setGradient]=useState("linear-gradient(135deg,#FFD93D,#FF6B35)");
  const emojiOpts=["🎨","📖","🎵","⛹️","🍱","😴","🧱","🎉","📚","🌳","🐛","🌺"];
  const gradOpts=[{l:"Sunset",v:"linear-gradient(135deg,#FFD93D,#FF6B35)"},{l:"Ocean",v:"linear-gradient(135deg,#4ECDC4,#10B981)"},{l:"Berry",v:"linear-gradient(135deg,#A78BFA,#EF4444)"},{l:"Sky",v:"linear-gradient(135deg,#60A5FA,#A78BFA)"}];
  const handleFile=(e)=>{const f=e.target.files[0];if(!f)return;if(f.size>5*1024*1024){alert("Max 5MB");return;}const r=new FileReader();r.onload=ev=>setImageData(ev.target.result);r.readAsDataURL(f);};
  const valid=caption.trim()&&(mode==="emoji"||imageData);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.6)",zIndex:10001,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{...card,width:520,maxWidth:"100%",padding:24,maxHeight:"95vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{margin:0,fontWeight:900,fontSize:20}}>📸 Post Photo</h3>
          <button onClick={onClose} style={{...btn("ghost","sm"),fontSize:16}}>✕</button>
        </div>
        <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:4,textTransform:"uppercase"}}>Child</label>
        <select value={childId} onChange={e=>setChildId(e.target.value)} style={{...selectStyle,marginBottom:14}}>
          {children.map(c=><option key={c.id} value={c.id}>{c.avatar} {c.name}</option>)}
        </select>
        <div style={{display:"flex",gap:6,marginBottom:14,borderBottom:`2px solid ${T.border}`}}>
          {[{id:"upload",l:"📷 Upload Photo"},{id:"emoji",l:"🎨 Quick Emoji"}].map(t=>(
            <button key={t.id} onClick={()=>setMode(t.id)} style={{padding:"10px 14px",border:"none",background:"transparent",color:mode===t.id?T.primary:T.muted,fontWeight:800,fontSize:13,cursor:"pointer",borderBottom:mode===t.id?`3px solid ${T.primary}`:"3px solid transparent",marginBottom:-2,fontFamily:FONT}}>{t.l}</button>
          ))}
        </div>
        {mode==="upload"?(
          imageData?(
            <div style={{position:"relative",marginBottom:14}}>
              <img src={imageData} alt="Preview" style={{width:"100%",maxHeight:260,objectFit:"cover",borderRadius:12,border:`1px solid ${T.border}`}}/>
              <button onClick={()=>setImageData(null)} style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.6)",color:"#fff",border:"none",width:32,height:32,borderRadius:"50%",fontSize:16,cursor:"pointer"}}>✕</button>
            </div>
          ):(
            <label style={{display:"block",border:`2px dashed ${T.primary}`,borderRadius:14,padding:28,textAlign:"center",cursor:"pointer",background:T.primaryLight,marginBottom:14}}>
              <input type="file" accept="image/*" capture="environment" onChange={handleFile} style={{display:"none"}}/>
              <div style={{fontSize:40,marginBottom:6}}>📷</div>
              <div style={{fontWeight:800,fontSize:15,color:T.primary}}>Tap to take photo or upload</div>
              <div style={{fontSize:11,color:T.muted,marginTop:4}}>JPG, PNG up to 5MB</div>
            </label>
          )
        ):(
          <>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              {emojiOpts.map(e=><button key={e} onClick={()=>setEmoji(e)} style={{width:40,height:40,borderRadius:10,border:emoji===e?`2px solid ${T.primary}`:`1.5px solid ${T.border}`,background:emoji===e?T.primaryLight:"#fff",fontSize:22,cursor:"pointer"}}>{e}</button>)}
            </div>
            <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
              {gradOpts.map(g=><button key={g.l} onClick={()=>setGradient(g.v)} style={{padding:"6px 12px",borderRadius:10,border:gradient===g.v?`2px solid ${T.primary}`:`1.5px solid ${T.border}`,background:g.v,color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer"}}>{g.l}</button>)}
            </div>
            <div style={{background:gradient,borderRadius:12,height:100,display:"flex",alignItems:"center",justifyContent:"center",fontSize:50,marginBottom:14}}>{emoji}</div>
          </>
        )}
        <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:4,textTransform:"uppercase"}}>Caption *</label>
        <textarea value={caption} onChange={e=>setCaption(e.target.value)} placeholder="What's happening?" style={{...textareaStyle,marginBottom:14}}/>
        <div style={{background:T.greenLight,borderRadius:8,padding:10,marginBottom:14,fontSize:11,lineHeight:1.5,borderLeft:`3px solid ${T.green}`}}>🛡️ Only {children.find(c=>c.id===childId)?.name||"child"}'s parent will see this. COPPA-protected.</div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={btn("ghost","md")}>Cancel</button>
          <button onClick={()=>valid&&onPost(childId,caption,mode==="emoji"?emoji:null,mode==="emoji"?gradient:null,mode==="upload"?imageData:null)} style={btn("primary","md")} disabled={!valid}>Post 📸</button>
        </div>
      </div>
    </div>
  );
}

function IncidentModal({children,onClose,onSave}){
  const [form,setForm]=useState({childId:children[0]?.id||"",category:"Boo-Boo",bodyPart:"",what:"",action:"",severity:"Minor"});
  const valid=form.childId&&form.what.trim()&&form.action.trim();
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.6)",zIndex:10001,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{...card,width:500,maxWidth:"100%",padding:24,maxHeight:"95vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{margin:0,fontWeight:900,fontSize:20}}>🩹 Log Incident Report</h3>
          <button onClick={onClose} style={{...btn("ghost","sm"),fontSize:16}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Child *</label>
            <select value={form.childId} onChange={e=>setForm(f=>({...f,childId:e.target.value}))} style={{...selectStyle}}>
              {children.map(c=><option key={c.id} value={c.id}>{c.avatar} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Category</label>
            <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={{...selectStyle}}>
              {["Boo-Boo","Fall","Bite","Scratch","Allergic Reaction","Illness","Behavior Note","Medication","Other"].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Severity</label>
            <select value={form.severity} onChange={e=>setForm(f=>({...f,severity:e.target.value}))} style={{...selectStyle}}>
              {["Minor","Significant","Note","Routine"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Body Part (if applicable)</label>
            <input value={form.bodyPart} onChange={e=>setForm(f=>({...f,bodyPart:e.target.value}))} placeholder="e.g. Right knee" style={{...inputStyle}}/>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>What Happened? *</label>
            <textarea value={form.what} onChange={e=>setForm(f=>({...f,what:e.target.value}))} placeholder="Describe what happened..." style={{...textareaStyle}}/>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Action Taken *</label>
            <textarea value={form.action} onChange={e=>setForm(f=>({...f,action:e.target.value}))} placeholder="What did you do?" style={{...textareaStyle}}/>
          </div>
        </div>
        <div style={{background:T.redLight,borderRadius:8,padding:10,marginBottom:14,fontSize:11,lineHeight:1.5,borderLeft:`3px solid ${T.red}`}}>📬 Parent will be notified immediately after saving.</div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={btn("ghost","md")}>Cancel</button>
          <button onClick={()=>valid&&onSave(form.childId,form.category,form.bodyPart,form.what,form.action,form.severity)} style={btn("danger","md")} disabled={!valid}>Log Report 🩹</button>
        </div>
      </div>
    </div>
  );
}

function ActivityModal({onClose,onSave}){
  const [form,setForm]=useState({title:"",category:"Colors",description:"",duration:"15 min",steps:["","",""]});
  const valid=form.title.trim()&&form.description.trim();
  const updStep=(i,v)=>setForm(f=>({...f,steps:f.steps.map((s,idx)=>idx===i?v:s)}));
  const addStep=()=>setForm(f=>({...f,steps:[...f.steps,""]}));
  const removeStep=(i)=>setForm(f=>({...f,steps:f.steps.filter((_,idx)=>idx!==i)}));
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.6)",zIndex:10001,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{...card,width:520,maxWidth:"100%",padding:24,maxHeight:"95vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{margin:0,fontWeight:900,fontSize:20}}>🎓 New Activity</h3>
          <button onClick={onClose} style={{...btn("ghost","sm"),fontSize:16}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Title *</label>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Color Hunt Adventure" style={{...inputStyle}}/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Category</label>
            <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={{...selectStyle}}>
              {["Colors","Numbers","Shapes","Letters","Animals","Music","Art","Science","Movement"].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Duration</label>
            <select value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} style={{...selectStyle}}>
              {["5 min","10 min","15 min","20 min","30 min","45 min"].map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase"}}>Description *</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="What will kids do?" style={{...textareaStyle}}/>
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase"}}>Steps (kids follow these)</label>
            <button onClick={addStep} style={btn("ghost","sm")}>+ Add Step</button>
          </div>
          {form.steps.map((s,i)=>(
            <div key={i} style={{display:"flex",gap:6,marginBottom:6,alignItems:"center"}}>
              <span style={{width:24,height:24,borderRadius:"50%",background:T.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:T.primary,flexShrink:0}}>{i+1}</span>
              <input value={s} onChange={e=>updStep(i,e.target.value)} placeholder={`Step ${i+1}...`} style={{...inputStyle,flex:1}}/>
              {form.steps.length>1&&<button onClick={()=>removeStep(i)} style={{...btn("danger","sm"),padding:"5px 8px"}}>✕</button>}
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={btn("ghost","md")}>Cancel</button>
          <button onClick={()=>valid&&onSave(form.title,form.category,form.description,form.duration,form.steps.filter(s=>s.trim()))} style={btn("primary","md")} disabled={!valid}>Post Activity 🎓</button>
        </div>
      </div>
    </div>
  );
}

function QuestionModal({onClose,onPush}){
  const [selected,setSelected]=useState(null);
  const [custom,setCustom]=useState("");
  const [customAnswer,setCustomAnswer]=useState("");
  const [tab,setTab]=useState("quick");
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.6)",zIndex:10001,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{...card,width:480,maxWidth:"100%",padding:24,maxHeight:"95vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{margin:0,fontWeight:900,fontSize:20}}>❓ Push Question to Kids</h3>
          <button onClick={onClose} style={{...btn("ghost","sm"),fontSize:16}}>✕</button>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:14,borderBottom:`2px solid ${T.border}`}}>
          {[{id:"quick",l:"⚡ Quick Questions"},{id:"custom",l:"✏️ Custom"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"9px 14px",border:"none",background:"transparent",color:tab===t.id?T.primary:T.muted,fontWeight:800,fontSize:13,cursor:"pointer",borderBottom:tab===t.id?`3px solid ${T.primary}`:"3px solid transparent",marginBottom:-2,fontFamily:FONT}}>{t.l}</button>
          ))}
        </div>
        {tab==="quick"?(
          <div style={{display:"grid",gap:8}}>
            {QUICK_QUESTIONS.map(q=>(
              <button key={q.id} onClick={()=>setSelected(q)} style={{...card,padding:14,border:selected?.id===q.id?`2px solid ${T.primary}`:`1.5px solid ${T.border}`,background:selected?.id===q.id?T.primaryLight:"#fff",cursor:"pointer",fontFamily:FONT,textAlign:"left",display:"flex",gap:12,alignItems:"center"}}>
                <span style={{fontSize:28}}>{q.emoji}</span>
                <div style={{flex:1}}><div style={{fontWeight:800,fontSize:14}}>{q.question}</div><div style={{fontSize:11,color:T.muted}}>Answer: <strong>{q.answer}</strong></div></div>
                {selected?.id===q.id&&<span style={{color:T.primary,fontWeight:900}}>✓</span>}
              </button>
            ))}
          </div>
        ):(
          <div>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:4,textTransform:"uppercase"}}>Your Question</label>
            <input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="e.g. What is 2 + 2?" style={{...inputStyle,marginBottom:10}}/>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:4,textTransform:"uppercase"}}>Answer (shown to teacher only)</label>
            <input value={customAnswer} onChange={e=>setCustomAnswer(e.target.value)} placeholder="e.g. 4" style={{...inputStyle}}/>
          </div>
        )}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
          <button onClick={onClose} style={btn("ghost","md")}>Cancel</button>
          <button onClick={()=>{
            if(tab==="quick"&&selected) onPush(selected);
            else if(tab==="custom"&&custom.trim()) onPush({id:"custom_"+Date.now(),question:custom,answer:customAnswer||"—",emoji:"❓"});
          }} disabled={tab==="quick"?!selected:!custom.trim()} style={btn("primary","md")}>Push to All Kids 📲</button>
        </div>
      </div>
    </div>
  );
}

// Renders the official Stripe Buy Button web component.
// Opens a Stripe-hosted checkout overlay — no redirect, no backend needed.
function StripeBuyButton({planKey, userEmail}){
  const cfg = STRIPE.plans[planKey];
  if(!cfg) return null;

  // Once live + configured → show embedded Buy Button
  if(STRIPE.isReady(planKey)){
    return(
      <div style={{marginTop:8}}>
        {/* stripe-buy-button is a web component loaded via app/index.html script */}
        <stripe-buy-button
          buy-button-id={cfg.buyButtonId}
          publishable-key={STRIPE.publishableKey}
          customer-email={userEmail||undefined}
        />
      </div>
    );
  }

  // Fallback: Payment Link redirect (works without Buy Button IDs)
  if(STRIPE.live && cfg.paymentLink && !cfg.paymentLink.includes("REPLACE_")){
    return(
      <a href={`${cfg.paymentLink}${userEmail?`?prefilled_email=${encodeURIComponent(userEmail)}`:""}`}
        target="_blank" rel="noreferrer"
        style={{...btn("primary","md"),display:"block",textAlign:"center",textDecoration:"none",
          background:PLANS[planKey]?.color,marginTop:8}}>
        💳 Pay ${cfg.price}/mo via Stripe →
      </a>
    );
  }

  return null; // Not configured yet
}

function UpgradeModal({currentPlan,onUpgrade,onClose,userEmail=""}){
  const [selected, setSelected] = useState(currentPlan==="basic"?"plus":"premium");
  const isLive = STRIPE.live;

  const handleDemoUpgrade = ()=>{ onUpgrade(selected); };

  const TRUST = ["🔒 256-bit SSL encryption","💳 Visa, Mastercard, Amex","🔄 Cancel anytime","📧 Receipt sent instantly","🛡 PCI DSS compliant"];

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.65)",zIndex:10001,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{...card,width:620,maxWidth:"100%",padding:28,maxHeight:"95vh",overflowY:"auto"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <h3 style={{margin:0,fontWeight:900,fontSize:20}}>🚀 Upgrade Your Plan</h3>
          <button onClick={onClose} style={{...btn("ghost","sm"),fontSize:18,lineHeight:1}}>✕</button>
        </div>

        {/* Live / Demo status bar */}
        <div style={{marginBottom:18,padding:"8px 12px",borderRadius:8,
          background:isLive?T.greenLight:T.yellowLight,
          border:`1px solid ${isLive?T.green+"44":T.yellow+"44"}`}}>
          {isLive
            ? <span style={{fontSize:12,fontWeight:700,color:T.green}}>🟢 LIVE — Real payment via Stripe. You will be charged.</span>
            : <span style={{fontSize:12,fontWeight:700,color:"#92400E"}}>🟡 DEMO MODE — No real charge. To enable payments: set <code style={{background:"#FDE68A",padding:"1px 4px",borderRadius:3}}>STRIPE.live = true</code> and fill in your Stripe IDs.</span>}
        </div>

        {/* Plan cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:20}}>
          {Object.entries(PLANS).map(([key,plan])=>{
            const isCurrent = key===currentPlan;
            const isSel = key===selected;
            return(
              <div key={key} onClick={()=>!isCurrent&&setSelected(key)}
                style={{...card,padding:16,cursor:isCurrent?"default":"pointer",
                  border:isSel?`2px solid ${plan.color}`:isCurrent?`2px solid ${T.border}`:`1.5px solid ${T.border}`,
                  background:isCurrent?"#F9FAFB":isSel?plan.color+"0F":"#fff",
                  borderTop:`4px solid ${isCurrent?T.border:plan.color}`,
                  opacity:isCurrent?0.6:1,position:"relative",transition:"all .15s"}}>
                {isCurrent&&<div style={{position:"absolute",top:6,right:8,fontSize:10,fontWeight:800,color:T.muted}}>CURRENT</div>}
                {isSel&&!isCurrent&&<div style={{position:"absolute",top:6,right:8,color:plan.color,fontWeight:900,fontSize:14}}>✓</div>}
                <div style={{fontWeight:900,fontSize:14,color:plan.color,marginBottom:2}}>{plan.name}</div>
                <div style={{fontSize:24,fontWeight:900,marginBottom:6}}>${plan.price}<span style={{fontSize:12,color:T.muted,fontWeight:500}}>/mo</span></div>
                {plan.features.slice(0,3).map(f=>(
                  <div key={f} style={{fontSize:11,color:T.muted,marginBottom:2,display:"flex",gap:4,alignItems:"flex-start"}}>
                    <span style={{color:T.green,flexShrink:0}}>✓</span>{f}
                  </div>
                ))}
                {isLive&&!isCurrent&&(
                  <div style={{marginTop:8,fontSize:10,color:T.green,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                    <span>💳</span> Stripe secured
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Stripe Buy Button / Demo CTA */}
        {selected!==currentPlan&&(
          <div style={{marginBottom:16}}>
            {isLive ? (
              <StripeBuyButton planKey={selected} userEmail={userEmail}/>
            ):(
              <button onClick={handleDemoUpgrade}
                style={{...btn("primary","lg"),width:"100%",background:PLANS[selected]?.color,fontSize:15,padding:"14px 24px"}}>
                Upgrade to {PLANS[selected]?.name} — ${PLANS[selected]?.price}/mo (Demo) →
              </button>
            )}
          </div>
        )}

        {/* Trust signals — shown in live mode */}
        {isLive&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:"6px 16px",marginBottom:16}}>
            {TRUST.map(s=><span key={s} style={{fontSize:11,color:T.muted,fontWeight:600}}>{s}</span>)}
          </div>
        )}

        {/* Powered by Stripe logo row */}
        {isLive&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px 0",
            borderTop:`1px solid ${T.border}`,marginTop:4}}>
            <span style={{fontSize:11,color:T.muted}}>Payments powered by</span>
            <span style={{fontWeight:900,fontSize:13,color:"#635BFF",letterSpacing:"-0.5px"}}>stripe</span>
          </div>
        )}

        <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
          <button onClick={onClose} style={btn("ghost","md")}>Close</button>
        </div>
      </div>
    </div>
  );
}

function UpgradePrompt({onUpgrade}){
  return(
    <div style={{...card,padding:40,textAlign:"center",maxWidth:480,margin:"40px auto"}}>
      <div style={{fontSize:54,marginBottom:12}}>🎓</div>
      <h2 style={{fontWeight:900,margin:"0 0 8px"}}>Unlock the Classroom Board</h2>
      <p style={{color:T.muted,marginBottom:20}}>Post activities, push live questions, share videos, and track kid progress. Only on Plus & Premium.</p>
      <button onClick={onUpgrade} style={{...btn("primary","lg"),width:"100%"}}>Upgrade to Plus — $79/mo →</button>
    </div>
  );
}

function NotificationsPanel({notifications,onClose,onNavigate}){
  const urgent=notifications.filter(n=>n.urgent&&!n.read);
  const recent=notifications.filter(n=>!n.urgent&&!n.read);
  const read=notifications.filter(n=>n.read);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.5)",zIndex:10001,display:"flex",alignItems:"flex-start",justifyContent:"flex-end",padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{...card,width:400,maxWidth:"100%",maxHeight:"85vh",overflowY:"auto",marginTop:60,marginRight:8}}>
        <div style={{position:"sticky",top:0,background:"#fff",padding:"16px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><h3 style={{margin:0,fontWeight:900,fontSize:17}}>🔔 Notifications</h3><p style={{margin:"2px 0 0",fontSize:11,color:T.muted}}>{notifications.filter(n=>!n.read).length} unread</p></div>
          <button onClick={onClose} style={btn("ghost","sm")}>✕</button>
        </div>
        {notifications.length===0?(
          <div style={{padding:40,textAlign:"center"}}><div style={{fontSize:46,marginBottom:8}}>✨</div><p style={{color:T.muted,fontWeight:600}}>All caught up!</p></div>
        ):(
          <div style={{padding:"8px 12px"}}>
            {urgent.length>0&&<><div style={{fontSize:10,fontWeight:800,color:T.red,textTransform:"uppercase",letterSpacing:1,padding:"10px 4px 4px"}}>🚨 Urgent</div>{urgent.map(n=><NotifItem key={n.id} n={n} onClick={()=>onNavigate(n.goTo)}/>)}</>}
            {recent.length>0&&<><div style={{fontSize:10,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1,padding:"12px 4px 4px"}}>📬 Recent</div>{recent.map(n=><NotifItem key={n.id} n={n} onClick={()=>onNavigate(n.goTo)}/>)}</>}
            {read.length>0&&<><div style={{fontSize:10,fontWeight:800,color:T.muted,textTransform:"uppercase",letterSpacing:1,padding:"12px 4px 4px"}}>✓ Read</div>{read.map(n=><NotifItem key={n.id} n={n} onClick={()=>onNavigate(n.goTo)}/>)}</>}
          </div>
        )}
      </div>
    </div>
  );
}

function NotifItem({n,onClick}){
  return(
    <button onClick={onClick} style={{width:"100%",border:"none",background:n.read?"transparent":T.primaryLight+"50",borderRadius:10,padding:"10px 12px",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start",fontFamily:FONT,textAlign:"left",marginBottom:4}} onMouseEnter={e=>e.currentTarget.style.background=T.primaryLight} onMouseLeave={e=>e.currentTarget.style.background=n.read?"transparent":T.primaryLight+"50"}>
      <div style={{width:34,height:34,borderRadius:10,background:n.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{n.icon}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:1}}>
          <strong style={{fontSize:12,color:n.read?T.muted:T.text}}>{n.title}</strong>
          {!n.read&&<span style={{width:7,height:7,borderRadius:"50%",background:n.color,flexShrink:0}}/>}
        </div>
        <p style={{margin:"0 0 2px",fontSize:11,color:T.muted,lineHeight:1.3}}>{n.message}</p>
        <span style={{fontSize:10,color:T.muted}}>{n.time}</span>
      </div>
      <span style={{color:T.muted,opacity:0.4,fontSize:12}}>→</span>
    </button>
  );
}

function AvatarModal({currentAvatar,onSave,onClose}){
  const [picked,setPicked]=useState(currentAvatar);
  const [uploaded,setUploaded]=useState(null);
  const [tab,setTab]=useState("emoji");
  const KID_EMOJIS=["🌸","🦁","🌈","🚀","🦋","🐱","🐶","🐰","🐼","🦄","⭐","🌟","🎨","🍎","🌻","🐢","🐧","🦊","🐝","🐙"];
  const ADULT_EMOJIS=["👤","👩‍🏫","👨‍🏫","👩‍💼","👨‍💼","🧑‍🎓","👩‍⚕️","🦸‍♀️","🦸‍♂️","🧙","🧚","👸","🤴","🧑‍🍳"];
  const allEmojis=[...KID_EMOJIS,...ADULT_EMOJIS];
  const handleFile=(e)=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{setUploaded(ev.target.result);setPicked(null);};r.readAsDataURL(f);};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.6)",zIndex:10001,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{...card,width:440,maxWidth:"100%",padding:24,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{margin:0,fontWeight:900,fontSize:20}}>🎨 Customize Profile</h3>
          <button onClick={onClose} style={{...btn("ghost","sm"),fontSize:16}}>✕</button>
        </div>
        <div style={{width:80,height:80,borderRadius:24,background:T.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:picked?46:0,margin:"0 auto 14px",overflow:"hidden"}}>
          {uploaded?<img src={uploaded} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:picked}
        </div>
        <div style={{display:"flex",gap:6,marginBottom:14,borderBottom:`2px solid ${T.border}`}}>
          {[{id:"emoji",l:"😊 Pick Emoji"},{id:"photo",l:"📷 Upload Photo"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"9px 12px",border:"none",background:"transparent",color:tab===t.id?T.primary:T.muted,fontWeight:800,fontSize:12,cursor:"pointer",borderBottom:tab===t.id?`3px solid ${T.primary}`:"3px solid transparent",marginBottom:-2,fontFamily:FONT}}>{t.l}</button>
          ))}
        </div>
        {tab==="emoji"?(
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
            {allEmojis.map(e=><button key={e} onClick={()=>{setPicked(e);setUploaded(null);}} style={{width:40,height:40,borderRadius:10,border:picked===e?`2px solid ${T.primary}`:`1.5px solid ${T.border}`,background:picked===e?T.primaryLight:"#fff",fontSize:22,cursor:"pointer"}}>{e}</button>)}
          </div>
        ):(
          <label style={{display:"block",border:`2px dashed ${T.primary}`,borderRadius:14,padding:24,textAlign:"center",cursor:"pointer",background:T.primaryLight,marginBottom:14}}>
            <input type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
            <div style={{fontSize:36,marginBottom:6}}>📷</div>
            <div style={{fontWeight:800,fontSize:14,color:T.primary}}>Upload profile photo</div>
            <div style={{fontSize:11,color:T.muted,marginTop:3}}>JPG or PNG</div>
          </label>
        )}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={btn("ghost","md")}>Cancel</button>
          <button onClick={()=>onSave(uploaded||picked||currentAvatar)} style={btn("primary","md")}>Save ✓</button>
        </div>
      </div>
    </div>
  );
}

function GameModal({game,onAnswer,onNext,onClose,score}){
  if(!game)return null;
  const q=game.questions[game.currentQ];
  const done=game.currentQ+1>=game.questions.length||game.hearts<=0;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.8)",zIndex:10001,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{...card,width:440,maxWidth:"100%",padding:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{display:"flex",gap:4}}>{Array.from({length:3}).map((_,i)=><span key={i} style={{fontSize:20,opacity:i<game.hearts?1:0.25}}>❤️</span>)}</div>
          <span style={{fontWeight:900,color:T.yellow}}>⭐ {score}</span>
          <button onClick={onClose} style={btn("ghost","sm")}>✕</button>
        </div>
        {done?(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:60,marginBottom:12}} className="bouncy">{game.hearts>0?"🎉":"😢"}</div>
            <h2 style={{fontWeight:900,fontSize:24,margin:"0 0 6px"}}>{game.hearts>0?"Awesome!":"Keep Trying!"}</h2>
            <p style={{color:T.muted,fontWeight:600}}>You earned <strong style={{color:T.yellow}}>⭐ {score} XP</strong></p>
            <button onClick={onClose} style={{...btn("primary","lg"),marginTop:14}}>Done! 🎉</button>
          </div>
        ):(
          <>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:60,marginBottom:10}}>{q.visual}</div>
              <h3 style={{fontWeight:900,fontSize:20,margin:0}}>{q.q}</h3>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {q.o.map(opt=>{
                let bg="#fff",borderColor=T.border,color=T.text;
                if(game.showResult&&game.picked===opt){bg=opt===q.a?T.green:T.red;borderColor=bg;color="#fff";}
                else if(game.showResult&&opt===q.a){bg=T.green;borderColor=T.green;color="#fff";}
                return(
                  <button key={opt} onClick={()=>!game.showResult&&onAnswer(opt)} style={{padding:"14px 12px",borderRadius:12,border:`2px solid ${borderColor}`,background:bg,color,fontWeight:800,fontSize:15,cursor:game.showResult?"default":"pointer",fontFamily:FONT,transition:"all 0.2s"}}>{opt}</button>
                );
              })}
            </div>
            {game.showResult&&(
              <div style={{textAlign:"center",marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:800,color:game.picked===q.a?T.green:T.red,marginBottom:8}}>{game.picked===q.a?"🎉 Correct! +10 XP":"😅 Oops! The answer is "+q.a}</div>
                <button onClick={onNext} style={btn("primary","md")}>Next Question →</button>
              </div>
            )}
            <div style={{textAlign:"center",fontSize:11,color:T.muted}}>Question {game.currentQ+1} of {game.questions.length}</div>
          </>
        )}
      </div>
    </div>
  );
}

function VideoModal({video,onClose}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.9)",zIndex:10001,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{...card,width:520,maxWidth:"100%",padding:0,overflow:"hidden"}}>
        <div style={{background:`linear-gradient(135deg,${video.color},${video.color}88)`,height:260,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,position:"relative"}}>
          <div style={{fontSize:80}}>{video.thumb}</div>
          <div style={{fontSize:11,fontWeight:800,color:"#fff",background:"rgba(0,0,0,0.3)",padding:"5px 14px",borderRadius:20}}>▶ Playing Demo Mode</div>
          <button onClick={onClose} style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,0.5)",color:"#fff",border:"none",width:32,height:32,borderRadius:"50%",fontSize:16,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{padding:20}}>
          <h3 style={{margin:"0 0 4px",fontWeight:900,fontSize:17}}>{video.title}</h3>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
            <span style={bdg(T.cyan,T.cyanLight)}>{video.channel}</span>
            <span style={bdg(T.purple,T.purpleLight)}>{video.category}</span>
            <span style={bdg(T.muted,"#F3F4F6")}>⏱️ {video.duration}</span>
          </div>
          <div style={{background:T.primaryLight,borderRadius:8,padding:10,fontSize:12,fontWeight:600,color:T.primary}}>📌 In production, this opens the real YouTube or educational video. Demo shows preview.</div>
        </div>
      </div>
    </div>
  );
}

function PrivacyModal({onClose}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.6)",zIndex:10001,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{...card,width:560,maxWidth:"100%",padding:24,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{margin:0,fontWeight:900,fontSize:20}}>🔒 Privacy Policy</h2>
          <button onClick={onClose} style={{...btn("ghost","sm"),fontSize:16}}>✕</button>
        </div>
        <div style={{fontSize:13,lineHeight:1.7,color:T.muted}}>
          <p><strong style={{color:T.text}}>BrightDays Privacy Policy</strong> — Updated April 2026</p>
          <p><strong>COPPA Compliance:</strong> BrightDays is fully COPPA-compliant. We only collect personal information from children under 13 with verified parental consent.</p>
          <p><strong>What We Collect:</strong> Child profile data (name, age, allergies), attendance records, daily reports, photos (with consent), incident reports, and parent communication.</p>
          <p><strong>How We Use It:</strong> Data is used solely to provide daycare management services. We never sell data. We never use child data for advertising.</p>
          <p><strong>Data Security:</strong> All data is encrypted at rest and in transit. Photos are stored securely and never publicly accessible.</p>
          <p><strong>Your Rights:</strong> Parents can request deletion of all data within 30 days. Contact privacy@brightdays.com.</p>
          <p><strong>Data Retention:</strong> Active data retained while child is enrolled. Deleted within 90 days of disenrollment.</p>
        </div>
        <button onClick={onClose} style={{...btn("primary","lg"),width:"100%",marginTop:14}}>I Understand ✓</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ════════════════════════════════════════════════════════════════════════

function LoginScreen({email,setEmail,pw,setPw,onLogin,err,onShowPrivacy,showPrivacyModal,closePrivacy}){
  const DEMO_ACCOUNTS=[
    {role:"Super Admin",email:"super@brightdays.com",pw:"demo",icon:"🎯",color:T.gold},
    {role:"Director",email:"daycare@demo.com",pw:"demo",icon:"👑",color:T.primary},
    {role:"Staff/Teacher",email:"staff@demo.com",pw:"demo",icon:"👩‍🏫",color:T.green},
    {role:"Parent",email:"parent@demo.com",pw:"demo",icon:"👩",color:T.cyan},
    {role:"Child",email:"kid@demo.com",pw:"demo",icon:"🌸",color:T.purple},
  ];
  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${T.primaryLight},${T.yellowLight},#fff)`,fontFamily:FONT,display:"flex",flexDirection:"column"}}>
      {showPrivacyModal&&<PrivacyModal onClose={closePrivacy}/>}
      <nav style={{background:"rgba(255,255,255,0.9)",backdropFilter:"blur(8px)",borderBottom:`1px solid ${T.border}`,padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:28}}>🌟</span>
          <div><div style={{fontWeight:900,fontSize:22,color:T.primary}}>BrightDays</div><div style={{fontSize:10,color:T.muted,fontWeight:600}}>Daycare Management Platform</div></div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onShowPrivacy} style={btn("ghost","sm")}>Privacy</button>
          <button onClick={()=>document.getElementById("demo-try")?.scrollIntoView({behavior:"smooth"})} style={btn("primary","sm")}>Try Demo →</button>
        </div>
      </nav>

      <div style={{flex:1,padding:"40px 16px",maxWidth:1000,margin:"0 auto",width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:54,marginBottom:10}} className="bouncy">🌟</div>
          <h1 style={{fontWeight:900,fontSize:40,margin:"0 0 12px",lineHeight:1.2}}>The all-in-one app for<br/><span style={{color:T.primary}}>modern daycares</span></h1>
          <p style={{fontSize:16,color:T.muted,fontWeight:600,maxWidth:500,margin:"0 auto 20px"}}>Photos, daily reports, attendance, billing, compliance, and a kid-friendly classroom — in one platform.</p>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            {["📸 Real-time Photos","📋 Daily Reports","💳 Auto Billing","🛡️ COPPA Compliant","🎓 Kid Classroom","📲 Mobile Ready"].map(f=><span key={f} style={bdg(T.primary,T.primaryLight)}>{f}</span>)}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:24,alignItems:"start"}}>
          <div>
            <div style={{...card,padding:24,marginBottom:16}}>
              <h2 style={{fontWeight:900,fontSize:18,margin:"0 0 16px"}}>🔐 Sign In to BrightDays</h2>
              <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:4,textTransform:"uppercase"}}>Email</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={{...inputStyle,marginBottom:10}} onKeyDown={e=>e.key==="Enter"&&onLogin()}/>
              <label style={{fontSize:11,fontWeight:700,color:T.muted,display:"block",marginBottom:4,textTransform:"uppercase"}}>Password</label>
              <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••" style={{...inputStyle,marginBottom:14}} onKeyDown={e=>e.key==="Enter"&&onLogin()}/>
              {err&&<div style={{color:T.red,fontSize:13,fontWeight:700,marginBottom:10,background:T.redLight,padding:"8px 12px",borderRadius:8}}>{err}</div>}
              <button onClick={onLogin} style={{...btn("primary","lg"),width:"100%"}}>Sign In →</button>
            </div>

            <div id="demo-try" style={{...card,padding:20}}>
              <h3 style={{margin:"0 0 4px",fontWeight:900,fontSize:16}}>🚀 Try the Live Demo</h3>
              <p style={{margin:"0 0 14px",fontSize:12,color:T.muted}}>Click any role to auto-fill login credentials</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>
                {DEMO_ACCOUNTS.map(a=>(
                  <button key={a.role} onClick={()=>{setEmail(a.email);setPw(a.pw);}} style={{padding:"12px 8px",border:`2px solid ${a.color}`,background:email===a.email?a.color:"#fff",color:email===a.email?"#fff":a.color,borderRadius:12,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:FONT,display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"all 0.15s"}}>
                    <span style={{fontSize:22}}>{a.icon}</span>{a.role}
                  </button>
                ))}
              </div>
              {email&&<button onClick={onLogin} style={{...btn("primary","lg"),width:"100%",marginTop:12}}>Sign In as {DEMO_ACCOUNTS.find(a=>a.email===email)?.role||"User"} →</button>}
            </div>
          </div>

          <div>
            <div style={{...card,padding:20,marginBottom:12}}>
              <h3 style={{margin:"0 0 14px",fontWeight:900,fontSize:15}}>💎 Pricing</h3>
              {Object.entries(PLANS).map(([key,plan])=>(
                <div key={key} style={{padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{fontWeight:800,color:plan.color}}>{plan.name}</span>
                    <span style={{fontWeight:900}}>${plan.price}<span style={{fontSize:11,color:T.muted,fontWeight:400}}>/mo</span></span>
                  </div>
                  <div style={{fontSize:11,color:T.muted}}>{plan.features.slice(0,2).join(" · ")}</div>
                </div>
              ))}
            </div>
            <div style={{...card,padding:20,background:`linear-gradient(135deg,${T.primaryLight},${T.yellowLight})`,border:`2px solid ${T.primary}`}}>
              <h3 style={{margin:"0 0 6px",fontWeight:900,fontSize:15,color:T.primary}}>🌟 Founding Member</h3>
              <p style={{margin:"0 0 10px",fontSize:12,color:T.text}}>First 20 daycares get <strong>50% off forever</strong> + 6 months free</p>
              <button onClick={()=>document.getElementById("demo-try")?.scrollIntoView({behavior:"smooth"})} style={{...btn("primary","md"),width:"100%"}}>Claim Your Spot →</button>
            </div>
          </div>
        </div>
      </div>
      <footer style={{padding:"14px 20px",textAlign:"center",fontSize:11,color:T.muted,borderTop:`1px solid ${T.border}`,background:"#fff"}}>
        © 2026 BrightDays · <button onClick={onShowPrivacy} style={{background:"none",border:"none",color:T.primary,cursor:"pointer",fontSize:11,fontWeight:700}}>Privacy</button> · COPPA-compliant · Built with ❤️
      </footer>
    </div>
  );
}

// PlanView removed — functionality covered by UpgradeModal
