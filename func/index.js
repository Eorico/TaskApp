// Application State
let currentUser = null;
let tasks = [];
let currentView = 'tasks';
let currentDate = new Date();
let editingTaskId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
    setupSidebarToggle();
    initializeDarkMode();
});

// Check authentication status
function checkAuthStatus() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    }
}

function setupSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    if (!sidebar || !toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside (on mobile)
    document.addEventListener('click', (e) => {
        if (
            window.innerWidth <= 600 &&
            sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            e.target !== toggleBtn
        ) {
            sidebar.classList.remove('open');
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Auth events
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterForm();
    });

    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });

    document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement').addEventListener('submit', handleRegister);

    // Dashboard events
    document.getElementById('dashboardLogout').addEventListener('click', handleLogout);
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            switchView(view);
        });
    });

    // Task events
    document.getElementById('addTaskBtn').addEventListener('click', addTask);
    document.getElementById('taskInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    // Calendar events
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // Settings events
    document.getElementById('profileForm').addEventListener('submit', updateProfile);
    document.getElementById('darkModeToggle').addEventListener('change', toggleDarkMode);

    // Edit task modal events
    document.getElementById('closeEditModal').addEventListener('click', closeEditModal);
    document.getElementById('cancelEdit').addEventListener('click', closeEditModal);
    document.getElementById('editTaskForm').addEventListener('submit', saveEditedTask);
}


// Authentication functions
function showLoginForm() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    clearMessages();
}

function showRegisterForm() {
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
    clearMessages();
}

function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showSuccess('Login successful!');
        setTimeout(() => {
            showDashboard();
        }, 1000);
    } else {
        showError('Invalid email or password');
    }
}

function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.find(u => u.email === email)) {
        showError('User with this email already exists');
        return;
    }

    const newUser = {
        id: Date.now(),
        name,
        email,
        password,
        darkMode: false
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    showSuccess('Account created successfully! Please sign in.');
    setTimeout(() => {
        showLoginForm();
        document.getElementById('loginEmail').value = email;
    }, 1500);
}

function handleLogout() {
    currentUser = null;
    tasks = [];
    localStorage.removeItem('currentUser');
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
    clearMessages();
    document.getElementById('loginFormElement').reset();
    document.getElementById('registerFormElement').reset();
}

function showDashboard() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    loadTasks();
    loadUserSettings();
    renderTasks();
    renderCalendar();
}

// Navigation
function switchView(view) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    // Show/hide views
    document.querySelectorAll('.view').forEach(viewEl => {
        viewEl.classList.add('hidden');
    });
    document.getElementById(`${view}View`).classList.remove('hidden');

    currentView = view;

    // Render view-specific content
    if (view === 'calendar') {
        renderCalendar();
    }
}

// Task management
function loadTasks() {
    const savedTasks = localStorage.getItem(`tasks_${currentUser.id}`);
    tasks = savedTasks ? JSON.parse(savedTasks) : [];
}

function saveTasks() {
    localStorage.setItem(`tasks_${currentUser.id}`, JSON.stringify(tasks));
}

function addTask() {
    const input = document.getElementById('taskInput');
    const dueDateInput = document.getElementById('taskDueDate');
    const prioritySelect = document.getElementById('taskPriority');
    
    const text = input.value.trim();
    if (text === '') return;

    const newTask = {
        id: Date.now(),
        title: text,
        completed: false,
        dueDate: dueDateInput.value || null,
        priority: prioritySelect.value,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    saveTasks();
    renderTasks();
    
    // Clear inputs
    input.value = '';
    dueDateInput.value = '';
    prioritySelect.value = 'low';
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
        if (currentView === 'calendar') {
            renderCalendar();
        }
    }
}

function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
        if (currentView === 'calendar') {
            renderCalendar();
        }
    }
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        editingTaskId = id;
        document.getElementById('editTaskTitle').value = task.title;
        document.getElementById('editTaskDueDate').value = task.dueDate || '';
        document.getElementById('editTaskPriority').value = task.priority;
        document.getElementById('editTaskModal').classList.remove('hidden');
    }
}

function closeEditModal() {
    document.getElementById('editTaskModal').classList.add('hidden');
    editingTaskId = null;
}

function saveEditedTask(e) {
    e.preventDefault();
    
    const task = tasks.find(t => t.id === editingTaskId);
    if (task) {
        task.title = document.getElementById('editTaskTitle').value;
        task.dueDate = document.getElementById('editTaskDueDate').value || null;
        task.priority = document.getElementById('editTaskPriority').value;
        
        saveTasks();
        renderTasks();
        if (currentView === 'calendar') {
            renderCalendar();
        }
        closeEditModal();
    }
}

function renderTasks() {
    const container = document.getElementById('tasksContainer');
    
    if (tasks.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); font-style: italic; margin-top: 50px;">No tasks yet. Add one above to get started!</div>';
        return;
    }

    container.innerHTML = tasks.map(task => {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const isOverdue = dueDate && dueDate < new Date() && !task.completed;
        
        return `
            <div class="task-item priority-${task.priority} ${task.completed ? 'completed' : ''}">
                <div class="task-header">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                            onchange="toggleTask(${task.id})">
                    <div class="task-title ${task.completed ? 'completed' : ''}">${escapeHtml(task.title)}</div>
                    <div class="task-actions">
                        <button class="task-btn edit-btn" onclick="editTask(${task.id})">Edit</button>
                        <button class="task-btn delete-btn" onclick="deleteTask(${task.id})">Delete</button>
                    </div>
                </div>
                <div class="task-meta">
                    <span class="priority-badge priority-${task.priority}">${task.priority.toUpperCase()}</span>
                    ${task.dueDate ? `<span ${isOverdue ? 'style="color: var(--danger-color); font-weight: 600;"' : ''}>Due: ${formatDate(task.dueDate)}</span>` : ''}
                    ${isOverdue ? '<span style="color: var(--danger-color); font-weight: 600;">OVERDUE</span>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Calendar functions
function renderCalendar() {
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    
    document.getElementById('calendarMonth').textContent = 
        `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';

    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day';
        dayHeader.style.background = 'var(--primary-color)';
        dayHeader.style.color = 'white';
        dayHeader.style.fontWeight = '600';
        dayHeader.style.textAlign = 'center';
        dayHeader.style.minHeight = '40px';
        dayHeader.style.display = 'flex';
        dayHeader.style.alignItems = 'center';
        dayHeader.style.justifyContent = 'center';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });

    // Add calendar days
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        if (date.getMonth() !== currentDate.getMonth()) {
            dayElement.style.opacity = '0.3';
        }

        const dayTasks = tasks.filter(task => 
            task.dueDate && new Date(task.dueDate).toDateString() === date.toDateString()
        );

        dayElement.innerHTML = `
            <div class="calendar-day-number">${date.getDate()}</div>
            ${dayTasks.map(task => {
                const isOverdue = new Date(task.dueDate) < new Date() && !task.completed;
                return `<div class="calendar-task ${isOverdue ? 'overdue' : ''}" title="${escapeHtml(task.title)}">${escapeHtml(task.title.substring(0, 15))}${task.title.length > 15 ? '...' : ''}</div>`;
            }).join('')}
        `;

        calendarGrid.appendChild(dayElement);
    }
}

// Settings functions
function loadUserSettings() {
    document.getElementById('profileName').value = currentUser.name;
    document.getElementById('profileEmail').value = currentUser.email;
    document.getElementById('darkModeToggle').checked = currentUser.darkMode || false;
}

function updateProfile(e) {
    e.preventDefault();
    
    const name = document.getElementById('profileName').value;
    const email = document.getElementById('profileEmail').value;

    // Update current user
    currentUser.name = name;
    currentUser.email = email;

    // Update in users array
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }

    showSuccess('Profile updated successfully!');
    setTimeout(() => {
        clearMessages();
    }, 3000);
}

function initializeDarkMode() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        if (user.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }
}

function toggleDarkMode() {
    const isDark = document.getElementById('darkModeToggle').checked;
    
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }

    // Update user preference
    currentUser.darkMode = isDark;
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
}

// Utility functions
function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    document.getElementById('successMessage').style.display = 'none';
}

function showSuccess(message) {
    const successEl = document.getElementById('successMessage');
    successEl.textContent = message;
    successEl.style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
}

function clearMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}