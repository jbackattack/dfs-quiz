/**
 * Fantasy Sports Quiz - Live Data Backend
 * Integrates sportsdataverse + ESPN Fantasy API
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());

// Fallback mock data (if APIs fail)
const mockRecentGames = {
  nfl: {
    currentWeek: 8,
    qbs: [
      { name: 'Josh Allen', team: 'Buffalo Bills', fantasyPoints: 42.3, rank: 1, opponent: 'Miami Dolphins' },
      { name: 'Lamar Jackson', team: 'Baltimore Ravens', fantasyPoints: 38.6, rank: 2, opponent: 'Pittsburgh Steelers' },
      { name: 'Jared Goff', team: 'Detroit Lions', fantasyPoints: 41.2, rank: 3, opponent: 'Chicago Bears' }
    ],
    rbs: [
      { name: 'Saquon Barkley', team: 'Philadelphia Eagles', fantasyPoints: 44.9, rank: 1, opponent: 'Washington Commanders' },
      { name: 'Christian McCaffrey', team: 'San Francisco 49ers', fantasyPoints: 43.5, rank: 2, opponent: 'Dallas Cowboys' }
    ],
    wrs: [
      { name: 'Ja\'Marr Chase', team: 'Cincinnati Bengals', fantasyPoints: 38.6, rank: 1, opponent: 'Las Vegas Raiders' },
      { name: 'Tyreek Hill', team: 'Miami Dolphins', fantasyPoints: 32.5, rank: 2, opponent: 'Buffalo Bills' }
    ]
  }
};

/**
 * ============================================
 * DATA SOURCE 1: SPORTSDATAVERSE
 * ============================================
 */

async function fetchFromSportsdataverse() {
  try {
    const sportsdata = require('sportsdataverse');
    const week = getCurrentNFLWeek();

    if (week.inOffseason) {
      console.log('NFL in offseason - using mock data');
      return null;
    }

    console.log(`Fetching sportsdataverse data for Week ${week.week} of ${week.year}`);

    // Fetch play-by-play data for the week
    const games = await sportsdata.nfl_pbp({
      seasons: [week.year],
      weeks: [week.week]
    });

    if (!games || games.length === 0) {
      console.log('No sportsdataverse games found');
      return null;
    }

    // Transform raw data to player stats
    const playerStats = transformSportsdataverseData(games);
    return playerStats;

  } catch (error) {
    console.error('Sportsdataverse fetch failed:', error.message);
    return null;
  }
}

function transformSportsdataverseData(games) {
  /**
   * Transform sportsdataverse PBP data to our format
   * games = array of play-by-play records
   * 
   * Expected structure:
   * [{ posteam, player_name, rushing_yds, receiving_yds, pass_yards, pass_td, rush_td, rec_td, ... }]
   */

  const players = {};

  games.forEach(play => {
    // Skip if no player data
    if (!play.player_name || !play.posteam) return;

    const key = `${play.player_name}-${play.posteam}`;

    if (!players[key]) {
      players[key] = {
        name: play.player_name,
        team: play.posteam,
        opponent: play.defteam || 'Unknown',
        passingYards: 0,
        passingTouchdowns: 0,
        rushingYards: 0,
        rushingTouchdowns: 0,
        receivingYards: 0,
        receivingTouchdowns: 0,
        receptions: 0
      };
    }

    // Accumulate stats
    if (play.pass_yards) players[key].passingYards += play.pass_yards;
    if (play.pass_touchdown) players[key].passingTouchdowns += play.pass_touchdown;
    if (play.rushing_yards) players[key].rushingYards += play.rushing_yards;
    if (play.rush_touchdown) players[key].rushingTouchdowns += play.rush_touchdown;
    if (play.rec_yards) players[key].receivingYards += play.rec_yards;
    if (play.rec_touchdown) players[key].receivingTouchdowns += play.rec_touchdown;
    if (play.reception) players[key].receptions += 1;
  });

  // Calculate fantasy points (PPR: 1pt per reception, 6pts TD, 0.1pts per passing yard, 0.1pts per rushing/receiving yard)
  const playerArray = Object.values(players).map(p => ({
    ...p,
    fantasyPoints: calculateFantasyPoints(p)
  }));

  // Sort by fantasy points and assign ranks
  const byPosition = {
    qbs: playerArray.filter(p => p.passingYards > 0).sort((a, b) => b.fantasyPoints - a.fantasyPoints),
    rbs: playerArray.filter(p => p.rushingYards > 0 || (p.receivingYards > 0 && !p.passingYards)).sort((a, b) => b.fantasyPoints - a.fantasyPoints),
    wrs: playerArray.filter(p => p.receivingYards > 0 && !p.rushingYards).sort((a, b) => b.fantasyPoints - a.fantasyPoints)
  };

  // Add ranks
  byPosition.qbs.forEach((p, i) => p.rank = i + 1);
  byPosition.rbs.forEach((p, i) => p.rank = i + 1);
  byPosition.wrs.forEach((p, i) => p.rank = i + 1);

  return {
    currentWeek: getCurrentNFLWeek().week,
    qbs: byPosition.qbs.slice(0, 10),
    rbs: byPosition.rbs.slice(0, 10),
    wrs: byPosition.wrs.slice(0, 10)
  };
}

/**
 * ============================================
 * DATA SOURCE 2: ESPN FANTASY API
 * ============================================
 */

async function fetchFromESPN() {
  try {
    const week = getCurrentNFLWeek();

    if (week.inOffseason) {
      console.log('NFL in offseason - using mock data');
      return null;
    }

    console.log(`Fetching ESPN Fantasy data for Week ${week.week}`);

    // Get scoreboard for the week
    const response = await axios.get(
      `https://fantasy.espn.com/apis/site/v2/scoreboard?leagueId=1&seasonId=${week.year}&matchupPeriod=${week.week}`,
      { timeout: 10000 }
    );

    const data = response.data;

    if (!data.players || data.players.length === 0) {
      console.log('No ESPN players found');
      return null;
    }

    // Transform ESPN data to our format
    const playerStats = transformESPNData(data.players, week.week);
    return playerStats;

  } catch (error) {
    console.error('ESPN API fetch failed:', error.message);
    return null;
  }
}

function transformESPNData(players, week) {
  /**
   * Transform ESPN fantasy API data
   * 
   * Expected structure:
   * [{ 
   *   player: { fullName, nflTeam },
   *   stats: [{ statId, value }],  // stat values indexed by ID
   *   healthData: { status } 
   * }]
   */

  const playerArray = players
    .map(p => {
      if (!p.player || !p.stats) return null;

      const stats = p.stats || {};
      const name = p.player.fullName;
      const team = p.player.nflTeam;

      // ESPN stat IDs: 0=pass yds, 1=pass TD, 2=int, 3=rush yds, 4=rush TD, 5=rec, 6=rec yds, 7=rec TD
      const passingYards = stats[0] || 0;
      const passingTouchdowns = stats[1] || 0;
      const rushingYards = stats[3] || 0;
      const rushingTouchdowns = stats[4] || 0;
      const receptions = stats[5] || 0;
      const receivingYards = stats[6] || 0;
      const receivingTouchdowns = stats[7] || 0;

      return {
        name,
        team,
        opponent: 'TBD', // ESPN doesn't easily provide this; would need lookup
        passingYards,
        passingTouchdowns,
        rushingYards,
        rushingTouchdowns,
        receptions,
        receivingYards,
        receivingTouchdowns,
        fantasyPoints: calculateFantasyPoints({
          passingYards,
          passingTouchdowns,
          rushingYards,
          rushingTouchdowns,
          receptions,
          receivingYards,
          receivingTouchdowns
        })
      };
    })
    .filter(p => p !== null)
    .sort((a, b) => b.fantasyPoints - a.fantasyPoints);

  // Sort by position and assign ranks
  const byPosition = {
    qbs: playerArray.filter(p => p.passingYards > 0),
    rbs: playerArray.filter(p => p.rushingYards > 0 || (p.receivingYards > 0 && !p.passingYards)),
    wrs: playerArray.filter(p => p.receivingYards > 0 && !p.rushingYards)
  };

  byPosition.qbs.forEach((p, i) => p.rank = i + 1);
  byPosition.rbs.forEach((p, i) => p.rank = i + 1);
  byPosition.wrs.forEach((p, i) => p.rank = i + 1);

  return {
    currentWeek: week,
    qbs: byPosition.qbs.slice(0, 10),
    rbs: byPosition.rbs.slice(0, 10),
    wrs: byPosition.wrs.slice(0, 10)
  };
}

/**
 * ============================================
 * SHARED UTILITIES
 * ============================================
 */

function getCurrentNFLWeek() {
  const now = new Date();
  const year = now.getFullYear();
  const seasonStart = new Date(year, 8, 1); // Sept 1
  const dayOfYear = Math.floor((now - seasonStart) / (24 * 60 * 60 * 1000));
  const week = Math.floor(dayOfYear / 7) + 1;

  return {
    year,
    week: Math.min(week, 18),
    inOffseason: week < 1 || week > 18
  };
}

function calculateFantasyPoints(player) {
  // PPR scoring: 1pt per reception, 6pts per TD, 0.1pts per yard
  let points = 0;

  points += (player.passingYards || 0) * 0.04; // 0.04 pts per pass yard
  points += (player.passingTouchdowns || 0) * 6;
  points -= (player.interceptions || 0) * 2;
  points += (player.rushingYards || 0) * 0.1;
  points += (player.rushingTouchdowns || 0) * 6;
  points += (player.receptions || 0) * 1; // PPR
  points += (player.receivingYards || 0) * 0.1;
  points += (player.receivingTouchdowns || 0) * 6;

  return Math.round(points * 10) / 10;
}

/**
 * ============================================
 * FALLBACK: AUTO-SELECT DATA SOURCE
 * ============================================
 */

async function getRecentGameData() {
  // Try sportsdataverse first
  let data = await fetchFromSportsdataverse();
  if (data) {
    console.log('✅ Using sportsdataverse data');
    return data;
  }

  // Fall back to ESPN
  data = await fetchFromESPN();
  if (data) {
    console.log('✅ Using ESPN Fantasy API data');
    return data;
  }

  // Fall back to mock
  console.log('⚠️  Using mock data (both APIs failed)');
  return mockRecentGames.nfl;
}

/**
 * ============================================
 * API ENDPOINTS
 * ============================================
 */

app.post('/api/generate-recent-questions', async (req, res) => {
  const { sport = 'nfl', position = 'qb', limit = 5 } = req.body;

  try {
    const recentData = await getRecentGameData();

    if (!recentData) {
      return res.status(500).json({ error: 'Failed to fetch recent data' });
    }

    const questions = [];
    let players = [];

    // Get players for position
    switch (position.toLowerCase()) {
      case 'qb':
        players = recentData.qbs || [];
        break;
      case 'rb':
        players = recentData.rbs || [];
        break;
      case 'wr':
        players = recentData.wrs || [];
        break;
      default:
        players = [...(recentData.qbs || []), ...(recentData.rbs || []), ...(recentData.wrs || [])];
    }

    // Generate questions (using templates from recent-questions-integration.js)
    players.slice(0, limit).forEach(player => {
      questions.push({
        question: `Who was the top ${position.toUpperCase()} in fantasy NFL last week (Week ${recentData.currentWeek})?`,
        options: [player.name, generateFakeName(player.name), generateFakeName(player.name), generateFakeName(player.name)],
        correct: 0,
        stat: `${player.name}: ${player.fantasyPoints} fantasy points`,
        weekNumber: recentData.currentWeek,
        sport: 'nfl',
        difficulty: 'easy'
      });
    });

    res.json({
      success: true,
      questions: questions.slice(0, limit),
      count: questions.slice(0, limit).length,
      week: recentData.currentWeek,
      sport,
      position
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/current-week', (req, res) => {
  const weekInfo = getCurrentNFLWeek();
  res.json({
    ...weekInfo,
    message: weekInfo.inOffseason
      ? 'NFL is currently in offseason'
      : `Currently in NFL Week ${weekInfo.week} of ${weekInfo.year}`
  });
});

app.get('/api/recent-leaders/:sport', async (req, res) => {
  const { sport } = req.params;

  if (sport !== 'nfl') {
    return res.status(404).json({ error: 'Currently only NFL supported' });
  }

  try {
    const data = await getRecentGameData();

    res.json({
      success: true,
      week: data.currentWeek,
      leaders: {
        qbs: data.qbs || [],
        rbs: data.rbs || [],
        wrs: data.wrs || []
      },
      sport
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'DFS Quiz API running' });
});

function generateFakeName(realName) {
  const firstNames = ['Patrick', 'Aaron', 'Tom', 'Travis', 'Kyle', 'Tyreek', 'Stefon'];
  const lastNames = ['Mahomes', 'Rodgers', 'Brady', 'Kelce', 'Shanahan', 'Hill', 'Diggs'];

  let fake = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  while (fake === realName) {
    fake = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  }
  return fake;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`DFS Quiz API running on http://localhost:${PORT}`);
});

module.exports = { fetchFromSportsdataverse, fetchFromESPN, getRecentGameData };
