const STORAGE_KEY = "llm_debate_todo_state_v2";
const GENERAL_TASK_MODAL_ID = "generalTaskModal";
const DEFAULT_THEME = "dark";

const DAILY_TASKS = [
    { id: "daily-expert", title: "숙련자", subtitle: "기억석판 파밍" },
    { id: "daily-highest-dungeon", title: "최고레벨던전", subtitle: "수리석판 파밍" },
    { id: "daily-upper-leveling", title: "상급레벨링", subtitle: "시학석판 파밍" },
    { id: "daily-leveling", title: "레벨링", subtitle: "경험치 파밍" },
    { id: "daily-tribe", title: "우호부족 퀘스트", subtitle: "클릭할 때마다 +3", special: "tribeQuest" }
];

const WEEKLY_TASKS = [
    { id: "weekly-arcadion-1", title: "아르카디아 선수권 헤비급 1층", subtitle: "악세" },
    { id: "weekly-arcadion-2", title: "아르카디아 선수권 헤비급 2층", subtitle: "머리, 손, 발" },
    { id: "weekly-arcadion-3", title: "아르카디아 선수권 헤비급 3층", subtitle: "몸통, 바지" },
    { id: "weekly-arcadion-4", title: "아르카디아 선수권 헤비급 4층", subtitle: "무기" },
    { id: "weekly-echo", title: "연합레이드 : 세번째 반향세계", subtitle: "동전" },
    { id: "weekly-doman", title: "도마 도읍지", subtitle: "길" }
];

const state = {
    generalTasks: [],
    dailyProgress: {},
    weeklyCompletions: {},
    theme: DEFAULT_THEME
};

const todayLabel = document.getElementById("todayLabel");
const generalSummary = document.getElementById("generalSummary");
const generalTaskList = document.getElementById("generalTaskList");
const dailyTaskList = document.getElementById("dailyTaskList");
const weeklyTaskList = document.getElementById("weeklyTaskList");
const generalTaskForm = document.getElementById("generalTaskForm");
const generalTaskTitle = document.getElementById("generalTaskTitle");
const generalTaskSubtitle = document.getElementById("generalTaskSubtitle");
const themeToggle = document.getElementById("themeToggle");
const generalTaskModalElement = document.getElementById(GENERAL_TASK_MODAL_ID);
const generalTaskModal = window.bootstrap ? bootstrap.Modal.getOrCreateInstance(generalTaskModalElement) : null;

function getPreferredTheme() {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
        return "light";
    }

    return DEFAULT_THEME;
}

function makeId() {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }

    return `task_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function todayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatKoreanDate(date = new Date()) {
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} (${weekdays[date.getDay()]})`;
}

function getWeeklyPeriodStart(date = new Date()) {
    const current = new Date(date);
    current.setHours(0, 0, 0, 0);

    const dayOfWeek = current.getDay();
    const daysSinceTuesday = (dayOfWeek + 5) % 7;
    current.setDate(current.getDate() - daysSinceTuesday);
    current.setHours(17, 0, 0, 0);

    if (date < current) {
        current.setDate(current.getDate() - 7);
    }

    return current;
}

function weeklyKey(date = new Date()) {
    return todayKey(getWeeklyPeriodStart(date));
}

function persistState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return;
        }

        const parsed = JSON.parse(raw);
        state.generalTasks = Array.isArray(parsed.generalTasks) ? parsed.generalTasks : [];
        state.dailyProgress = parsed.dailyProgress && typeof parsed.dailyProgress === "object" ? parsed.dailyProgress : {};
        state.weeklyCompletions = parsed.weeklyCompletions && typeof parsed.weeklyCompletions === "object" ? parsed.weeklyCompletions : {};
        state.theme = parsed.theme === "light" || parsed.theme === "dark" ? parsed.theme : getPreferredTheme();
    } catch (error) {
        console.error("상태 로딩 실패", error);
    }
}

function updateThemeToggleLabel() {
    if (!themeToggle) {
        return;
    }

    themeToggle.textContent = state.theme === "light" ? "다크 모드" : "라이트 모드";
    themeToggle.setAttribute("aria-label", state.theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환");
}

function applyTheme(theme, shouldPersist = true) {
    state.theme = theme === "light" ? "light" : "dark";
    document.body.dataset.theme = state.theme;
    document.documentElement.dataset.theme = state.theme;
    updateThemeToggleLabel();

    if (shouldPersist) {
        persistState();
    }
}

function saveAndRender() {
    persistState();
    renderAll();
}

function getDailyRecord(dateKey) {
    if (!state.dailyProgress[dateKey]) {
        state.dailyProgress[dateKey] = {};
    }

    return state.dailyProgress[dateKey];
}

function getWeeklyRecord(periodKey) {
    if (!state.weeklyCompletions[periodKey]) {
        state.weeklyCompletions[periodKey] = {};
    }

    return state.weeklyCompletions[periodKey];
}

function toggleGeneralTask(taskId) {
    const task = state.generalTasks.find((item) => item.id === taskId);
    if (!task) {
        return;
    }

    task.done = !task.done;
    saveAndRender();
}

function removeGeneralTask(taskId) {
    state.generalTasks = state.generalTasks.filter((task) => task.id !== taskId);
    saveAndRender();
}

function toggleDailyTask(taskId, dateKey) {
    const record = getDailyRecord(dateKey);
    const task = DAILY_TASKS.find((item) => item.id === taskId);

    if (!task) {
        return;
    }

    if (task.special === "tribeQuest") {
        const current = Number(record[taskId]) || 0;
        record[taskId] = current >= 12 ? 0 : Math.min(current + 3, 12);
    } else {
        record[taskId] = !record[taskId];
    }

    saveAndRender();
}

function toggleWeeklyTask(taskId, periodKey) {
    const record = getWeeklyRecord(periodKey);
    record[taskId] = !record[taskId];
    saveAndRender();
}

function createTaskCard({ title, subtitle, done, badgeText, onClick, onDelete, progress }) {
    const card = document.createElement("article");
    card.className = `task-card card${done ? " is-done" : ""}`;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-pressed", done ? "true" : "false");

    const body = document.createElement("div");
    body.className = "card-body p-3 p-lg-4";

    const head = document.createElement("div");
    head.className = "d-flex justify-content-between align-items-start gap-3";

    const content = document.createElement("div");
    content.className = "task-content";

    const titleEl = document.createElement("h3");
    titleEl.className = "task-title h6 mb-1";
    titleEl.textContent = title;

    const subtitleEl = document.createElement("p");
    subtitleEl.className = "task-subtitle mb-0";
    subtitleEl.textContent = subtitle || "";

    content.appendChild(titleEl);
    content.appendChild(subtitleEl);

    const badge = document.createElement("span");
    badge.className = `badge rounded-pill ${done ? "text-bg-success" : "text-bg-secondary"}`;
    badge.textContent = badgeText;

    head.appendChild(content);
    head.appendChild(badge);
    body.appendChild(head);

    if (typeof progress === "number") {
        const progressWrap = document.createElement("div");
        progressWrap.className = "progress mt-3";

        const progressBar = document.createElement("div");
        progressBar.className = "progress-bar bg-success";
        progressBar.style.width = `${Math.min(100, Math.round((progress / 12) * 100))}%`;
        progressBar.setAttribute("role", "progressbar");
        progressBar.setAttribute("aria-valuemin", "0");
        progressBar.setAttribute("aria-valuemax", "12");
        progressBar.setAttribute("aria-valuenow", String(progress));
        progressBar.textContent = `${progress}/12`;

        progressWrap.appendChild(progressBar);
        body.appendChild(progressWrap);
    }

    card.appendChild(body);

    if (typeof onDelete === "function") {
        const footer = document.createElement("div");
        footer.className = "card-footer bg-transparent border-0 pt-0 px-3 px-lg-4 pb-3 pb-lg-4 d-flex justify-content-end";

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "btn btn-sm btn-outline-danger";
        deleteBtn.textContent = "삭제";
        deleteBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            onDelete();
        });

        footer.appendChild(deleteBtn);
        card.appendChild(footer);
    }

    card.addEventListener("click", () => onClick());
    card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
        }
    });

    return card;
}

function openGeneralTaskModal() {
    if (!generalTaskModal) {
        return;
    }

    generalTaskForm.reset();
    generalTaskModal.show();
    window.setTimeout(() => generalTaskTitle.focus(), 150);
}


function renderGeneralTasks() {
    generalTaskList.innerHTML = "";

    state.generalTasks.forEach((task) => {
        const card = createTaskCard({
            title: task.title,
            subtitle: task.subtitle,
            done: Boolean(task.done),
            badgeText: task.done ? "완료" : "진행 중",
            onClick: () => toggleGeneralTask(task.id),
            onDelete: () => removeGeneralTask(task.id)
        });

        generalTaskList.appendChild(card);
    });

    const addCard = document.createElement("button");
    addCard.type = "button";
    addCard.className = "task-card task-card-add card border-dashed border-2 w-100 text-start";
    addCard.setAttribute("aria-label", "일반 할 일 추가");

    const body = document.createElement("div");
    body.className = "card-body p-4 d-flex align-items-center justify-content-center text-center";

    const inner = document.createElement("div");
    inner.className = "add-card-inner";

    const plus = document.createElement("div");
    plus.className = "add-card-plus";
    plus.textContent = "+";

    const label = document.createElement("h3");
    label.className = "h6 mb-1";
    label.textContent = "할 일 추가";

    const helper = document.createElement("p");
    helper.className = "mb-0 text-body-secondary small";
    helper.textContent = "“성공은 대단한 재능의 결과가 아니라, 매일매일 쌓아 올린 수많은 노력의 결과물이다.”";

    inner.appendChild(plus);
    inner.appendChild(label);
    inner.appendChild(helper);
    body.appendChild(inner);
    addCard.appendChild(body);

    addCard.addEventListener("click", openGeneralTaskModal);
    addCard.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openGeneralTaskModal();
        }
    });

    generalTaskList.appendChild(addCard);
    generalSummary.textContent = `${state.generalTasks.filter((task) => task.done).length}/${state.generalTasks.length}개`;
}

function renderDailyTasks() {
    const dateKey = todayKey();
    const dailyRecord = state.dailyProgress[dateKey] || {};

    dailyTaskList.innerHTML = "";

    DAILY_TASKS.forEach((task) => {
        const isQuest = task.special === "tribeQuest";
        const progress = isQuest ? Number(dailyRecord[task.id]) || 0 : (dailyRecord[task.id] ? 1 : 0);
        const done = isQuest ? progress >= 12 : Boolean(dailyRecord[task.id]);

        const card = createTaskCard({
            title: task.title,
            subtitle: task.subtitle,
            done,
            badgeText: isQuest ? `${progress}/12` : done ? "완료" : "대기",
            progress: isQuest ? progress : null,
            onClick: () => toggleDailyTask(task.id, dateKey)
        });

        dailyTaskList.appendChild(card);
    });
}

function renderWeeklyTasks() {
    const periodKey = weeklyKey();
    const weeklyRecord = state.weeklyCompletions[periodKey] || {};

    weeklyTaskList.innerHTML = "";

    WEEKLY_TASKS.forEach((task) => {
        const done = Boolean(weeklyRecord[task.id]);

        const card = createTaskCard({
            title: task.title,
            subtitle: task.subtitle,
            done,
            badgeText: done ? "완료" : "대기",
            onClick: () => toggleWeeklyTask(task.id, periodKey)
        });

        weeklyTaskList.appendChild(card);
    });
}

function renderHeader() {
    todayLabel.textContent = formatKoreanDate();
}

function renderAll() {
    renderHeader();
    renderGeneralTasks();
    renderDailyTasks();
    renderWeeklyTasks();
}

generalTaskForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = generalTaskTitle.value.trim();
    const subtitle = generalTaskSubtitle.value.trim();
    if (!title) {
        return;
    }

    state.generalTasks.push({
        id: makeId(),
        title,
        subtitle,
        done: false,
        createdAt: new Date().toISOString()
    });

    persistState();
    renderAll();

    if (generalTaskModal) {
        generalTaskModal.hide();
    }
});

if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        applyTheme(state.theme === "light" ? "dark" : "light");
    });
}

loadState();
applyTheme(state.theme, false);
renderAll();

window.setInterval(() => {
    renderAll();
}, 60000);
