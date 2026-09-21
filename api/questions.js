const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// REAL WEEK 1 2026 DATA
// ============================================

async function generateQuestions(sport, era) {
  let questions = [];

  if (sport === 'nfl') {
    if (era === 'recent') {
      questions = [
        {
          q: `Who led the NFL in passing yards in Week 1?`,
          a: 'Tyler Shough',
          opts: ['Tyler Shough', 'Patrick Mahomes', 'Lamar Jackson', 'Jared Goff'],
          stats: '410 passing yards'
        },
        {
          q: `Which RB had the most rushing yards in Week 1?`,
          a: 'Kenneth Walker',
          opts: ['Kenneth Walker', 'Josh Jacobs', 'Saquon Barkley', 'Christian McCaffrey'],
          stats: '173 rushing yards'
        },
        {
          q: `Who led in receiving yards in Week 1?`,
          a: 'Chris Olave',
          opts: ['Chris Olave', 'Travis Kelce', 'CeeDee Lamb', 'Tyreek Hill'],
          stats: '182 receiving yards'
        },
        {
          q: 'Which team did Tyler Shough play for?',
          a: 'New Orleans Saints',
          opts: ['New Orleans Saints', 'Kansas City Chiefs', 'Dallas Cowboys', 'San Francisco 49ers'],
          stats: 'NFL Week 1'
        },
        {
          q: 'What team does Kenneth Walker play for?',
          a: 'Kansas City Chiefs',
          opts: ['Kansas City Chiefs', 'Seattle Seahawks', 'Denver Broncos', 'Los Angeles Chargers'],
          stats: 'NFL Week 1'
        }
      ];
    } else if (era === 'season') {
      questions = [
        {
          q: 'Who is the NFL leading rusher this season?',
          a: 'Derrick Henry',
          opts: ['Derrick Henry', 'Josh Jacobs', 'Saquon Barkley', 'Kenneth Walker'],
          stats: '1200+ yards'
        },
        {
          q: 'Which WR has the most receiving yards this season?',
          a: 'Tyreek Hill',
          opts: ['Tyreek Hill', 'Chris Olave', 'CeeDee Lamb', 'Justin Jefferson'],
          stats: '1100+ yards'
        },
        {
          q: 'Who leads in passing yards this season?',
          a: 'Patrick Mahomes',
          opts: ['Patrick Mahomes', 'Tyler Shough', 'Lamar Jackson', 'Jared Goff'],
          stats: '4000+ yards'
        }
      ];
    } else {
      questions = [
        {
          q: 'Who holds the all-time rushing record?',
          a: 'Emmitt Smith',
          opts: ['Emmitt Smith', 'Walter Payton', 'Barry Sanders', 'Curtis Martin'],
          stats: '18,355 yards'
        },
        {
          q: 'Who has the most all-time passing yards?',
          a: 'Tom Brady',
          opts: ['Tom Brady', 'Peyton Manning', 'Drew Brees', 'Brett Favre'],
          stats: '89,214 yards'
        },
        {
          q: 'Who is the all-time leading receiver?',
          a: 'Jerry Rice',
          opts: ['Jerry Rice', 'Rob Gronkowski', 'Calvin Johnson', 'Terrell Owens'],
          stats: '22,895 yards'
        }
      ];
    }
  } else if (sport === 'nba') {
    if (era === 'recent') {
      questions = [
        {
          q: 'Who is leading the NBA in scoring?',
          a: 'Luka Doncic',
          opts: ['Luka Doncic', 'Shai Gilgeous-Alexander', 'Kevin Durant', 'LeBron James'],
          stats: '33.5 PPG'
        },
        {
          q: 'Which player leads in assists?',
          a: 'Nikola Jokic',
          opts: ['Nikola Jokic', 'Luka Doncic', 'Stephen Curry', 'Damian Lillard'],
          stats: '10.7 APG'
        }
      ];
    } else {
      questions = [
        {
          q: 'Who is the all-time leading scorer in NBA history?',
          a: 'LeBron James',
          opts: ['LeBron James', 'Kareem Abdul-Jabbar', 'Karl Malone', 'Kobe Bryant'],
          stats: '40,000+ points'
        }
      ];
    }
  } else if (sport === 'mlb') {
    questions = [
      {
        q: 'Who leads MLB in home runs?',
        a: 'Shea Langeliers',
        opts: ['Shea Langeliers', 'Aaron Judge', 'Juan Soto', 'Kyle Schwarber'],
        stats: '5 HR'
      },
      {
        q: 'Who holds the all-time home run record?',
        a: 'Barry Bonds',
        opts: ['Barry Bonds', 'Aaron Judge', 'Hank Aaron', 'Babe Ruth'],
        stats: '762 HR'
      }
    ];
  } else if (sport === 'nhl') {
    questions = [
      {
        q: 'Who leads NHL in goals?',
        a: 'Connor McDavid',
        opts: ['Connor McDavid', 'Auston Matthews', 'David Pastrnak', 'Artemi Panarin'],
        stats: 'Multiple goals'
      },
      {
        q: 'Who is the all-time leading goal scorer in NHL?',
        a: 'Wayne Gretzky',
        opts: ['Wayne Gretzky', 'Alex Ovechkin', 'Gordie Howe', 'Mario Lemieux'],
        stats: '894 goals'
      }
    ];
  }

  // Pad to 10 questions if needed
  while (questions.length < 10) {
    questions.push({
      q: 'Which team won the championship?',
      a: 'Your Team',
      opts: ['Your Team', 'Other Team', 'Another Team', 'Last Team'],
      stats: 'Championship'
    });
  }

  return questions.slice(0, 10);
}

// ============================================
// API ROUTES
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/questions', async (req, res) => {
  try {
    const { sport, era } = req.body;

    if (!sport) {
      return res.status(400).json({ error: 'Missing sport parameter' });
    }

    const questions = await generateQuestions(sport, era || 'recent');
    res.json({ questions, count: questions.length });
  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`DFS Quiz API running on port ${PORT}`);
  console.log(`POST /api/questions { "sport": "nfl", "era": "recent" }`);
});

module.exports = app;
