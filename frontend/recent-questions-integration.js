/**
 * DFS Quiz - Recent Questions Integration
 * Adds "Last Week" tab for live fantasy performance questions
 */

class RecentQuestionsManager {
  constructor(apiBase = API_BASE) {
    this.apiBase = apiBase;
  }

  /**
   * Fetch current NFL week
   */
  async getCurrentWeek() {
    try {
      const response = await fetch(`${this.apiBase}/api/current-week`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching current week:', error);
      return null;
    }
  }

  /**
   * Fetch recent top performers for a sport
   */
  async getRecentLeaders(sport = 'nfl') {
    try {
      const response = await fetch(`${this.apiBase}/api/recent-leaders/${sport}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching recent leaders:', error);
      return null;
    }
  }

  /**
   * Load recent/last-week questions
   * @param {string} sport - nfl, nba, mlb, nhl
   * @param {string} position - qb, rb, wr, etc (nfl only)
   * @param {string} difficulty - easy, medium, hard
   * @returns {Promise<Array>} Array of questions
   */
  async loadRecentQuestions(sport = 'nfl', position = 'qb', difficulty = 'easy') {
    try {
      const response = await fetch(`${this.apiBase}/api/generate-recent-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport,
          position,
          limit: 10
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate recent questions');
      }

      // Shuffle questions
      const questions = data.questions.sort(() => Math.random() - 0.5);

      console.log(`Loaded ${questions.length} recent questions for Week ${data.week}`);
      return questions;
    } catch (error) {
      console.error('Error loading recent questions:', error);
      throw error;
    }
  }
}

/**
 * UI UPDATE: Add "Recent" tab to quiz screen
 * 
 * In your HTML quiz screen, add:
 */

const recentUIHTML = `
<div id="eraToggleContainer" style="text-align: center; margin: 15px 0;">
  <button class="era-toggle-btn active" data-era="recent">📊 Last Week</button>
  <button class="era-toggle-btn" data-era="season">📈 Season</button>
  <button class="era-toggle-btn" data-era="alltime">🏆 All-Time</button>
</div>

<div id="weekIndicator" style="text-align: center; font-size: 12px; color: #999; margin: 10px 0;">
  <!-- Will show: "Week 8 - Updated Nov 24" -->
</div>

<div id="positionFilter" style="display: none; text-align: center; margin: 15px 0;">
  <button class="position-btn" data-position="qb">QB</button>
  <button class="position-btn" data-position="rb">RB</button>
  <button class="position-btn" data-position="wr">WR</button>
  <button class="position-btn" data-position="te">TE</button>
</div>
`;

/**
 * INTEGRATION: Update QuizUI to handle recent questions
 */

class QuizUIWithRecent extends QuizUI {
  constructor(questionManager, recentManager) {
    super(questionManager);
    this.recentManager = recentManager;
    this.currentEra = 'recent';
    this.currentPosition = 'qb';
  }

  /**
   * Initialize with era toggle
   */
  async initializeWithRecent() {
    this.initializeUI();
    
    // Add era buttons
    const eraButtons = document.querySelectorAll('.era-toggle-btn');
    eraButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchEra(e.target.dataset.era);
      });
    });

    // Add position buttons
    const positionButtons = document.querySelectorAll('.position-btn');
    positionButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentPosition = e.target.dataset.position;
        this.selectTimeScale(this.currentEra, 'nfl', 'auto', { id: 'auto' }, 'mixed');
      });
    });

    // Update week indicator
    await this.updateWeekInfo();
  }

  /**
   * Switch between recent, season, all-time
   */
  switchEra(era) {
    this.currentEra = era;
    
    // Update button states
    document.querySelectorAll('.era-toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.era === era);
    });

    // Show/hide position filter
    const positionFilter = document.getElementById('positionFilter');
    if (era === 'recent') {
      positionFilter.style.display = 'block';
    } else {
      positionFilter.style.display = 'none';
    }
  }

  /**
   * Update week indicator showing current week
   */
  async updateWeekInfo() {
    try {
      const weekInfo = await this.recentManager.getCurrentWeek();
      
      if (weekInfo) {
        const indicator = document.getElementById('weekIndicator');
        if (indicator) {
          if (weekInfo.inOffseason) {
            indicator.textContent = 'NFL is in offseason - using historical data';
          } else {
            const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            indicator.textContent = `Week ${weekInfo.week} - Updated ${date}`;
          }
        }
      }
    } catch (error) {
      console.error('Error updating week info:', error);
    }
  }

  /**
   * Load recent questions instead of static
   */
  async startRecentQuiz(sport = 'nfl', difficulty = 'easy') {
    try {
      document.getElementById('loadingMessage').style.display = 'block';

      const questions = await this.recentManager.loadRecentQuestions(
        sport,
        this.currentPosition,
        difficulty
      );

      this.qm.currentQuestions = questions;
      this.qm.questionIndex = 0;

      document.getElementById('loadingMessage').style.display = 'none';
      document.getElementById('quizScreen').style.display = 'block';

      this.displayQuestion();
    } catch (error) {
      alert(`Error loading recent questions: ${error.message}`);
      document.getElementById('loadingMessage').style.display = 'none';
    }
  }

  /**
   * Override displayQuestion to show week indicator
   */
  displayQuestion() {
    const question = this.qm.getCurrentQuestion();
    if (!question) {
      this.showResults();
      return;
    }

    // Call parent method
    super.displayQuestion();

    // Add week number to question display
    if (question.weekNumber) {
      const weekBadge = document.createElement('span');
      weekBadge.className = 'week-badge';
      weekBadge.textContent = `Week ${question.weekNumber}`;
      weekBadge.style.cssText = `
        display: inline-block;
        background: #FF6B35;
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        margin-left: 10px;
      `;
      
      const questionText = document.getElementById('questionText');
      const eraBadge = questionText.querySelector('.era-badge');
      if (eraBadge) {
        eraBadge.after(weekBadge);
      }
    }
  }
}

/**
 * USAGE IN HTML
 * 
 * <script>
 *   document.addEventListener('DOMContentLoaded', () => {
 *     const questionManager = new QuestionManager();
 *     const recentManager = new RecentQuestionsManager();
 *     const quizUI = new QuizUIWithRecent(questionManager, recentManager);
 *     
 *     quizUI.initializeWithRecent();
 *   });
 * </script>
 */

/**
 * EXAMPLE: Get leaders for display
 */
async function displayRecentLeaders(sport = 'nfl') {
  const rm = new RecentQuestionsManager();
  const leaders = await rm.getRecentLeaders(sport);
  
  if (leaders && leaders.leaders) {
    console.log(`Top performers in ${sport} last week:`);
    
    if (sport === 'nfl') {
      console.log('QBs:', leaders.leaders.qbs.map(q => `${q.name}: ${q.fantasyPoints}`));
      console.log('RBs:', leaders.leaders.rbs.map(r => `${r.name}: ${r.fantasyPoints}`));
      console.log('WRs:', leaders.leaders.wrs.map(w => `${w.name}: ${w.fantasyPoints}`));
    }
  }
}

/**
 * CSS for new elements
 */
const recentCSS = `
.era-toggle-btn {
  padding: 10px 15px;
  background: #f5f5f5;
  border: 2px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  margin: 0 5px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}

.era-toggle-btn:hover {
  border-color: #667eea;
  background: #f0f7ff;
}

.era-toggle-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #667eea;
}

.position-btn {
  padding: 8px 12px;
  background: #f5f5f5;
  border: 2px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  margin: 0 3px;
  font-size: 12px;
  font-weight: bold;
  transition: all 0.2s;
}

.position-btn:hover {
  border-color: #667eea;
}

.position-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.week-badge {
  display: inline-block;
  background: #FF6B35;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  margin-left: 10px;
  font-weight: 600;
}

#weekIndicator {
  font-size: 12px;
  color: #999;
  margin: 10px 0;
  font-style: italic;
}
`;
