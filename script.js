const STORAGE_KEY = "moon_todo_state_v1";

const state = {
    tasks: [],
    completions: {},
    focusDate: todayStr(),
    focusYear: new Date().getFullYear(),
    activeTab: "todocheck"
};

const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskType = document.getElementById("taskType");
const taskDate = document.getElementById("taskDate");
const taskDateLabel = document.getElementById("taskDateLabel");
const focusDateInput = document.getElementById("focusDate");
const yearPicker = document.getElementById("yearPicker");
const taskList = document.getElementById("taskList");
const taskDashboards = document.getElementById("taskDashboards");
const taskCount = document.getElementById("taskCount");
const yearPlannedCount = document.getElementById("yearPlannedCount");
const yearCompletionRate = document.getElementById("yearCompletionRate");
const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

// 오늘 날짜를 문자열로 생성(yyyy-mm-dd)
function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

// 이번달 문자열 생성(yyyy-mm)
function monthStr(date) {
    return date.toISOString().slice(0, 7);
}

// 날짜 문자열을 집어넣으면 각각 { year, month, day } 로 슬라이싱해서 반환
function parseDateParts(dateStr) {
    const [year, month, day] = dateStr.split("-").map((v) => Number(v));
    return { year, month, day };
}

// 월 문자열 반환
function formatMonthLabel(monthIndex) {
    return `${monthIndex + 1}월`;
}

// todo 목록에 삽입되는 객체의 고유값을 생성하는 함수 (생성형 AI의 도움 받음)
function makeId() {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }

    return `task_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function completionKey(taskId, date) {
    return `${taskId}|${date}`;
}

// 로컬 스토리지 저장
function persistState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// 로컬 스토리지에서 저장된 데이터 불러오기
function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return;
        }

        const parsed = JSON.parse(raw);
        state.tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
        state.completions = parsed.completions && typeof parsed.completions === "object" ? parsed.completions : {};
        state.focusDate = parsed.focusDate || todayStr();
        state.focusYear = Number(parsed.focusYear) || new Date().getFullYear();
        state.activeTab = parsed.activeTab || "todocheck";
    } catch (error) {
        console.error("상태 로딩 실패", error);
    }
}

// 네비게이션 탭 선택한 탭 활성화하고 나머지는 비활성화 상태로 세팅하는 함수
function setActiveTab(tab) {
    state.activeTab = tab;

    tabButtons.forEach((button) => {
        const isActive = button.dataset.tab === tab;
        button.classList.toggle("active", isActive);
    });

    tabPanels.forEach((panel) => {
        const isActive = panel.dataset.panel === tab;
        panel.classList.toggle("active", isActive);
    });

    persistState();
}

// 
function isVisibleOnDate(task, date) {
    if (task.type === "one-time") {
        return task.dueDate === date;
    }

    return task.type === "daily" && date >= task.startDate;
}

function tasksForDate(date) {
    return state.tasks.filter((task) => isVisibleOnDate(task, date));
}

function isDone(task, date) {
    return Boolean(state.completions[completionKey(task.id, date)]);
}

function setDone(task, date, done) {
    const key = completionKey(task.id, date);
    if (done) {
        state.completions[key] = true;
    } else {
        delete state.completions[key];
    }
    persistState();
    renderAll();
}

function removeTask(taskId) {
    state.tasks = state.tasks.filter((task) => task.id !== taskId);

    Object.keys(state.completions).forEach((key) => {
        if (key.startsWith(`${taskId}|`)) {
            delete state.completions[key];
        }
    });

    persistState();
    renderAll();
}

function updateTaskDateLabel() {
    taskDateLabel.textContent = taskType.value === "daily" ? "반복 시작일" : "실행 날짜";
}

function openTaskDatePicker() {
    if (typeof taskDate.showPicker === "function") {
        taskDate.showPicker();
        return;
    }

    taskDate.focus();
}

function renderTaskList() {
    taskList.innerHTML = "";
    const items = tasksForDate(state.focusDate);

    if (items.length === 0) {
        const li = document.createElement("li");
        li.className = "task-item";
        li.innerHTML = "<div class='task-main'><strong></strong><small>add 메뉴에서 새 할 일을 추가해보세요.</small></div>";
        taskList.appendChild(li);
        return;
    }

    items.forEach((task) => {
        const done = isDone(task, state.focusDate);
        const li = document.createElement("li");
        li.className = `task-item${done ? " done" : ""}`;
        li.setAttribute("role", "button");
        li.setAttribute("tabindex", "0");
        li.setAttribute("aria-label", `할 일 완료 토글: ${task.title}`);

        const indicator = document.createElement("span");
        indicator.className = `task-check-indicator${done ? " done" : ""}`;
        indicator.setAttribute("aria-hidden", "true");

        const main = document.createElement("div");
        main.className = "task-main";

        const title = document.createElement("strong");
        title.textContent = task.title;

        const meta = document.createElement("small");
        if (task.type === "daily") {
            meta.textContent = `매일 · 시작일 ${task.startDate}`;
        } else {
            meta.textContent = `일회성 · 실행일 ${task.dueDate}`;
        }

        main.appendChild(title);
        main.appendChild(meta);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "btn-delete";
        removeBtn.textContent = "삭제";
        removeBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            removeTask(task.id);
        });

        li.addEventListener("click", () => {
            setDone(task, state.focusDate, !done);
        });

        li.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setDone(task, state.focusDate, !done);
            }
        });

        li.appendChild(indicator);
        li.appendChild(main);
        li.appendChild(removeBtn);
        taskList.appendChild(li);
    });
}

function dateRangeList(startDate, endDate) {
    const list = [];
    let current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
        list.push(current.toISOString().slice(0, 10));
        current.setDate(current.getDate() + 1);
    }

    return list;
}

function getMonthlyStatsForTask(task, year, monthIndex) {
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);

    let plannedDates = [];

    if (task.type === "one-time") {
        const { year: dueYear, month: dueMonth } = parseDateParts(task.dueDate);
        if (dueYear === year && dueMonth === monthIndex + 1) {
            plannedDates = [task.dueDate];
        }
    } else {
        const start = new Date(task.startDate);
        if (start <= monthEnd) {
            const actualStart = start > monthStart ? start : monthStart;
            plannedDates = dateRangeList(actualStart, monthEnd);
        }
    }

    const planned = plannedDates.length;
    const done = plannedDates.filter((date) => isDone(task, date)).length;

    let status = "none";
    if (planned > 0 && done === planned) {
        status = "done";
    } else if (done > 0) {
        status = "partial";
    } else if (planned > 0) {
        status = "missed";
    }

    return { planned, done, status };
}

function renderTaskDashboards() {
    taskDashboards.innerHTML = "";

    if (state.tasks.length === 0) {
        const empty = document.createElement("div");
        empty.className = "task-dashboard-card";
        empty.textContent = "등록된 할 일이 없습니다. Add 탭에서 할 일을 먼저 추가하세요.";
        taskDashboards.appendChild(empty);
        taskCount.textContent = "0";
        yearPlannedCount.textContent = "0";
        yearCompletionRate.textContent = "0%";
        return;
    }

    let allPlanned = 0;
    let allDone = 0;

    state.tasks.forEach((task) => {
        const card = document.createElement("article");
        card.className = "task-dashboard-card";

        const top = document.createElement("div");
        top.className = "task-dashboard-top";

        const left = document.createElement("div");
        const title = document.createElement("p");
        title.className = "task-dashboard-title";
        title.textContent = task.title;

        const meta = document.createElement("p");
        meta.className = "task-dashboard-meta";
        meta.textContent = task.type === "daily" ? `매일 · 시작일 ${task.startDate}` : `일회성 · 실행일 ${task.dueDate}`;

        left.appendChild(title);
        left.appendChild(meta);

        const rate = document.createElement("p");
        rate.className = "task-dashboard-rate";

        const monthStrip = document.createElement("div");
        monthStrip.className = "month-strip";

        let taskPlanned = 0;
        let taskDone = 0;

        for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
            const stats = getMonthlyStatsForTask(task, state.focusYear, monthIndex);
            taskPlanned += stats.planned;
            taskDone += stats.done;

            const chip = document.createElement("div");
            chip.className = `month-chip ${stats.status}`;

            const name = document.createElement("span");
            name.className = "month-name";
            name.textContent = formatMonthLabel(monthIndex);

            const metric = document.createElement("span");
            metric.className = "month-metric";
            metric.textContent = stats.planned === 0 ? "-" : `${stats.done}/${stats.planned}`;

            chip.appendChild(name);
            chip.appendChild(metric);
            monthStrip.appendChild(chip);
        }

        allPlanned += taskPlanned;
        allDone += taskDone;

        const taskRate = taskPlanned === 0 ? 0 : Math.round((taskDone / taskPlanned) * 100);
        rate.textContent = `완료율 ${taskRate}%`;

        top.appendChild(left);
        top.appendChild(rate);

        card.appendChild(top);
        card.appendChild(monthStrip);
        taskDashboards.appendChild(card);
    });

    taskCount.textContent = String(state.tasks.length);
    yearPlannedCount.textContent = String(allPlanned);
    yearCompletionRate.textContent = `${allPlanned === 0 ? 0 : Math.round((allDone / allPlanned) * 100)}%`;
}

function renderAll() {
    renderTaskList();
    renderTaskDashboards();
}

taskForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = taskTitle.value.trim();
    if (!title) {
        return;
    }

    const type = taskType.value;
    const date = taskDate.value || todayStr();

    const task = {
        id: makeId(),
        title,
        type,
        createdAt: new Date().toISOString()
    };

    if (type === "daily") {
        task.startDate = date;
    } else {
        task.dueDate = date;
    }

    state.tasks.push(task);
    persistState();

    taskTitle.value = "";
    renderAll();
});

taskType.addEventListener("change", updateTaskDateLabel);

taskDate.addEventListener("focus", openTaskDatePicker);
taskDate.addEventListener("click", openTaskDatePicker);
taskDate.addEventListener("keydown", (event) => {
    const allowedKeys = ["Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", "Escape"];
    if (!allowedKeys.includes(event.key)) {
        event.preventDefault();
    }
});

tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
        setActiveTab(button.dataset.tab || "todocheck");
    });
});

focusDateInput.addEventListener("change", () => {
    state.focusDate = focusDateInput.value || todayStr();
    persistState();
    renderTaskList();
});

yearPicker.addEventListener("change", () => {
    const parsedYear = Number(yearPicker.value);
    if (!Number.isFinite(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
        yearPicker.value = String(state.focusYear);
        return;
    }

    state.focusYear = parsedYear;
    persistState();
    renderTaskDashboards();
});

loadState();

focusDateInput.value = state.focusDate;
yearPicker.value = String(state.focusYear);
taskDate.value = state.focusDate;

updateTaskDateLabel();
setActiveTab(state.activeTab);
renderAll();
