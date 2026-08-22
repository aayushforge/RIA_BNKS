/* ==========================================================================
   HISAB — main.js
   Shared behaviour for every page: theme toggle, language toggle,
   mobile nav, toast notifications, session-aware header, auto-logout timer.
   ========================================================================== */

const Hisab = (() => {
  const THEME_KEY = 'hisab_theme';
  const LANG_KEY = 'hisab_lang';
  const SESSION_KEY = 'hisab_session';
  const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes auto-logout

  /* ---------------- Theme ---------------- */
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    document.querySelectorAll('[data-action="toggle-theme"]').forEach(btn => {
      btn.addEventListener('click', toggleTheme);
    });
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
  }

  /* ---------------- Language (English / Nepali) ---------------- */
  const DICTIONARY = {
    en: {
      /* Shared header / footer */
      nav_about: 'About', nav_features: 'Features', nav_contact: 'Contact',
      get_started: 'Get Started', login: 'Log In', create_account: 'Create Account',
      footer_tagline: 'Smart finance for people and green businesses — no credit score required.',
      footer_product: 'Product', footer_company: 'Company', footer_legal: 'Legal',
      footer_features: 'Features', footer_get_started: 'Get Started', footer_login: 'Log In',
      footer_about_us: 'About Us', footer_contact: 'Contact', footer_team: 'Team',
      footer_privacy: 'Privacy Policy', footer_terms: 'Terms of Service', footer_gdpr: 'GDPR & Data Rights',
      footer_copyright: '© 2026 HISAB. All rights reserved.', footer_hackathon: 'Built for the Green Fintech Hackathon 🌱',

      /* index.html hero */
      hero_badge: 'No Credit Score Required',
      hero_title_1: 'Hisab — Your Smart', hero_title_accent: 'Finance', hero_title_2: 'Companion',
      hero_tagline: 'Empowering Green Business & Personal Finance — track spending, grow savings, and finance eco-friendly equipment without a credit score.',
      cta_start: 'Get Started Free',
      cta_demo: 'See How It Works',
      stat1_label: 'Users Empowered', stat2_label: 'Green Loans Disbursed', stat3_label: 'Repayment Success',
      visual_card1_title: 'Solar Panel Loan', visual_card1_desc: 'NRs 85,000 · Approved',
      visual_card2_title: 'Monthly Savings Goal', visual_card2_desc: '72% completed',
      visual_card3_title: 'Personal Budget', visual_card3_desc: 'On track this month',
      chip_savings: '+18% Savings', chip_privacy: 'Privacy-First',

      /* index.html features */
      features_eyebrow: 'Key Differentiators', features_title: 'Everything You Need, Green by Design',
      features_subtitle: 'A single platform that manages your money and grows your impact — personal or business.',
      feat1_title: 'Personal Finance Tracking', feat1_desc: 'Track income, expenses and savings goals with visual, easy-to-read dashboards.',
      feat2_title: 'Business Management', feat2_desc: 'Profit & loss, budgets, invoicing and inventory — all in one business dashboard.',
      feat3_title: 'Green Equipment Loans', feat3_desc: 'Finance solar panels, efficient machinery and eco-equipment with flexible terms.',
      feat3_badge: 'No Credit Score',
      feat4_title: 'Microfinance Solutions', feat4_desc: 'Small, accessible loans designed for individuals and micro-entrepreneurs.',
      feat5_title: 'No Credit Score Required', feat5_desc: 'We evaluate transaction history and repayment behaviour, not legacy credit bureaus.',
      feat6_title: 'AI-Powered Insights', feat6_desc: 'Smart categorization, anomaly detection and personalized financial tips.',

      /* index.html about summary */
      idx_about_eyebrow: 'Our Mission', idx_about_title: 'Financial Inclusion, Powered by Sustainability',
      idx_about_body: 'HISAB was built to close two gaps at once: access to fair financing for people credit bureaus overlook, and access to capital for small businesses ready to go green. We combine transparent personal finance tools with microfinance-backed green equipment loans — no paperwork mountains, no credit score gatekeeping.',
      idx_about_cta: 'Read Our Full Story',
      idx_stat1: 'Small Businesses Financed', idx_stat2: 'CO₂ Emissions Avoided', idx_stat3: 'Districts Reached', idx_stat4: 'Average User Rating',

      /* index.html contact */
      contact_eyebrow: 'Get in touch', contact_title: 'Ready to take control of your finances?',
      contact_body: 'Join thousands of individuals and green businesses already managing money smarter with HISAB.',
      contact_cta1: 'Create Free Account',

      /* about.html */
      abt_hero_badge: 'Our Story', abt_hero_title: 'Built for the People Traditional Finance Overlooks',
      abt_hero_tagline: 'HISAB pairs everyday money management with credit-score-free green financing — so individuals and small businesses can grow without the usual gatekeeping.',
      abt_mission_eyebrow: 'Mission', abt_mission_title: 'Financial inclusion, one ledger at a time',
      abt_mission_body1: 'Hisab (हिसाब) means "account" or "reckoning" in Nepali — a word people already use every day to talk about money. We built a platform around that everyday habit, then extended it with something most personal finance apps never touch: fair access to financing for green equipment, evaluated on real transaction and repayment behaviour instead of a credit bureau score.',
      abt_mission_body2: 'Our dual-mode dashboard means one account can serve a person tracking their salary and groceries, or a small business tracking payroll, inventory and a solar-panel loan — without forcing either into the wrong tool.',
      abt_green_eyebrow: 'Why Green Business', abt_green_title: "Sustainability shouldn't require capital you don't have",
      abt_green_body: "Small businesses want to switch to efficient, low-emission equipment, but upfront cost and lack of credit history routinely lock them out of traditional loans. HISAB's microfinance-backed Green Equipment Loans close that gap — with transparent daily, bi-weekly or monthly repayment schedules built for real cash flow.",
      abt_stat1: 'Users Empowered', abt_stat2: 'Green Loans Disbursed', abt_stat3: 'CO₂ Emissions Avoided', abt_stat4: 'Repayment Success Rate',
      abt_hackathon_eyebrow: 'Hackathon Context', abt_hackathon_title: 'Built for the Green Fintech Hackathon 2026',
      abt_hackathon_body: 'HISAB started as a hackathon prototype tackling two judging themes at once: financial technology innovation and environmental impact — designed, built and pitched by a small, focused team.',
      abt_role1: 'Team Lead', abt_role1_desc: 'Product & Architecture',
      abt_role2: 'Frontend Engineer', abt_role2_desc: 'UI/UX & Accessibility',
      abt_role3: 'Backend Engineer', abt_role3_desc: 'API & Security',
      abt_role4: 'Data & AI', abt_role4_desc: 'Insights & Analytics',
      abt_values_eyebrow: 'Our Values', abt_values_title: 'What guides every feature we ship',
      abt_val1_title: 'Privacy-First', abt_val1_desc: 'End-to-end encrypted financial data, GDPR-aligned consent, and role-based access on every account.',
      abt_val2_title: 'Fair Access', abt_val2_desc: 'No credit score required — loan eligibility is based on real transaction and repayment history.',
      abt_val3_title: 'Sustainability', abt_val3_desc: 'Every green loan we finance is a small step toward lower emissions and more resilient small businesses.',

      /* login.html */
      login_visual_badge: 'Welcome Back', login_visual_title: 'Pick up right where your money left off.',
      login_visual_body: 'Log in to review your budget, track green equipment loans, and stay ahead of every repayment date.',
      login_li1: 'End-to-end encrypted financial data', login_li2: 'Loan & bill reminders with alarms', login_li3: 'AI-powered spending insights',
      login_heading: 'Log In', login_subtitle: 'Enter your credentials to access your dashboard.',
      field_email: 'Email Address', field_password: 'Password', field_confirm_password: 'Confirm Password',
      remember_me: 'Remember me', forgot_password: 'Forgot Password?',
      login_button: 'Log In', divider_or: 'or continue with', google_continue: 'Continue with Google',
      login_switch: "Don't have an account?", login_switch_link: 'Register here',

      /* register.html */
      reg_visual_badge: 'Join HISAB', reg_visual_title: 'Two account types. One smarter way to manage money.',
      reg_visual_body: 'Choose Personal to track everyday finances, or Business to unlock green equipment financing, invoicing and payroll tools.',
      reg_li1: 'Email OTP-verified accounts', reg_li2: 'No-credit-score green loans (Business)', reg_li3: 'Encrypted, GDPR-aligned data handling',
      reg_heading: 'Create Your Account', reg_subtitle: 'Get started in under a minute.',
      tab_personal: 'Personal', tab_business: 'Business',
      field_first_name: 'First Name', field_last_name: 'Last Name',
      field_business_name: 'Business Name', field_pan: 'PAN Number', field_phone: 'Phone Number',
      field_password_hint: 'Use 8+ characters with a number and a special character.',
      consent_text: 'I agree to the', consent_privacy: 'Privacy Policy', consent_suffix: '& consent to GDPR-aligned data processing.',
      btn_register: 'Register', btn_cancel: 'Cancel',
      reg_switch: 'Already have an account?', reg_switch_link: 'Log in',
      otp_title: 'Verify Your Email', otp_body: 'Enter the 4-digit code sent to',
      otp_resend_label: 'Resend code in', otp_resend_btn: 'Resend OTP', otp_verify_btn: 'Verify & Create Account',

      /* Dashboards — shared chrome */
      sidebar_personal: 'Personal', sidebar_business: 'Business',
      nav_overview: 'Overview', nav_transactions: 'Transactions', nav_loans: 'Loans',
      nav_savings: 'Savings Goals', nav_calendar: 'Calendar', nav_reports: 'Reports', nav_insights: 'AI Insights',
      nav_green_loans: 'Green Loans', nav_budget: 'Budget Breakdown', nav_repayments: 'Repayments', nav_tools: 'Business Tools',
      logout: 'Log Out', add_income: 'Add Income', add_expense: 'Add Expense',
      pd_subtitle: "Here's where your money stands today.",
      bd_subtitle: 'Manage your business finances & green investments.',
      stat_income: 'Monthly Income', stat_expense: 'Monthly Expenditure', stat_savings: 'Net Savings', stat_loans: 'Active Loans',
      bd_stat_income: 'Total Business Income', bd_stat_expense: 'Operating Expenses',
      bd_stat_profit: 'Net Profit Margin', bd_stat_savings: 'Business Savings',
      panel_expense_breakdown: 'Expense Breakdown', panel_period: 'This period', panel_recent_tx: 'Recent Transactions', panel_view_all: 'View all',
      panel_loan_mgmt: 'Loan Management', btn_add_loan: 'Add Loan',
      panel_savings_goals: 'Savings Goals', btn_new_goal: 'New Goal',
      panel_calendar: 'Loan & Bill Calendar', panel_reports: 'Reports', panel_ai_tips: 'AI-Powered Financial Tips',
      reports_body: 'Export your transaction history for the month or year.',
      btn_export_csv: 'Export CSV', btn_export_pdf: 'Export PDF',
      panel_green_loans: 'Green Equipment Loans', btn_apply: 'Apply', btn_apply_green: 'Apply for Green Loan',
      panel_pl_trend: 'Profit & Loss Trend', panel_recent_activity: 'Recent activity',
      panel_budget_breakdown: 'Budget Breakdown', panel_repay_calendar: 'Repayment Calendar',
      record_repayment: 'Record a repayment', btn_pay: 'Pay',
      panel_financial_reports: 'Financial Reports', reports_body_biz: 'P&L statements, cash flow & green impact — export anytime.',
      co2_avoided: 'Est. CO₂ avoided (kg/yr)', projected_revenue: 'Projected next-month revenue',
      panel_ai_business: 'AI Business Insights', panel_business_tools: 'Business Tools', tools_badge: 'Phase 2 & 3 Roadmap',
      tool_inventory: 'Inventory Management', tool_inventory_desc: 'Track stock levels & reorder points.',
      tool_invoice: 'Invoice Generation', tool_invoice_desc: 'Create & send client invoices.',
      tool_tax: 'Nepal Tax Calculator', tool_tax_desc: 'Estimate GST & income tax.',
      tool_employee: 'Employee Management', tool_employee_desc: 'Payroll & staff records.'
    },
    ne: {
      /* Shared header / footer */
      nav_about: 'हाम्रोबारे', nav_features: 'विशेषताहरू', nav_contact: 'सम्पर्क',
      get_started: 'सुरु गर्नुहोस्', login: 'लगइन', create_account: 'खाता खोल्नुहोस्',
      footer_tagline: 'व्यक्ति र हरित व्यवसायका लागि स्मार्ट फाइनान्स — कुनै क्रेडिट स्कोर आवश्यक छैन।',
      footer_product: 'उत्पादन', footer_company: 'कम्पनी', footer_legal: 'कानूनी',
      footer_features: 'विशेषताहरू', footer_get_started: 'सुरु गर्नुहोस्', footer_login: 'लगइन',
      footer_about_us: 'हाम्रोबारे', footer_contact: 'सम्पर्क', footer_team: 'टिम',
      footer_privacy: 'गोपनीयता नीति', footer_terms: 'सेवाका सर्तहरू', footer_gdpr: 'GDPR र डेटा अधिकार',
      footer_copyright: '© २०२६ हिसाब। सर्वाधिकार सुरक्षित।', footer_hackathon: 'ग्रीन फिनटेक ह्याकाथनका लागि निर्मित 🌱',

      /* index.html hero */
      hero_badge: 'क्रेडिट स्कोर आवश्यक छैन',
      hero_title_1: 'हिसाब — तपाईंको स्मार्ट', hero_title_accent: 'फाइनान्स', hero_title_2: 'साथी',
      hero_tagline: 'हरित व्यवसाय र व्यक्तिगत फाइनान्सलाई सशक्त बनाउँदै — खर्च ट्र्याक गर्नुहोस्, बचत बढाउनुहोस्, र क्रेडिट स्कोर बिना इको-फ्रेन्डली उपकरण वित्तपोषण गर्नुहोस्।',
      cta_start: 'नि:शुल्क सुरु गर्नुहोस्',
      cta_demo: 'यो कसरी काम गर्छ हेर्नुहोस्',
      stat1_label: 'सशक्त प्रयोगकर्ताहरू', stat2_label: 'वितरण भएको हरित ऋण', stat3_label: 'भुक्तानी सफलता',
      visual_card1_title: 'सोलार प्यानल ऋण', visual_card1_desc: 'रु ८५,०००  · स्वीकृत',
      visual_card2_title: 'मासिक बचत लक्ष्य', visual_card2_desc: '७२% पूरा भयो',
      visual_card3_title: 'व्यक्तिगत बजेट', visual_card3_desc: 'यो महिना ट्र्याकमा छ',
      chip_savings: '+१८% बचत', chip_privacy: 'गोपनीयता-प्राथमिकता',

      /* index.html features */
      features_eyebrow: 'मुख्य विशेषताहरू', features_title: 'तपाईंलाई चाहिने सबै, हरित डिजाइनमा',
      features_subtitle: 'एउटै प्लेटफर्मले तपाईंको पैसा व्यवस्थापन गर्छ र प्रभाव बढाउँछ — व्यक्तिगत वा व्यवसाय।',
      feat1_title: 'व्यक्तिगत फाइनान्स ट्र्याकिङ', feat1_desc: 'भिजुअल, सजिलै-पढ्न मिल्ने ड्यासबोर्डसँग आम्दानी, खर्च र बचत लक्ष्यहरू ट्र्याक गर्नुहोस्।',
      feat2_title: 'व्यवसाय व्यवस्थापन', feat2_desc: 'नाफा र नोक्सान, बजेट, बिलिङ र इन्भेन्टरी — सबै एउटै व्यवसाय ड्यासबोर्डमा।',
      feat3_title: 'हरित उपकरण ऋण', feat3_desc: 'लचिलो सर्तमा सोलार प्यानल, दक्ष मेसिनरी र इको-उपकरण वित्तपोषण गर्नुहोस्।',
      feat3_badge: 'क्रेडिट स्कोर छैन',
      feat4_title: 'माइक्रोफाइनान्स समाधान', feat4_desc: 'व्यक्ति र साना उद्यमीहरूका लागि सजिलो पहुँचयोग्य साना ऋणहरू।',
      feat5_title: 'क्रेडिट स्कोर आवश्यक छैन', feat5_desc: 'हामी पुरानो क्रेडिट ब्युरो होइन, कारोबार इतिहास र भुक्तानी व्यवहारको मूल्याङ्कन गर्छौं।',
      feat6_title: 'AI-संचालित अन्तर्दृष्टि', feat6_desc: 'स्मार्ट वर्गीकरण, विसंगति पत्ता लगाउने र व्यक्तिगत वित्तीय सुझावहरू।',

      /* index.html about summary */
      idx_about_eyebrow: 'हाम्रो लक्ष्य', idx_about_title: 'दिगोपनाद्वारा सञ्चालित वित्तीय समावेशीकरण',
      idx_about_body: 'हिसाब एकैचोटि दुई खाडल पुर्न बनाइएको हो: क्रेडिट ब्युरोले बेवास्ता गरेका मानिसहरूका लागि उचित वित्तपोषणमा पहुँच, र हरित बन्न तयार साना व्यवसायहरूका लागि पूँजीमा पहुँच। हामी पारदर्शी व्यक्तिगत फाइनान्स उपकरणहरूलाई माइक्रोफाइनान्स-समर्थित हरित उपकरण ऋणहरूसँग जोड्छौं — कागजातको पहाड छैन, क्रेडिट स्कोर बाधा छैन।',
      idx_about_cta: 'हाम्रो पूरा कथा पढ्नुहोस्',
      idx_stat1: 'वित्तपोषित साना व्यवसायहरू', idx_stat2: 'बचत भएको CO₂ उत्सर्जन', idx_stat3: 'पुगेका जिल्लाहरू', idx_stat4: 'औसत प्रयोगकर्ता रेटिङ',

      /* index.html contact */
      contact_eyebrow: 'सम्पर्कमा रहनुहोस्', contact_title: 'तपाईंको फाइनान्स नियन्त्रण गर्न तयार हुनुहुन्छ?',
      contact_body: 'हजारौं व्यक्ति र हरित व्यवसायहरूसँग सामेल हुनुहोस् जसले पहिले नै HISAB सँग स्मार्ट रूपमा पैसा व्यवस्थापन गरिरहेका छन्।',
      contact_cta1: 'नि:शुल्क खाता खोल्नुहोस्',

      /* about.html */
      abt_hero_badge: 'हाम्रो कथा', abt_hero_title: 'परम्परागत फाइनान्सले बेवास्ता गरेका मानिसहरूका लागि निर्मित',
      abt_hero_tagline: 'हिसाबले दैनिक पैसा व्यवस्थापनलाई क्रेडिट-स्कोर-रहित हरित वित्तपोषणसँग जोड्छ — ताकि व्यक्ति र साना व्यवसायहरू सामान्य बाधा बिना बढ्न सक्छन्।',
      abt_mission_eyebrow: 'लक्ष्य', abt_mission_title: 'एक पटकमा एउटा खाता, वित्तीय समावेशीकरण',
      abt_mission_body1: 'हिसाब भन्नाले नेपालीमा "खाता" वा "लेखा" भन्ने बुझिन्छ — यो शब्द मानिसहरूले दैनिक पैसाको कुरा गर्दा प्रयोग गर्छन्। हामीले त्यही दैनिक बानीको वरिपरि एउटा प्लेटफर्म बनायौं, त्यसपछि यसलाई धेरैजसो व्यक्तिगत फाइनान्स एपहरूले नछोएको कुरासँग विस्तार गर्यौं: क्रेडिट ब्युरो स्कोरको सट्टा वास्तविक कारोबार र भुक्तानी व्यवहारमा मूल्याङ्कन गरिएको हरित उपकरणको लागि उचित वित्तपोषण पहुँच।',
      abt_mission_body2: 'हाम्रो दोहोरो-मोड ड्यासबोर्डको अर्थ हो कि एउटै खाताले तलब र किराना ट्र्याक गर्ने व्यक्ति, वा पेरोल, इन्भेन्टरी र सोलार-प्यानल ऋण ट्र्याक गर्ने साना व्यवसायलाई सेवा दिन सक्छ — कुनैलाई पनि गलत उपकरणमा जबरजस्ती नगरी।',
      abt_green_eyebrow: 'किन हरित व्यवसाय', abt_green_title: 'दिगोपनलाई तपाईंसँग नभएको पूँजी आवश्यक पर्नु हुँदैन',
      abt_green_body: 'साना व्यवसायहरू दक्ष, न्यून-उत्सर्जन उपकरणमा स्विच गर्न चाहन्छन्, तर अग्रिम लागत र क्रेडिट इतिहासको अभावले नियमित रूपमा उनीहरूलाई परम्परागत ऋणबाट बन्चित गर्छ। हिसाबको माइक्रोफाइनान्स-समर्थित हरित उपकरण ऋणहरूले त्यो खाडल पुर्छ — वास्तविक नगद प्रवाहका लागि बनाइएको पारदर्शी दैनिक, द्वि-साप्ताहिक वा मासिक भुक्तानी तालिकासहित।',
      abt_stat1: 'सशक्त प्रयोगकर्ताहरू', abt_stat2: 'वितरण भएको हरित ऋण', abt_stat3: 'बचत भएको CO₂ उत्सर्जन', abt_stat4: 'भुक्तानी सफलता दर',
      abt_hackathon_eyebrow: 'ह्याकाथन सन्दर्भ', abt_hackathon_title: 'ग्रीन फिनटेक ह्याकाथन २०२६ का लागि निर्मित',
      abt_hackathon_body: 'हिसाब एकैचोटि दुई न्याय विषयवस्तुलाई सम्बोधन गर्ने ह्याकाथन प्रोटोटाइपको रूपमा सुरु भयो: वित्तीय प्रविधि नवप्रवर्तन र वातावरणीय प्रभाव — एउटा सानो, केन्द्रित टिमद्वारा डिजाइन, निर्माण र प्रस्तुत गरिएको।',
      abt_role1: 'टिम लिड', abt_role1_desc: 'उत्पादन र वास्तुकला',
      abt_role2: 'फ्रन्टइन्ड इन्जिनियर', abt_role2_desc: 'UI/UX र पहुँच',
      abt_role3: 'ब्याकइन्ड इन्जिनियर', abt_role3_desc: 'API र सुरक्षा',
      abt_role4: 'डेटा र AI', abt_role4_desc: 'अन्तर्दृष्टि र विश्लेषण',
      abt_values_eyebrow: 'हाम्रा मूल्यहरू', abt_values_title: 'हामीले पठाउने प्रत्येक विशेषतालाई मार्गदर्शन गर्ने कुरा',
      abt_val1_title: 'गोपनीयता-प्राथमिकता', abt_val1_desc: 'प्रत्येक खातामा एन्ड-टु-एन्ड इन्क्रिप्टेड वित्तीय डेटा, GDPR-अनुरूप सहमति, र भूमिका-आधारित पहुँच।',
      abt_val2_title: 'उचित पहुँच', abt_val2_desc: 'क्रेडिट स्कोर आवश्यक छैन — ऋण योग्यता वास्तविक कारोबार र भुक्तानी इतिहासमा आधारित छ।',
      abt_val3_title: 'दिगोपन', abt_val3_desc: 'हामीले वित्तपोषण गर्ने प्रत्येक हरित ऋण कम उत्सर्जन र बलियो साना व्यवसायहरूतर्फको एउटा सानो कदम हो।',

      /* login.html */
      login_visual_badge: 'फेरि स्वागत छ', login_visual_title: 'तपाईंको पैसा जहाँ छाडेको थियो त्यहीँबाट सुरु गर्नुहोस्।',
      login_visual_body: 'तपाईंको बजेट समीक्षा गर्न, हरित उपकरण ऋणहरू ट्र्याक गर्न, र हरेक भुक्तानी मिति अगाडि रहन लगइन गर्नुहोस्।',
      login_li1: 'एन्ड-टु-एन्ड इन्क्रिप्टेड वित्तीय डेटा', login_li2: 'अलार्मसहित ऋण र बिल रिमाइन्डर', login_li3: 'AI-संचालित खर्च अन्तर्दृष्टि',
      login_heading: 'लगइन', login_subtitle: 'तपाईंको ड्यासबोर्डमा पहुँच गर्न आफ्नो प्रमाणहरू प्रविष्ट गर्नुहोस्।',
      field_email: 'इमेल ठेगाना', field_password: 'पासवर्ड', field_confirm_password: 'पासवर्ड पुष्टि गर्नुहोस्',
      remember_me: 'मलाई सम्झनुहोस्', forgot_password: 'पासवर्ड बिर्सनुभयो?',
      login_button: 'लगइन', divider_or: 'वा जारी राख्नुहोस्', google_continue: 'Google सँग जारी राख्नुहोस्',
      login_switch: 'खाता छैन?', login_switch_link: 'यहाँ दर्ता गर्नुहोस्',

      /* register.html */
      reg_visual_badge: 'हिसाबमा सामेल हुनुहोस्', reg_visual_title: 'दुई खाता प्रकार। पैसा व्यवस्थापन गर्ने एउटा स्मार्ट तरिका।',
      reg_visual_body: 'दैनिक फाइनान्स ट्र्याक गर्न व्यक्तिगत छान्नुहोस्, वा हरित उपकरण वित्तपोषण, बिलिङ र पेरोल उपकरणहरू अनलक गर्न व्यवसाय छान्नुहोस्।',
      reg_li1: 'इमेल OTP-प्रमाणित खाताहरू', reg_li2: 'क्रेडिट-स्कोर-रहित हरित ऋण (व्यवसाय)', reg_li3: 'इन्क्रिप्टेड, GDPR-अनुरूप डेटा ह्यान्डलिङ',
      reg_heading: 'तपाईंको खाता सिर्जना गर्नुहोस्', reg_subtitle: 'एक मिनेटभित्र सुरु गर्नुहोस्।',
      tab_personal: 'व्यक्तिगत', tab_business: 'व्यवसाय',
      field_first_name: 'पहिलो नाम', field_last_name: 'थर',
      field_business_name: 'व्यवसायको नाम', field_pan: 'PAN नम्बर', field_phone: 'फोन नम्बर',
      field_password_hint: 'नम्बर र विशेष क्यारेक्टरसहित ८+ क्यारेक्टर प्रयोग गर्नुहोस्।',
      consent_text: 'म सहमत छु', consent_privacy: 'गोपनीयता नीति', consent_suffix: 'र GDPR-अनुरूप डेटा प्रशोधनमा सहमति दिन्छु।',
      btn_register: 'दर्ता गर्नुहोस्', btn_cancel: 'रद्द गर्नुहोस्',
      reg_switch: 'पहिले नै खाता छ?', reg_switch_link: 'लगइन गर्नुहोस्',
      otp_title: 'तपाईंको इमेल प्रमाणित गर्नुहोस्', otp_body: 'यसमा पठाइएको ४-अंकको कोड प्रविष्ट गर्नुहोस्',
      otp_resend_label: 'कोड पुन: पठाउनुहोस्', otp_resend_btn: 'OTP पुन: पठाउनुहोस्', otp_verify_btn: 'प्रमाणित गर्नुहोस् र खाता सिर्जना गर्नुहोस्',

      /* Dashboards — shared chrome */
      sidebar_personal: 'व्यक्तिगत', sidebar_business: 'व्यवसाय',
      nav_overview: 'सिंहावलोकन', nav_transactions: 'कारोबारहरू', nav_loans: 'ऋणहरू',
      nav_savings: 'बचत लक्ष्यहरू', nav_calendar: 'पात्रो', nav_reports: 'रिपोर्टहरू', nav_insights: 'AI अन्तर्दृष्टि',
      nav_green_loans: 'हरित ऋणहरू', nav_budget: 'बजेट विवरण', nav_repayments: 'भुक्तानीहरू', nav_tools: 'व्यवसाय उपकरणहरू',
      logout: 'लगआउट', add_income: 'आम्दानी थप्नुहोस्', add_expense: 'खर्च थप्नुहोस्',
      pd_subtitle: 'आज तपाईंको पैसा कहाँ छ यहाँ छ।',
      bd_subtitle: 'तपाईंको व्यवसाय फाइनान्स र हरित लगानी व्यवस्थापन गर्नुहोस्।',
      stat_income: 'मासिक आम्दानी', stat_expense: 'मासिक खर्च', stat_savings: 'खुद बचत', stat_loans: 'सक्रिय ऋणहरू',
      bd_stat_income: 'कुल व्यवसाय आम्दानी', bd_stat_expense: 'सञ्चालन खर्च',
      bd_stat_profit: 'खुद नाफा मार्जिन', bd_stat_savings: 'व्यवसाय बचत',
      panel_expense_breakdown: 'खर्च विवरण', panel_period: 'यो अवधि', panel_recent_tx: 'हालका कारोबारहरू', panel_view_all: 'सबै हेर्नुहोस्',
      panel_loan_mgmt: 'ऋण व्यवस्थापन', btn_add_loan: 'ऋण थप्नुहोस्',
      panel_savings_goals: 'बचत लक्ष्यहरू', btn_new_goal: 'नयाँ लक्ष्य',
      panel_calendar: 'ऋण र बिल पात्रो', panel_reports: 'रिपोर्टहरू', panel_ai_tips: 'AI-संचालित वित्तीय सुझावहरू',
      reports_body: 'महिना वा वर्षको लागि आफ्नो कारोबार इतिहास निर्यात गर्नुहोस्।',
      btn_export_csv: 'CSV निर्यात गर्नुहोस्', btn_export_pdf: 'PDF निर्यात गर्नुहोस्',
      panel_green_loans: 'हरित उपकरण ऋणहरू', btn_apply: 'आवेदन दिनुहोस्', btn_apply_green: 'हरित ऋणको लागि आवेदन दिनुहोस्',
      panel_pl_trend: 'नाफा र नोक्सान प्रवृत्ति', panel_recent_activity: 'हालको गतिविधि',
      panel_budget_breakdown: 'बजेट विवरण', panel_repay_calendar: 'भुक्तानी पात्रो',
      record_repayment: 'भुक्तानी रेकर्ड गर्नुहोस्', btn_pay: 'भुक्तानी गर्नुहोस्',
      panel_financial_reports: 'वित्तीय रिपोर्टहरू', reports_body_biz: 'नाफा-नोक्सान विवरण, नगद प्रवाह र हरित प्रभाव — जुनसुकै बेला निर्यात गर्नुहोस्।',
      co2_avoided: 'अनुमानित CO₂ बचत (kg/वर्ष)', projected_revenue: 'अनुमानित अर्को महिनाको आम्दानी',
      panel_ai_business: 'AI व्यवसाय अन्तर्दृष्टि', panel_business_tools: 'व्यवसाय उपकरणहरू', tools_badge: 'चरण २ र ३ रोडम्याप',
      tool_inventory: 'इन्भेन्टरी व्यवस्थापन', tool_inventory_desc: 'स्टक स्तर र पुन: अर्डर बिन्दुहरू ट्र्याक गर्नुहोस्।',
      tool_invoice: 'बिजक निर्माण', tool_invoice_desc: 'ग्राहक बिजकहरू सिर्जना र पठाउनुहोस्।',
      tool_tax: 'नेपाल कर क्यालकुलेटर', tool_tax_desc: 'GST र आयकर अनुमान गर्नुहोस्।',
      tool_employee: 'कर्मचारी व्यवस्थापन', tool_employee_desc: 'पेरोल र कर्मचारी रेकर्डहरू।'
    }
  };

  function initLanguage() {
    const saved = localStorage.getItem(LANG_KEY) || 'en';
    applyLanguage(saved);
    document.querySelectorAll('[data-lang-option]').forEach(btn => {
      btn.addEventListener('click', () => {
        applyLanguage(btn.getAttribute('data-lang-option'));
        document.querySelectorAll('.lang-menu').forEach(m => m.classList.remove('open'));
      });
    });
    const langToggle = document.querySelector('[data-action="toggle-lang-menu"]');
    if (langToggle) {
      langToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelector('.lang-menu')?.classList.toggle('open');
      });
      document.addEventListener('click', () => {
        document.querySelector('.lang-menu')?.classList.remove('open');
      });
    }
  }

  function applyLanguage(lang) {
    localStorage.setItem(LANG_KEY, lang);
    const dict = DICTIONARY[lang] || DICTIONARY.en;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) el.setAttribute('placeholder', dict[key]);
    });
    document.documentElement.setAttribute('lang', lang);
    const label = document.querySelector('[data-lang-label]');
    if (label) label.textContent = lang === 'ne' ? 'ने' : 'EN';
  }

  /* ---------------- Mobile nav ---------------- */
  function initMobileNav() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.main-nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }

  function initSidebarToggle() {
    const toggle = document.querySelector('[data-action="toggle-sidebar"]');
    const sidebar = document.querySelector('.sidebar');
    if (!toggle || !sidebar) return;
    toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  /* ---------------- Toasts ---------------- */
  function toast(message, type = 'info', duration = 3800) {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
    el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(() => el.remove(), 250);
    }, duration);
  }

  /* ---------------- Session helpers (demo/local, mirrors backend contract) --- */
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  }
  function setSession(data) { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  function requireAuth(expectedType) {
    const session = getSession();
    if (!session || !session.token) {
      window.location.href = 'login.html';
      return null;
    }
    if (expectedType && session.userType !== expectedType) {
      window.location.href = session.userType === 'business' ? 'business-dashboard.html' : 'personal-dashboard.html';
      return null;
    }
    return session;
  }

  function redirectIfAuthenticated() {
    const session = getSession();
    if (session && session.token) {
      window.location.href = session.userType === 'business' ? 'business-dashboard.html' : 'personal-dashboard.html';
    }
  }

  function logout() {
    clearSession();
    window.location.href = 'login.html';
  }

  /* ---------------- Auto-logout on inactivity ---------------- */
  function initInactivityLogout() {
    if (!document.body.hasAttribute('data-protected')) return;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        toast('Session expired due to inactivity. Please log in again.', 'warning');
        setTimeout(logout, 1200);
      }, INACTIVITY_LIMIT_MS);
    };
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt =>
      window.addEventListener(evt, reset, { passive: true })
    );
    reset();
  }

  /* ---------------- Populate header user info if logged in ---------------- */
  function initAuthAwareHeader() {
    const session = getSession();
    const cta = document.querySelector('[data-header-cta]');
    if (session && session.token && cta) {
      cta.textContent = 'Dashboard';
      cta.href = session.userType === 'business' ? 'business-dashboard.html' : 'personal-dashboard.html';
    }
  }

  function currency(amount) {
    const n = Number(amount) || 0;
    return 'NRs ' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function init() {
    initTheme();
    initLanguage();
    initMobileNav();
    initSidebarToggle();
    initAuthAwareHeader();
    initInactivityLogout();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    toast, getSession, setSession, clearSession, requireAuth,
    redirectIfAuthenticated, logout, currency, applyLanguage
  };
})();