/**
 * Frontend Integration Example
 * Shows how to modify the quiz HTML to connect to the Node.js backend
 * and load dynamic questions at different time scales
 */

// ============================================
// Configuration
// ============================================

const API_BASE = 'http://localhost:3001';

const SPORTS = {
  nfl: {
    name: 'NFL',
    teams: {
      'new-york-jets': {
        name: 'New York Jets',
        players: [
          { id: 'curtis_martin', name: 'Curtis Martin', position: 'RB', years: '1998-2006' },
          { id: 'thomas_jones', name: 'Thomas Jones', position: 'RB', years: '2007-2011' }
        ]
      },
      'san-francisco-49ers': {
        name: 'San Francisco 49ers',
        players: [
          { id: 'joe_montana', name: 'Joe Montana', position: 'QB', years: '1979-1992' },
          { id: 'jerry_rice', name: 'Jerry Rice', position: 'WR', years: '1985-2002' }
        ]
      }
    }
  },
  nba: {
    name: 'NBA',
    teams: {
      'los-angeles-lakers': {
        name: 'Los Angeles Lakers',
        players: [
          { id: 'lebron_james', name: 'LeBron James', position: 'F', years: '2018-present' }
        ]
      }
    }
  }
};

// ============================================
// Question Manager
// ============================================

class QuestionManager {
  constructor(apiBase = API_BASE) {
    this.apiBase = apiBase;
    this.currentQuestions = [];
    this.questionIndex = 0;
  }

  /**
   * Fetch questions from backend
   * @param {string} sport - Sport key (nfl, nba, etc)
   * @param {string} team - Team key
   * @param {string} player - Player key
   * @param {string} difficulty - easy, medium, hard
   * @param {string} timeScale - singleGame, singleSeason, allTime, mixed
   * @returns {Promise<Array>} Array of questions
   */
  async loadQuestions(sport, team, player, difficulty, timeScale = 'mixed') {
    try {
      const response = await fetch(`${this.apiBase}/api/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport, team, player, difficulty, timeScale })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate questions');
      }

      // Handle mixed vs single time scale responses
      if (timeScale === 'mixed') {
        this.currentQuestions = [
          ...data.questions.singleGame,
          ...data.questions.singleSeason,
          ...data.questions.allTime
        ];
      } else {
        // For single time scale, questions come as array
        this.currentQuestions = Array.isArray(data.questions) 
          ? data.questions 
          : [data.questions];
      }

      // Shuffle questions
      this.currentQuestions = this.currentQuestions.sort(() => Math.random() - 0.5);
      this.questionIndex = 0;

      console.log(`Loaded ${this.currentQuestions.length} questions`);
      return this.currentQuestions;
    } catch (error) {
      console.error('Error loading questions:', error);
      throw error;
    }
  }

  /**
   * Get current question
   * @returns {Object} Question object
   */
  getCurrentQuestion() {
    return this.currentQuestions[this.questionIndex];
  }

  /**
   * Move to next question
   * @returns {boolean} True if more questions, false if at end
   */
  nextQuestion() {
    this.questionIndex++;
    return this.questionIndex < this.currentQuestions.length;
  }

  /**
   * Get progress info
   * @returns {Object} Progress data
   */
  getProgress() {
    return {
      current: this.questionIndex + 1,
      total: this.currentQuestions.length,
      timeScales: this.getTimeScaleBreakdown()
    };
  }

  /**
   * Get breakdown of questions by time scale
   * @returns {Object} Count of questions per time scale
   */
  getTimeScaleBreakdown() {
    return {
      singleGame: this.currentQuestions.filter(q => q.timeScale === 'singleGame').length,
      singleSeason: this.currentQuestions.filter(q => q.timeScale === 'singleSeason').length,
      allTime: this.currentQuestions.filter(q => q.timeScale === 'allTime').length
    };
  }
}

// ============================================
// UI Integration
// ============================================

class QuizUI {
  constructor(questionManager) {
    this.qm = questionManager;
    this.score = 0;
    this.correctAnswers = 0;
    this.totalAnswered = 0;
    this.selectedAnswer = null;
    this.answered = false;
    this.timerInterval = null;
    this.timeRemaining = 10; // 10 seconds for countdown
    this.questionStartTime = null;
  }

  /**
   * Initialize UI components
   */
  initializeUI() {
    // Populate sport selector
    const sportGrid = document.getElementById('sportGrid');
    Object.entries(SPORTS).forEach(([key, sport]) => {
      const btn = document.createElement('button');
      btn.className = 'sport-btn';
      btn.onclick = () => this.selectSport(key, sport);
      btn.innerHTML = `<div>${sport.name}</div>`;
      sportGrid.appendChild(btn);
    });
  }

  /**
   * Handle sport selection
   */
  async selectSport(sportKey, sport) {
    const teamGrid = document.getElementById('teamGrid');
    teamGrid.innerHTML = ''; // Clear existing

    // Show teams for selected sport
    Object.entries(sport.teams).forEach(([teamKey, team]) => {
      const btn = document.createElement('button');
      btn.className = 'team-btn';
      btn.onclick = () => this.selectTeam(sportKey, teamKey, team);
      btn.innerHTML = `<div>${team.name}</div>`;
      teamGrid.appendChild(btn);
    });

    document.getElementById('sportScreen').style.display = 'none';
    document.getElementById('teamScreen').style.display = 'block';
  }

  /**
   * Handle team selection
   */
  selectTeam(sportKey, teamKey, team) {
    const playerGrid = document.getElementById('playerGrid');
    playerGrid.innerHTML = ''; // Clear existing

    // Show players for selected team
    team.players.forEach(player => {
      const btn = document.createElement('button');
      btn.className = 'player-btn';
      btn.onclick = () => this.selectPlayer(sportKey, teamKey, player);
      btn.innerHTML = `
        <div>${player.name}</div>
        <div class="data-source">${player.position} (${player.years})</div>
      `;
      playerGrid.appendChild(btn);
    });

    document.getElementById('teamScreen').style.display = 'none';
    document.getElementById('playerScreen').style.display = 'block';
  }

  /**
   * Handle player selection
   */
  selectPlayer(sportKey, teamKey, player) {
    // Show time scale selector
    const timeScaleButtons = document.querySelectorAll('.timescale-btn');
    timeScaleButtons.forEach(btn => {
      btn.onclick = (e) => this.selectTimeScale(
        e.target.dataset.timeScale,
        sportKey,
        teamKey,
        player
      );
    });

    document.getElementById('playerScreen').style.display = 'none';
    document.getElementById('timeScaleScreen').style.display = 'block';
  }

  /**
   * Handle time scale selection
   */
  selectTimeScale(timeScale, sportKey, teamKey, player) {
    // Show difficulty selector
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    difficultyButtons.forEach(btn => {
      btn.onclick = (e) => this.startQuiz(
        e.target.dataset.difficulty,
        sportKey,
        teamKey,
        player,
        timeScale
      );
    });

    document.getElementById('timeScaleScreen').style.display = 'none';
    document.getElementById('difficultyScreen').style.display = 'block';
  }

  /**
   * Start quiz with loaded questions
   */
  async startQuiz(difficulty, sportKey, teamKey, player, timeScale) {
    try {
      document.getElementById('loadingMessage').style.display = 'block';
      document.getElementById('difficultyScreen').style.display = 'none';

      // Load questions from backend
      await this.qm.loadQuestions(sportKey, teamKey, player.id, difficulty, timeScale);

      document.getElementById('loadingMessage').style.display = 'none';
      document.getElementById('quizScreen').style.display = 'block';

      // Display first question
      this.displayQuestion();
    } catch (error) {
      alert(`Error loading questions: ${error.message}`);
      document.getElementById('loadingMessage').style.display = 'none';
    }
  }

  /**
   * Display current question
   */
  displayQuestion() {
    const question = this.qm.getCurrentQuestion();
    if (!question) {
      this.showResults();
      return;
    }

    const progress = this.qm.getProgress();
    
    // Update UI
    document.getElementById('progressDisplay').innerHTML = 
      `Question ${progress.current} of ${progress.total}`;
    
    document.getElementById('questionText').innerHTML = 
      `${question.question}<span class="era-badge">${question.timeScale === 'singleGame' ? 'Single Game' : question.timeScale === 'singleSeason' ? 'Single Season' : 'All-Time'}</span>`;
    
    if (question.stat) {
      document.getElementById('statInfo').innerHTML = 
        `<div class="stat-badge">📊 ${question.stat}</div>`;
    }

    // Render options
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option';
      btn.innerText = option;
      btn.onclick = () => this.selectOption(idx);
      optionsContainer.appendChild(btn);
    });

    this.answered = false;
    this.selectedAnswer = null;
    document.getElementById('submitBtn').disabled = true;

    // Initialize timer: 2.5s read delay, then 10s countdown
    this.questionStartTime = Date.now();
    this.timeRemaining = 10;
    this.startTimerWithDelay();
  }

  /**
   * Start timer with 2.5s read delay before countdown begins
   */
  startTimerWithDelay() {
    // Disable options during read time
    document.querySelectorAll('.option').forEach(btn => btn.disabled = true);

    // After 2.5 seconds, start the countdown
    setTimeout(() => {
      document.querySelectorAll('.option').forEach(btn => btn.disabled = false);
      this.updateTimer();
    }, 2500);
  }

  /**
   * Update timer display and handle countdown
   */
  updateTimer() {
    // Clear any existing interval
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      this.timeRemaining--;

      // Update timer display
      const timerDisplay = document.getElementById('timerDisplay');
      if (timerDisplay) {
        timerDisplay.textContent = this.timeRemaining;
        
        // Color coding: green → yellow → red
        if (this.timeRemaining > 5) {
          timerDisplay.style.color = '#4CAF50'; // Green
        } else if (this.timeRemaining > 2) {
          timerDisplay.style.color = '#FFC107'; // Yellow
        } else {
          timerDisplay.style.color = '#F44336'; // Red
        }
      }

      // Auto-submit when time runs out
      if (this.timeRemaining <= 0) {
        clearInterval(this.timerInterval);
        this.autoSubmitAnswer();
      }
    }, 1000); // Update every second
  }

  /**
   * Calculate points based on time remaining
   * 10s remaining = 5 pts
   * 8s remaining = 4 pts
   * 6s remaining = 3 pts
   * 4s remaining = 2 pts
   * 2s remaining = 1 pt
   * 0s remaining = 0 pts
   */
  calculatePointsFromTime() {
    if (this.timeRemaining <= 0) return 0;
    if (this.timeRemaining >= 10) return 5;
    if (this.timeRemaining >= 8) return 4;
    if (this.timeRemaining >= 6) return 3;
    if (this.timeRemaining >= 4) return 2;
    if (this.timeRemaining >= 2) return 1;
    return 0;
  }

  /**
   * Handle option selection
   */
  selectOption(idx) {
    if (this.answered) return;

    this.selectedAnswer = idx;
    document.querySelectorAll('.option').forEach((btn, i) => {
      btn.classList.toggle('selected', i === idx);
    });
    document.getElementById('submitBtn').disabled = false;
  }

  /**
   * Submit answer with time-based scoring
   */
  submitAnswer() {
    if (this.answered) return;

    this.answered = true;
    
    // Stop timer
    if (this.timerInterval) clearInterval(this.timerInterval);

    const question = this.qm.getCurrentQuestion();
    const isCorrect = this.selectedAnswer === question.correct;

    // Calculate points: only award if correct
    let pointsEarned = 0;
    if (isCorrect) {
      pointsEarned = this.calculatePointsFromTime();
      this.score += pointsEarned;
      this.correctAnswers++;
    }

    // Show correct/incorrect
    document.querySelectorAll('.option').forEach((btn, idx) => {
      if (idx === question.correct) {
        btn.classList.add('correct');
      } else if (idx === this.selectedAnswer && !isCorrect) {
        btn.classList.add('incorrect');
      }
    });

    // Show points earned
    const pointsDisplay = document.getElementById('pointsDisplay');
    if (pointsDisplay) {
      if (isCorrect) {
        pointsDisplay.innerHTML = `<span style="color: #4CAF50;">+${pointsEarned} pts</span>`;
      } else {
        pointsDisplay.innerHTML = `<span style="color: #F44336;">+0 pts</span>`;
      }
    }

    // Update score display
    document.getElementById('currentScore').innerText = this.score;

    this.totalAnswered++;
    document.getElementById('submitBtn').disabled = true;
    setTimeout(() => this.nextQuestion(), 1500);
  }

  /**
   * Auto-submit when timer runs out
   */
  autoSubmitAnswer() {
    if (this.answered) return;

    // If no answer selected, select first option by default
    if (this.selectedAnswer === null) {
      this.selectedAnswer = 0;
      document.querySelectorAll('.option')[0].classList.add('selected');
    }

    this.submitAnswer();
  }

  /**
   * Move to next question
   */
  nextQuestion() {
    if (this.qm.nextQuestion()) {
      this.displayQuestion();
    } else {
      this.showResults();
    }
  }

  /**
   * Show results screen
   */
  showResults() {
    const accuracy = this.totalAnswered > 0 
      ? Math.round((this.correctAnswers / this.totalAnswered) * 100)
      : 0;
    
    const maxPossibleScore = this.totalAnswered * 5; // 5 points per question if answered instantly

    document.getElementById('quizScreen').style.display = 'none';
    document.getElementById('resultsScreen').style.display = 'block';

    document.getElementById('finalScore').innerText = `${this.score} / ${maxPossibleScore}`;

    let message = '';
    if (accuracy === 100 && this.score === maxPossibleScore) {
      message = "Perfect score! You're a fantasy legend! 🏆";
    } else if (accuracy === 100) {
      message = "Perfect accuracy! But you answered slowly.";
    } else if (accuracy >= 80) {
      message = "Excellent! You know your fantasy history.";
    } else if (accuracy >= 60) {
      message = "Good performance! You've got solid knowledge.";
    } else if (accuracy >= 40) {
      message = "Not bad! Study up and try again.";
    } else {
      message = "Keep learning! Try again.";
    }

    document.getElementById('performanceText').innerText = message;
    document.getElementById('statsText').innerHTML = `
      <strong>Accuracy:</strong> ${this.correctAnswers}/${this.totalAnswered} correct (${accuracy}%)<br>
      <strong>Score Breakdown:</strong> Max possible: ${maxPossibleScore} pts<br>
      <strong>Time Scales:</strong> Single Game (${this.qm.getProgress().timeScales.singleGame}) | 
                   Single Season (${this.qm.getProgress().timeScales.singleSeason}) | 
                   All-Time (${this.qm.getProgress().timeScales.allTime})
    `;
  }
}

// ============================================
// Initialize on page load
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const questionManager = new QuestionManager();
  const quizUI = new QuizUI(questionManager);
  quizUI.initializeUI();
});

// ============================================
// Example: Programmatic Quiz Start
// ============================================

/**
 * Start quiz for a specific player without UI navigation
 * Useful for testing or embedding
 */
async function quickStartQuiz(sport, team, player, difficulty = 'medium', timeScale = 'mixed') {
  const qm = new QuestionManager();
  const ui = new QuizUI(qm);
  
  try {
    await ui.startQuiz(difficulty, sport, team, player, timeScale);
    console.log(`Quiz started: ${player.name} (${difficulty} - ${timeScale})`);
  } catch (error) {
    console.error('Failed to start quiz:', error);
  }
}

// Usage:
// quickStartQuiz('nfl', 'new-york-jets', 
//   { id: 'curtis_martin', name: 'Curtis Martin' },
//   'medium',
//   'mixed'
// );

// ============================================
// Utility: Load Questions for Testing
// ============================================

/**
 * Load questions and log them for debugging
 */
async function testQuestionGeneration(sport, team, player, difficulty, timeScale) {
  const qm = new QuestionManager();
  
  try {
    const questions = await qm.loadQuestions(sport, team, player, difficulty, timeScale);
    
    console.group(`Questions for ${player} (${difficulty} - ${timeScale})`);
    questions.forEach((q, idx) => {
      console.log(`\n${idx + 1}. ${q.question}`);
      console.log(`   Options: ${q.options.join(', ')}`);
      console.log(`   Correct: ${q.options[q.correct]}`);
      console.log(`   Time Scale: ${q.timeScale}`);
      console.log(`   Stat: ${q.stat}`);
    });
    console.groupEnd();

    return questions;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Usage in browser console:
// testQuestionGeneration('nfl', 'new-york-jets', 'curtis_martin', 'medium', 'mixed')
