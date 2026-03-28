export const CHAPTERS = [
  {
    id: 'beginning',
    title: 'In the Beginning',
    subtitle: 'Where your story starts',
    icon: '\u{1F338}',
    color: '#D4A5A5',
    questions: [
      { id: 'birthday', text: "When is your birthday?", size: 'half', type: 'short', placeholder: "Month, day, year..." },
      { id: 'birthplace', text: "Where were you born?", size: 'half', type: 'short', placeholder: "City and state..." },
      { id: 'named_after', text: "Were you named after anyone special?", size: 'full', type: 'short', placeholder: "The story behind your name..." },
      { id: 'baby_stories', text: "What stories has your family told about you as a baby?", size: 'full', type: 'long', placeholder: "First words, funny moments..." },
      { id: 'earliest_memory', text: "What is your earliest childhood memory?", size: 'full', type: 'long', placeholder: "The very first thing you can remember..." },
    ]
  },
  {
    id: 'growing_up',
    title: 'Growing Up',
    subtitle: 'Childhood days',
    icon: '\u{1F3E1}',
    color: '#D4B896',
    questions: [
      { id: 'hometown', text: "Where did you grow up?", size: 'half', type: 'short', placeholder: "Your hometown..." },
      { id: 'nickname', text: "Did you have a nickname?", size: 'half', type: 'short', placeholder: "What people called you..." },
      { id: 'best_friend', text: "Who was your best friend growing up?", size: 'half', type: 'short', placeholder: "A name and a memory..." },
      { id: 'fav_candy', text: "What was your favorite candy or treat?", size: 'half', type: 'short', placeholder: "The one you always picked..." },
      { id: 'kid_personality', text: "What were you like as a kid?", size: 'full', type: 'long', placeholder: "Shy, adventurous, bookworm, troublemaker..." },
      { id: 'miss_childhood', text: "What do you miss most about being a kid?", size: 'full', type: 'long', placeholder: "The feeling, the freedom, the simplicity..." },
    ]
  },
  {
    id: 'school',
    title: 'School Days',
    subtitle: 'Lessons learned, not all from books',
    icon: '\u{1F4DA}',
    color: '#A3C4D9',
    questions: [
      { id: 'enjoy_school', text: "Did you enjoy school?", size: 'half', type: 'short', placeholder: "Loved it, tolerated it, or..." },
      { id: 'fav_subject', text: "Favorite and least favorite subjects?", size: 'half', type: 'short', placeholder: "Loved ____, hated ____" },
      { id: 'school_activities', text: "What activities did you participate in?", size: 'half', type: 'short', placeholder: "Sports, clubs, band..." },
      { id: 'grades', text: "What kind of student were you?", size: 'half', type: 'short', placeholder: "Straight A's or... creative with grades" },
      { id: 'teacher_impact', text: "Was there a teacher who changed your life?", size: 'full', type: 'long', placeholder: "Their name, what they taught, and why they mattered..." },
      { id: 'school_advice', text: "Knowing what you know now, what would you tell your student self?", size: 'full', type: 'long', placeholder: "The advice that only hindsight can give..." },
    ]
  },
  {
    id: 'teenage',
    title: 'The Teenage Years',
    subtitle: 'Finding out who you were going to be',
    icon: '\u{1F3B5}',
    color: '#C5B3D6',
    questions: [
      { id: 'teen_style', text: "How did you dress and style your hair as a teenager?", size: 'half', type: 'short', placeholder: "Fashion choices of the era..." },
      { id: 'teen_weekend', text: "What was a typical weekend night like?", size: 'half', type: 'short', placeholder: "Hangouts, parties, or..." },
      { id: 'teen_friends', text: "Big group or a few close friends?", size: 'half', type: 'short', placeholder: "The crew, the besties..." },
      { id: 'first_car', text: "What kind of car did you learn to drive?", size: 'half', type: 'short', placeholder: "Your first set of wheels..." },
      { id: 'teen_personality', text: "What were you like during your teen years?", size: 'full', type: 'long', placeholder: "Rebellious, dreamy, ambitious, lost..." },
      { id: 'teen_advice', text: "What advice would you give your teenage self?", size: 'full', type: 'long', placeholder: "The one thing you wish you knew then..." },
    ]
  },
  {
    id: 'parents',
    title: 'Mom & Dad',
    subtitle: 'The people who shaped you',
    icon: '\u{1F33F}',
    color: '#B5C9A8',
    questions: [
      { id: 'describe_mother', text: "Three words to describe your mother?", size: 'half', type: 'short', placeholder: "Three words that capture her..." },
      { id: 'describe_father', text: "Three words to describe your father?", size: 'half', type: 'short', placeholder: "Three words that capture him..." },
      { id: 'parents_meet', text: "How did your parents meet?", size: 'full', type: 'long', placeholder: "The love story that started it all..." },
      { id: 'family_traditions', text: "What family traditions do you remember?", size: 'full', type: 'long', placeholder: "Holiday rituals, Sunday dinners, bedtime routines..." },
      { id: 'like_parents', text: "How are you most like your parents? Least like them?", size: 'full', type: 'long', placeholder: "The apple doesn't fall far... or does it?" },
    ]
  },
  {
    id: 'love',
    title: 'Love & Romance',
    subtitle: 'Matters of the heart',
    icon: '\u{1F48C}',
    color: '#E8B4B8',
    questions: [
      { id: 'first_crush', text: "Who was your biggest crush?", size: 'half', type: 'short', placeholder: "The one who made your heart race..." },
      { id: 'first_kiss', text: "How old were you for your first kiss?", size: 'half', type: 'short', placeholder: "The age, the story..." },
      { id: 'romantic_memory', text: "What is your most romantic memory?", size: 'full', type: 'long', placeholder: "The moment that still makes you smile..." },
      { id: 'love_lesson', text: "What is the most important thing love has taught you?", size: 'full', type: 'long', placeholder: "The wisdom that only love can teach..." },
      { id: 'relationship_qualities', text: "What matters most in a relationship?", size: 'full', type: 'long', placeholder: "The things that truly matter..." },
    ]
  },
  {
    id: 'career',
    title: 'Work & Dreams',
    subtitle: 'The paths taken and not taken',
    icon: '\u2728',
    color: '#D4C5A0',
    questions: [
      { id: 'childhood_dream', text: "What did you want to be when you grew up?", size: 'half', type: 'short', placeholder: "The big childhood dream..." },
      { id: 'first_job', text: "What was your very first job?", size: 'half', type: 'short', placeholder: "The one that started it all..." },
      { id: 'favorite_job', text: "What was your favorite job and why?", size: 'full', type: 'long', placeholder: "The work that felt like more than work..." },
      { id: 'dream_profession', text: "If you could do anything, what would it be?", size: 'half', type: 'short', placeholder: "Dream job, no limits..." },
      { id: 'never_do_jobs', text: "Three jobs you would never do?", size: 'half', type: 'short', placeholder: "Absolutely not..." },
    ]
  },
  {
    id: 'adventures',
    title: 'Adventures',
    subtitle: 'The places and moments that changed everything',
    icon: '\u{1F30D}',
    color: '#93B5B3',
    questions: [
      { id: 'fav_travel', text: "What is your favorite travel memory?", size: 'full', type: 'long', placeholder: "The trip that lives rent-free in your mind..." },
      { id: 'dream_vacation', text: "What is your fantasy vacation?", size: 'half', type: 'short', placeholder: "Dream destination..." },
      { id: 'always_packs', text: "What do you always bring on a trip?", size: 'half', type: 'short', placeholder: "The one thing you never forget..." },
      { id: 'most_impulsive', text: "What is the most impulsive thing you ever did?", size: 'full', type: 'long', placeholder: "The leap of faith, the spontaneous decision..." },
    ]
  },
  {
    id: 'parent_hood',
    title: 'Becoming a Parent',
    subtitle: 'The chapter that changed everything',
    icon: '\u{1F33B}',
    color: '#E8C5A5',
    questions: [
      { id: 'first_parent_age', text: "How old were you when you first became a parent?", size: 'half', type: 'short', placeholder: "The age everything changed..." },
      { id: 'first_told', text: "Who was the first person you told?", size: 'half', type: 'short', placeholder: "The person who heard it first..." },
      { id: 'sang_to_kids', text: "Was there a song you would sing to your children?", size: 'full', type: 'long', placeholder: "The lullaby, the bedtime song..." },
      { id: 'parenting_advice', text: "What advice would you give yourself as a new parent?", size: 'full', type: 'long', placeholder: "The wisdom that only experience brings..." },
      { id: 'fav_kid_memory', text: "What is your favorite memory of your children?", size: 'full', type: 'long', placeholder: "The moment you never want to forget..." },
    ]
  },
  {
    id: 'favorites',
    title: 'Favorites & Quirks',
    subtitle: 'The little things that make you, you',
    icon: '\u{1F3AA}',
    color: '#C9B1C1',
    questions: [
      { id: 'ice_cream', text: "Favorite ice cream flavor?", size: 'half', type: 'short', placeholder: "The one you always pick..." },
      { id: 'coffee', text: "How do you like your coffee?", size: 'half', type: 'short', placeholder: "Black, sweet, or not at all..." },
      { id: 'favorite_season', text: "Favorite season and why?", size: 'half', type: 'short', placeholder: "Spring, summer, fall, or winter..." },
      { id: 'last_meal', text: "What would you pick as your last meal?", size: 'half', type: 'short', placeholder: "The ultimate feast..." },
      { id: 'autobiography_title', text: "What would be the title of your autobiography?", size: 'full', type: 'long', placeholder: "The book of your life, in one title..." },
      { id: 'perfect_day', text: "What does a perfect day look like for you?", size: 'full', type: 'long', placeholder: "From morning to night, no limits..." },
    ]
  },
  {
    id: 'reflections',
    title: 'Looking Back',
    subtitle: 'Wisdom, wonder, and what matters most',
    icon: '\u{1F305}',
    color: '#D4A574',
    questions: [
      { id: 'proudest', text: "What are you most proud of?", size: 'full', type: 'long', placeholder: "The achievement that means the most..." },
      { id: 'biggest_regret', text: "What is your biggest regret?", size: 'full', type: 'long', placeholder: "The road not taken, the words unsaid..." },
      { id: 'modern_surprise', text: "What about the modern world surprises you most?", size: 'full', type: 'long', placeholder: "The thing that would blow your younger self's mind..." },
      { id: 'lesson_to_share', text: "What would you want someone to learn from your story?", size: 'full', type: 'long', placeholder: "The one thing that matters more than anything..." },
    ]
  }
]

export const BOOK_COLORS = [
  { bg: '#7B3F3F', bgDark: '#5C2D2D', text: '#F0D4B8' },
  { bg: '#2D4A4A', bgDark: '#1E3838', text: '#B8D8D4' },
  { bg: '#5C4A35', bgDark: '#3D3020', text: '#E8D4B8' },
  { bg: '#3D3B6B', bgDark: '#2D2B5B', text: '#C8C4E0' },
  { bg: '#4A5C35', bgDark: '#354525', text: '#C8D8B0' },
  { bg: '#6B4A35', bgDark: '#4C3520', text: '#F0D0B0' },
  { bg: '#5C2040', bgDark: '#3D1530', text: '#E0B8C8' },
]
