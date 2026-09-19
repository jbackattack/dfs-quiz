/**
 * End-to-End Example: Fantasy Sports Quiz Data Flow
 * Shows complete flow from raw data → questions → quiz
 */

// ============================================================================
// STEP 1: RAW PLAYER DATA
// ============================================================================

const curtisMartin = {
  name: 'Curtis Martin',
  position: 'RB',
  team: 'New York Jets',
  yearsActive: '1998-2006',
  careerPprPoints: 2847,
  franchiseRecord: true,
  consecutiveRecord: 10, // 1000+ yard seasons

  // GAME-BY-GAME DATA (Single Game Questions)
  games: [
    {
      gameId: 'nfl-2000-10-15',
      date: '2000-10-15',
      week: 6,
      season: 2000,
      opponent: 'New England Patriots',
      location: 'home',
      finalScore: 'NYJ 34-17 NE',
      rushingYards: 143,
      rushingTouchdowns: 3,
      rushingAttempts: 34,
      receivingYards: 18,
      receivingTouchdowns: 0,
      receptions: 2,
      targets: 2,
      fantasyPoints: 34.1,
      pprRanking: 1, // Best game of season
      fantasyPointsAllTime: 15, // 15th best game in career
      statline: '143 rush yards, 3 TDs, 18 rec yards'
    },
    {
      gameId: 'nfl-2000-11-19',
      date: '2000-11-19',
      week: 11,
      season: 2000,
      opponent: 'Indianapolis Colts',
      rushingYards: 127,
      rushingTouchdowns: 2,
      receivingYards: 22,
      receptions: 4,
      fantasyPoints: 28.8,
      pprRanking: 3
    },
    {
      gameId: 'nfl-2000-12-10',
      date: '2000-12-10',
      week: 14,
      season: 2000,
      opponent: 'Miami Dolphins',
      rushingYards: 156,
      rushingTouchdowns: 2,
      receivingYards: 35,
      receptions: 5,
      fantasyPoints: 32.2,
      pprRanking: 2
    }
    // ... 40+ more games per season
  ],

  // SEASON-BY-SEASON DATA (Single Season Questions)
  seasons: [
    {
      year: 2000,
      gamesPlayed: 16,
      rushingAttempts: 331,
      rushingYards: 1204,
      rushingTouchdowns: 9,
      receivingYards: 189,
      receivingTouchdowns: 1,
      receptions: 41,
      pprPoints: 204.3,
      ppg: 12.8,
      positionRank: 8,
      overallRank: 12,
      positionAbove: ['Edgerrin James', 'Jamal Lewis', 'Ricky Williams', 'Ricky Watters'],
      careerBest: false,
      fantasyMvp: false,
      topFive: false,
      ledLeague: false,
      leadingStatCategory: 'rush attempts'
    },
    {
      year: 2001,
      gamesPlayed: 16,
      rushingAttempts: 333,
      rushingYards: 1247,
      rushingTouchdowns: 10,
      receivingYards: 271,
      receivingTouchdowns: 2,
      receptions: 65,
      pprPoints: 228.1,
      ppg: 14.3,
      positionRank: 5,
      overallRank: 8,
      careerBest: true,
      fantasyMvp: false,
      topFive: true,
      ledLeague: false
    },
    {
      year: 2002,
      gamesPlayed: 16,
      rushingAttempts: 349,
      rushingYards: 1308,
      rushingTouchdowns: 9,
      receivingYards: 301,
      receivingTouchdowns: 3,
      receptions: 70,
      pprPoints: 236.2,
      ppg: 14.8,
      positionRank: 4,
      overallRank: 6,
      careerBest: false,
      fantasyMvp: false,
      topFive: true,
      ledLeague: false
    }
    // ... 6 more seasons
  ]
};

// ============================================================================
// STEP 2: QUESTION TEMPLATES APPLIED TO DATA
// ============================================================================

/**
 * Single Game Template #1: Rushing stats → Fantasy points
 */
function generateSingleGameQuestion_RushingStats(player, game) {
  return {
    question: `In ${game.date.split('-')[0]}, ${player.name} rushed for ${game.rushingYards} yards and ${game.rushingTouchdowns} TDs against the ${game.opponent}. How many fantasy points did this performance give him?`,
    
    options: [
      game.fantasyPoints,                                    // Correct
      Math.round(game.fantasyPoints + game.fantasyPoints * 0.15),
      Math.round(game.fantasyPoints - game.fantasyPoints * 0.15),
      Math.round(game.fantasyPoints + game.fantasyPoints * 0.30)
    ].sort((a, b) => a - b),
    
    correct: 0, // After sorting, original value is at position 0
    
    stat: `${game.rushingYards} yards, ${game.rushingTouchdowns} TDs`,
    
    gameId: game.gameId,
    timeScale: 'singleGame',
    difficulty: 'medium'
  };
}

/**
 * Single Season Template #1: Season ranking & PPR
 */
function generateSingleSeasonQuestion_SeasonRanking(player, season) {
  return {
    question: `In the ${season.year} season, ${player.name} finished as RB${season.positionRank} with ${season.pprPoints.toFixed(1)} PPR points. Was this his best fantasy season?`,
    
    options: [
      `${season.year}: Career high at ${season.pprPoints.toFixed(1)} PPR`,
      `${season.year}: Good year but not his best`
    ],
    
    correct: season.careerBest ? 0 : 1,
    
    stat: `RB${season.positionRank} overall, ${season.pprPoints.toFixed(1)} PPR (${season.ppg.toFixed(1)} ppg)`,
    
    yearId: season.year,
    timeScale: 'singleSeason',
    difficulty: 'medium'
  };
}

/**
 * All-Time Template #1: Consecutive seasons record
 */
function generateAllTimeQuestion_ConsecutiveSeasons(player) {
  return {
    question: `${player.name} surpassed 1,000 rushing yards in how many consecutive seasons?`,
    
    options: [
      player.consecutiveRecord - 1,
      player.consecutiveRecord,
      player.consecutiveRecord + 1,
      player.consecutiveRecord + 2
    ].sort((a, b) => a - b),
    
    correct: 1, // After sorting, original value is at position 1
    
    stat: `${player.consecutiveRecord} consecutive 1000+ yard seasons (franchise record)`,
    
    allTimeId: player.name.toLowerCase().replace(' ', '_'),
    timeScale: 'allTime',
    difficulty: 'hard'
  };
}

// ============================================================================
// STEP 3: QUESTION GENERATION RESULTS
// ============================================================================

const generatedQuestions = {
  singleGame: [
    // Game 1: Oct 15, 2000 vs Patriots
    {
      question: "In 2000, Curtis Martin rushed for 143 yards and 3 TDs against the New England Patriots. How many fantasy points did this performance give him?",
      options: [30, 32, 34, 36],
      correct: 2,
      stat: "143 yards, 3 TDs",
      gameId: "nfl-2000-10-15",
      timeScale: "singleGame",
      difficulty: "medium"
    },
    // Game 2: Nov 19, 2000 vs Colts
    {
      question: "In 2000, Curtis Martin rushed for 127 yards and 2 TDs against the Indianapolis Colts. How many fantasy points was this?",
      options: [25, 27, 29, 31],
      correct: 1,
      stat: "127 yards, 2 TDs, 4 rec",
      gameId: "nfl-2000-11-19",
      timeScale: "singleGame",
      difficulty: "medium"
    },
    // Game 3: Dec 10, 2000 vs Dolphins
    {
      question: "In 2000, Curtis Martin's best game featured 156 rushing yards and 2 TDs. Which team did he play against?",
      options: ["Miami Dolphins", "New England Patriots", "Buffalo Bills", "Indianapolis Colts"],
      correct: 0,
      stat: "156 yards, 2 TDs, best game of 2000",
      gameId: "nfl-2000-12-10",
      timeScale: "singleGame",
      difficulty: "easy"
    }
  ],

  singleSeason: [
    {
      question: "In the 2000 season, Curtis Martin finished as RB8 with 204.3 PPR points. Was this his best fantasy season?",
      options: ["2000: Career high at 204.3 PPR", "2000: Good year but not his best"],
      correct: 1,
      stat: "RB8 overall, 204.3 PPR (12.8 ppg)",
      yearId: 2000,
      timeScale: "singleSeason",
      difficulty: "medium"
    },
    {
      question: "In the 2001 season, Curtis Martin surpassed 1,200 rushing yards for the first time. How many touchdowns did he score?",
      options: [8, 9, 10, 11],
      correct: 2,
      stat: "1,247 rush yards, 10 TDs, RB5",
      yearId: 2001,
      timeScale: "singleSeason",
      difficulty: "medium"
    },
    {
      question: "Which season was Curtis Martin's best fantasy year in terms of PPR points?",
      options: ["2000 (204.3)", "2001 (228.1)", "2002 (236.2)", "2003 (219.5)"],
      correct: 2,
      stat: "Career best: 236.2 PPR in 2002",
      yearId: 2002,
      timeScale: "singleSeason",
      difficulty: "hard"
    }
  ],

  allTime: [
    {
      question: "Curtis Martin surpassed 1,000 rushing yards in how many consecutive seasons?",
      options: [8, 9, 10, 11],
      correct: 2,
      stat: "10 consecutive 1000+ yard seasons (franchise record)",
      allTimeId: "curtis_martin",
      timeScale: "allTime",
      difficulty: "hard"
    },
    {
      question: "Curtis Martin accumulated the most career fantasy points for the New York Jets at the RB. How many total PPR points did he score?",
      options: [2400, 2600, 2847, 3100],
      correct: 2,
      stat: "1998-2006: 2,847 career PPR",
      allTimeId: "curtis_martin",
      timeScale: "allTime",
      difficulty: "medium"
    },
    {
      question: "Which era did Curtis Martin play the majority of his career?",
      options: ["1990s", "2000s", "Early 2000s", "2010s"],
      correct: 1,
      stat: "Career span: 1998-2006",
      allTimeId: "curtis_martin",
      timeScale: "allTime",
      difficulty: "easy"
    }
  ]
};

// ============================================================================
// STEP 4: FRONTEND DISPLAYS QUESTIONS TO USER
// ============================================================================

/**
 * Example: User sees this on screen
 */
const userSeeesOnScreen = {
  // Before quiz starts:
  sportSelection: "Choose a sport: NFL, NBA, MLB, NHL",
  eraToggle: "2025 Season | All-Time",
  teamSelection: "New York Jets",
  playerSelection: "Curtis Martin (RB, 1998-2006)",
  timeScaleSelection: "Single Game | Single Season | All-Time | Mixed",
  difficultySelection: "Easy (10 pts) | Medium (15 pts) | Hard (20 pts)",

  // During quiz (Mixed mode example):
  question1: {
    timeScale: "Single Game",
    question: "In 2000, Curtis Martin rushed for 143 yards and 3 TDs against the New England Patriots. How many fantasy points did this performance give him?",
    options: ["30", "32", "34", "36"],
    badge: "Single Game",
    stat: "143 yards, 3 TDs",
    timer: "30s"
  },

  question2: {
    timeScale: "Single Season",
    question: "In the 2000 season, Curtis Martin finished as RB8 with 204.3 PPR points. Was this his best fantasy season?",
    options: ["2000: Career high at 204.3 PPR", "2000: Good year but not his best"],
    badge: "Single Season",
    stat: "RB8 overall, 204.3 PPR (12.8 ppg)",
    timer: "30s"
  },

  question3: {
    timeScale: "All-Time",
    question: "Curtis Martin surpassed 1,000 rushing yards in how many consecutive seasons?",
    options: ["8", "9", "10", "11"],
    badge: "All-Time",
    stat: "10 consecutive 1000+ yard seasons (franchise record)",
    timer: "30s"
  },

  // After quiz:
  results: {
    finalScore: 45,
    accuracy: "67%",
    correctAnswers: "2/3",
    breakdown: "Single Game (1/1) | Single Season (1/1) | All-Time (0/1)",
    message: "Good performance! You know your fantasy history."
  }
};

// ============================================================================
// STEP 5: API REQUEST/RESPONSE CYCLE
// ============================================================================

/**
 * Frontend sends this to backend
 */
const apiRequest = {
  endpoint: "POST /api/generate-questions",
  headers: {
    "Content-Type": "application/json"
  },
  body: {
    sport: "nfl",
    team: "new-york-jets",
    player: "curtis_martin",
    difficulty: "medium",
    timeScale: "mixed"
  }
};

/**
 * Backend returns this to frontend
 */
const apiResponse = {
  success: true,
  questions: {
    singleGame: [
      {
        question: "In 2000, Curtis Martin rushed for 143 yards and 3 TDs against the New England Patriots. How many fantasy points did this performance give him?",
        options: [30, 32, 34, 36],
        correct: 2,
        stat: "143 yards, 3 TDs",
        gameId: "nfl-2000-10-15",
        timeScale: "singleGame",
        difficulty: "medium"
      }
      // ... more single game questions
    ],
    singleSeason: [
      {
        question: "In the 2000 season, Curtis Martin finished as RB8 with 204.3 PPR points. Was this his best fantasy season?",
        options: ["2000: Career high at 204.3 PPR", "2000: Good year but not his best"],
        correct: 1,
        stat: "RB8 overall, 204.3 PPR (12.8 ppg)",
        yearId: 2000,
        timeScale: "singleSeason",
        difficulty: "medium"
      }
      // ... more single season questions
    ],
    allTime: [
      {
        question: "Curtis Martin surpassed 1,000 rushing yards in how many consecutive seasons?",
        options: [8, 9, 10, 11],
        correct: 2,
        stat: "10 consecutive 1000+ yard seasons (franchise record)",
        allTimeId: "curtis_martin",
        timeScale: "allTime",
        difficulty: "medium"
      }
      // ... more all-time questions
    ]
  },
  count: 15
};

// ============================================================================
// STEP 6: BROWSER EXECUTION
// ============================================================================

/**
 * Browser JavaScript execution flow:
 * 
 * 1. User selects: NFL → New York Jets → Curtis Martin → Mixed → Medium
 * 
 * 2. Frontend calls:
 *    fetch('http://localhost:3001/api/generate-questions', {
 *      method: 'POST',
 *      body: JSON.stringify({
 *        sport: 'nfl',
 *        team: 'new-york-jets',
 *        player: 'curtis_martin',
 *        difficulty: 'medium',
 *        timeScale: 'mixed'
 *      })
 *    })
 * 
 * 3. Backend:
 *    - Loads curtisMartin data
 *    - Filters games by difficulty (top 5 performances)
 *    - Filters seasons by difficulty (top 5 seasons)
 *    - Applies question templates
 *    - Generates 15 questions (5 single game + 5 single season + 5 all-time)
 *    - Returns JSON response
 * 
 * 4. Frontend:
 *    - Receives 15 questions
 *    - Shuffles them randomly
 *    - Displays first question with 30-second timer
 *    - User selects answer and submits
 *    - Scores added (15 points for correct medium question)
 *    - Shows next question
 *    - Repeats until all 15 questions answered
 *    - Shows results with breakdown by time scale
 */

// ============================================================================
// STEP 7: COMPLETE EXAMPLE - DIFFERENT TIME SCALES
// ============================================================================

const exampleQuestions = {
  samePLayer_differentScales: [
    {
      title: "Single Game",
      question: "In 2000, Curtis Martin rushed for 143 yards and 3 TDs against New England. How many fantasy points?",
      dataPoint: "One specific game performance",
      difficulty: "Easiest (well-documented)"
    },
    {
      title: "Single Season",
      question: "In 2001, Curtis Martin finished as RB5 with 228.1 PPR. Was this his best season?",
      dataPoint: "Entire season aggregated stats",
      difficulty: "Medium (requires season knowledge)"
    },
    {
      title: "All-Time",
      question: "Curtis Martin surpassed 1,000 rushing yards in how many consecutive seasons?",
      dataPoint: "Career record spanning 9 years",
      difficulty: "Hardest (requires deep knowledge)"
    }
  ]
};

// ============================================================================
// SUMMARY
// ============================================================================

console.log(`
╔════════════════════════════════════════════════════════════════╗
║        FANTASY SPORTS QUIZ - END-TO-END DATA FLOW              ║
╚════════════════════════════════════════════════════════════════╝

Raw Data (Curtis Martin)
├── Games: 160+ career games with individual stats
├── Seasons: 9 seasons with season totals
└── Career: 2,847 PPR points total

         ↓ (Template Application)

Generated Questions
├── Single Game: "In 2000, rushed for 143 yards, 3 TDs vs NE. Fantasy points?"
├── Single Season: "2001: RB5, 228.1 PPR. Best season?"
└── All-Time: "How many consecutive 1000+ yard seasons?"

         ↓ (API Request/Response)

Backend Processing (Node.js)
POST /api/generate-questions
  Input: sport, team, player, difficulty, timeScale
  Output: 15 questions (shuffled, with options)

         ↓ (Frontend Rendering)

User Quiz Experience
1. Select: Sport → Team → Player → Time Scale → Difficulty
2. See questions one at a time (30-second timer)
3. Select answer, submit
4. Get feedback (correct/incorrect)
5. Score points (10/15/20 based on difficulty)
6. View results with time scale breakdown

Result: User learns fantasy sports history through timed trivia!
`);
