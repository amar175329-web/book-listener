import { getDb, ensureDbInitialized } from './db';

let memorySeeded = false;

export async function runSeed() {
  if (memorySeeded) return;
  await ensureDbInitialized();
  const db = getDb();
  
  // Check if books are already seeded with expanded catalog
  const existingCount = await db.prepare('SELECT COUNT(*) as count FROM books').get() as { count: number };
  if (existingCount && existingCount.count >= 11) {
    memorySeeded = true;
    return;
  }

  console.log('[Seed] Seeding curated personal-growth books, summaries, and audio tracks to Turso...');
  const batchStatements: { sql: string; args: any[] }[] = [];

  const bookSql = `
    INSERT OR REPLACE INTO books (
      id, slug, title, author, description, cover_url, published_year,
      themes_json, problem_tags_json, source_flags_json, spotify_query,
      gutenberg_id, standard_ebooks_slug, librivox_identifier, open_library_key,
      google_books_id, metadata_source
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `;

  const summarySql = `
    INSERT OR REPLACE INTO original_summaries (
      id, book_id, title, executive_overview, core_problem_solved,
      key_lessons_json, audio_tts_url, audio_duration_seconds, attribution_notice
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const trackSql = `
    INSERT OR REPLACE INTO audio_tracks (
      id, book_id, track_index, title, duration_seconds, stream_url, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const booksData = [
    {
      id: 'book_meditations',
      slug: 'meditations-marcus-aurelius',
      title: 'Meditations',
      author: 'Marcus Aurelius',
      description: 'Private reflections of Roman Emperor Marcus Aurelius on Stoic philosophy, resilience against emotional turmoil, mental clarity, and duty.',
      coverUrl: 'https://covers.openlibrary.org/b/id/13202688-M.jpg',
      publishedYear: 180,
      themes: ['discipline', 'focus', 'consistency', 'confidence'],
      problemTags: ['distraction', 'overthinking', 'quitting', 'anxiety', 'loss-of-control', 'stress'],
      sourceFlags: { hasSpotify: true, hasGutenberg: true, hasLibriVox: true, hasSummary: true },
      spotifyQuery: 'Meditations Marcus Aurelius',
      gutenbergId: 2680,
      standardEbooksSlug: 'marcus-aurelius/meditations/george-long',
      librivoxIdentifier: 'themeditationsofmarcusaurelius_1801_librivox',
      openLibraryKey: '/works/OL133986W',
      googleBooksId: null,
      metadataSource: 'curated',
      summary: {
        title: 'Stoic Self-Mastery: The Inner Citadel',
        executiveOverview: 'Written as personal journal entries while on military campaign, Meditations is a practical operating system for maintaining unflinching calm and focus amid external chaos.',
        coreProblemSolved: 'Worrying about things outside your control, suffering from social friction, and losing emotional composure.',
        lessons: [
          {
            lessonNumber: 1,
            title: 'The Dichotomy of Control',
            explanation: 'You have power over your mind, not outside events. Realize this, and you will find indestructible strength.',
            practicalAction: 'When feeling overwhelmed, ask yourself: Is this within my direct sphere of control right now? If not, consciously release emotional attachment.'
          },
          {
            lessonNumber: 2,
            title: 'Morning Mental Preparation',
            explanation: 'When you wake up in the morning, tell yourself: the people I deal with today will be meddling, ungrateful, arrogant, dishonest, and jealous. None of them can hurt you because you recognize the nature of the wrongdoer.',
            practicalAction: 'Take 60 seconds every morning to mentally rehearse encountering difficult people without taking offense.'
          },
          {
            lessonNumber: 3,
            title: 'The Present Is All You Ever Have',
            explanation: 'Remember that man lives only in the present, in this fleeting instant; all the rest of his life is either past and gone, or not yet revealed.',
            practicalAction: 'Anchor your attention to the exact physical task in front of you right now rather than ruminating on tomorrow.'
          }
        ]
      },
      tracks: [
        {
          index: 1,
          title: 'Book 1: Debts and Lessons from Mentors',
          duration: 1356,
          url: 'https://archive.org/download/themeditationsofmarcusaurelius_1801_librivox/meditationsofmarcusaurelius_01_aurelius.mp3'
        },
        {
          index: 2,
          title: 'Book 2: On the River Gran, Among the Quadi',
          duration: 720,
          url: 'https://archive.org/download/themeditationsofmarcusaurelius_1801_librivox/meditationsofmarcusaurelius_02_aurelius.mp3'
        },
        {
          index: 3,
          title: 'Book 3: In Carnuntum',
          duration: 884,
          url: 'https://archive.org/download/themeditationsofmarcusaurelius_1801_librivox/meditationsofmarcusaurelius_03_aurelius.mp3'
        }
      ]
    },
    {
      id: 'book_as_a_man_thinketh',
      slug: 'as-a-man-thinketh-james-allen',
      title: 'As A Man Thinketh',
      author: 'James Allen',
      description: 'A foundational self-help classic detailing how your thoughts shape your character, physical health, circumstances, and destiny.',
      coverUrl: 'https://covers.openlibrary.org/b/id/8231856-M.jpg',
      publishedYear: 1903,
      themes: ['habits', 'consistency', 'discipline', 'confidence'],
      problemTags: ['procrastination', 'victim-mindset', 'negativity', 'unfocused-habits', 'lack-of-discipline'],
      sourceFlags: { hasSpotify: true, hasGutenberg: true, hasLibriVox: true, hasSummary: true },
      spotifyQuery: 'As A Man Thinketh James Allen',
      gutenbergId: 4507,
      standardEbooksSlug: null,
      librivoxIdentifier: 'as_a_man_thinketh_librivox',
      openLibraryKey: '/works/OL15858604W',
      googleBooksId: null,
      metadataSource: 'curated',
      summary: {
        title: 'Mastering the Garden of the Mind',
        executiveOverview: 'James Allen shows that mind is the master weaver, both of the inner garment of character and the outer garment of circumstance.',
        coreProblemSolved: 'Feeling like a helpless victim of your environment and harboring undisciplined, reactive thought patterns.',
        lessons: [
          {
            lessonNumber: 1,
            title: 'The Mind as a Fertile Garden',
            explanation: 'A person\'s mind may be likened to a garden, which may be intelligently cultivated or allowed to run wild; but whether cultivated or neglected, it must, and will, bring forth.',
            practicalAction: 'Audit your media diet. Replace 30 minutes of doomscrolling with purposeful reading or silence.'
          },
          {
            lessonNumber: 2,
            title: 'Effect of Thought on Health and Body',
            explanation: 'The body is the servant of the mind. It obeys the operations of the mind, whether they be deliberately chosen or automatically expressed.',
            practicalAction: 'Notice physical tension caused by resentment or anxiety; consciously drop your shoulders and breathe deeply.'
          },
          {
            lessonNumber: 3,
            title: 'Serenity as Power',
            explanation: 'Calmness of mind is one of the beautiful jewels of wisdom. It is the result of long and patient effort in self-control.',
            practicalAction: 'When facing unexpected friction, pause for three breaths before responding.'
          }
        ]
      },
      tracks: [
        {
          index: 1,
          title: 'Chapter 1: Thought and Character',
          duration: 490,
          url: 'https://archive.org/download/as_a_man_thinketh_librivox/as_a_man_thinketh_1_allen.mp3'
        },
        {
          index: 2,
          title: 'Chapter 2: Effect of Thought on Circumstances',
          duration: 940,
          url: 'https://archive.org/download/as_a_man_thinketh_librivox/as_a_man_thinketh_2_allen.mp3'
        }
      ]
    },
    {
      id: 'book_benjamin_franklin',
      slug: 'autobiography-of-benjamin-franklin',
      title: 'The Autobiography of Benjamin Franklin',
      author: 'Benjamin Franklin',
      description: 'The pioneering manual on personal habit tracking, self-education, time-blocking, and moral perfection via structured daily routines.',
      coverUrl: 'https://covers.openlibrary.org/b/id/12833946-M.jpg',
      publishedYear: 1791,
      themes: ['habits', 'consistency', 'discipline', 'learning'],
      problemTags: ['irregularity', 'inconsistency', 'lack-of-routine', 'disorganization', 'time-wasting'],
      sourceFlags: { hasSpotify: true, hasGutenberg: true, hasLibriVox: true, hasSummary: true },
      spotifyQuery: 'Autobiography of Benjamin Franklin',
      gutenbergId: 20203,
      standardEbooksSlug: null,
      librivoxIdentifier: 'franklin_autobiography_librivox',
      openLibraryKey: '/works/OL262758W',
      googleBooksId: null,
      metadataSource: 'curated',
      summary: {
        title: 'The 13-Virtue Habit Tracking System',
        executiveOverview: 'Benjamin Franklin created the first modern habit tracker, charting 13 personal virtues weekly to eliminate friction and foster consistent compounding growth.',
        coreProblemSolved: 'Trying to change everything at once and failing; lack of tracking and measurement in daily habits.',
        lessons: [
          {
            lessonNumber: 1,
            title: 'One Habit at a Time',
            explanation: 'Franklin did not attempt all 13 virtues simultaneously. He focused on one virtue per week, giving it his undivided attention.',
            practicalAction: 'Pick one single habit this week (e.g. drinking 2L of water) before adding any other habit.'
          },
          {
            lessonNumber: 2,
            title: 'The Daily Bookend Routine',
            explanation: 'Franklin started every morning asking "What good shall I do this day?" and ended every evening asking "What good have I done today?".',
            practicalAction: 'Adopt Franklin\'s morning and evening question as a 2-minute daily journaling bookend.'
          }
        ]
      },
      tracks: [
        {
          index: 1,
          title: 'Part 1: Ancestry and Early Life in Boston',
          duration: 1820,
          url: 'https://archive.org/download/franklin_autobiography_librivox/franklin_autobiography_01_franklin.mp3'
        },
        {
          index: 2,
          title: 'Part 2: Arrival in Philadelphia and First Job',
          duration: 1640,
          url: 'https://archive.org/download/franklin_autobiography_librivox/franklin_autobiography_02_franklin.mp3'
        }
      ]
    },
    {
      id: 'book_science_of_getting_rich',
      slug: 'the-science-of-getting-rich-wallace-wattles',
      title: 'The Science of Getting Rich',
      author: 'Wallace D. Wattles',
      description: 'A pragmatic, non-mystical guide to creating economic value through focused thought, efficient action, and gratitude.',
      coverUrl: 'https://covers.openlibrary.org/b/id/11153288-M.jpg',
      publishedYear: 1910,
      themes: ['money', 'focus', 'consistency'],
      problemTags: ['scarcity-mindset', 'debt-fear', 'poverty-paralysis', 'unfocused-work', 'inefficient-effort'],
      sourceFlags: { hasSpotify: true, hasGutenberg: true, hasLibriVox: true, hasSummary: true },
      spotifyQuery: 'Science of Getting Rich Wallace Wattles',
      gutenbergId: 398,
      standardEbooksSlug: null,
      librivoxIdentifier: 'science_getting_rich_librivox',
      openLibraryKey: '/works/OL15848525W',
      googleBooksId: null,
      metadataSource: 'curated',
      summary: {
        title: 'Acting in the Certain Way',
        executiveOverview: 'Wattles argues that getting rich is not a matter of luck, environment, or talent, but of doing things in a "Certain Way" with full intent and daily efficiency.',
        coreProblemSolved: 'Feeling financially paralyzed and working hard without strategic focus or creative output.',
        lessons: [
          {
            lessonNumber: 1,
            title: 'Creative vs. Competitive Mindset',
            explanation: 'You are to create, not to compete for what is already created. You do not have to take anything away from anyone.',
            practicalAction: 'Focus on how much value you give in every interaction rather than how much you can extract.'
          },
          {
            lessonNumber: 2,
            title: 'Efficient Daily Action',
            explanation: 'Every day is either a successful day or a day of failure; and it is the successful days which get you what you want. If every day is a success, you cannot fail.',
            practicalAction: 'Do not attempt tomorrow\'s work today; simply make every single task you do today completely successful.'
          }
        ]
      },
      tracks: [
        {
          index: 1,
          title: 'The Right to Be Rich & There is a Science',
          duration: 860,
          url: 'https://archive.org/download/science_getting_rich_librivox/scienceofgettingrich_01_wattles.mp3'
        },
        {
          index: 2,
          title: 'How Riches Come to You',
          duration: 790,
          url: 'https://archive.org/download/science_getting_rich_librivox/scienceofgettingrich_02_wattles.mp3'
        }
      ]
    },
    {
      id: 'book_atomic_habits',
      slug: 'atomic-habits-james-clear',
      title: 'Atomic Habits',
      author: 'James Clear',
      description: 'An easy and proven way to build good habits and break bad ones using tiny changes that compound into remarkable results.',
      coverUrl: 'https://covers.openlibrary.org/b/id/12843477-M.jpg',
      publishedYear: 2018,
      themes: ['habits', 'consistency', 'discipline'],
      problemTags: ['quitting', 'bad-habits', 'inconsistency', 'lack-of-discipline', 'procrastination', 'motivation-drop'],
      sourceFlags: { hasSpotify: true, hasGutenberg: false, hasLibriVox: false, hasSummary: true },
      spotifyQuery: 'Atomic Habits James Clear',
      gutenbergId: null,
      standardEbooksSlug: null,
      librivoxIdentifier: null,
      openLibraryKey: '/works/OL17930368W',
      googleBooksId: null,
      metadataSource: 'curated',
      summary: {
        title: 'The Four Laws of Behavior Change',
        executiveOverview: 'Atomic Habits proves that massive results do not require massive action. Small 1% improvements daily compound exponentially over time. You do not rise to the level of your goals; you fall to the level of your systems.',
        coreProblemSolved: 'Relying on fleeting willpower, setting ambitious goals without systems, and failing to maintain consistency after the first week.',
        lessons: [
          {
            lessonNumber: 1,
            title: 'Identity-Based Habits',
            explanation: 'True behavior change is identity change. The goal is not to read a book, the goal is to become a reader. The goal is not to run a marathon, the goal is to become a runner.',
            practicalAction: 'Ask yourself: What would a healthy, consistent person do right now? Then cast a small vote for that identity.'
          },
          {
            lessonNumber: 2,
            title: 'The 2-Minute Rule',
            explanation: 'When you start a new habit, it should take less than two minutes to do. Optimize for showing up rather than optimizing for performance.',
            practicalAction: 'Scale your habit down: "Read one page", "Put on running shoes", "Do two push-ups". Master the art of showing up.'
          },
          {
            lessonNumber: 3,
            title: 'Never Miss Twice',
            explanation: 'Missing once is an accident. Missing twice is the start of a new, bad habit. Slips happen, but immediate recovery preserves momentum.',
            practicalAction: 'If you miss a scheduled session, do a reduced 30-second version today so the unbroken streak of intent continues.'
          }
        ]
      },
      tracks: []
    },
    {
      id: 'book_deep_work',
      slug: 'deep-work-cal-newport',
      title: 'Deep Work',
      author: 'Cal Newport',
      description: 'Rules for focused success in a distracted world. The superpower of performing cognitively demanding activities without distraction.',
      coverUrl: 'https://covers.openlibrary.org/b/id/10524458-M.jpg',
      publishedYear: 2016,
      themes: ['focus', 'discipline', 'consistency'],
      problemTags: ['distraction', 'phone-addiction', 'brain-fog', 'social-media', 'multitasking', 'shallow-work'],
      sourceFlags: { hasSpotify: true, hasGutenberg: false, hasLibriVox: false, hasSummary: true },
      spotifyQuery: 'Deep Work Cal Newport',
      gutenbergId: null,
      standardEbooksSlug: null,
      librivoxIdentifier: null,
      openLibraryKey: '/works/OL17358763W',
      googleBooksId: null,
      metadataSource: 'curated',
      summary: {
        title: 'Cultivating Monastic Focus in a Hyper-Distracted Age',
        executiveOverview: 'Deep work is the ability to focus without distraction on a cognitively demanding task. Cal Newport demonstrates that deep work is becoming increasingly rare at the exact time it is becoming increasingly valuable in our economy.',
        coreProblemSolved: 'Constant distraction, context switching between emails/notifications, and inability to concentrate for more than 10 minutes.',
        lessons: [
          {
            lessonNumber: 1,
            title: 'Attention Residue Kills Cognitive Depth',
            explanation: 'When you quickly check your email or phone for just 15 seconds, your attention does not immediately shift back. A residue of your attention remains stuck on the previous task.',
            practicalAction: 'Keep your smartphone in another room during your primary 90-minute morning focus block.'
          },
          {
            lessonNumber: 2,
            title: 'Embrace Boredom',
            explanation: 'If every moment of potential boredom (in an elevator, waiting in line) is relieved with a phone check, your brain is wired for on-demand novelty, destroying deep focus stamina.',
            practicalAction: 'Practice waiting in line or sitting for 5 minutes without pulling out your phone.'
          },
          {
            lessonNumber: 3,
            title: 'Shutdown Ritual',
            explanation: 'At the end of the workday, perform a strict shutdown ritual where all unfinished tasks are cataloged into a trusted system so your mind can fully disconnect.',
            practicalAction: 'Say a physical shutdown phrase (e.g. "Shutdown complete") and close your work laptop until morning.'
          }
        ]
      },
      tracks: []
    },
    {
      id: 'book_epictetus_discourses',
      slug: 'the-enchiridion-epictetus',
      title: 'The Enchiridion',
      author: 'Epictetus',
      description: 'The definitive handbook of Stoic mental sovereignty, teaching how to maintain total internal freedom regardless of external events or societal pressure.',
      coverUrl: 'https://covers.openlibrary.org/b/id/12833946-M.jpg',
      publishedYear: 125,
      themes: ['discipline', 'confidence', 'focus'],
      problemTags: ['anxiety', 'loss-of-control', 'fear-of-failure', 'stoic-calm', 'approval-seeking'],
      sourceFlags: { hasSpotify: true, hasGutenberg: true, hasLibriVox: true, hasSummary: true },
      spotifyQuery: 'Enchiridion Epictetus',
      gutenbergId: 45109,
      standardEbooksSlug: null,
      librivoxIdentifier: 'enchiridion_1001_librivox',
      openLibraryKey: '/works/OL15359288W',
      googleBooksId: null,
      metadataSource: 'curated',
      summary: {
        title: 'Freedom Through Radical Acceptance',
        executiveOverview: 'Born a slave in Hierapolis, Epictetus taught that psychological distress does not stem from external events, but from the judgments we form about them.',
        coreProblemSolved: 'Feeling crushed by external criticism, anxiety about future outcomes, and seeking external validation.',
        lessons: [
          {
            lessonNumber: 1,
            title: 'Some Things are in Our Control, Others Not',
            explanation: 'Things in our control are opinion, pursuit, desire, aversion, and, in a word, whatever are our own actions. Things not in our control are body, property, reputation, command.',
            practicalAction: 'Draw two columns on paper: "My Choices" and "External Outcomes". Focus 100% of your energy exclusively on the first.'
          },
          {
            lessonNumber: 2,
            title: 'Do Not Seek for Events to Happen as You Wish',
            explanation: 'Demand not that things should happen as you wish; but wish them to happen as they do happen, and you will go on well.',
            practicalAction: 'When plans are interrupted, replace "Why did this happen to me?" with "How can I respond with virtue to this?".'
          }
        ]
      },
      tracks: [
        {
          index: 1,
          title: 'Part 1: The Enchiridion Sections 1-15',
          duration: 1120,
          url: 'https://archive.org/download/enchiridion_1001_librivox/enchiridion_01_epictetus.mp3'
        },
        {
          index: 2,
          title: 'Part 2: The Enchiridion Sections 16-30',
          duration: 1240,
          url: 'https://archive.org/download/enchiridion_1001_librivox/enchiridion_02_epictetus.mp3'
        }
      ]
    },
    {
      id: 'book_seneca_shortness_life',
      slug: 'on-the-shortness-of-life-seneca',
      title: 'On the Shortness of Life',
      author: 'Lucius Annaeus Seneca',
      description: 'A searing philosophical essay addressing why we squander our days in trivial busywork while complaining that life is too brief.',
      coverUrl: 'https://covers.openlibrary.org/b/id/8231856-M.jpg',
      publishedYear: 49,
      themes: ['focus', 'energy', 'discipline', 'consistency'],
      problemTags: ['wasting-time', 'busywork', 'procrastination', 'scattered', 'overcommitment'],
      sourceFlags: { hasSpotify: true, hasGutenberg: true, hasLibriVox: true, hasSummary: true },
      spotifyQuery: 'On the Shortness of Life Seneca',
      gutenbergId: 28299,
      standardEbooksSlug: null,
      librivoxIdentifier: 'shortness_life_1010_librivox',
      openLibraryKey: '/works/OL1982736W',
      googleBooksId: null,
      metadataSource: 'curated',
      summary: {
        title: 'Reclaiming the Sovereign Hour',
        executiveOverview: 'Seneca argues that life is long if you know how to use it, but most humans waste the majority of their years in meaningless busyness and involuntary servitude to trivial distractions.',
        coreProblemSolved: 'Feeling like days slip by without meaningful progress; saying yes to obligations you secretly dread.',
        lessons: [
          {
            lessonNumber: 1,
            title: 'Life is Long if You Know How to Use It',
            explanation: 'It is not that we have a short time to live, but that we waste a lot of it. We are not given a short life but we make it short, and we are not ill-supplied, but wasteful of it.',
            practicalAction: 'Do a ruthless time-audit: identify and eliminate the single largest time-sink that produces zero long-term fulfillment.'
          },
          {
            lessonNumber: 2,
            title: 'Guarding Your Time Like Your Wealth',
            explanation: 'People are frugal in guarding their personal property; but as soon as it comes to squandering time they are most wasteful of the one thing in which it is right to be stingy.',
            practicalAction: 'Establish an explicit policy: say "no" by default to invitations that do not align with your core focus.'
          }
        ]
      },
      tracks: [
        {
          index: 1,
          title: 'Sections 1-10: On the Shortness of Life',
          duration: 1450,
          url: 'https://archive.org/download/shortness_life_1010_librivox/shortness_of_life_01_seneca.mp3'
        }
      ]
    },
    {
      id: 'book_psychology_of_money',
      slug: 'the-psychology-of-money-morgan-housel',
      title: 'The Psychology of Money',
      author: 'Morgan Housel',
      description: 'Timeless lessons on wealth, greed, and happiness, showing how your psychological relationship with money matters far more than mathematical formulas.',
      coverUrl: 'https://covers.openlibrary.org/b/id/10523412-M.jpg',
      publishedYear: 2020,
      themes: ['money', 'discipline', 'consistency'],
      problemTags: ['impulse-buying', 'scarcity-mindset', 'financial-anxiety', 'greed', 'debt'],
      sourceFlags: { hasSpotify: true, hasGutenberg: false, hasLibriVox: false, hasSummary: true },
      spotifyQuery: 'The Psychology of Money Morgan Housel',
      gutenbergId: null,
      standardEbooksSlug: null,
      librivoxIdentifier: null,
      openLibraryKey: '/works/OL20847926W',
      googleBooksId: null,
      metadataSource: 'curated',
      summary: {
        title: 'Behavior Over Spreadsheet Intelligence',
        executiveOverview: 'Doing well with money has a little to do with how smart you are and a lot to do with how you behave. Financial success is not a hard science; it is a soft skill where emotional regulation reigns supreme.',
        coreProblemSolved: 'Impulsive financial decisions, anxiety about market volatility, and comparing your lifestyle to others.',
        lessons: [
          {
            lessonNumber: 1,
            title: 'Freedom is the Highest Dividend',
            explanation: 'The highest form of wealth is the ability to wake up every morning and say: "I can do whatever I want today." Controlling your time is the ultimate ROI of savings.',
            practicalAction: 'Build an emergency buffer of 3-6 months expenses that you never invest or gamble with.'
          },
          {
            lessonNumber: 2,
            title: 'Never Risk What You Have and Need for What You Don\'t Have and Don\'t Need',
            explanation: 'There is no reason to risk what you have and need in order to seek what you don\'t have and don\'t need. Recognize when you have "enough".',
            practicalAction: 'Define your personal "enough" threshold so lifestyle creep does not perpetually move the goalposts.'
          },
          {
            lessonNumber: 3,
            title: 'The Power of Compounding Requires Staying in the Game',
            explanation: 'Compounding only works if you can give an asset years or decades to grow. The real key to compounding is longevity and survival without panic-selling.',
            practicalAction: 'Automate a fixed monthly investment into a low-cost index fund and delete the tracking app from your home screen.'
          }
        ]
      },
      tracks: []
    },
    {
      id: 'book_nonviolent_communication',
      slug: 'nonviolent-communication-marshall-rosenberg',
      title: 'Nonviolent Communication',
      author: 'Marshall B. Rosenberg',
      description: 'A transformative framework for speaking and listening with deep empathy, resolving bitter conflicts, and building unshakeable human relationships.',
      coverUrl: 'https://covers.openlibrary.org/b/id/8314112-M.jpg',
      publishedYear: 1999,
      themes: ['relationships', 'confidence'],
      problemTags: ['arguments', 'misunderstandings', 'conflict', 'loneliness', 'defensiveness', 'communication-breakdown'],
      sourceFlags: { hasSpotify: true, hasGutenberg: false, hasLibriVox: false, hasSummary: true },
      spotifyQuery: 'Nonviolent Communication Marshall Rosenberg',
      gutenbergId: null,
      standardEbooksSlug: null,
      librivoxIdentifier: null,
      openLibraryKey: '/works/OL3424167W',
      googleBooksId: null,
      metadataSource: 'curated',
      summary: {
        title: 'Connecting Across the Human Divide',
        executiveOverview: 'Marshall Rosenberg presents a four-step framework (Observations, Feelings, Needs, Requests) that replaces blame, judgment, and emotional defensiveness with compassionate clarity.',
        coreProblemSolved: 'Recurring arguments with partners or colleagues, feeling misunderstood, and reacting with hostility when challenged.',
        lessons: [
          {
            lessonNumber: 1,
            title: 'Observation Without Evaluation',
            explanation: 'When we combine our observation with an evaluation, the other person hears criticism and instinctively resists. Stating bare factual observations without judgment de-escalates conflict instantly.',
            practicalAction: 'Describe specific physical actions ("You arrived 20 minutes after 6 PM") rather than emotional evaluations ("You are always late and don\'t care").'
          },
          {
            lessonNumber: 2,
            title: 'Identifying Underlying Human Needs',
            explanation: 'Every anger, judgment, and argument is the tragic expression of an unmet universal human need (e.g. respect, safety, autonomy, connection).',
            practicalAction: 'In any conflict, ask: "What need is this person desperately trying to meet right now?"'
          },
          {
            lessonNumber: 3,
            title: 'Concrete, Actionable Requests',
            explanation: 'Ask for what you want in concrete, positive action language rather than vague demands or stating what you don\'t want.',
            practicalAction: 'State clearly: "Would you be willing to put your phone on silent while we have dinner together tonight?"'
          }
        ]
      },
      tracks: []
    },
    {
      id: 'book_why_we_sleep',
      slug: 'why-we-sleep-matthew-walker',
      title: 'Why We Sleep',
      author: 'Matthew Walker',
      description: 'A revolutionary neurological investigation into how sleep governs learning, emotional resilience, cellular repair, immunity, and lifelong health.',
      coverUrl: 'https://covers.openlibrary.org/b/id/8389146-M.jpg',
      publishedYear: 2017,
      themes: ['energy', 'discipline'],
      problemTags: ['tired', 'burnout', 'insomnia', 'sluggish', 'exhaustion', 'chronic-fatigue'],
      sourceFlags: { hasSpotify: true, hasGutenberg: false, hasLibriVox: false, hasSummary: true },
      spotifyQuery: 'Why We Sleep Matthew Walker',
      gutenbergId: null,
      standardEbooksSlug: null,
      librivoxIdentifier: null,
      openLibraryKey: '/works/OL17871261W',
      googleBooksId: null,
      metadataSource: 'curated',
      summary: {
        title: 'The Master Biological Reset',
        executiveOverview: 'Neuroscientist Matthew Walker shows that sleep is the single most effective thing we can do to reset our brain and physical health each day. Sleep deprivation is not a badge of honor; it is systemic cognitive impairment.',
        coreProblemSolved: 'Waking up exhausted, relying on excessive caffeine, suffering afternoon energy crashes, and feeling chronically drained.',
        lessons: [
          {
            lessonNumber: 1,
            title: 'Regularity is King',
            explanation: 'Going to bed and waking up at the same time every day—including weekends—is the single most impactful habit for deep, restorative sleep architecture.',
            practicalAction: 'Set a non-negotiable bedtime alarm 30 minutes before your scheduled sleep time.'
          },
          {
            lessonNumber: 2,
            title: 'The Caffeine Half-Life Trap',
            explanation: 'Caffeine has a half-life of 5 to 7 hours and a quarter-life of up to 12 hours. A cup of coffee at 4 PM means 25% of that caffeine is still circulating in your brain at 4 AM, destroying deep NREM sleep.',
            practicalAction: 'Implement a strict caffeine cutoff at 12:00 PM noon.'
          },
          {
            lessonNumber: 3,
            title: 'The Cool, Dark Sanctuary',
            explanation: 'Your body needs to drop its core temperature by 2-3 degrees Fahrenheit to initiate sleep. Warm bedrooms signal your brain to remain awake.',
            practicalAction: 'Keep your bedroom cool (around 65°F / 18°C) and completely blackout dark.'
          }
        ]
      },
      tracks: []
    }
  ];

  for (const b of booksData) {
    batchStatements.push({
      sql: bookSql,
      args: [
        b.id,
        b.slug,
        b.title,
        b.author,
        b.description,
        b.coverUrl,
        b.publishedYear,
        JSON.stringify(b.themes),
        JSON.stringify(b.problemTags),
        JSON.stringify(b.sourceFlags),
        b.spotifyQuery,
        b.gutenbergId,
        b.standardEbooksSlug,
        b.librivoxIdentifier,
        b.openLibraryKey,
        b.googleBooksId,
        b.metadataSource
      ]
    });

    if (b.summary) {
      batchStatements.push({
        sql: summarySql,
        args: [
          `sum_${b.id}`,
          b.id,
          b.summary.title,
          b.summary.executiveOverview,
          b.summary.coreProblemSolved,
          JSON.stringify(b.summary.lessons),
          null,
          null,
          'Book Listener Original Summary — Transformative analysis & key takeaways. Not the full book.'
        ]
      });
    }

    if (b.tracks && b.tracks.length > 0) {
      for (const tr of b.tracks) {
        batchStatements.push({
          sql: trackSql,
          args: [
            `trk_${b.id}_${tr.index}`,
            b.id,
            tr.index,
            tr.title,
            tr.duration,
            tr.url,
            'librivox'
          ]
        });
      }
    }
  }

  if (batchStatements.length > 0) {
    await db.batch(batchStatements);
  }
  memorySeeded = true;

  console.log(`[Seed] Successfully seeded ${booksData.length} books with complete 4-state availability metadata to Turso.`);
}
