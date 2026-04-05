// ============================================================
// TRIVIA QUESTIONS
// Replace or add questions here. Keep the same object structure.
// 'answer' is shown to the ADMIN only as a scoring reference.
// Optional flags:
//   flag: 'must'  — always included somewhere in the game
//   flag: 'skip'  — never included in the draw
// ============================================================

const QUESTIONS = [

  // -------------------------
  // 1 POINT QUESTIONS
  // -------------------------

  {
    id: 'q1',
    round: 1,
    question: "This movie soundtrack, anchored by a hit song by Canadian pop singer Celine Dion, spent 16 weeks at #1 on the Billboard Charts.",
    answer: "Titanic",
    points: 1
  },
  {
    id: 'q2',
    round: 1,
    question: "This female pop star, whose catalog includes the songs \"Fantasy\" and \"Always Be My Baby\", was infamously caught lip syncing during a New Year's Eve telecast in 2016.",
    answer: "Mariah Carey",
    points: 1
  },
  {
    id: 'q3',
    round: 1,
    question: "Billy Joel, Alicia Keys, and Nas have all released a song with the same \"State of Mind\" about this large US city.",
    answer: "New York",
    points: 1,
    flag: 'must'
  },
  {
    id: 'q4',
    round: 1,
    question: "Before she was a pop icon, this artist spent years as a Mouseketeer alongside Justin Timberlake and Ryan Gosling.",
    answer: "Britney Spears",
    points: 1,
    flag: 'must'
  },
  {
    id: 'q5',
    round: 1,
    question: "In one of her biggest hits from her album Jagged Little Pill, Alanis Morissette starts off by singing \"An old man turned ninety-eight, he won the lottery and died the next day.\" What is the name of the song?",
    answer: "Ironic",
    points: 1
  },
  {
    id: 'q6',
    round: 1,
    question: "This boy band, whose members included AJ, Howie, Nick, Kevin and Brian, sold over 130 million records worldwide making them the best selling boy band of all time.",
    answer: "Backstreet Boys",
    points: 1
  },
  {
    id: 'q7',
    round: 1,
    question: "This Canadian pop punk artist released \"Complicated\" as her debut single in 2002.",
    answer: "Avril Lavigne",
    points: 1
  },
  {
    id: 'q8',
    round: 1,
    question: "Carson Daly hosted this MTV institution from Times Square every afternoon, where screaming fans below tried to catch a glimpse of whoever was counting down that day.",
    answer: "TRL",
    points: 1
  },
  {
    id: 'q9',
    round: 2,
    question: "This Atlanta trio was the best selling American female group of the 90s — despite filing for bankruptcy in 1995 at the height of their fame.",
    answer: "TLC",
    points: 1
  },
  {
    id: 'q10',
    round: 2,
    question: "This 2003 track by The White Stripes features an iconic seven-note riff that has since become a standard chant in sports stadiums worldwide.",
    answer: "Seven Nation Army",
    points: 1
  },
  {
    id: 'q11',
    round: 2,
    question: "This Las Vegas band, whose debut major label release Hot Fuss furnished three #1 singles, is fronted by singer Brandon Flowers.",
    answer: "The Killers",
    points: 1
  },
  {
    id: 'q12',
    round: 2,
    question: "In Outkast's song \"Hey Ya\", Andre 3000 tells you to shake it like a _______.",
    answer: "Polaroid Picture",
    points: 1
  },
  {
    id: 'q13',
    round: 2,
    question: "In a span of just six months between late 1996 and early 1997, the music world lost both of these legendary rap artists due to gun violence. Name them.",
    answer: "Biggie Smalls (The Notorious B.I.G.) and Tupac Shakur (2Pac)",
    points: 1
  },

  // -------------------------
  // 2 POINT QUESTIONS
  // -------------------------

  {
    id: 'q14',
    round: 1,
    question: "This Brooklyn-born artist is the only rapper in history to be inducted into both the Rock and Roll and Songwriters Hall of Fame.",
    answer: "Jay-Z",
    points: 2,
    flag: 'must'
  },
  {
    id: 'q15',
    round: 1,
    question: "What European country was 90s pop group Ace of Base from?",
    answer: "Sweden",
    points: 2
  },
  {
    id: 'q16',
    round: 1,
    question: "This singer/rapper and her future ex-boyfriend were both members of the critically acclaimed rap group the Fugees — after their split, her debut (and only) solo album earned her 6 Grammys in a single night in 2000.",
    answer: "Lauryn Hill",
    points: 2
  },
  {
    id: 'q17',
    round: 1,
    question: "This former member of Destiny's Child collaborated with Nelly on \"Dilemma,\" a 2002 duet that went on to win the Grammy for Best Rap/Sung Collaboration.",
    answer: "Kelly Rowland",
    points: 2
  },
  {
    id: 'q18',
    round: 1,
    question: "This legendary guitarist, who first rose to fame in the 1960s, made a comeback with his 1999 album \"Supernatural\" — featuring collaborations with Rob Thomas and Everlast — and swept the Grammys winning 9 in a single night.",
    answer: "Santana",
    points: 2
  },
  {
    id: 'q19',
    round: 2,
    question: "This rapper's 2002 semi-autobiographical film featured the song \"Lose Yourself,\" which became the first hip hop track to win the Academy Award for Best Original Song.",
    answer: "Eminem",
    points: 2
  },
  {
    id: 'q20',
    round: 2,
    question: "This Atlanta R&B artist's 2004 album \"Confessions\" spent 9 weeks at #1 and produced four number one singles — still one of the best selling albums of the 2000s.",
    answer: "Usher",
    points: 2
  },
  {
    id: 'q21',
    round: 2,
    question: "In 2003, this jazz-pop singer made history by winning 8 Grammys in a single night for her debut album \"Come Away with Me\".",
    answer: "Norah Jones",
    points: 2
  },
  {
    id: 'q22',
    round: 2,
    question: "This New York City band's 2001 debut \"Is This It is widely\" credited with sparking the indie rock revival of the early 2000s.",
    answer: "The Strokes",
    points: 2
  },
  {
    id: 'q23',
    round: 2,
    question: "This alternative metal band, whose four members are all of Armenian descent, released the 2002 platinum-certified record \"Steal This Album!\" — featuring a cover designed to look like a hand-written, burned CD.",
    answer: "System of a Down",
    points: 2,
    flag: 'must'
  },
  {
    id: 'q24',
    round: 2,
    question: "This \"virtual band\" was created by Damon Albarn, frontman of Blur, and featured animated characters in all their music videos",
    answer: "Gorillaz",
    points: 2
  },
  {
    id: 'q25',
    round: 2,
    question: "Which member of TLC was both married to an NFL player and arrested for arson for burning down the house they once lived in?",
    answer: "Lisa Lopes / Left Eye",
    points: 2
  },
  {
    id: 'q26',
    round: 2,
    question: "Finish this Sublime lyric from \"What I Got\": \"Early in the morning, rising to the street, light me up that cigarette and I _______\"",
    answer: "strap shoes on my feet",
    points: 2,
    flag: 'must'
  },
  {
    id: 'q27',
    round: 2,
    question: "This female artist from a famous musical family, has a catalog of hit songs across multiple decades including \"What Have You Done For Me Lately\" (1986), \"That's the Way Love Goes\" (1993), and \"All for You\" (2001). Who is she?",
    answer: "Janet Jackson",
    points: 2
  },
  {
    id: 'q28',
    round: 2,
    question: "Three of these four rock/metal bands performed at Woodstock 99 — Korn, Limp Bizkit, Linkin Park, Rage Against the Machine. Which one wasn't there?",
    answer: "Linkin Park",
    points: 2,
    flag: 'must'
  },
  {
    id: 'q29',
    round: 2,
    question: "Nirvana, Pearl Jam, Alice in Chains, and Soundgarden were all defining bands of the 90s grunge scene — but only three of them recorded iconic MTV Unplugged sessions. Which one never did?",
    answer: "Soundgarden",
    points: 2,
    flag: 'must'
  },
  {
    id: 'q30',
    round: 2,
    question: "In 2008, this artist released \"Love Story,\" a re-telling of Romeo and Juliet that became the first country song in history to top the Mainstream Top 40 chart, signaling her shift into global pop superstardom.",
    answer: "Taylor Swift",
    points: 2,
    flag: 'must'
  },
  {
    id: 'q31',
    round: 1,
    question: "Which of the following was NOT an official nickname for one of the Spice Girls — Sporty Spice, Ginger Spice, Posh Spice, or Sugar Spice?",
    answer: "Sugar Spice",
    points: 1
  },

  // -------------------------
  // ROUND 3 QUESTIONS
  // -------------------------

  {
    id: 'q32',
    round: 3,
    question: "Name the *NSYNC member who went on to have a massive solo career, releasing 'SexyBack' in 2006 and 'Mirrors' in 2013.",
    answer: "Justin Timberlake",
    points: 1
  },
  {
    id: 'q33',
    round: 3,
    question: "What was the name of Nirvana's 1991 breakthrough album, widely credited with bringing grunge into the mainstream?",
    answer: "Nevermind",
    points: 1
  },
  {
    id: 'q34',
    round: 3,
    question: "Finish this blink-182 lyric from 'All the Small Things': 'Say it ain't so, I will not go, turn the lights off, _______'",
    answer: "carry me home",
    points: 1
  },
  {
    id: 'q35',
    round: 3,
    question: "This pop star, who got her start as lead singer of Destiny's Child, released 'Crazy in Love' as her debut solo single in 2003.",
    answer: "Beyoncé",
    points: 1
  },
  {
    id: 'q36',
    round: 3,
    question: "This British singer's 2006 album 'Back to Black' swept the Grammys, winning 5 in a single night including Record of the Year for 'Rehab.'",
    answer: "Amy Winehouse",
    points: 2
  },
  {
    id: 'q37',
    round: 3,
    question: "Before forming the Foo Fighters, Dave Grohl was the drummer for which iconic 90s band?",
    answer: "Nirvana",
    points: 2
  },
  {
    id: 'q38',
    round: 3,
    question: "This French electronic duo, famous for performing in robot helmets, released 'One More Time' in 2000 and reunited with Pharrell Williams for 'Get Lucky' in 2013.",
    answer: "Daft Punk",
    points: 2
  },
  {
    id: 'q39',
    round: 3,
    question: "Jack and Meg White of the White Stripes publicly claimed to be brother and sister for years. What was their actual relationship?",
    answer: "Ex-husband and wife",
    points: 2
  },
  {
    id: 'q40',
    round: 3,
    question: "The infamous 2004 Super Bowl halftime 'wardrobe malfunction' involved Justin Timberlake and which other performer?",
    answer: "Janet Jackson",
    points: 2
  }

];

// Randomly assign questions to rounds: 5×1pt + 6×2pt per round, no repeats.
// Optional per-question flags:
//   flag: 'must'  — always included somewhere in the game (round 1 or 2)
//   flag: 'skip'  — never included
// Called at game reset; result is stored in Firebase so all clients see the same order.
function generateQuestionOrder() {
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const available = QUESTIONS.filter(q => q.flag !== 'skip');

  // Must-ask questions go to the front of each pool before shuffling normals in
  const mustOnes   = available.filter(q => q.points === 1 && q.flag === 'must').map(q => q.id);
  const normalOnes = shuffle(available.filter(q => q.points === 1 && q.flag !== 'must').map(q => q.id));
  const mustTwos   = available.filter(q => q.points === 2 && q.flag === 'must').map(q => q.id);
  const normalTwos = shuffle(available.filter(q => q.points === 2 && q.flag !== 'must').map(q => q.id));

  // Shuffle must + normal together so must questions are spread across both rounds
  const ones = shuffle([...mustOnes, ...normalOnes]);
  const twos = shuffle([...mustTwos, ...normalTwos]);

  return {
    r1: shuffle([...ones.slice(0, 5),  ...twos.slice(0, 5)]),
    r2: shuffle([...ones.slice(5, 10), ...twos.slice(5, 10)]),
    r3: shuffle([...ones.slice(10, 15), ...twos.slice(10, 15)]),
  };
}
