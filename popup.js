// --- POMODORO TIMER & HOURS/MINUTES STATE ---
let focusTotalSeconds = 25 * 60;
let breakTotalSeconds = 5 * 60;

let focusTimeLeft = focusTotalSeconds;
let breakTimeLeft = breakTotalSeconds;

let isRunning = false;
let isFocusMode = true;
let timerInterval = null;

const timerDisplay = document.getElementById('timerDisplay');
const startPauseBtn = document.getElementById('startPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const modeSwitchBtn = document.getElementById('modeSwitchBtn');
const modeIndicator = document.getElementById('modeIndicator');

const toggleSettingsBtn = document.getElementById('toggleSettingsBtn');
const settingsDrawer = document.getElementById('settingsDrawer');
const focusHrInput = document.getElementById('focusHrInput');
const focusMinInput = document.getElementById('focusMinInput');
const breakHrInput = document.getElementById('breakHrInput');
const breakMinInput = document.getElementById('breakMinInput');
const setTimerBtn = document.getElementById('setTimerBtn');

// Toggle config drawer
if (toggleSettingsBtn && settingsDrawer) {
  toggleSettingsBtn.addEventListener('click', () => {
    settingsDrawer.classList.toggle('hidden');
  });
}

function formatTime(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateDisplay() {
  if (!timerDisplay) return;
  const activeTime = isFocusMode ? focusTimeLeft : breakTimeLeft;
  timerDisplay.textContent = formatTime(activeTime);
}

function saveTimerState() {
  chrome.storage.local.set({
    focusTimeLeft,
    breakTimeLeft,
    isRunning,
    isFocusMode,
    focusTotalSeconds,
    breakTotalSeconds,
    targetTimestamp: isRunning ? Date.now() + (isFocusMode ? focusTimeLeft : breakTimeLeft) * 1000 : null
  });
}

function restoreTimerState() {
  chrome.storage.local.get([
    'focusTimeLeft', 
    'breakTimeLeft', 
    'isRunning', 
    'isFocusMode', 
    'focusTotalSeconds', 
    'breakTotalSeconds', 
    'targetTimestamp'
  ], (data) => {
    if (data.focusTotalSeconds !== undefined) {
      focusTotalSeconds = data.focusTotalSeconds;
      if (focusHrInput) focusHrInput.value = Math.floor(focusTotalSeconds / 3600);
      if (focusMinInput) focusMinInput.value = Math.floor((focusTotalSeconds % 3600) / 60);
    }
    if (data.breakTotalSeconds !== undefined) {
      breakTotalSeconds = data.breakTotalSeconds;
      if (breakHrInput) breakHrInput.value = Math.floor(breakTotalSeconds / 3600);
      if (breakMinInput) breakMinInput.value = Math.floor((breakTotalSeconds % 3600) / 60);
    }

    focusTimeLeft = data.focusTimeLeft !== undefined ? data.focusTimeLeft : focusTotalSeconds;
    breakTimeLeft = data.breakTimeLeft !== undefined ? data.breakTimeLeft : breakTotalSeconds;

    if (data.isFocusMode !== undefined) {
      isFocusMode = data.isFocusMode;
      updateModeUI();
    }

    if (data.isRunning && data.targetTimestamp) {
      const remaining = Math.round((data.targetTimestamp - Date.now()) / 1000);
      if (remaining > 0) {
        if (isFocusMode) {
          focusTimeLeft = remaining;
        } else {
          breakTimeLeft = remaining;
        }
        isRunning = true;
        if (startPauseBtn) startPauseBtn.textContent = 'Pause';
        startTimerInterval();
      } else {
        isRunning = false;
        if (startPauseBtn) startPauseBtn.textContent = 'Start';
      }
    } else {
      isRunning = false;
      if (startPauseBtn) startPauseBtn.textContent = 'Start';
    }
    updateDisplay();
  });
}

function startTimerInterval() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (isFocusMode) {
      if (focusTimeLeft > 0) {
        focusTimeLeft--;
        updateDisplay();
        saveTimerState();
      } else {
        clearInterval(timerInterval);
        isRunning = false;
        if (startPauseBtn) startPauseBtn.textContent = 'Start';
        alert("Focus session complete! Take a break! ☕");
        isFocusMode = false;
        breakTimeLeft = breakTotalSeconds;
        updateModeUI();
        updateDisplay();
        saveTimerState();
      }
    } else {
      if (breakTimeLeft > 0) {
        breakTimeLeft--;
        updateDisplay();
        saveTimerState();
      } else {
        clearInterval(timerInterval);
        isRunning = false;
        if (startPauseBtn) startPauseBtn.textContent = 'Start';
        alert("Break finished! Back to focus! ⚡");
        isFocusMode = true;
        focusTimeLeft = focusTotalSeconds;
        updateModeUI();
        updateDisplay();
        saveTimerState();
      }
    }
  }, 1000);
}

function updateModeUI() {
  if (!modeIndicator || !modeSwitchBtn) return;
  if (isFocusMode) {
    modeIndicator.textContent = "Focus Session";
    modeSwitchBtn.textContent = "Switch to Break";
  } else {
    modeIndicator.textContent = "Break Session";
    modeSwitchBtn.textContent = "Switch to Focus";
  }
}

if (setTimerBtn) {
  setTimerBtn.addEventListener('click', () => {
    const fHrs = parseInt(focusHrInput.value) || 0;
    const fMins = parseInt(focusMinInput.value) || 0;
    const bHrs = parseInt(breakHrInput.value) || 0;
    const bMins = parseInt(breakMinInput.value) || 0;

    const newFocusSec = (fHrs * 3600) + (fMins * 60);
    const newBreakSec = (bHrs * 3600) + (bMins * 60);

    if (newFocusSec > 0 && newBreakSec > 0) {
      focusTotalSeconds = newFocusSec;
      breakTotalSeconds = newBreakSec;

      if (timerInterval) clearInterval(timerInterval);
      isRunning = false;
      if (startPauseBtn) startPauseBtn.textContent = 'Start';
      
      focusTimeLeft = focusTotalSeconds;
      breakTimeLeft = breakTotalSeconds;

      updateDisplay();
      saveTimerState();
      if (settingsDrawer) settingsDrawer.classList.add('hidden');
    } else {
      alert("Please enter valid durations greater than 0.");
    }
  });
}

if (startPauseBtn) {
  startPauseBtn.addEventListener('click', () => {
    isRunning = !isRunning;
    if (isRunning) {
      startPauseBtn.textContent = 'Pause';
      startTimerInterval();
    } else {
      startPauseBtn.textContent = 'Start';
      if (timerInterval) clearInterval(timerInterval);
    }
    saveTimerState();
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    if (timerInterval) clearInterval(timerInterval);
    isRunning = false;
    if (startPauseBtn) startPauseBtn.textContent = 'Start';
    
    if (isFocusMode) {
      focusTimeLeft = focusTotalSeconds;
    } else {
      breakTimeLeft = breakTotalSeconds;
    }
    
    updateDisplay();
    saveTimerState();
  });
}

if (modeSwitchBtn) {
  modeSwitchBtn.addEventListener('click', () => {
    if (timerInterval) clearInterval(timerInterval);
    isRunning = false;
    if (startPauseBtn) startPauseBtn.textContent = 'Start';
    isFocusMode = !isFocusMode;
    updateModeUI();
    updateDisplay();
    saveTimerState();
  });
}


// --- STUDY AUDIO LOGIC ---
const audioStream = document.getElementById('audioStream');
const playLofiBtn = document.getElementById('playLofiBtn');
const playRainBtn = document.getElementById('playRainBtn');
const stopAudioBtn = document.getElementById('stopAudioBtn');

if (playLofiBtn && audioStream) {
  playLofiBtn.addEventListener('click', () => {
    audioStream.src = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    audioStream.play().catch(err => console.log("Audio play error:", err));
  });
}

if (playRainBtn && audioStream) {
  playRainBtn.addEventListener('click', () => {
    audioStream.src = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3";
    audioStream.play().catch(err => console.log("Audio play error:", err));
  });
}

if (stopAudioBtn && audioStream) {
  stopAudioBtn.addEventListener('click', () => {
    audioStream.pause();
    audioStream.currentTime = 0;
  });
}


// --- TO-DO LIST LOGIC ---
const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const progressText = document.getElementById('progressText');
const progressBar = document.getElementById('progressBar');

let tasks = [];

function loadTasks() {
  chrome.storage.local.get(['focusFlowTasks'], (result) => {
    if (result.focusFlowTasks) {
      tasks = result.focusFlowTasks;
      renderTasks();
    }
  });
}

function saveTasks() {
  chrome.storage.local.set({ focusFlowTasks: tasks }, () => {
    updateProgress();
  });
}

function renderTasks() {
  if (!taskList) return;
  taskList.innerHTML = '';
  if (tasks.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
  } else {
    if (emptyState) emptyState.style.display = 'none';
    tasks.forEach((task, index) => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''}`;

      const leftDiv = document.createElement('div');
      leftDiv.className = 'task-left';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', () => toggleTask(index));

      const span = document.createElement('span');
      span.textContent = task.text;

      leftDiv.appendChild(checkbox);
      leftDiv.appendChild(span);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '✕';
      deleteBtn.addEventListener('click', () => deleteTask(index));

      li.appendChild(leftDiv);
      li.appendChild(deleteBtn);
      taskList.appendChild(li);
    });
  }
  updateProgress();
}

function addTask() {
  if (!taskInput) return;
  const text = taskInput.value.trim();
  if (text === '') return;
  tasks.push({ text: text, completed: false });
  taskInput.value = '';
  saveTasks();
  renderTasks();
}

function toggleTask(index) {
  tasks[index].completed = !tasks[index].completed;
  saveTasks();
  renderTasks();
}

function deleteTask(index) {
  tasks.splice(index, 1);
  saveTasks();
  renderTasks();
}

function updateProgress() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  if (progressText) progressText.textContent = `${completed}/${total} completed (${percentage}%)`;
  if (progressBar) progressBar.style.width = `${percentage}%`;
}

if (addTaskBtn) {
  addTaskBtn.addEventListener('click', addTask);
}
if (taskInput) {
  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  restoreTimerState();
  loadTasks();
});