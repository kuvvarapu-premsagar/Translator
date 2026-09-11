/*
=========================================================
PALASH MTB-MLE FRONTEND & ANIMATION ENGINE (v2.2)
=========================================================
Supports:
- English → Hindi (Primary Bridge)
- English Voice Recognition (en-IN / en-US) with Live Interims
- Hindi Speech Synthesis (hi-IN)
- Web Audio Synthesizer (Chimes, Fanfares, Clicks)
- Particle Confetti Physics System
- 3D Interactive Flashcard Flip Controls
- Voice Equalizer Waveform & Simulation Presets
- Kids Zone (बाल वाटिका) Quiz & Story Reader Engine
=========================================================
*/

// Node.js execution safeguard
if (typeof window === "undefined") {
    console.log("\n=======================================================");
    console.log("ℹ️  NOTICE: 'public/script.js' is a browser client script.");
    console.log("   It runs inside the browser with 'public/index.html'.");
    console.log("-------------------------------------------------------");
    console.log("👉 To run the application backend, please run: node server.js");
    console.log("🌐 Then open http://localhost:5000 in your browser.");
    console.log("=======================================================\n");
    process.exit(0);
}

const API_BASE = "/api";

let currentTranslation = "";
let currentLanguage = "santhali"; // Default target language: Santhali (Ol Chiki)
let recognition = null;
let isListening = false;
let translatorRecognizer = null;
let isTranslatorListening = false;

// Kids Zone State
let kidStars = 0;
let kidStreak = 0;
let currentKidTopic = "Colours";
let kidQuizList = [];
let currentQuizIndex = 0;
let kidStoriesList = [];

/* =====================================================
   THEME, AUDIO SOUND ENGINE & MICRO-ANIMATIONS
===================================================== */
let audioCtx = null;
let soundEnabled = localStorage.getItem("palash_sound") !== "false";

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    return audioCtx;
}

function playTapSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(480, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(960, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
    } catch (e) {}
}

function playChimeSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.value = freq;
            const startTime = ctx.currentTime + i * 0.07;
            gain.gain.setValueAtTime(0.12, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.35);
        });
    } catch (e) {}
}

function playThudSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
}

// 1. CHEERFUL CORRECT ANSWER SOUND (Sparkling Major Arpeggio + Bell)
function playCorrectSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = i === notes.length - 1 ? "sine" : "triangle";
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);
            const startTime = ctx.currentTime + i * 0.06;
            const duration = i === notes.length - 1 ? 0.45 : 0.25;
            gain.gain.setValueAtTime(0.14, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + duration);
        });
    } catch (e) {}
}

// 2. GENTLE ENCOURAGING WRONG ANSWER SOUND (Soft Descending Dual Tone)
function playWrongSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "triangle";
        osc2.type = "sine";

        // Gentle drop from ~210Hz down to 130Hz
        osc1.frequency.setValueAtTime(220, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.35);

        osc2.frequency.setValueAtTime(175, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.35);

        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.35);
        osc2.stop(ctx.currentTime + 0.35);
    } catch (e) {}
}

// 3. CARD FLIP SOUND (Crisp Paper/Whoosh Sweep)
function playCardFlipSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(740, ctx.currentTime + 0.08);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.09, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
    } catch (e) {}
}

// 4. CELEBRATION STAR POP (High-pitched sparkling ping)
function playStarPopSound(pitchIndex = 0) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const baseFreq = 980 * Math.pow(1.2, pitchIndex);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.16, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
}

// 5. TOPIC COMPLETION FANFARE (Triumphant Brass Melody)
function playTopicCompleteSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const notes = [
            { f: 523.25, t: 0, d: 0.14 },
            { f: 659.25, t: 0.12, d: 0.14 },
            { f: 783.99, t: 0.24, d: 0.14 },
            { f: 1046.50, t: 0.36, d: 0.45 },
            { f: 1318.51, t: 0.50, d: 0.65 }
        ];
        notes.forEach(n => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.value = n.f;
            const startTime = ctx.currentTime + n.t;
            gain.gain.setValueAtTime(0.16, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + n.d);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + n.d);
        });
    } catch (e) {}
}

// 6. WORKSHEET COMPLETION SOUND (Multi-Voice Celebration Chords)
function playWorksheetCompleteSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const chords = [
            { freqs: [523.25, 659.25], t: 0, d: 0.16 },
            { freqs: [587.33, 739.99], t: 0.15, d: 0.16 },
            { freqs: [659.25, 783.99], t: 0.30, d: 0.18 },
            { freqs: [783.99, 1046.50, 1318.51], t: 0.46, d: 0.70 }
        ];
        chords.forEach(c => {
            c.freqs.forEach(freq => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "triangle";
                osc.frequency.value = freq;
                const startTime = ctx.currentTime + c.t;
                gain.gain.setValueAtTime(0.11, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + c.d);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + c.d);
            });
        });
    } catch (e) {}
}

// 7. COURSE GRADUATION & GRAND VICTORY SOUND (Grand Royal Overture)
function playCourseCompleteSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const sequence = [
            { f: 440.00, t: 0, d: 0.15 },
            { f: 554.37, t: 0.14, d: 0.15 },
            { f: 659.25, t: 0.28, d: 0.15 },
            { f: 880.00, t: 0.42, d: 0.35 },
            { f: 783.99, t: 0.75, d: 0.15 },
            { f: 880.00, t: 0.90, d: 0.20 },
            { f: 1108.73, t: 1.10, d: 0.90 },
            { f: 1318.51, t: 1.10, d: 0.90 }
        ];
        sequence.forEach(item => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.value = item.f;
            const startTime = ctx.currentTime + item.t;
            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + item.d);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + item.d);
        });
    } catch (e) {}
}

// 8. BADGE UNLOCK & LEVEL UP SOUND (Celestial Ascending Sparkles)
function playBadgeUnlockSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const notes = [659.25, 830.61, 987.77, 1318.51, 1661.22, 1975.53];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            const startTime = ctx.currentTime + i * 0.07;
            gain.gain.setValueAtTime(0.12, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.35);
        });
    } catch (e) {}
}

function playFanfareSound() {
    playTopicCompleteSound();
}

function toggleSoundFX() {
    soundEnabled = !soundEnabled;
    localStorage.setItem("palash_sound", soundEnabled ? "true" : "false");
    const icon = document.getElementById("soundIcon");
    if (icon) icon.textContent = soundEnabled ? "🔊" : "🔇";
    if (soundEnabled) playTapSound();
    showToast(soundEnabled ? "Sound effects enabled 🔊" : "Sound effects muted 🔇", "♪");
}

function toggleTheme() {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("palash_theme", isDark ? "dark" : "light");
    const icon = document.getElementById("themeIcon");
    if (icon) icon.textContent = isDark ? "☀️" : "🌙";
    if (soundEnabled) playTapSound();
    showToast(isDark ? "Dark Classroom Mode 🌙" : "Light Classroom Mode ☀️", "✦");
}

function initThemeAndSound() {
    const savedTheme = localStorage.getItem("palash_theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
        document.body.classList.add("dark-mode");
        const icon = document.getElementById("themeIcon");
        if (icon) icon.textContent = "☀️";
    }
    
    const savedSound = localStorage.getItem("palash_sound");
    if (savedSound === "false") {
        soundEnabled = false;
        const icon = document.getElementById("soundIcon");
        if (icon) icon.textContent = "🔇";
    }
}

/* =====================================================
   USER PROFILE, PERFORMANCE & CELEBRATIONS ENGINE
===================================================== */
const DEFAULT_PROFILE = {
    name: "Sunita Murmu",
    role: "Primary Educator",
    school: "GPS Dumka, Jharkhand",
    grade: "Grade 1 - 3 (FLN)",
    avatar: "👨‍🏫",
    level: 3,
    xp: 480,
    xpToNext: 600,
    stars: 140,
    streakDays: 5,
    gamesMastered: 16,
    flashcardsMastered: 16,
    worksheetsCompleted: 4,
    quizzesCompleted: 6,
    totalQuizQuestions: 30,
    correctQuizAnswers: 28,
    audioPronunciationsListened: 18,
    completedModules: {
        literacy: false,
        numeracy: false,
        language: false
    },
    topicMastery: {
        "Classroom": { mastered: 6, total: 8 },
        "Numbers": { mastered: 7, total: 8 },
        "Colours": { mastered: 8, total: 8 },
        "Animals": { mastered: 5, total: 8 },
        "Foundational Literacy": { mastered: 5, total: 5 },
        "Foundational Numeracy": { mastered: 4, total: 5 }
    },
    badges: [
        { id: "first_step", title: "🌱 First Steps", desc: "Started MTB-MLE Primary Journey", unlocked: true, icon: "🌱" },
        { id: "game_master", title: "🎮 Arena Master", desc: "Mastered 10+ Multi-Tier Language Game Challenges", unlocked: true, icon: "🎮" },
        { id: "quiz_ace", title: "🎯 Quiz Star", desc: "Aced a vocabulary quiz with 100% score", unlocked: true, icon: "🎯" },
        { id: "worksheet_hero", title: "📝 Worksheet Hero", desc: "Solved 3+ FLN Bilingual Worksheets", unlocked: true, icon: "📝" },
        { id: "streak_master", title: "🔥 5-Day Streak", desc: "Maintained a 5-day active streak", unlocked: true, icon: "🔥" },
        { id: "course_graduate", title: "🎓 Course Graduate", desc: "Completed all Foundational Modules", unlocked: false, icon: "🎓" }
    ],
    activities: [
        { title: "Won Colours Game Challenge", detail: "Scored 100% in Santhali Colours Arena", icon: "🎮", time: "Earlier Today", type: "game" },
        { title: "Completed Grade 1 Literacy Worksheet", detail: "Scored 100% in NIPUN Foundational Literacy", icon: "📝", time: "Yesterday", type: "worksheet" },
        { title: "Colours & Shapes Quiz", detail: "Scored 50/50 points (5/5 Correct)", icon: "🎯", time: "2 days ago", type: "quiz" }
    ]
};

function getUserProfile() {
    try {
        const stored = localStorage.getItem("palash_user_profile_v2");
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_PROFILE, ...parsed };
        }
    } catch (e) {}
    return { ...DEFAULT_PROFILE };
}

function saveUserProfile(profile) {
    try {
        localStorage.setItem("palash_user_profile_v2", JSON.stringify(profile));
        syncProfileHeaders(profile);
    } catch (e) {}
}

function syncProfileHeaders(profile) {
    const prof = profile || getUserProfile();
    const headerAvatar = document.getElementById("headerProfileAvatar");
    if (headerAvatar) headerAvatar.textContent = prof.avatar || "👨‍🏫";

    const sideAvatar = document.getElementById("sidebarTeacherAvatar");
    if (sideAvatar) sideAvatar.textContent = prof.avatar || "👨‍🏫";

    const sideName = document.getElementById("sidebarTeacherName");
    if (sideName) sideName.textContent = prof.name || "Sunita Murmu";

    const sideRole = document.getElementById("sidebarTeacherRole");
    if (sideRole) sideRole.textContent = `Level ${prof.level} • ${prof.role ? prof.role.split(" ")[0] : "Explorer"}`;
}

function updateUserStats(updates = {}) {
    const prof = getUserProfile();

    if (updates.stars) {
        prof.stars = Math.max(0, (prof.stars || 0) + updates.stars);
        kidStars = prof.stars;
        const starsElem = document.getElementById("kidStars");
        if (starsElem) starsElem.textContent = kidStars;
    }

    if (updates.xp) {
        prof.xp = (prof.xp || 0) + updates.xp;
        while (prof.xp >= prof.xpToNext) {
            prof.level += 1;
            prof.xpToNext += prof.level * 200;
            playBadgeUnlockSound();
            fireConfetti(true);
            showToast(`⭐ LEVEL UP! You reached Level ${prof.level}!`, "🌟");
        }
    }

    if (updates.games) {
        prof.gamesMastered = (prof.gamesMastered || 0) + updates.games;
    }
    if (updates.flashcards) {
        prof.gamesMastered = (prof.gamesMastered || 0) + updates.flashcards;
    }

    if (updates.worksheets) {
        prof.worksheetsCompleted = (prof.worksheetsCompleted || 0) + updates.worksheets;
    }

    if (updates.quizzes) {
        prof.quizzesCompleted = (prof.quizzesCompleted || 0) + updates.quizzes;
    }

    if (updates.quizQuestions) {
        prof.totalQuizQuestions = (prof.totalQuizQuestions || 0) + updates.quizQuestions;
    }

    if (updates.quizCorrect) {
        prof.correctQuizAnswers = (prof.correctQuizAnswers || 0) + updates.quizCorrect;
    }

    if (updates.audio) {
        prof.audioPronunciationsListened = (prof.audioPronunciationsListened || 0) + updates.audio;
    }

    checkAndUnlockBadges(prof);
    saveUserProfile(prof);
    return prof;
}

function recordActivity(title, detail, icon = "✨", type = "general") {
    const prof = getUserProfile();
    const newAct = {
        title,
        detail,
        icon,
        type,
        time: "Just now"
    };
    prof.activities = [newAct, ...(prof.activities || [])].slice(0, 20);
    saveUserProfile(prof);
}

function checkAndUnlockBadges(prof) {
    let unlockedAny = false;
    prof.badges.forEach(b => {
        if (!b.unlocked) {
            let shouldUnlock = false;
            if ((b.id === "game_master" || b.id === "flashcard_champ") && ((prof.gamesMastered || 0) >= 10 || (prof.flashcardsMastered || 0) >= 10)) shouldUnlock = true;
            if (b.id === "worksheet_hero" && prof.worksheetsCompleted >= 3) shouldUnlock = true;
            if (b.id === "streak_master" && prof.streakDays >= 5) shouldUnlock = true;
            if (b.id === "course_graduate" && prof.completedModules && prof.completedModules.literacy && prof.completedModules.numeracy && prof.completedModules.language) shouldUnlock = true;

            if (shouldUnlock) {
                b.unlocked = true;
                b.date = new Date().toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });
                unlockedAny = true;
                setTimeout(() => {
                    playBadgeUnlockSound();
                    showToast(`🏆 New Honor Unlocked: ${b.title}!`, "🎖️");
                }, 800);
            }
        }
    });
    return unlockedAny;
}

function renderProfilePage() {
    const prof = getUserProfile();
    syncProfileHeaders(prof);

    // Profile Hero Identity
    const avatarEl = document.getElementById("profileUserAvatar");
    if (avatarEl) avatarEl.textContent = prof.avatar || "👨‍🏫";

    const nameEl = document.getElementById("profileUserName");
    if (nameEl) nameEl.textContent = prof.name || "Sunita Murmu";

    const roleEl = document.getElementById("profileUserRole");
    if (roleEl) roleEl.textContent = `👨‍🏫 ${prof.role || "Primary Educator"}`;

    const schoolEl = document.getElementById("profileUserSchool");
    if (schoolEl) schoolEl.textContent = `🏫 ${prof.school || "GPS Dumka, Jharkhand"}`;

    const gradeEl = document.getElementById("profileUserGrade");
    if (gradeEl) gradeEl.textContent = `🎒 ${prof.grade || "Grade 1 - 3 (FLN)"}`;

    const langEl = document.getElementById("profileUserLang");
    if (langEl) langEl.textContent = `🇮🇳 ${getLanguageName(currentLanguage)}`;

    // Level & XP
    const levelEl = document.getElementById("profileLevelText");
    if (levelEl) levelEl.textContent = `Level ${prof.level} • FLN Explorer`;

    const xpTextEl = document.getElementById("profileXpText");
    if (xpTextEl) xpTextEl.textContent = `${prof.xp} / ${prof.xpToNext} XP`;

    const xpFillEl = document.getElementById("profileXpFill");
    if (xpFillEl) {
        const pct = Math.min(100, Math.round((prof.xp / prof.xpToNext) * 100));
        xpFillEl.style.width = `${pct}%`;
    }

    const streakEl = document.getElementById("profileStreakCount");
    if (streakEl) streakEl.textContent = prof.streakDays || 5;

    // Metrics Grid
    const statStars = document.getElementById("profileStatStars");
    if (statStars) animateCounter(statStars, prof.stars || 0, 800);

    const statCards = document.getElementById("profileStatGames") || document.getElementById("profileStatFlashcards");
    if (statCards) animateCounter(statCards, prof.gamesMastered || prof.flashcardsMastered || 16, 800);

    const statWs = document.getElementById("profileStatWorksheets");
    if (statWs) animateCounter(statWs, prof.worksheetsCompleted || 0, 800);

    const statAcc = document.getElementById("profileStatAccuracy");
    if (statAcc) {
        const accuracy = prof.totalQuizQuestions > 0 ? Math.round((prof.correctQuizAnswers / prof.totalQuizQuestions) * 100) : 100;
        statAcc.textContent = `${accuracy}%`;
    }

    const statQuizCount = document.getElementById("profileStatQuizCount");
    if (statQuizCount) statQuizCount.textContent = `${prof.quizzesCompleted || 0} quizzes completed`;

    const statMod = document.getElementById("profileStatModules");
    if (statMod) {
        let completedCount = 0;
        if (prof.completedModules?.literacy) completedCount++;
        if (prof.completedModules?.numeracy) completedCount++;
        if (prof.completedModules?.language) completedCount++;
        statMod.textContent = `${completedCount} / 3`;
    }

    const statAudio = document.getElementById("profileStatAudio");
    if (statAudio) animateCounter(statAudio, prof.audioPronunciationsListened || 0, 800);

    // Topic Mastery Progress
    const masteryContainer = document.getElementById("topicMasteryList");
    if (masteryContainer) {
        const topics = prof.topicMastery || {};
        masteryContainer.innerHTML = Object.entries(topics).map(([topName, data]) => {
            const pct = Math.min(100, Math.round((data.mastered / data.total) * 100));
            return `
                <div class="mastery-item">
                    <div class="mastery-labels">
                        <strong>${topName}</strong>
                        <span>${data.mastered} / ${data.total} (${pct}%)</span>
                    </div>
                    <div class="progress-track" style="height:8px; margin-top:4px;">
                        <div class="progress-fill" style="width:${pct}%; background: linear-gradient(90deg, #0d9488, #10b981);"></div>
                    </div>
                </div>
            `;
        }).join("");
    }

    // Achievements Grid
    const badgesContainer = document.getElementById("profileBadgesGrid");
    if (badgesContainer) {
        const unlockedCount = prof.badges.filter(b => b.unlocked).length;
        const countPill = document.getElementById("profileBadgeCount");
        if (countPill) countPill.textContent = `${unlockedCount} / ${prof.badges.length} Unlocked`;

        badgesContainer.innerHTML = prof.badges.map(b => `
            <div class="badge-card ${b.unlocked ? 'unlocked' : 'locked'}">
                <div class="badge-icon-wrap">${b.icon || '🎖️'}</div>
                <div class="badge-text">
                    <h4>${b.title}</h4>
                    <p>${b.desc}</p>
                    <small class="badge-status-note">${b.unlocked ? '✅ Unlocked' : '🔒 In Progress'}</small>
                </div>
            </div>
        `).join("");
    }

    // Recent Activity Timeline
    const timeline = document.getElementById("profileActivityTimeline");
    if (timeline) {
        if (!prof.activities || prof.activities.length === 0) {
            timeline.innerHTML = `<div class="empty-timeline"><span>🌱</span><p>No recent activities logged yet.</p></div>`;
        } else {
            timeline.innerHTML = prof.activities.map(act => `
                <div class="timeline-row">
                    <div class="timeline-icon-box">${act.icon || '✨'}</div>
                    <div class="timeline-details">
                        <h4>${act.title}</h4>
                        <p>${act.detail}</p>
                    </div>
                    <span class="timeline-time">${act.time || 'Recently'}</span>
                </div>
            `).join("");
        }
    }
}

// Avatar Picker Modal
const AVATARS_LIST = ["👨‍🏫", "👩‍🎓", "👦", "👧", "🦁", "🌟", "🏹", "🌿", "🦉", "🦊", "🐯", "🦚"];

function openAvatarModal() {
    playTapSound();
    const modal = document.getElementById("avatarModal");
    const grid = document.getElementById("avatarPickerGrid");
    if (grid) {
        const currentProf = getUserProfile();
        grid.innerHTML = AVATARS_LIST.map(av => `
            <button class="avatar-option-btn ${av === currentProf.avatar ? 'selected' : ''}" onclick="selectAvatar('${av}')">
                <span>${av}</span>
            </button>
        `).join("");
    }
    if (modal) modal.style.display = "flex";
}

function closeAvatarModal() {
    playTapSound();
    const modal = document.getElementById("avatarModal");
    if (modal) modal.style.display = "none";
}

function selectAvatar(av) {
    playCorrectSound();
    const prof = getUserProfile();
    prof.avatar = av;
    saveUserProfile(prof);
    closeAvatarModal();
    renderProfilePage();
    showToast(`Avatar updated! ${av}`, "✓");
}

// Edit Profile Modal
function openEditProfileModal() {
    playTapSound();
    const prof = getUserProfile();
    const nameInp = document.getElementById("inputProfileName");
    const schoolInp = document.getElementById("inputProfileSchool");
    const gradeInp = document.getElementById("inputProfileGrade");
    const roleInp = document.getElementById("inputProfileRole");

    if (nameInp) nameInp.value = prof.name || "";
    if (schoolInp) schoolInp.value = prof.school || "";
    if (gradeInp) gradeInp.value = prof.grade || "Grade 1 - 3 (FLN)";
    if (roleInp) roleInp.value = prof.role || "Primary Educator";

    const modal = document.getElementById("editProfileModal");
    if (modal) modal.style.display = "flex";
}

function closeEditProfileModal() {
    playTapSound();
    const modal = document.getElementById("editProfileModal");
    if (modal) modal.style.display = "none";
}

function saveProfileChanges() {
    const prof = getUserProfile();
    const nameInp = document.getElementById("inputProfileName");
    const schoolInp = document.getElementById("inputProfileSchool");
    const gradeInp = document.getElementById("inputProfileGrade");
    const roleInp = document.getElementById("inputProfileRole");

    if (nameInp && nameInp.value.trim()) prof.name = nameInp.value.trim();
    if (schoolInp && schoolInp.value.trim()) prof.school = schoolInp.value.trim();
    if (gradeInp) prof.grade = gradeInp.value;
    if (roleInp) prof.role = roleInp.value;

    saveUserProfile(prof);
    playCorrectSound();
    closeEditProfileModal();
    renderProfilePage();
    showToast("Profile details updated! ✓", "✓");
}

function resetLearningHistory() {
    if (confirm("Reset learning progress and stats back to starting defaults?")) {
        localStorage.removeItem("palash_user_profile_v2");
        playTapSound();
        renderProfilePage();
        showToast("Progress reset to initial state", "↺");
    }
}

function initUserProfile() {
    const prof = getUserProfile();
    kidStars = prof.stars || 0;
    const starsElem = document.getElementById("kidStars");
    if (starsElem) starsElem.textContent = kidStars;
    syncProfileHeaders(prof);
    updateCurriculumUI();
}

/* =====================================================
   CELEBRATION MODAL ENGINE
===================================================== */
let celebrationNextAction = null;

function showCelebrationModal({
    title = "शानदार! Outstanding Work! 🎉",
    subtitle = "You have completed this topic!",
    pill = "MODULE COMPLETED",
    icon = "🏆",
    stars = 3,
    stats = [],
    onNext = null,
    nextLabel = "Continue Learning →",
    onReview = null,
    reviewLabel = "🔍 Review Mistakes"
}) {
    const modal = document.getElementById("celebrationModal");
    if (!modal) return;

    celebrationNextAction = onNext;

    const titleEl = document.getElementById("celebrationTitle");
    if (titleEl) titleEl.textContent = title;

    const subEl = document.getElementById("celebrationSubtitle");
    if (subEl) subEl.textContent = subtitle;

    const pillEl = document.getElementById("celebrationPill");
    if (pillEl) pillEl.textContent = pill.toUpperCase();

    const iconEl = document.getElementById("celebrationIcon");
    if (iconEl) iconEl.textContent = icon;

    const statsGrid = document.getElementById("celebrationStatsGrid");
    if (statsGrid) {
        statsGrid.innerHTML = stats.map(s => `
            <div class="celebration-stat-pill">
                <span class="stat-pill-label">${s.label}</span>
                <strong class="stat-pill-val">${s.value}</strong>
            </div>
        `).join("");
    }

    const nextBtn = document.getElementById("celebrationNextBtn");
    if (nextBtn) nextBtn.textContent = nextLabel;

    const reviewBtn = document.getElementById("celebrationReviewBtn");
    if (reviewBtn) {
        if (onReview) {
            reviewBtn.style.display = "inline-flex";
            reviewBtn.textContent = reviewLabel;
            reviewBtn.onclick = () => {
                closeCelebrationModal();
                onReview();
            };
        } else {
            reviewBtn.style.display = "none";
        }
    }

    modal.style.display = "flex";
    modal.classList.add("show");

    // Play sounds & animate stars in sequence
    fireConfetti(true);

    const starElems = document.querySelectorAll(".celebration-star");
    starElems.forEach((star, index) => {
        star.classList.remove("pop");
        if (index < stars) {
            setTimeout(() => {
                star.classList.add("pop");
                playStarPopSound(index);
            }, 300 + index * 260);
        } else {
            star.style.opacity = "0.2";
        }
    });
}

function closeCelebrationModal() {
    playTapSound();
    const modal = document.getElementById("celebrationModal");
    if (modal) {
        modal.classList.remove("show");
        modal.style.display = "none";
    }
}

function celebrateNextStep() {
    closeCelebrationModal();
    if (typeof celebrationNextAction === "function") {
        celebrationNextAction();
    }
}

/* =====================================================
   NIPUN CURRICULUM COURSE COMPLETION ENGINE
===================================================== */
function updateCurriculumUI() {
    const prof = getUserProfile();
    const modules = prof.completedModules || {};

    const btnLit = document.getElementById("btnModuleLit");
    const cardLit = document.getElementById("cardModuleLiteracy");
    if (btnLit && cardLit) {
        if (modules.literacy) {
            btnLit.innerHTML = `<span class="check-circle">✓</span> Completed`;
            btnLit.classList.add("completed");
            cardLit.classList.add("module-done");
        } else {
            btnLit.innerHTML = `<span class="check-circle">○</span> Mark as Completed`;
            btnLit.classList.remove("completed");
            cardLit.classList.remove("module-done");
        }
    }

    const btnNum = document.getElementById("btnModuleNum");
    const cardNum = document.getElementById("cardModuleNumeracy");
    if (btnNum && cardNum) {
        if (modules.numeracy) {
            btnNum.innerHTML = `<span class="check-circle">✓</span> Completed`;
            btnNum.classList.add("completed");
            cardNum.classList.add("module-done");
        } else {
            btnNum.innerHTML = `<span class="check-circle">○</span> Mark as Completed`;
            btnNum.classList.remove("completed");
            cardNum.classList.remove("module-done");
        }
    }

    const btnLang = document.getElementById("btnModuleLang");
    const cardLang = document.getElementById("cardModuleLanguage");
    if (btnLang && cardLang) {
        if (modules.language) {
            btnLang.innerHTML = `<span class="check-circle">✓</span> Completed`;
            btnLang.classList.add("completed");
            cardLang.classList.add("module-done");
        } else {
            btnLang.innerHTML = `<span class="check-circle">○</span> Mark as Completed`;
            btnLang.classList.remove("completed");
            cardLang.classList.remove("module-done");
        }
    }

    let completedCount = 0;
    if (modules.literacy) completedCount++;
    if (modules.numeracy) completedCount++;
    if (modules.language) completedCount++;

    const statusEl = document.getElementById("courseModulesStatus");
    if (statusEl) statusEl.textContent = `${completedCount} of 3 Completed`;

    const progressFill = document.getElementById("courseProgressFill");
    if (progressFill) {
        const pct = Math.round((completedCount / 3) * 100);
        progressFill.style.width = `${pct}%`;
    }

    const claimBtn = document.getElementById("claimCourseCertBtn");
    if (claimBtn) {
        claimBtn.style.display = completedCount === 3 ? "inline-flex" : "none";
    }
}

function toggleModuleCompletion(moduleKey) {
    playTapSound();
    const prof = getUserProfile();
    if (!prof.completedModules) {
        prof.completedModules = { literacy: false, numeracy: false, language: false };
    }

    const wasCompleted = !!prof.completedModules[moduleKey];
    prof.completedModules[moduleKey] = !wasCompleted;

    if (!wasCompleted) {
        playCorrectSound();
        updateUserStats({ xp: 60, stars: 20 });
        recordActivity(
            `Completed Module: ${moduleKey.toUpperCase()}`,
            `Passed learning outcome requirements for ${moduleKey}`,
            "🎓",
            "course"
        );
        showToast(`Module marked complete! +60 XP ⭐`, "✓");

        let count = 0;
        if (prof.completedModules.literacy) count++;
        if (prof.completedModules.numeracy) count++;
        if (prof.completedModules.language) count++;

        if (count === 3) {
            // All 3 completed!
            setTimeout(() => {
                playCourseCompleteSound();
                fireConfetti(true);
                showCelebrationModal({
                    title: "🎓 FULL COURSE COMPLETED!",
                    subtitle: "Congratulations! You have completed all Foundational FLN Modules in PALASH MTB-MLE!",
                    pill: "COURSE GRADUATE",
                    icon: "🎖️",
                    stars: 3,
                    stats: [
                        { label: "Modules", value: "3 / 3" },
                        { label: "Stars Earned", value: "+100 ⭐" },
                        { label: "Bonus XP", value: "+250 XP" },
                        { label: "Honor", value: "FLN Master" }
                    ],
                    onNext: () => claimCourseCertificate(),
                    nextLabel: "🏆 View Certificate"
                });
                updateUserStats({ xp: 250, stars: 100 });
                checkAndUnlockBadges(prof);
            }, 500);
        }
    } else {
        saveUserProfile(prof);
        showToast("Module marked incomplete", "○");
    }

    updateCurriculumUI();
    renderProfilePage();
}

function claimCourseCertificate() {
    playCorrectSound();
    const prof = getUserProfile();
    const modal = document.getElementById("certificateModal");
    const nameEl = document.getElementById("certStudentName");
    const dateEl = document.getElementById("certIssueDate");

    if (nameEl) nameEl.textContent = prof.name || "Sunita Murmu";
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString("en-IN", { day: '2-digit', month: 'long', year: 'numeric' });

    if (modal) modal.style.display = "flex";
}

function closeCertificateModal() {
    playTapSound();
    const modal = document.getElementById("certificateModal");
    if (modal) modal.style.display = "none";
}

function animateCounter(element, targetNumber, duration = 1200, suffix = "") {
    if (!element) return;
    const startTime = performance.now();
    const startNumber = 0;
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.floor(startNumber + (targetNumber - startNumber) * easeOut);
        element.textContent = currentVal.toLocaleString() + suffix;
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = targetNumber.toLocaleString() + suffix;
        }
    }
    requestAnimationFrame(update);
}

/* =====================================================
   CANVAS CONFETTI PARTICLE SYSTEM
===================================================== */
function fireConfetti(isGrand = false) {
    const canvas = document.getElementById("confettiCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ["#0d9488", "#10b981", "#f59e0b", "#f97316", "#3b82f6", "#ec4899", "#8b5cf6", "#ffd700"];
    const count = isGrand ? 130 : 65;

    for (let i = 0; i < count; i++) {
        const isStar = isGrand && Math.random() < 0.25;
        particles.push({
            x: canvas.width / 2 + (Math.random() - 0.5) * (canvas.width * 0.7),
            y: canvas.height * 0.45 + (Math.random() - 0.5) * 80,
            vx: (Math.random() - 0.5) * (isGrand ? 18 : 12),
            vy: -Math.random() * (isGrand ? 18 : 12) - 4,
            size: isStar ? 12 : Math.random() * 9 + 4,
            color: isStar ? "#fbbf24" : colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            vRot: (Math.random() - 0.5) * 12,
            alpha: 1,
            gravity: 0.42,
            isStar
        });
    }

    let animationFrame;
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = 0;

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.rotation += p.vRot;
            p.alpha -= isGrand ? 0.011 : 0.016;

            if (p.alpha > 0) {
                active++;
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;

                if (p.isStar) {
                    ctx.beginPath();
                    for (let s = 0; s < 5; s++) {
                        ctx.lineTo(Math.cos((18 + s * 72) * Math.PI / 180) * p.size, -Math.sin((18 + s * 72) * Math.PI / 180) * p.size);
                        ctx.lineTo(Math.cos((54 + s * 72) * Math.PI / 180) * (p.size / 2), -Math.sin((54 + s * 72) * Math.PI / 180) * (p.size / 2));
                    }
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * (isGrand ? 1.4 : 1));
                }
                ctx.restore();
            }
        });

        if (active > 0) {
            animationFrame = requestAnimationFrame(render);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            cancelAnimationFrame(animationFrame);
        }
    }

    render();
}

/* =====================================================
   PAGE NAVIGATION
===================================================== */
const navButtons = document.querySelectorAll(".nav-btn");

navButtons.forEach(button => {
    button.addEventListener("click", () => {
        const page = button.dataset.page;
        playTapSound();
        openPage(page);
    });
});

function openPage(pageName) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.remove("active");
    });

    const page = document.getElementById(pageName);
    if (page) {
        page.classList.add("active");
    }

    document.querySelector(".sidebar")?.classList.remove("open");

    const nav = document.querySelector(`[data-page="${pageName}"]`);
    if (nav) {
        nav.classList.add("active");
    }

    const titles = {
        dashboard: [
            "Teacher Dashboard",
            "Bridge classroom language from English to Hindi and regional mother tongues."
        ],
        translator: [
            "AI Translator (English → Hindi)",
            "Translate English classroom instructions and curriculum content into Hindi."
        ],
        voice: [
            "Voice Classroom (English Speech → Hindi Voice)",
            "Real-time English classroom speech translated and spoken in Hindi."
        ],
        worksheet: [
            "Bilingual Worksheets",
            "Generate NIPUN Bharat aligned learning activities."
        ],
        game: [
            "भाषा खेल साहसिक (Multi-Tier Language Arena)",
            "Animated interactive games for 3 age levels (Kids, Teens, Adults) with Colours, Animals & Words."
        ],
        kidszone: [
            "बाल वाटिका (Kids Zone)",
            "Interactive learning games and bilingual picture stories for children."
        ],
        offline: [
            "Offline Center",
            "Manage local language and curriculum resources."
        ],
        curriculum: [
            "NIPUN Curriculum",
            "Foundational Literacy and Numeracy framework."
        ],
        profile: [
            "Learner Profile & Performance Hub",
            "Review your MTB-MLE progress, topic mastery, badges, and learning history."
        ]
    };

    const data = titles[pageName];
    if (data) {
        document.getElementById("pageTitle").textContent = data[0];
        document.getElementById("pageSubtitle").textContent = data[1];
    }

    if (pageName === "game") {
        onOpenGamePage();
    } else if (pageName === "kidszone") {
        loadKidQuiz();
    } else if (pageName === "dashboard") {
        refreshDashboardStats();
    } else if (pageName === "profile") {
        renderProfilePage();
    }
}

/* =====================================================
   LANGUAGE SELECTION
===================================================== */
const languageSelector = document.getElementById("globalLanguage");

if (languageSelector) {
    languageSelector.addEventListener("change", event => {
        currentLanguage = event.target.value;
        updateLanguageUI();
        showToast("Target language set to: " + getLanguageName(currentLanguage), "🌐");
        playTapSound();

        const kidszone = document.getElementById("kidszone");
        if (kidszone && kidszone.classList.contains("active")) {
            loadKidQuiz();
        }
    });
}

function getLanguageName(language) {
    const names = {
        santhali: "Santhali (ᱥᱟᱱᱛᱟᱲᱤ • Ol Chiki)",
        ho: "Ho (𑢹𑣉𑣉 • Warang Chiti)",
        mundari: "Mundari (मुंडारी • Mundari Bani)",
        hindi: "Hindi (हिन्दी • Bridge)"
    };
    return names[language] || language;
}

function updateLanguageUI() {
    const name = getLanguageName(currentLanguage);

    const target = document.getElementById("targetLanguageName");
    if (target) target.textContent = name;

    const voiceTarget = document.getElementById("voiceTargetLanguage");
    if (voiceTarget) voiceTarget.textContent = name;

    const kidLang = document.getElementById("kidCurrentLangLabel");
    if (kidLang) kidLang.textContent = currentLanguage.toUpperCase();
}

/* =====================================================
   TOAST NOTIFICATIONS
===================================================== */
let toastTimer;

function showToast(message, icon = "✓") {
    const toast = document.getElementById("toast");
    const messageElement = document.getElementById("toastMessage");
    const iconElement = document.getElementById("toastIcon");

    if (!toast || !messageElement || !iconElement) return;

    messageElement.textContent = message;
    iconElement.textContent = icon;

    toast.classList.add("show");
    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3200);
}

/* =====================================================
   QUICK PHRASES
===================================================== */
function setPhrase(text) {
    playTapSound();
    const textarea = document.getElementById("sourceText");
    if (textarea) {
        textarea.value = text;
        textarea.focus();
    }
}

/* =====================================================
   TRANSLATION ENGINE (ENGLISH -> HINDI)
===================================================== */
async function translateText() {
    const textarea = document.getElementById("sourceText");
    const text = textarea.value.trim();

    if (!text) {
        showToast("Please enter English text to translate.", "!");
        return;
    }

    playTapSound();
    const result = document.getElementById("translationResult");
    const confidence = document.getElementById("confidence");

    const sourceLang = /[a-zA-Z]/.test(text) ? "English" : "Hindi";

    result.innerHTML = `
        <div class="loading-result" style="padding:16px; border-radius:8px; display:flex; align-items:center; gap:8px;">
            <span>✨</span> Translating to ${getLanguageName(currentLanguage)}...
        </div>
    `;
    confidence.textContent = "Processing";

    const start = performance.now();

    try {
        const response = await fetch(`${API_BASE}/translate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text,
                sourceLanguage: sourceLang,
                targetLanguage: currentLanguage
            })
        });

        if (!response.ok) throw new Error("Translation failed");

        const data = await response.json();
        const totalTime = Math.round(performance.now() - start);

        currentTranslation = data.translatedText;

        result.innerHTML = `
            <div style="animation: celebratePop 0.3s ease;">
                <div style="font-size:22px; font-weight:800; color:var(--text-primary); margin-bottom:8px; line-height:1.4;">
                    ${data.translatedText}
                </div>
                ${data.phonetic ? `<div style="font-size:13px; color:#0f766e; font-weight:700; background:rgba(13,148,136,0.1); border:1px solid rgba(13,148,136,0.25); border-radius:6px; padding:6px 12px; display:inline-block;">🗣️ शिक्षक उच्चारण निर्देश: ${data.phonetic}</div>` : ''}
            </div>
        `;

        confidence.textContent = Math.round(data.confidence * 100) + "% confidence";

        saveToLocalHistory({
            source: text,
            target: currentTranslation,
            language: currentLanguage,
            timestamp: new Date().toISOString()
        });

        showToast(`Translated to ${getLanguageName(currentLanguage)} in ${totalTime}ms`, "✓");
        refreshDashboardStats();

    } catch (error) {
        console.error("Translation Error:", error);
        result.innerHTML = `<span class="result-placeholder">Translation error. Please check server.</span>`;
        confidence.textContent = "Unavailable";
        showToast("Translation service unavailable", "!");
    }
}

/* =====================================================
   TEXT TO SPEECH (SPEECH SYNTHESIS)
===================================================== */
let cachedVoices = [];

function preloadVoices() {
    if ("speechSynthesis" in window) {
        cachedVoices = window.speechSynthesis.getVoices();
    }
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = preloadVoices;
    preloadVoices();
}

function speakWord(word, lang = "hi-IN") {
    if (!word) return;

    if (!("speechSynthesis" in window)) {
        playChimeSound();
        return;
    }

    try {
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = lang;
        utterance.rate = 0.90;
        utterance.pitch = 1.0;

        if (!cachedVoices || cachedVoices.length === 0) {
            cachedVoices = window.speechSynthesis.getVoices();
        }

        const targetVoice = cachedVoices.find(v => v.lang === lang || v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase()) ||
                            cachedVoices.find(v => v.lang.toLowerCase().startsWith(lang.toLowerCase().substring(0, 2)));

        if (targetVoice) utterance.voice = targetVoice;

        const eq = document.getElementById("audioEqualizer");
        if (eq) eq.classList.add("active");

        utterance.onend = () => {
            if (eq && !isListening) eq.classList.remove("active");
        };

        utterance.onerror = (e) => {
            console.warn("SpeechSynthesis notice:", e);
            if (eq && !isListening) eq.classList.remove("active");
            playTapSound();
        };

        window.speechSynthesis.speak(utterance);
    } catch (err) {
        console.warn("Speech error:", err);
        playChimeSound();
    }
}

function speakTranslation() {
    if (!currentTranslation) {
        showToast("Translate something first.", "!");
        return;
    }
    speakWord(currentTranslation, currentLanguage === "hindi" ? "hi-IN" : "hi-IN");
    showToast("Playing Hindi voice translation", "🔊");
}

async function copyTranslation() {
    if (!currentTranslation) {
        showToast("Nothing to copy.", "!");
        return;
    }
    try {
        await navigator.clipboard.writeText(currentTranslation);
        showToast("Translation copied", "✓");
        playTapSound();
    } catch {
        showToast("Copy failed.", "!");
    }
}

function saveTranslation() {
    if (!currentTranslation) {
        showToast("Translate something first.", "!");
        return;
    }
    const saved = JSON.parse(localStorage.getItem("palash_saved") || "[]");
    saved.push({
        source: document.getElementById("sourceText")?.value || "",
        translation: currentTranslation,
        language: currentLanguage,
        date: new Date().toLocaleString()
    });
    localStorage.setItem("palash_saved", JSON.stringify(saved));
    showToast("Translation saved locally", "♡");
    playTapSound();
}

/* =====================================================
   SPEECH RECOGNITION (ENGLISH VOICE INPUT)
===================================================== */
let lastVoiceTranscript = "";
let hasProcessedVoiceTurn = false;

function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognizer = new SpeechRecognition();
    recognizer.lang = "hi-IN"; // Hindi speech recognition for Jharkhand primary teachers (with English support)
    recognizer.continuous = false;
    recognizer.interimResults = true; // Live interim results
    recognizer.maxAlternatives = 1;

    recognizer.onstart = () => {
        isListening = true;
        hasProcessedVoiceTurn = false;
        lastVoiceTranscript = "";
        setVoiceUI(true);
        showToast("🎙️ Listening... बोलिए (Speak in Hindi or English now)", "🔊");
    };

    recognizer.onresult = async event => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                final += transcript;
            } else {
                interim += transcript;
            }
        }

        const candidate = (final || interim).trim();
        if (candidate) {
            lastVoiceTranscript = candidate;
            const inputElem = document.getElementById("voiceInput");
            if (inputElem) {
                inputElem.textContent = candidate;
            }
        }

        if (final && final.trim().length > 0) {
            hasProcessedVoiceTurn = true;
            await processVoiceTranslation(final.trim());
        }
    };

    recognizer.onerror = event => {
        console.warn("Speech recognition notice:", event.error);
        isListening = false;
        setVoiceUI(false);

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            showToast("Microphone access blocked. Please allow mic permissions in your browser bar.", "⚠️");
        } else if (event.error === "no-speech") {
            showToast("No speech heard. Try speaking louder or click a quick teacher command chip below!", "ℹ️");
        } else {
            showToast("Voice notice: " + event.error + ". Quick test chips are ready below!", "🎙️");
        }
    };

    recognizer.onend = async () => {
        isListening = false;
        setVoiceUI(false);

        // Fallback: If utterance finished before isFinal was marked, translate captured interim
        if (!hasProcessedVoiceTurn && lastVoiceTranscript && lastVoiceTranscript.trim().length > 0) {
            hasProcessedVoiceTurn = true;
            await processVoiceTranslation(lastVoiceTranscript.trim());
        }
    };

    return recognizer;
}

recognition = setupSpeechRecognition();

async function toggleVoice() {
    playTapSound();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showToast("Speech recognition not supported in this browser. Please use Chrome/Edge or tap quick test chips below!", "💡");
        return;
    }

    if (isListening) {
        if (recognition) {
            try { recognition.stop(); } catch (e) {}
        }
        isListening = false;
        setVoiceUI(false);
        return;
    }

    // Safely check microphone permission and IMMEDIATELY release the track so it is not held locked
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
        } catch (permErr) {
            console.warn("Microphone permission prompt:", permErr);
            showToast("Please allow microphone access when prompted in your browser.", "🎙️");
        }
    }

    if (!recognition) {
        recognition = setupSpeechRecognition();
    }

    try {
        recognition.start();
    } catch (e) {
        console.warn("Recognition start restart attempt:", e);
        try {
            recognition.stop();
            setTimeout(() => {
                try { recognition.start(); } catch (err) {}
            }, 250);
        } catch (err2) {
            showToast("Microphone ready. Speak in Hindi or English now.", "🎙️");
        }
    }
}

// Dedicated Translator Tab Mic Dictation
let lastTranslatorTranscript = "";
let hasProcessedTranslatorTurn = false;

async function toggleTranslatorMic() {
    playTapSound();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showToast("Speech recognition is not supported in this browser.", "💡");
        return;
    }

    const btn = document.getElementById("translatorMicBtn");
    const textarea = document.getElementById("sourceText");

    if (isTranslatorListening) {
        if (translatorRecognizer) {
            try { translatorRecognizer.stop(); } catch (e) {}
        }
        isTranslatorListening = false;
        if (btn) btn.classList.remove("listening");
        return;
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
        } catch (e) {}
    }

    if (!translatorRecognizer) {
        translatorRecognizer = new SpeechRecognition();
        translatorRecognizer.lang = "hi-IN";
        translatorRecognizer.interimResults = true;

        translatorRecognizer.onstart = () => {
            isTranslatorListening = true;
            hasProcessedTranslatorTurn = false;
            lastTranslatorTranscript = "";
            if (btn) btn.classList.add("listening");
            showToast("🎙️ Listening... Speak your instruction in Hindi or English.", "🔊");
        };

        translatorRecognizer.onresult = event => {
            let final = "";
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript;
                else interim += event.results[i][0].transcript;
            }

            const candidate = (final || interim).trim();
            if (candidate) {
                lastTranslatorTranscript = candidate;
                if (textarea) textarea.value = candidate;
            }

            if (final && final.trim().length > 0) {
                hasProcessedTranslatorTurn = true;
                translateText();
            }
        };

        translatorRecognizer.onerror = event => {
            isTranslatorListening = false;
            if (btn) btn.classList.remove("listening");
            showToast("Voice input notice: " + event.error, "!");
        };

        translatorRecognizer.onend = () => {
            isTranslatorListening = false;
            if (btn) btn.classList.remove("listening");
            if (!hasProcessedTranslatorTurn && lastTranslatorTranscript && lastTranslatorTranscript.trim().length > 0) {
                hasProcessedTranslatorTurn = true;
                translateText();
            }
        };
    }

    try {
        translatorRecognizer.start();
    } catch (e) {
        try {
            translatorRecognizer.stop();
            setTimeout(() => translatorRecognizer.start(), 200);
        } catch (err) {}
    }
}

async function simulateVoice(teacherText) {
    playTapSound();
    const inputElem = document.getElementById("voiceInput");
    if (inputElem) inputElem.textContent = teacherText;

    setVoiceUI(true);
    await processVoiceTranslation(teacherText);

    setTimeout(() => {
        setVoiceUI(false);
    }, 1500);
}

function setVoiceUI(active) {
    const interfaceElement = document.querySelector(".voice-interface");
    const icon = document.getElementById("voiceIcon");
    const status = document.getElementById("voiceStatus");
    const equalizer = document.getElementById("audioEqualizer");

    if (active) {
        interfaceElement?.classList.add("listening");
        equalizer?.classList.add("active");
        if (icon) icon.textContent = "⏹";
        if (status) status.textContent = "Listening to Teacher (शिक्षक की आवाज़ सुन रहे हैं)...";
    } else {
        interfaceElement?.classList.remove("listening");
        equalizer?.classList.remove("active");
        if (icon) icon.textContent = "🎙";
        if (status) status.textContent = "Tap mic to speak (बोलने के लिए माइक दबाएं)";
    }
}

async function processVoiceTranslation(teacherTranscript) {
    if (!teacherTranscript || !teacherTranscript.trim()) return;

    const output = document.getElementById("voiceOutput");
    const latency = document.getElementById("latency");
    const status = document.getElementById("voiceStatus");

    if (output) {
        output.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; color:var(--primary); font-weight:600;">
                <span>✨</span> Translating to ${getLanguageName(currentLanguage)}...
            </div>
        `;
    }
    const start = performance.now();
    const sourceLang = /[a-zA-Z]/.test(teacherTranscript) ? "English" : "Hindi";

    try {
        const response = await fetch(`${API_BASE}/voice/session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                transcript: teacherTranscript.trim(),
                teacherSpeech: teacherTranscript.trim(),
                text: teacherTranscript.trim(),
                sourceLanguage: sourceLang,
                targetLanguage: currentLanguage
            })
        });

        const data = await response.json();
        const elapsed = Math.round(performance.now() - start);

        if (output) {
            output.innerHTML = `
                <div style="font-size:22px; font-weight:800; color:#065f46; margin-bottom:6px; animation:celebratePop 0.25s ease;">
                    ${data.translatedText}
                </div>
                ${data.phonetic ? `<small style="color:#0f766e; font-weight:700; background:rgba(13,148,136,0.12); padding:4px 10px; border-radius:4px; display:inline-block;">🗣️ शिक्षक उच्चारण निर्देश: ${data.phonetic}</small>` : ''}
            `;
        }
        if (latency) latency.textContent = elapsed + " ms";
        if (status && !isListening) {
            status.textContent = "✅ Translated to Mother Tongue! Tap mic to speak again";
        }

        currentTranslation = data.translatedText;
        speakWord(data.translatedText, "hi-IN");
        refreshDashboardStats();

    } catch (error) {
        console.error("Voice Translation Error:", error);
        if (output) output.textContent = "Translation unavailable.";
    }
}

/* =====================================================
   WORKSHEET GENERATOR
===================================================== */
function updateActivityCount() {
    const slider = document.getElementById("activityCount");
    const valElem = document.getElementById("activityCountValue");
    if (slider && valElem) {
        valElem.textContent = slider.value;
    }
}

async function generateWorksheet() {
    playTapSound();
    const grade = document.getElementById("gradeSelect")?.value || "Grade 1";
    const topic = document.getElementById("topicSelect")?.value || "Foundational Literacy";
    const language = document.getElementById("worksheetLanguage")?.value || currentLanguage;
    const count = Number(document.getElementById("activityCount")?.value || 5);

    const preview = document.getElementById("worksheetPreview");
    if (preview) {
        preview.innerHTML = `
            <div class="empty-generator">
                <div>✨</div>
                <h2>Generating NIPUN Bharat Worksheet...</h2>
                <p>Creating bilingual activities for young learners.</p>
            </div>
        `;
    }

    try {
        const response = await fetch(`${API_BASE}/worksheet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                topic,
                grade,
                targetLanguage: language,
                count
            })
        });

        const data = await response.json();
        renderWorksheet(data.worksheet);
        showToast("Bilingual worksheet ready!", "✓");
        fireConfetti();
        playFanfareSound();
        refreshDashboardStats();

    } catch (error) {
        console.error(error);
        showToast("Could not generate worksheet", "!");
    }
}

let activeWorksheetData = null;
let activeWorksheetUserAnswers = {};

function renderWorksheet(worksheet) {
    const preview = document.getElementById("worksheetPreview");
    if (!preview) return;

    activeWorksheetData = worksheet;
    activeWorksheetUserAnswers = {};

    // Generate questions with interactive practice mode options
    const questionsHtml = worksheet.questions.map((q, qIndex) => {
        // Prepare options: correct answer + distractors
        const otherQuestions = worksheet.questions.filter((_, i) => i !== qIndex);
        const distractors = otherQuestions.slice(0, 2).map(oq => oq.tribalLanguage);
        const allChoices = [q.tribalLanguage, ...distractors].sort(() => 0.5 - Math.random());

        const optionsHtml = allChoices.map(opt => `
            <button class="worksheet-option-pill" onclick="selectWorksheetAnswer(${qIndex}, '${opt.replace(/'/g, "\\'")}', this)">
                ${opt}
            </button>
        `).join("");

        return `
            <div class="worksheet-question-card" id="worksheetQCard_${qIndex}">
                <div class="worksheet-q-top">
                    <div class="question-number">${q.number}</div>
                    <div style="flex:1;">
                        <h4>Activity ${q.number} • ${q.activityType || 'Bilingual Activity'}</h4>
                        <p class="ws-prompt-hindi">👨‍🏫 हिन्दी: <strong>${q.hindi}</strong></p>
                    </div>
                </div>

                <div class="ws-solve-section">
                    <span class="ws-choose-label">👉 Select the matching Mother Tongue translation:</span>
                    <div class="ws-options-grid" id="wsOptionsGrid_${qIndex}">
                        ${optionsHtml}
                    </div>
                </div>

                <!-- DYNAMIC ERROR CORRECTION & REVIEW CALLOUT -->
                <div class="ws-correction-callout" id="wsCorrection_${qIndex}" style="display:none;"></div>
            </div>
        `;
    }).join("");

    preview.innerHTML = `
        <div class="worksheet-document">
            <div class="worksheet-header">
                <span class="eyebrow" style="margin-bottom:6px; display:inline-block;">NIPUN BHARAT FOUNDATIONAL WORKSHEET</span>
                <h2>${worksheet.title}</h2>
                <p>AI Generated Interactive Activity Sheet • PALASH MTB-MLE (${worksheet.framework})</p>
            </div>

            <div class="worksheet-meta">
                <span>🎒 ${worksheet.grade}</span>
                <span>🇮🇳 ${worksheet.language}</span>
                <span>🎯 Outcome: ${worksheet.learningOutcome}</span>
                <span>📅 ${worksheet.dateGenerated || 'Today'}</span>
            </div>

            <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
                ${worksheet.description}
            </p>

            <div class="worksheet-questions-list">
                ${questionsHtml}
            </div>

            <div class="worksheet-submit-banner">
                <button class="primary-btn submit-worksheet-btn" id="btnSubmitWorksheet" onclick="submitInteractiveWorksheet()">
                    ✅ Submit & Check Worksheet
                </button>
                <button class="secondary-btn" onclick="printWorksheet()">
                    🖨️ Print Worksheet (A4)
                </button>
            </div>
        </div>
    `;
}

function selectWorksheetAnswer(qIndex, selectedAnswer, button) {
    playTapSound();
    activeWorksheetUserAnswers[qIndex] = selectedAnswer;

    const parentGrid = document.getElementById(`wsOptionsGrid_${qIndex}`);
    if (parentGrid) {
        parentGrid.querySelectorAll(".worksheet-option-pill").forEach(btn => btn.classList.remove("selected"));
    }
    button.classList.add("selected");
}

function submitInteractiveWorksheet() {
    if (!activeWorksheetData) return;

    let correctCount = 0;
    const totalQuestions = activeWorksheetData.questions.length;
    let hasMistakes = false;

    activeWorksheetData.questions.forEach((q, qIndex) => {
        const userAnswer = activeWorksheetUserAnswers[qIndex];
        const isCorrect = userAnswer === q.tribalLanguage;
        const qCard = document.getElementById(`worksheetQCard_${qIndex}`);
        const correctionBox = document.getElementById(`wsCorrection_${qIndex}`);
        const parentGrid = document.getElementById(`wsOptionsGrid_${qIndex}`);

        if (parentGrid) {
            parentGrid.querySelectorAll(".worksheet-option-pill").forEach(btn => {
                btn.disabled = true;
                if (btn.textContent.trim() === q.tribalLanguage) {
                    btn.classList.add("correct", "correct-pulse");
                } else if (userAnswer && btn.textContent.trim() === userAnswer && !isCorrect) {
                    btn.classList.add("wrong", "shake-wrong");
                }
            });
        }

        if (isCorrect) {
            correctCount++;
            if (correctionBox) correctionBox.style.display = "none";
        } else {
            hasMistakes = true;
            // SHOW THE ACCURATE CORRECTION CALLOUT
            if (correctionBox) {
                correctionBox.innerHTML = `
                    <div class="correction-box-inner">
                        <div class="correction-row">
                            <span class="correction-badge-wrong">❌ आपका उत्तर: <s>${userAnswer || 'छूट गया (Unanswered)'}</s></span>
                            <span class="correction-badge-correct">✅ सही उत्तर: <strong>${q.tribalLanguage}</strong></span>
                        </div>
                        ${q.phonetic ? `<div class="correction-phonetic">🗣️ शिक्षक उच्चारण: <strong>${q.phonetic}</strong></div>` : ''}
                        <button class="card-audio-btn ws-listen-btn" onclick="speakWord('${q.tribalLanguage.replace(/'/g, "\\'")}', 'hi-IN')">
                            🔊 सही उच्चारण सुनिए (Listen Pronunciation)
                        </button>
                    </div>
                `;
                correctionBox.style.display = "block";
            }
        }
    });

    const submitBtn = document.getElementById("btnSubmitWorksheet");
    if (submitBtn) {
        submitBtn.textContent = `Completed: Score ${correctCount} / ${totalQuestions}`;
        submitBtn.disabled = true;
    }

    // Sound effect & User profile record
    const starsEarned = correctCount * 10;
    const xpEarned = correctCount * 20;
    updateUserStats({
        worksheets: 1,
        stars: starsEarned,
        xp: xpEarned
    });

    recordActivity(
        `Completed Worksheet: ${activeWorksheetData.title}`,
        `Scored ${correctCount}/${totalQuestions} • Earned +${starsEarned} ⭐`,
        "📝",
        "worksheet"
    );

    if (hasMistakes) {
        playWrongSound();
    } else {
        playCorrectSound();
    }

    setTimeout(() => {
        playWorksheetCompleteSound();
        fireConfetti(true);

        showCelebrationModal({
            title: correctCount === totalQuestions ? "बधाई हो! Perfect Worksheet! 📝" : "शानदार प्रयास! Worksheet Completed! 🌟",
            subtitle: `You scored ${correctCount} of ${totalQuestions} in "${activeWorksheetData.title}"!`,
            pill: "WORKSHEET COMPLETED",
            icon: "📝",
            stars: correctCount === totalQuestions ? 3 : (correctCount >= 3 ? 2 : 1),
            stats: [
                { label: "Score", value: `${correctCount} / ${totalQuestions}` },
                { label: "Stars Earned", value: `+${starsEarned} ⭐` },
                { label: "Experience", value: `+${xpEarned} XP` }
            ],
            onNext: () => openPage("profile"),
            nextLabel: "👤 View Performance Profile",
            onReview: () => {
                const firstMistake = document.querySelector(".ws-correction-callout[style*='display: block']");
                if (firstMistake) firstMistake.scrollIntoView({ behavior: 'smooth', block: 'center' });
            },
            reviewLabel: "🔍 Review Mistakes"
        });
    }, 600);
}

function printWorksheet() {
    window.print();
}

/* =====================================================
   MULTI-TIER INTERACTIVE LANGUAGE GAME ENGINE
   - 3 Age Tiers: Kids (3-8 yrs), Youth (9-17 yrs), Adults (18+ yrs)
   - Age Detection, Balloon Pop, Speed Match & Scramble, Cultural Context
===================================================== */
let gameUserAge = parseInt(localStorage.getItem("palash_game_age") || "7", 10);
let gameActiveTier = localStorage.getItem("palash_game_tier") || (gameUserAge <= 8 ? "kids" : (gameUserAge <= 17 ? "youth" : "adults"));
let gameTopic = "Colours";
let gameTargetLanguage = "santhali";
let gameStars = parseInt(localStorage.getItem("palash_game_stars") || "0", 10);
let gameStreak = 0;
let gameCorrectCount = 0;
let gameSoundActive = localStorage.getItem("palash_game_sound") !== "false";

let currentGamePool = [];
let currentChallengeIndex = 0;
let currentTargetItem = null;
let youthTimerInterval = null;
let youthTimeRemaining = 15;
let youthSubMode = "match";
let currentScrambleAssembled = [];
let currentScrambleTarget = "";

// Built-in High Quality Offline & Online Resilient Dictionaries
const GAME_VOCABULARY = {
    Colours: [
        { en: "Red", hi: "लाल", santhali: "ᱟᱨᱟᱜ", ho: "ᱟᱨᱟ", mundari: "अरा", phonetic: "Araq'", emoji: "🔴", hex: "#ef4444", note: "सिंदूर और करमा पर्व का शुभ रंग" },
        { en: "Green", hi: "हरा", santhali: "ᱦᱟᱹᱨᱭᱟᱹᱲ", ho: "ᱦᱟᱹᱨᱤᱭᱟᱹᱨ", mundari: "हरियर", phonetic: "Hariyad'", emoji: "🟢", hex: "#10b981", note: "सारंडा के घने साल वनों और नई फसलों की हरियाली" },
        { en: "Blue", hi: "नीला", santhali: "ᱞᱤᱞ", ho: "ᱞᱤᱞ", mundari: "लिल", phonetic: "Lil", emoji: "🔵", hex: "#3b82f6", note: "स्वर्णरेखा और दामोदर नदियों का निर्मल जल" },
        { en: "Yellow", hi: "पीला", santhali: "ᱥᱟᱥᱟᱝ", ho: "ᱥᱟᱥᱟᱝ", mundari: "सासांग", phonetic: "Sasang", emoji: "🟡", hex: "#eab308", note: "सरहुल पर्व में महुआ और पलाश का सुनहरा रंग" },
        { en: "White", hi: "सफ़ेद", santhali: "ᱯᱳᱸᱰ", ho: "ᱯᱩᱱᱰᱤ", mundari: "पुंडी", phonetic: "Pond'", emoji: "⚪", hex: "#f8fafc", note: "पारंपरिक पंछी-पारहण वस्त्रों की पवित्र श्वेत आभा" },
        { en: "Black", hi: "काला", santhali: "ᱦᱮᱸᱫᱮ", ho: "ᱦᱮᱱᱫᱮ", mundari: "हेंदे", phonetic: "Hende", emoji: "⚫", hex: "#1e293b", note: "उर्वर काली मिट्टी और सोहराई कला की रेखाएँ" }
    ],
    Animals: [
        { en: "Elephant", hi: "हाथी", santhali: "ᱦᱟᱹᱛᱤ", ho: "ᱦᱟᱛᱤ", mundari: "हाति", phonetic: "Hati", emoji: "🐘", sound: "चिंघाड़", note: "दलमा अभयारण्य का गौरव और वनों का रक्षक" },
        { en: "Tiger", hi: "बाघ", santhali: "ᱛᱟᱹᱨᱩᱵ", ho: "ᱛᱟᱹᱨᱩᱵ", mundari: "तारुब", phonetic: "Tarub'", emoji: "🐯", sound: "गर्जना", note: "झारखंड के वनों और पारंपरिक शिकार गीतों का प्रतीक" },
        { en: "Cow", hi: "गाय", santhali: "ᱜᱟᱹᱭ", ho: "ᱩᱨᱤᱜ", mundari: "गाई", phonetic: "Gai", emoji: "🐄", sound: "रंभाना", note: "सोहराई उत्सव में पशुधन पूजन का केंद्रबिंदु" },
        { en: "Bird", hi: "चिड़िया", santhali: "ᱪᱮᱬᱮ", ho: "ᱪᱮᱬᱮ", mundari: "चेणे", phonetic: "Cẽrẽ", emoji: "🐦", sound: "चीं-चीं", note: "सुबह की शुरुआत और प्रकृति के संगीत की वाहक" },
        { en: "Fish", hi: "मछली", santhali: "ᱦᱟᱹᱠᱩ", ho: "ᱦᱟᱠᱩ", mundari: "हाकु", phonetic: "Haku", emoji: "🐟", sound: "छप-छप", note: "स्थानीय नदियों और पारंपरिक जालों से जुड़ा प्रतीक" },
        { en: "Peacock", hi: "मोर", santhali: "ᱢᱟᱨᱟᱜ", ho: "ᱢᱟᱨᱟᱜ", mundari: "माराग", phonetic: "Marag'", emoji: "🦚", sound: "पिहू-पिहू", note: "वर्षा ऋतु और पारंपरिक नृत्यों का सुंदर श्रृंगार" },
        { en: "Goat", hi: "बकरी", santhali: "ᱢᱮᱨᱚᱢ", ho: "ᱢᱮᱨᱚᱢ", mundari: "मेरोम", phonetic: "Merom", emoji: "🐐", sound: "में-में", note: "ग्रामीण आजीविका और घरेलू संस्कृति का अभिन्न अंग" },
        { en: "Cat", hi: "बिल्ली", santhali: "ᱯᱩᱥᱤ", ho: "ᱯᱩᱥᱤ", mundari: "पुसी", phonetic: "Pusi", emoji: "🐱", sound: "म्याऊं", note: "घरेलू प्रिय साथी" }
    ],
    Words: [
        { en: "Water", hi: "पानी", santhali: "ᱫᱟᱜ", ho: "ᱫᱟᱜ", mundari: "दाः", phonetic: "Da'", emoji: "💧", note: "जीवन का आधार, झरने और जोरिया का निर्मल जल" },
        { en: "Tree", hi: "पेड़", santhali: "ᱫᱟᱨᱮ", ho: "ᱫᱟᱨᱩ", mundari: "दारे", phonetic: "Dare", emoji: "🌳", note: "पवित्र सरना स्थल और साल/सखुआ वृक्ष" },
        { en: "Sun", hi: "सूरज", santhali: "ᱥᱤᱧ", ho: "ᱥᱤᱝᱜᱤ", mundari: "सिंगी", phonetic: "Singi", emoji: "☀️", note: "सिंगबोंगा का दिव्य प्रकाश और ऊर्जा" },
        { en: "Book", hi: "किताब", santhali: "ᱯᱩᱛᱷᱤ", ho: "ᱯᱩᱛᱷᱤ", mundari: "पुथी", phonetic: "Puthi", emoji: "📚", note: "ओल चिकी और मातृभाषा शिक्षा का दीप" },
        { en: "Flower", hi: "फूल", santhali: "ᱵᱟᱦᱟ", ho: "ᱵᱟᱦᱟ", mundari: "बाहा", phonetic: "Baha", emoji: "🌺", note: "सरहुल में कानों में सजाया जाने वाला सखुआ फूल" },
        { en: "Fruit", hi: "फल", santhali: "ᱡᱚ", ho: "ᱡᱚ", mundari: "जो", phonetic: "Jo", emoji: "🍎", note: "जंगलों से मिलने वाले प्राकृतिक उपहार" },
        { en: "House", hi: "घर", santhali: "ᱚᱲᱟᱜ", ho: "ᱚᱲᱟᱜ", mundari: "ओड़ाः", phonetic: "Orak'", emoji: "🏠", note: "सोहराई भित्तिचित्रों से सजा पारंपरिक आवास" },
        { en: "Friend", hi: "दोस्त", santhali: "ᱜᱟᱛᱮ", ho: "ᱜᱟᱛᱮ", mundari: "गाते", phonetic: "Gate", emoji: "🤝", note: "अखड़ा में साथ नाचने-गाने वाले साथी" }
    ]
};

function onOpenGamePage() {
    updateGameScoreboard();
    const hasSeenAgeModal = localStorage.getItem("palash_game_age_set");
    if (!hasSeenAgeModal) {
        openGameAgeModal();
    } else {
        setGameTier(gameActiveTier, false);
        loadGameChallenge();
    }
}

function openGameAgeModal() {
    const modal = document.getElementById("gameAgeModal");
    if (!modal) return;
    const input = document.getElementById("gameUserAgeInput");
    if (input) input.value = gameUserAge;
    detectAndPreviewAgeTier(gameUserAge);
    modal.style.display = "flex";
}

function closeGameAgeModal() {
    const modal = document.getElementById("gameAgeModal");
    if (modal) modal.style.display = "none";
}

function adjustAgeInput(delta) {
    playTapSound();
    const input = document.getElementById("gameUserAgeInput");
    if (!input) return;
    let val = (parseInt(input.value, 10) || 7) + delta;
    if (val < 3) val = 3;
    if (val > 99) val = 99;
    input.value = val;
    onUserAgeInputChange();
}

function onUserAgeInputChange() {
    const input = document.getElementById("gameUserAgeInput");
    const val = parseInt(input?.value, 10) || 7;
    detectAndPreviewAgeTier(val);
}

function detectAndPreviewAgeTier(age) {
    let tier = "kids";
    let previewText = "✨ <strong>लेवल 1: बच्चे (Kids 3–8 yrs)</strong> डिटेक्ट हुआ!";
    if (age <= 8) {
        tier = "kids";
        previewText = "✨ <strong>लेवल 1: बच्चे (Kids 3–8 yrs)</strong> डिटेक्ट हुआ! (गुब्बारे और जानवर)";
    } else if (age <= 17) {
        tier = "youth";
        previewText = "⚡ <strong>लेवल 2: किशोर (Teens 9–17 yrs)</strong> डिटेक्ट हुआ! (स्पीड मैच और शब्द पहेली)";
    } else {
        tier = "adults";
        previewText = "🏛️ <strong>लेवल 3: वयस्क (Adults 18+ yrs)</strong> डिटेक्ट हुआ! (सांस्कृतिक संदर्भ और संवाद)";
    }

    const previewEl = document.getElementById("ageDetectionPreview");
    if (previewEl) previewEl.innerHTML = previewText;

    highlightAgeCard(tier);
    return tier;
}

function highlightAgeCard(tier) {
    ["Kids", "Youth", "Adults"].forEach(name => {
        const card = document.getElementById(`ageCard${name}`);
        if (card) {
            if (name.toLowerCase() === tier.toLowerCase()) card.classList.add("selected");
            else card.classList.remove("selected");
        }
    });
}

function pickAgeTier(tier) {
    playTapSound();
    highlightAgeCard(tier);
    const input = document.getElementById("gameUserAgeInput");
    if (input) {
        if (tier === "kids") input.value = 7;
        else if (tier === "youth") input.value = 13;
        else input.value = 24;
    }
    detectAndPreviewAgeTier(parseInt(input.value, 10));
}

function confirmAgeAndStartGame() {
    playTapSound();
    const input = document.getElementById("gameUserAgeInput");
    const age = parseInt(input?.value, 10) || 7;
    gameUserAge = age;
    localStorage.setItem("palash_game_age", age);
    localStorage.setItem("palash_game_age_set", "true");

    let tier = "kids";
    if (age <= 8) tier = "kids";
    else if (age <= 17) tier = "youth";
    else tier = "adults";

    gameActiveTier = tier;
    localStorage.setItem("palash_game_tier", tier);
    closeGameAgeModal();
    setGameTier(tier, true);

    const greeting = tier === "kids"
        ? "🧒 बाल वाटिका खेल में आपका स्वागत है! रंग-बिरंगे गुब्बारे फोड़ें!"
        : (tier === "youth" ? "⚡ स्पीड आर्केड में आपका स्वागत है! तेज खेलें और स्ट्रीक बनाएं!" : "🏛️ भाषा और संस्कृति प्रवीणता में आपका स्वागत है!");
    showToast(greeting, "🌟");
    playFanfareSound();
}

function setGameTier(tier, reloadChallenge = true) {
    gameActiveTier = tier;
    localStorage.setItem("palash_game_tier", tier);

    const kidsStage = document.getElementById("gameTierKidsArea");
    const youthStage = document.getElementById("gameTierYouthArea");
    const adultsStage = document.getElementById("gameTierAdultsArea");

    if (kidsStage) kidsStage.style.display = tier === "kids" ? "block" : "none";
    if (youthStage) youthStage.style.display = tier === "youth" ? "block" : "none";
    if (adultsStage) adultsStage.style.display = tier === "adults" ? "block" : "none";

    const pillIcon = document.getElementById("gameTierPillIcon");
    const pillText = document.getElementById("gameTierPillText");
    const activeTierLabel = document.getElementById("gameActiveTierLabel");

    if (tier === "kids") {
        if (pillIcon) pillIcon.textContent = "🧒";
        if (pillText) pillText.textContent = `लेवल 1: बच्चे (${gameUserAge} yrs)`;
        if (activeTierLabel) activeTierLabel.textContent = "Kids (3–8 yrs)";
    } else if (tier === "youth") {
        if (pillIcon) pillIcon.textContent = "⚡";
        if (pillText) pillText.textContent = `लेवल 2: किशोर (${gameUserAge} yrs)`;
        if (activeTierLabel) activeTierLabel.textContent = "Youth (9–17 yrs)";
    } else {
        if (pillIcon) pillIcon.textContent = "🏛️";
        if (pillText) pillText.textContent = `लेवल 3: वयस्क (${gameUserAge} yrs)`;
        if (activeTierLabel) activeTierLabel.textContent = "Adults (18+ yrs)";
    }

    if (reloadChallenge) {
        loadGameChallenge();
    }
}

function selectGameTopic(topic) {
    playTapSound();
    gameTopic = topic;
    document.querySelectorAll(".game-topic-btn").forEach(btn => {
        if (btn.getAttribute("data-topic") === topic) btn.classList.add("active");
        else btn.classList.remove("active");
    });
    showToast(`विषय चुना गया: ${topic}`, "🎯");
    loadGameChallenge();
}

function onGameLanguageChange() {
    const sel = document.getElementById("gameLanguageSelect");
    if (sel) {
        gameTargetLanguage = sel.value;
        playTapSound();
        showToast(`भाषा बदली: ${sel.options[sel.selectedIndex].text}`, "🌐");
        loadGameChallenge();
    }
}

function toggleGameSound() {
    gameSoundActive = !gameSoundActive;
    localStorage.setItem("palash_game_sound", gameSoundActive ? "true" : "false");
    const btn = document.getElementById("gameAudioToggleBtn");
    if (btn) {
        btn.textContent = gameSoundActive ? "🔊 आवाज़ चालू (Sound On)" : "🔇 आवाज़ बंद (Muted)";
        btn.classList.toggle("muted", !gameSoundActive);
    }
    playTapSound();
    showToast(gameSoundActive ? "गेम ऑडियो सक्रिय 🔊" : "गेम ऑडियो म्यूट 🔇", "🔔");
}

function startFreshGameSession() {
    playFanfareSound();
    gameStreak = 0;
    updateGameScoreboard();
    showToast("नया खेल सत्र शुरू! ⚡", "🚀");
    loadGameChallenge();
}

function updateGameScoreboard() {
    const starsEl = document.getElementById("gameStarsVal");
    const streakEl = document.getElementById("gameStreakVal");
    const correctEl = document.getElementById("gameCorrectVal");

    if (starsEl) starsEl.textContent = gameStars;
    if (streakEl) streakEl.textContent = `${gameStreak}x`;
    if (correctEl) correctEl.textContent = gameCorrectCount;

    localStorage.setItem("palash_game_stars", gameStars);
}

// Data Fetcher: Backend API with Instant Offline Fallback
async function loadGameChallenge() {
    let rawItems = [];
    if (gameTopic === "Mixed") {
        rawItems = [
            ...GAME_VOCABULARY.Colours.slice(0, 3),
            ...GAME_VOCABULARY.Animals.slice(0, 3),
            ...GAME_VOCABULARY.Words.slice(0, 2)
        ];
    } else {
        rawItems = (GAME_VOCABULARY[gameTopic] || GAME_VOCABULARY.Colours).slice();
    }

    // Try live server endpoint if available
    try {
        const response = await fetch(`${API_BASE}/game/data`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                age: gameUserAge,
                tier: gameActiveTier,
                topic: gameTopic,
                targetLanguage: gameTargetLanguage
            })
        });
        const data = await response.json();
        if (data.success && data.items && data.items.length > 0) {
            currentGamePool = data.items;
        } else {
            currentGamePool = buildLocalGameItems(rawItems);
        }
    } catch (e) {
        currentGamePool = buildLocalGameItems(rawItems);
    }

    // Shuffle and pick target challenge
    currentGamePool = currentGamePool.sort(() => 0.5 - Math.random());
    currentTargetItem = currentGamePool[0];

    // Hide feedback banners
    ["kidsFeedbackBanner", "youthFeedbackBanner", "adultsFeedbackBanner"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });

    if (gameActiveTier === "kids") {
        renderKidsChallenge();
    } else if (gameActiveTier === "youth") {
        renderYouthChallenge();
    } else {
        renderAdultsChallenge();
    }
}

function buildLocalGameItems(list) {
    return list.map((item, idx) => {
        let tribalWord = item[gameTargetLanguage] || item.santhali || item.hi;
        return {
            id: idx + 1,
            english: item.en,
            hindi: item.hi,
            tribal: tribalWord,
            phonetic: item.phonetic || item.hi,
            emoji: item.emoji || "✨",
            hex: item.hex || "#0d9488",
            culturalNote: item.note || `झारखंड की समृद्ध धरोहर: ${item.hi}`,
            sound: item.sound || ""
        };
    });
}

/* =====================================================
   TIER 1: KIDS ARENA IMPLEMENTATION (Balloons, Animals, Sounds)
===================================================== */
function renderKidsChallenge() {
    if (!currentTargetItem) return;

    const emojiEl = document.getElementById("kidsTargetEmoji");
    const tribalEl = document.getElementById("kidsTargetTribal");
    const phoneticEl = document.getElementById("kidsTargetPhonetic");
    const catBadge = document.getElementById("kidsTargetCategoryBadge");
    const canvas = document.getElementById("kidsSkyCanvas");

    if (emojiEl) emojiEl.textContent = currentTargetItem.emoji;
    if (tribalEl) tribalEl.innerHTML = `${currentTargetItem.tribal} <small>(${currentTargetItem.hindi})</small>`;
    if (phoneticEl) phoneticEl.textContent = `🗣️ उच्चारण: ${currentTargetItem.phonetic} • English: ${currentTargetItem.english}`;
    if (catBadge) catBadge.textContent = `${currentTargetItem.emoji} ${gameTopic}`;

    if (!canvas) return;
    canvas.innerHTML = "";

    // Pick 5 distractors + 1 correct target, shuffle
    const distractors = currentGamePool.filter(it => it.id !== currentTargetItem.id).slice(0, 5);
    const balloonItems = [currentTargetItem, ...distractors].sort(() => 0.5 - Math.random());

    const vibrantColours = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

    balloonItems.forEach((item, index) => {
        const isCorrect = item.id === currentTargetItem.id;
        const balloonBg = item.hex || vibrantColours[index % vibrantColours.length];

        const balloon = document.createElement("div");
        balloon.className = "game-floating-balloon";
        balloon.style.setProperty("--balloon-color", balloonBg);
        balloon.style.animationDelay = `${(index * 0.4).toFixed(1)}s`;
        balloon.style.animationDuration = `${(2.8 + (index % 3) * 0.4).toFixed(1)}s`;

        balloon.innerHTML = `
            <div class="balloon-visual" style="background: ${balloonBg};">
                <span class="balloon-emoji">${item.emoji}</span>
                <span class="balloon-word">${item.tribal}</span>
                <small class="balloon-hindi">${item.hindi}</small>
                <div class="balloon-string"></div>
            </div>
        `;

        balloon.onclick = () => onKidsBalloonClick(balloon, item, isCorrect);
        canvas.appendChild(balloon);
    });

    if (gameSoundActive) {
        setTimeout(playTargetWordAudio, 400);
    }
}

function onKidsBalloonClick(balloonElem, item, isCorrect) {
    if (balloonElem.classList.contains("popped")) return;

    if (isCorrect) {
        balloonElem.classList.add("popped", "balloon-popping");
        if (gameSoundActive) {
            playStarPopSound(3);
            playCorrectSound();
        }
        fireConfetti();

        gameStars += 10;
        gameStreak += 1;
        gameCorrectCount += 1;
        updateGameScoreboard();

        updateUserStats({
            games: 1,
            stars: 10,
            xp: 25
        });

        const feedback = document.getElementById("kidsFeedbackBanner");
        if (feedback) {
            feedback.style.display = "flex";
            const title = document.getElementById("kidsFeedbackTitle");
            const sub = document.getElementById("kidsFeedbackSubtitle");
            if (title) title.innerHTML = `🎈 शाबाश! "${item.tribal}" (${item.hindi}) बिल्कुल सही है! ⭐`;
            if (sub) sub.innerHTML = `आपने +10 चमकीले तारे जीत लिए! कुल तारे: ${gameStars}`;
        }

        const mascotHead = document.getElementById("kidsMascotHeading");
        if (mascotHead) mascotHead.innerHTML = `शानदार बच्चों! ⭐ आपने सही शब्द "${item.tribal}" पहचान लिया!`;

        recordActivity(`Won Kids Game Challenge`, `Recognized "${item.hindi}" in ${gameTargetLanguage}`, "🎈", "game");

    } else {
        balloonElem.classList.add("balloon-shake");
        setTimeout(() => balloonElem.classList.remove("balloon-shake"), 600);
        if (gameSoundActive) playWrongSound();

        const mascotHead = document.getElementById("kidsMascotHeading");
        if (mascotHead) mascotHead.innerHTML = `अरे! यह "${item.hindi}" है। सही शब्द ढूंढो प्यारे बच्चे! 😊`;
        showToast(`यह "${item.hindi}" है। पुनः प्रयास करें!`, "💡");
    }
}

/* =====================================================
   TIER 2: YOUTH & TEENS ARENA (Speed Match & Scramble)
===================================================== */
function renderYouthChallenge() {
    if (!currentTargetItem) return;
    startYouthTimer();

    const streakTag = document.getElementById("youthStreakTag");
    if (streakTag) {
        const mult = gameStreak > 4 ? "COMBO x5 🔥 RAMPAGE!" : (gameStreak > 2 ? "COMBO x3 ⚡" : `COMBO x${Math.max(1, gameStreak)}`);
        streakTag.textContent = mult;
    }

    if (youthSubMode === "match") {
        renderYouthMatchMode();
    } else {
        renderYouthScrambleMode();
    }
}

function switchYouthSubMode(mode) {
    playTapSound();
    youthSubMode = mode;
    const tabMatch = document.getElementById("youthTabMatch");
    const tabScramble = document.getElementById("youthTabScramble");
    const secMatch = document.getElementById("youthMatchSection");
    const secScramble = document.getElementById("youthScrambleSection");

    if (tabMatch) tabMatch.classList.toggle("active", mode === "match");
    if (tabScramble) tabScramble.classList.toggle("active", mode === "scramble");
    if (secMatch) secMatch.style.display = mode === "match" ? "block" : "none";
    if (secScramble) secScramble.style.display = mode === "scramble" ? "block" : "none";

    renderYouthChallenge();
}

function startYouthTimer() {
    clearInterval(youthTimerInterval);
    youthTimeRemaining = 15;
    const bar = document.getElementById("youthTimerBar");
    const sec = document.getElementById("youthTimerSeconds");
    if (bar) bar.style.width = "100%";
    if (sec) sec.textContent = "15";

    youthTimerInterval = setInterval(() => {
        youthTimeRemaining--;
        if (sec) sec.textContent = youthTimeRemaining;
        if (bar) {
            const pct = Math.max(0, (youthTimeRemaining / 15) * 100);
            bar.style.width = `${pct}%`;
            if (youthTimeRemaining <= 5) bar.style.background = "linear-gradient(90deg, #ef4444, #f97316)";
            else bar.style.background = "linear-gradient(90deg, #0d9488, #10b981)";
        }

        if (youthTimeRemaining <= 0) {
            clearInterval(youthTimerInterval);
            onYouthTimerExpired();
        }
    }, 1000);
}

function onYouthTimerExpired() {
    if (gameSoundActive) playWrongSound();
    gameStreak = 0;
    updateGameScoreboard();
    showToast(`⏱️ समय समाप्त! सही उत्तर था: "${currentTargetItem.tribal}" (${currentTargetItem.hindi})`, "⌛");

    const feedback = document.getElementById("youthFeedbackBanner");
    if (feedback) {
        feedback.style.display = "flex";
        const t = document.getElementById("youthFeedbackTitle");
        const s = document.getElementById("youthFeedbackSubtitle");
        if (t) t.textContent = "⏱️ समय समाप्त! (Time Up)";
        if (s) s.textContent = `सही उत्तर: "${currentTargetItem.tribal}" (${currentTargetItem.hindi})`;
    }
}

function renderYouthMatchMode() {
    const emojiEl = document.getElementById("youthTargetEmoji");
    const wordEl = document.getElementById("youthTargetWord");
    const hintEl = document.getElementById("youthPromptHint");
    const grid = document.getElementById("youthOptionsGrid");

    if (emojiEl) emojiEl.textContent = currentTargetItem.emoji;
    if (wordEl) wordEl.textContent = `${currentTargetItem.hindi} (${currentTargetItem.english})`;
    if (hintEl) hintEl.textContent = `${getLanguageName(gameTargetLanguage)} में सही शब्द तुरंत चुनो:`;

    if (!grid) return;
    grid.innerHTML = "";

    const distractors = currentGamePool.filter(it => it.id !== currentTargetItem.id).slice(0, 3);
    const options = [currentTargetItem, ...distractors].sort(() => 0.5 - Math.random());

    options.forEach(opt => {
        const isCorrect = opt.id === currentTargetItem.id;
        const btn = document.createElement("button");
        btn.className = "youth-option-card";
        btn.innerHTML = `
            <span class="youth-option-tribal">${opt.tribal}</span>
            <span class="youth-option-phonetic">${opt.phonetic}</span>
        `;
        btn.onclick = () => onYouthMatchOptionClick(btn, opt, isCorrect);
        grid.appendChild(btn);
    });
}

function onYouthMatchOptionClick(btn, opt, isCorrect) {
    clearInterval(youthTimerInterval);
    document.querySelectorAll(".youth-option-card").forEach(b => b.disabled = true);

    if (isCorrect) {
        btn.classList.add("correct");
        if (gameSoundActive) {
            playCorrectSound();
            playChimeSound();
        }

        const bonus = youthTimeRemaining > 7 ? 25 : 15;
        gameStars += bonus;
        gameStreak += 1;
        gameCorrectCount += 1;
        updateGameScoreboard();

        updateUserStats({
            games: 1,
            stars: bonus,
            xp: 40
        });

        const feedback = document.getElementById("youthFeedbackBanner");
        if (feedback) {
            feedback.style.display = "flex";
            const t = document.getElementById("youthFeedbackTitle");
            const s = document.getElementById("youthFeedbackSubtitle");
            if (t) t.innerHTML = `⚡ बहुत तेज! +${bonus} तारे! (Combo ${gameStreak}x)`;
            if (s) s.innerHTML = `सही पहचान: <strong>${opt.tribal}</strong> = ${opt.hindi}`;
        }
        recordActivity(`Speed Match Mastered`, `Matched "${opt.hindi}" in ${youthTimeRemaining}s`, "⚡", "game");

    } else {
        btn.classList.add("wrong");
        if (gameSoundActive) playWrongSound();
        gameStreak = 0;
        updateGameScoreboard();

        document.querySelectorAll(".youth-option-card").forEach(b => {
            if (b.textContent.includes(currentTargetItem.tribal)) b.classList.add("correct");
        });

        const feedback = document.getElementById("youthFeedbackBanner");
        if (feedback) {
            feedback.style.display = "flex";
            const t = document.getElementById("youthFeedbackTitle");
            const s = document.getElementById("youthFeedbackSubtitle");
            if (t) t.textContent = "अरे! गलत उत्तर";
            if (s) s.textContent = `सही उत्तर: "${currentTargetItem.tribal}" (${currentTargetItem.hindi})`;
        }
    }
}

function renderYouthScrambleMode() {
    const emojiEl = document.getElementById("scrambleEmoji");
    const clueEl = document.getElementById("scrambleClueWord");
    if (emojiEl) emojiEl.textContent = currentTargetItem.emoji;
    if (clueEl) clueEl.textContent = `${currentTargetItem.hindi} (${currentTargetItem.english})`;

    // Use Roman phonetic or tribal word as tiles
    currentScrambleTarget = (currentTargetItem.phonetic || currentTargetItem.tribal).toUpperCase().replace(/[^A-Z]/gi, "");
    if (!currentScrambleTarget) currentScrambleTarget = "HARE";

    currentScrambleAssembled = [];
    const letters = currentScrambleTarget.split("").sort(() => 0.5 - Math.random());

    renderScrambleSlots();
    renderScrambleTiles(letters);
}

function renderScrambleSlots() {
    const slotsRow = document.getElementById("scrambleSlotsRow");
    if (!slotsRow) return;
    slotsRow.innerHTML = "";

    for (let i = 0; i < currentScrambleTarget.length; i++) {
        const slot = document.createElement("div");
        slot.className = "scramble-slot";
        const char = currentScrambleAssembled[i];
        if (char) {
            slot.textContent = char;
            slot.classList.add("filled");
            slot.onclick = () => removeScrambleChar(i);
        } else {
            slot.textContent = "";
        }
        slotsRow.appendChild(slot);
    }
}

function renderScrambleTiles(letters) {
    const tilesRow = document.getElementById("scrambleTilesRow");
    if (!tilesRow) return;
    tilesRow.innerHTML = "";

    letters.forEach((char, idx) => {
        const tile = document.createElement("button");
        tile.className = "scramble-tile";
        tile.textContent = char;
        tile.onclick = () => {
            if (currentScrambleAssembled.length < currentScrambleTarget.length) {
                playTapSound();
                currentScrambleAssembled.push(char);
                tile.style.visibility = "hidden";
                renderScrambleSlots();
            }
        };
        tilesRow.appendChild(tile);
    });
}

function removeScrambleChar(index) {
    playTapSound();
    const removed = currentScrambleAssembled.splice(index, 1)[0];
    // restore tile in tilesRow
    const tiles = document.querySelectorAll(".scramble-tile");
    for (let t of tiles) {
        if (t.textContent === removed && t.style.visibility === "hidden") {
            t.style.visibility = "visible";
            break;
        }
    }
    renderScrambleSlots();
}

function resetCurrentScramble() {
    playTapSound();
    currentScrambleAssembled = [];
    renderScrambleSlots();
    document.querySelectorAll(".scramble-tile").forEach(t => t.style.visibility = "visible");
}

function checkScrambleAnswer() {
    clearInterval(youthTimerInterval);
    const assembled = currentScrambleAssembled.join("");
    if (assembled === currentScrambleTarget) {
        if (gameSoundActive) {
            playFanfareSound();
            fireConfetti();
        }
        gameStars += 30;
        gameStreak += 1;
        gameCorrectCount += 1;
        updateGameScoreboard();

        updateUserStats({ games: 1, stars: 30, xp: 50 });

        const feedback = document.getElementById("youthFeedbackBanner");
        if (feedback) {
            feedback.style.display = "flex";
            const t = document.getElementById("youthFeedbackTitle");
            const s = document.getElementById("youthFeedbackSubtitle");
            if (t) t.innerHTML = `🎉 बिल्कुल सही शब्द! +30 तारे!`;
            if (s) s.innerHTML = `आपने शब्द <strong>"${currentScrambleTarget}"</strong> = ${currentTargetItem.tribal} हल कर दिया!`;
        }
    } else {
        if (gameSoundActive) playWrongSound();
        showToast(`गलत क्रम! सही शब्द था: "${currentScrambleTarget}"`, "!");
        const feedback = document.getElementById("youthFeedbackBanner");
        if (feedback) {
            feedback.style.display = "flex";
            const t = document.getElementById("youthFeedbackTitle");
            const s = document.getElementById("youthFeedbackSubtitle");
            if (t) t.textContent = "अरे! क्रम गलत है";
            if (s) s.textContent = `सही शब्द था: ${currentScrambleTarget}`;
        }
    }
}

/* =====================================================
   TIER 3: ADULTS ARENA (Cultural Context & Dialogue)
===================================================== */
function renderAdultsChallenge() {
    if (!currentTargetItem) return;

    const emojiEl = document.getElementById("adultsCultureEmoji");
    const titleEl = document.getElementById("adultsCultureTitle");
    const descEl = document.getElementById("adultsCultureDescription");
    const tribalEl = document.getElementById("adultsTargetTribal");
    const phoneticEl = document.getElementById("adultsTargetPhonetic");
    const promptEl = document.getElementById("adultsSentencePrompt");
    const listEl = document.getElementById("adultsOptionsList");

    if (emojiEl) emojiEl.textContent = currentTargetItem.emoji;
    if (titleEl) titleEl.textContent = `${currentTargetItem.hindi} (${currentTargetItem.english}) - सांस्कृतिक संदर्भ`;
    if (descEl) descEl.textContent = currentTargetItem.culturalNote;
    if (tribalEl) tribalEl.textContent = `${currentTargetItem.tribal} (${currentTargetItem.phonetic})`;
    if (phoneticEl) phoneticEl.textContent = `रोमन: ${currentTargetItem.phonetic} • हिन्दी: ${currentTargetItem.hindi}`;

    if (promptEl) {
        promptEl.innerHTML = `पारंपरिक परिवेश में: "सोहराई व करमा पर्व के अवसर पर हम प्रकृति और <span class="blank-slot">[ _____ ]</span> का विशेष सम्मान करते हैं।"`;
    }

    if (!listEl) return;
    listEl.innerHTML = "";

    const distractors = currentGamePool.filter(it => it.id !== currentTargetItem.id).slice(0, 2);
    const options = [currentTargetItem, ...distractors].sort(() => 0.5 - Math.random());

    options.forEach(opt => {
        const isCorrect = opt.id === currentTargetItem.id;
        const btn = document.createElement("button");
        btn.className = "adults-option-item";
        btn.innerHTML = `
            <div class="opt-left">
                <span class="opt-symbol">${opt.emoji}</span>
                <div>
                    <strong>${opt.tribal}</strong>
                    <small>(${opt.hindi} • ${opt.phonetic})</small>
                </div>
            </div>
            <span class="opt-arrow">→</span>
        `;
        btn.onclick = () => onAdultsOptionClick(btn, opt, isCorrect);
        listEl.appendChild(btn);
    });
}

function onAdultsOptionClick(btn, opt, isCorrect) {
    document.querySelectorAll(".adults-option-item").forEach(b => b.disabled = true);

    if (isCorrect) {
        btn.classList.add("correct");
        if (gameSoundActive) {
            playCorrectSound();
            playChimeSound();
        }

        gameStars += 25;
        gameStreak += 1;
        gameCorrectCount += 1;
        updateGameScoreboard();

        updateUserStats({ games: 1, stars: 25, xp: 45 });

        const blankSlot = document.querySelector(".blank-slot");
        if (blankSlot) {
            blankSlot.textContent = `[ ${opt.tribal} (${opt.hindi}) ]`;
            blankSlot.classList.add("filled-correct");
        }

        const feedback = document.getElementById("adultsFeedbackBanner");
        if (feedback) {
            feedback.style.display = "flex";
            const t = document.getElementById("adultsFeedbackTitle");
            const s = document.getElementById("adultsFeedbackSubtitle");
            if (t) t.innerHTML = `🎓 उत्कृष्ट! सही सांस्कृतिक संदर्भ`;
            if (s) s.innerHTML = `"${opt.tribal}" (${opt.hindi}) - ${opt.culturalNote}`;
        }
        recordActivity(`Cultural Language Mastery`, `Completed context puzzle for "${opt.hindi}"`, "🏛️", "game");

    } else {
        btn.classList.add("wrong");
        if (gameSoundActive) playWrongSound();
        gameStreak = 0;
        updateGameScoreboard();

        document.querySelectorAll(".adults-option-item").forEach(b => {
            if (b.textContent.includes(currentTargetItem.tribal)) b.classList.add("correct");
        });

        const feedback = document.getElementById("adultsFeedbackBanner");
        if (feedback) {
            feedback.style.display = "flex";
            const t = document.getElementById("adultsFeedbackTitle");
            const s = document.getElementById("adultsFeedbackSubtitle");
            if (t) t.textContent = "पुनः विचार करें";
            if (s) s.textContent = `उचित शब्द था: "${currentTargetItem.tribal}" (${currentTargetItem.hindi})`;
        }
    }
}

function nextGameChallenge() {
    playTapSound();
    loadGameChallenge();
}

function playTargetWordAudio() {
    if (!currentTargetItem) return;
    playTapSound();
    const word = currentTargetItem.tribal || currentTargetItem.hindi;
    speakWord(word, "hi-IN");
    showToast(`🗣️ उच्चारण: ${word}`, "🔊");
}


/* =====================================================
   KIDS PLAY ZONE (BAL VATIKA)
===================================================== */
function switchKidMode(mode) {
    playTapSound();
    const gameSection = document.getElementById("kidGameSection");
    const storiesSection = document.getElementById("kidStoriesSection");
    const btnGame = document.getElementById("tabBtnGame");
    const btnStories = document.getElementById("tabBtnStories");

    if (mode === "game") {
        if (gameSection) gameSection.style.display = "block";
        if (storiesSection) storiesSection.style.display = "none";
        btnGame?.classList.add("active");
        btnStories?.classList.remove("active");
        loadKidQuiz();
    } else {
        if (gameSection) gameSection.style.display = "none";
        if (storiesSection) storiesSection.style.display = "block";
        btnStories?.classList.add("active");
        btnGame?.classList.remove("active");
        loadStories();
    }
}

function setKidTopic(topic, element) {
    playTapSound();
    currentKidTopic = topic;
    document.querySelectorAll(".topic-pill").forEach(p => p.classList.remove("active"));
    element?.classList.add("active");
    loadKidQuiz();
}

async function loadKidQuiz() {
    const emojiElem = document.getElementById("quizEmoji");
    const wordElem = document.getElementById("quizHindiWord");
    const hintElem = document.getElementById("quizHint");
    const optionsGrid = document.getElementById("quizOptionsGrid");
    const feedbackBox = document.getElementById("quizFeedback");

    if (feedbackBox) feedbackBox.classList.remove("show");
    if (emojiElem) emojiElem.textContent = "⏳";
    if (wordElem) wordElem.textContent = "Loading questions...";

    try {
        const response = await fetch(`${API_BASE}/quiz`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                targetLanguage: currentLanguage,
                topic: currentKidTopic,
                count: 5
            })
        });

        const data = await response.json();
        kidQuizList = data.questions;
        currentQuizIndex = 0;
        renderQuizQuestion();
    } catch (e) {
        console.error("Quiz load error:", e);
        if (wordElem) wordElem.textContent = "Could not load quiz.";
    }
}

function renderQuizQuestion() {
    if (!kidQuizList || kidQuizList.length === 0) return;
    const q = kidQuizList[currentQuizIndex];
    if (!q) return;

    const tagElem = document.getElementById("kidQuestionTag");
    const emojiElem = document.getElementById("quizEmoji");
    const wordElem = document.getElementById("quizHindiWord");
    const hintElem = document.getElementById("quizHint");
    const optionsGrid = document.getElementById("quizOptionsGrid");
    const feedbackBox = document.getElementById("quizFeedback");

    if (tagElem) tagElem.textContent = `Question ${q.id} / ${kidQuizList.length}`;
    if (emojiElem) emojiElem.textContent = q.visualSymbol;
    if (wordElem) wordElem.textContent = `${q.englishWord || q.hindiWord}`;
    if (hintElem) hintElem.textContent = q.hint;
    if (feedbackBox) feedbackBox.classList.remove("show");

    if (optionsGrid) {
        optionsGrid.innerHTML = q.options.map(opt => `
            <button class="quiz-option-btn" onclick="selectQuizOption(this, '${opt}')">
                <span>${opt}</span>
            </button>
        `).join("");
    }
}

let currentQuizSessionMistakes = [];

function selectQuizOption(button, selectedAnswer) {
    if (!kidQuizList || !kidQuizList[currentQuizIndex]) return;
    const q = kidQuizList[currentQuizIndex];
    const isCorrect = selectedAnswer === q.correctAnswer;
    const allButtons = document.querySelectorAll(".quiz-option-btn");

    allButtons.forEach(btn => (btn.disabled = true));

    const feedbackBox = document.getElementById("quizFeedback");
    const feedbackIcon = document.getElementById("feedbackIcon");
    const feedbackMessage = document.getElementById("feedbackMessage");
    const starsElem = document.getElementById("kidStars");
    const streakElem = document.getElementById("kidStreak");

    if (isCorrect) {
        button.classList.add("correct", "correct-pulse");
        kidStars += 10;
        kidStreak += 1;
        playCorrectSound();
        fireConfetti();
        speakWord(selectedAnswer, "hi-IN");

        updateUserStats({ stars: 10, xp: 20, audio: 1 });

        if (feedbackIcon) feedbackIcon.textContent = "🌟";
        if (feedbackMessage) {
            feedbackMessage.innerHTML = `
                <div style="color:#059669; font-weight:700; font-size:15px;">
                    ${q.praiseText || 'शाबाश! बहुत बढ़िया!'}
                </div>
            `;
        }
        if (feedbackBox) feedbackBox.classList.add("show");
    } else {
        button.classList.add("wrong", "shake-wrong");
        kidStreak = 0;
        playWrongSound();

        allButtons.forEach(btn => {
            if (btn.textContent.trim() === q.correctAnswer) {
                btn.classList.add("correct", "correct-pulse");
            }
        });

        currentQuizSessionMistakes.push({
            question: q,
            userAnswer: selectedAnswer,
            correctAnswer: q.correctAnswer
        });

        if (feedbackIcon) feedbackIcon.textContent = "💡";
        if (feedbackMessage) {
            feedbackMessage.innerHTML = `
                <div class="quiz-mistake-correction">
                    <div class="mistake-header-label">💡 सही उत्तर सीखिए (Learn Correct Answer):</div>
                    <div class="mistake-answers-row">
                        <span class="correction-badge-wrong">❌ आपका उत्तर: <s>${selectedAnswer}</s></span>
                        <span class="correction-badge-correct">✅ सही उत्तर: <strong>${q.correctAnswer}</strong></span>
                    </div>
                    <p style="margin:4px 0 6px 0; font-size:13px; color:var(--text-secondary);">
                        "${q.hindiWord || q.englishWord}" को ${getLanguageName(currentLanguage)} में <strong>"${q.correctAnswer}"</strong> कहते हैं।
                    </p>
                    <button class="card-audio-btn" style="padding:4px 10px; font-size:12px;" onclick="speakWord('${q.correctAnswer.replace(/'/g, "\\'")}', 'hi-IN')">
                        🔊 सही उच्चारण सुनिए
                    </button>
                </div>
            `;
        }
        if (feedbackBox) feedbackBox.classList.add("show");
    }

    if (starsElem) starsElem.textContent = kidStars;
    if (streakElem) streakElem.textContent = kidStreak;
}

function nextKidQuestion() {
    playTapSound();
    currentQuizIndex++;
    if (currentQuizIndex < kidQuizList.length) {
        renderQuizQuestion();
    } else {
        const total = kidQuizList.length;
        const mistakesCount = currentQuizSessionMistakes.length;
        const correctCount = total - mistakesCount;
        const accuracy = Math.round((correctCount / total) * 100);

        updateUserStats({
            quizzes: 1,
            quizQuestions: total,
            quizCorrect: correctCount,
            stars: correctCount * 5,
            xp: correctCount * 15
        });

        recordActivity(
            `Quiz: ${currentKidTopic} (${getLanguageName(currentLanguage)})`,
            `Scored ${correctCount}/${total} (${accuracy}%)`,
            "🎯",
            "quiz"
        );

        playTopicCompleteSound();
        fireConfetti(true);

        showCelebrationModal({
            title: correctCount === total ? "शानदार! 100% Perfect Score! 🏆" : "शाबाश! Quiz Completed! 🌟",
            subtitle: `You answered ${correctCount} of ${total} questions correctly in ${currentKidTopic}!`,
            pill: "QUIZ COMPLETED",
            icon: "🎯",
            stars: correctCount === total ? 3 : (correctCount >= 3 ? 2 : 1),
            stats: [
                { label: "Score", value: `${correctCount} / ${total}` },
                { label: "Accuracy", value: `${accuracy}%` },
                { label: "Stars Earned", value: `+${correctCount * 15} ⭐` },
                { label: "Streak", value: `${kidStreak} 🔥` }
            ],
            onNext: () => {
                currentQuizSessionMistakes = [];
                loadKidQuiz();
            },
            nextLabel: "🔄 Play Again",
            onReview: mistakesCount > 0 ? () => {
                showToast(`Reviewing ${mistakesCount} mistake(s) below`, "💡");
                const feedbackBox = document.getElementById("quizFeedback");
                if (feedbackBox) feedbackBox.scrollIntoView({ behavior: 'smooth' });
            } : null,
            reviewLabel: `🔍 Review ${mistakesCount} Mistakes`
        });

        const feedbackMessage = document.getElementById("feedbackMessage");
        const nextBtn = document.getElementById("nextQuizBtn");
        if (feedbackMessage) feedbackMessage.innerHTML = `🎉 Well done! Total Stars: <strong>${kidStars} ⭐</strong>`;
        if (nextBtn) {
            nextBtn.textContent = "🔄 Play Again";
            nextBtn.onclick = () => {
                nextBtn.textContent = "Next Question →";
                nextBtn.onclick = nextKidQuestion;
                currentQuizSessionMistakes = [];
                loadKidQuiz();
            };
        }
    }
}

async function loadStories() {
    const chipsContainer = document.getElementById("storyChips");
    if (chipsContainer) {
        chipsContainer.innerHTML = `<span>Loading bilingual stories...</span>`;
    }

    try {
        const response = await fetch(`${API_BASE}/stories?targetLanguage=${currentLanguage}`);
        const data = await response.json();
        kidStoriesList = data.stories;
        renderStoryChips();
        if (kidStoriesList.length > 0) {
            openStory(kidStoriesList[0].id);
        }
    } catch (e) {
        console.error("Stories error:", e);
    }
}

function renderStoryChips() {
    const chipsContainer = document.getElementById("storyChips");
    if (!chipsContainer || !kidStoriesList) return;

    chipsContainer.innerHTML = kidStoriesList.map((story, i) => `
        <button class="story-chip ${i === 0 ? 'active' : ''}" onclick="openStory('${story.id}', this)">
            <span>${story.emoji}</span>
            <strong>${story.englishTitle || story.title}</strong>
        </button>
    `).join("");
}

function openStory(storyId, element) {
    playTapSound();
    if (element) {
        document.querySelectorAll(".story-chip").forEach(c => c.classList.remove("active"));
        element.classList.add("active");
    }

    const story = kidStoriesList.find(s => s.id === storyId);
    const reader = document.getElementById("activeStoryReader");
    if (!story || !reader) return;

    const linesHtml = story.lines.map(line => `
        <div class="story-line-card">
            <div class="story-line-visual">${line.visual}</div>
            <div style="flex:1;">
                <p class="story-line-hindi" style="color:var(--text-secondary); font-size:14px; margin-bottom:4px;">👨‍🏫 हिन्दी (शिक्षक): ${line.hindi}</p>
                <p class="story-line-tribal" style="color:var(--primary); font-size:17px; font-weight:700; margin-bottom:4px;">🧒 मातृभाषा (${getLanguageName(currentLanguage)}): ${line.tribal || line.hindi}</p>
                ${line.phonetic ? `<p style="color:#059669; font-size:13px; font-weight:600; margin:0;">🗣️ शिक्षक उच्चारण निर्देश: ${line.phonetic}</p>` : ''}
            </div>
            <button class="card-audio-btn" onclick="speakWord('${(line.tribal || line.hindi).replace(/'/g, "\\'")}', 'hi-IN')">
                🔊 सुनिए
            </button>
        </div>
    `).join("");

    reader.innerHTML = `
        <div class="story-header">
            <div>
                <h2>${story.emoji} ${story.englishTitle || story.title}</h2>
                <p>🇮🇳 ${story.title}</p>
            </div>
            <button class="primary-btn" onclick="fireConfetti(); playFanfareSound();">
                ✨ Story Completed
            </button>
        </div>

        <div class="story-lines-container">
            ${linesHtml}
        </div>

        <div class="story-moral-badge">
            <span>🌟 Moral:</span>
            <strong>${story.moral}</strong>
        </div>
    `;
}

function playGreetingAudio() {
    playTapSound();
    speakWord("नमस्ते प्यारे बच्चों! आपका स्वागत है।", "hi-IN");
    showToast("🔊 नमस्ते प्यारे बच्चों!", "🇮🇳");
    playChimeSound();
}

function cheerKids() {
    playFanfareSound();
    fireConfetti();
    showToast("🌟 Great job children! Keep learning and shining!", "⭐");
}

/* =====================================================
   DYNAMIC LIVE ANALYTICS SYNCHRONIZER
===================================================== */
async function refreshDashboardStats() {
    try {
        const response = await fetch(`${API_BASE}/dashboard`);
        const data = await response.json();
        if (data.success && data.statistics) {
            const stats = data.statistics;
            const schoolsElem = document.getElementById("schoolsStat");
            if (schoolsElem) animateCounter(schoolsElem, stats.schoolsCovered, 1200, "+");

            const cards = document.querySelectorAll(".stat-card strong");
            if (cards.length >= 4) {
                animateCounter(cards[0], stats.schoolsCovered, 1200, "+");
                animateCounter(cards[1], stats.supportedLanguages, 800, "");
                animateCounter(cards[2], stats.translationsToday, 1200, "+");
                animateCounter(cards[3], stats.offlineDevices, 800, "%");
            }
        }
    } catch (e) {}
}

/* =====================================================
   OFFLINE STORAGE & SYNC
===================================================== */
function saveToLocalHistory(item) {
    const history = JSON.parse(localStorage.getItem("palash_history") || "[]");
    history.unshift(item);
    if (history.length > 100) history.length = 100;
    localStorage.setItem("palash_history", JSON.stringify(history));
}

function updateConnectionStatus() {
    const online = navigator.onLine;
    const status = document.getElementById("connectionStatus");
    const text = document.getElementById("connectionText");

    if (status && text) {
        if (online) {
            status.style.background = "#ecfdf5";
            status.style.color = "#047857";
            text.textContent = "Online + Offline Ready";
        } else {
            status.style.background = "#fff7ed";
            status.style.color = "#c2410c";
            text.textContent = "Offline Mode";
        }
    }
}

window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);
updateConnectionStatus();

async function syncContent() {
    playTapSound();
    const message = document.getElementById("syncMessage");
    if (message) message.textContent = "Synchronising English to Hindi curriculum resources...";

    try {
        const response = await fetch(`${API_BASE}/sync`);
        const data = await response.json();
        if (message) {
            message.textContent = `Synced ${data.totalRecords} resources • ${new Date().toLocaleTimeString()}`;
        }
        localStorage.setItem("palash_sync", JSON.stringify(data));
        showToast("Content synchronised successfully", "↻");
        fireConfetti();
        playChimeSound();
    } catch {
        if (message) {
            message.textContent = "Offline: using previously synchronised resources.";
        }
        showToast("Offline resources available", "📡");
    }
}

async function checkServer() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        if (data.success) {
            console.log("🌿 PALASH English-Hindi backend connected.");
            refreshDashboardStats();
        }
    } catch {
        console.log("PALASH running in offline/demo mode");
    }
}

/* =====================================================
   KEYBOARD SHORTCUT
===================================================== */
document.addEventListener("keydown", event => {
    if (event.ctrlKey && event.key === "Enter") {
        const translator = document.getElementById("translator");
        if (translator && translator.classList.contains("active")) {
            translateText();
        }
    }
});

/* =====================================================
   INITIALISE ON LOAD
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    initThemeAndSound();
    initUserProfile();
    updateLanguageUI();
    updateActivityCount();
    refreshDashboardStats();
    updateGameScoreboard();

    const mobileMenu = document.querySelector(".mobile-menu");
    if (mobileMenu) {
        mobileMenu.addEventListener("click", () => {
            document.querySelector(".sidebar")?.classList.toggle("open");
        });
    }

    checkServer();
    console.log("🌿 PALASH English → Hindi engine ready.");
});