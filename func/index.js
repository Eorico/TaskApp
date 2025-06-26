// Database-like structure
class TaskFlowDB {
    constructor() {
        this.users = this.getUsers();
        this.tasks = this.getTasks();
        this.userProfiles = this.getUserProfiles();
    }

    // Users table
    getUsers() {
        return JSON.parse(localStorage.getItem('taskflow_users') || '[]');
    }

    saveUsers() {
        localStorage.setItem('taskflow_users', JSON.stringify(this.users));
    }

    createUser(userData) {
        const user = {
            id: Date.now(),
            ...userData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.users.push(user);
        this.saveUsers();
        return user;
    }

    getUserByEmail(email) {
        return this.users.find(user => user.email === email);
    }

    updateUser(userId, updates) {
        const userIndex = this.users.findIndex(user => user.id === userId);
        if (userIndex !== -1) {
            this.users[userIndex] = {
                ...this.users[userIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveUsers();
            return this.users[userIndex];
        }
        return null;
    }

    // Tasks table
    getTasks() {
        return JSON.parse(localStorage.getItem('taskflow_tasks') || '[]');
    }

    saveTasks() {
        localStorage.setItem('taskflow_tasks', JSON.stringify(this.tasks));
    }

    createTask(userId, taskData) {
        const task = {
            id: Date.now(),
            userId: userId,
            ...taskData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.tasks.push(task);
        this.saveTasks();
        return task;
    }

    getUserTasks(userId) {
        return this.tasks.filter(task => task.userId === userId);
    }

    updateTask(taskId, updates) {
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
            this.tasks[taskIndex] = {
                ...this.tasks[taskIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveTasks();
            return this.tasks[taskIndex];
        }
        return null;
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveTasks();
    }

    // User profiles table
    getUserProfiles() {
        return JSON.parse(localStorage.getItem('taskflow_profiles') || '[]');
    }

    saveUserProfiles() {
        localStorage.setItem('taskflow_profiles', JSON.stringify(this.userProfiles));
    }

    getUserProfile(userId) {
        return this.userProfiles.find(profile => profile.userId === userId);
    }

    updateUserProfile(userId, profileData) {
        const profileIndex = this.userProfiles.findIndex(profile => profile.userId === userId);
        if (profileIndex !== -1) {
            this.userProfiles[profileIndex] = {
                ...this.userProfiles[profileIndex],
                ...profileData,
                updatedAt: new Date().toISOString()
            };
        } else {
            this.userProfiles.push({
                userId: userId,
                ...profileData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        this.saveUserProfiles();
    }
}

// Application State
let currentUser = null;
let tasks = [];
let filteredTasks = [];
let currentView = 'tasks';
let currentDate = new Date();
let editingTaskId = null;
let db = new TaskFlowDB();

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
    initializeDarkMode();
    setupMobileCollapsibles();
});
function setupMobileCollapsibles() {
    const toggleSearch = document.getElementById('toggleSearchFilter');
    const searchSection = document.getElementById('searchFilterSection');
    const toggleAdd = document.getElementById('toggleAddTask');
    const addSection = document.getElementById('addTaskSection');

    // Default: expanded on desktop, collapsed on mobile
    function setInitialState() {
        if (window.innerWidth <= 768) {
            searchSection.classList.remove('expanded');
            addSection.classList.remove('expanded');
            toggleSearch.classList.remove('active');
            toggleAdd.classList.remove('active');
        } else {
            searchSection.classList.add('expanded');
            addSection.classList.add('expanded');
        }
    }
    setInitialState();

    toggleSearch.addEventListener('click', function() {
        searchSection.classList.toggle('expanded');
        toggleSearch.classList.toggle('active');
    });
    toggleAdd.addEventListener('click', function() {
        addSection.classList.toggle('expanded');
        toggleAdd.classList.toggle('active');
    });

    // Reset state on resize
    window.addEventListener('resize', setInitialState);
}
// Check authentication status
function checkAuthStatus() {
    const savedUser = localStorage.getItem('taskflow_current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    }
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

    // Search and filter events
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('priorityFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('dateFilter').addEventListener('change', applyFilters);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);

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

    // Mobile menu events
    document.getElementById('mobileMenuToggle').addEventListener('click', toggleMobileMenu);
    document.getElementById('mobileLogout').addEventListener('click', handleLogout);

    // Close mobile menu when clicking nav items
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            switchView(view);
            closeMobileMenu();
        });
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeMobileMenu();
        }
    });
}

// Logo upload functions
function triggerLogoUpload() {
    document.getElementById('logoUpload').click();
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = e.target.result;
            
            // Update logo images
            const logoImage = document.getElementById('logoImage');
            const mobileLogoImage = document.getElementById('mobileLogoImage');
            const logoText = document.getElementById('logoText');
            const mobileLogoText = document.getElementById('mobileLogoText');
            
            logoImage.src = imageData;
            mobileLogoImage.src = imageData;
            logoImage.classList.remove('hidden');
            mobileLogoImage.classList.remove('hidden');
            logoText.style.display = 'none';
            mobileLogoText.style.display = 'none';
            
            // Save to user profile
            db.updateUserProfile(currentUser.id, { logoImage: imageData });
        };
        reader.readAsDataURL(file);
    }
}

function loadUserLogo() {
    const profile = db.getUserProfile(currentUser.id);
    if (profile && profile.logoImage) {
        const logoImage = document.getElementById('logoImage');
        const mobileLogoImage = document.getElementById('mobileLogoImage');
        const logoText = document.getElementById('logoText');
        const mobileLogoText = document.getElementById('mobileLogoText');
        
        logoImage.src = profile.logoImage;
        mobileLogoImage.src = profile.logoImage;
        logoImage.classList.remove('hidden');
        mobileLogoImage.classList.remove('hidden');
        logoText.style.display = 'none';
        mobileLogoText.style.display = 'none';
    }
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

    const user = db.getUserByEmail(email);

    if (user && user.password === password) {
        currentUser = user;
        localStorage.setItem('taskflow_current_user', JSON.stringify(currentUser));
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

    if (db.getUserByEmail(email)) {
        showError('User with this email already exists');
        return;
    }

    const newUser = db.createUser({
        name,
        email,
        password,
        darkMode: false
    });
    
    showSuccess('Account created successfully! Please sign in.');
    setTimeout(() => {
        showLoginForm();
        document.getElementById('loginEmail').value = email;
    }, 1500);
}

function handleLogout() {
    currentUser = null;
    tasks = [];
    filteredTasks = [];
    localStorage.removeItem('taskflow_current_user');
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
    loadUserLogo();
    applyFilters();
    renderCalendar();
}

// Navigation
function switchView(view) {
    // Update desktop nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const desktopNavItem = document.querySelector(`[data-view="${view}"]`);
    if (desktopNavItem) {
        desktopNavItem.classList.add('active');
    }

    // Update mobile nav items
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const mobileNavItem = document.querySelector(`.mobile-nav-item[data-view="${view}"]`);
    if (mobileNavItem) {
        mobileNavItem.classList.add('active');
    }

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
    tasks = db.getUserTasks(currentUser.id);
}

function addTask() {
    const input = document.getElementById('taskInput');
    const dueDateInput = document.getElementById('taskDueDate');
    const prioritySelect = document.getElementById('taskPriority');
    
    const text = input.value.trim();
    if (text === '') return;

    const newTask = db.createTask(currentUser.id, {
        title: text,
        completed: false,
        dueDate: dueDateInput.value || null,
        priority: prioritySelect.value
    });

    tasks.unshift(newTask);
    applyFilters();
    
    // Clear inputs
    input.value = '';
    dueDateInput.value = '';
    prioritySelect.value = 'low';
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        const updatedTask = db.updateTask(id, { completed: !task.completed });
        const taskIndex = tasks.findIndex(t => t.id === id);
        tasks[taskIndex] = updatedTask;
        applyFilters();
        if (currentView === 'calendar') {
            renderCalendar();
        }
    }
}

function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        db.deleteTask(id);
        tasks = tasks.filter(t => t.id !== id);
        applyFilters();
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
        const updatedTask = db.updateTask(editingTaskId, {
            title: document.getElementById('editTaskTitle').value,
            dueDate: document.getElementById('editTaskDueDate').value || null,
            priority: document.getElementById('editTaskPriority').value
        });
        
        const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
        tasks[taskIndex] = updatedTask;
        
        applyFilters();
        if (currentView === 'calendar') {
            renderCalendar();
        }
        closeEditModal();
    }
}

// Search and filter functions
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const priorityFilter = document.getElementById('priorityFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;

    filteredTasks = tasks.filter(task => {
        // Search filter
        const matchesSearch = task.title.toLowerCase().includes(searchTerm);
        
        // Priority filter
        const matchesPriority = !priorityFilter || task.priority === priorityFilter;
        
        // Status filter
        let matchesStatus = true;
        if (statusFilter === 'completed') {
            matchesStatus = task.completed;
        } else if (statusFilter === 'pending') {
            matchesStatus = !task.completed && (!task.dueDate || new Date(task.dueDate) >= new Date());
        } else if (statusFilter === 'overdue') {
            matchesStatus = !task.completed && task.dueDate && new Date(task.dueDate) < new Date();
        }
        
        // Date filter
        let matchesDate = true;
        if (dateFilter && task.dueDate) {
            const taskDate = new Date(task.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (dateFilter === 'today') {
                matchesDate = taskDate.toDateString() === today.toDateString();
            } else if (dateFilter === 'week') {
                const weekFromNow = new Date(today);
                weekFromNow.setDate(today.getDate() + 7);
                matchesDate = taskDate >= today && taskDate <= weekFromNow;
            } else if (dateFilter === 'month') {
                const monthFromNow = new Date(today);
                monthFromNow.setMonth(today.getMonth() + 1);
                matchesDate = taskDate >= today && taskDate <= monthFromNow;
            }
        } else if (dateFilter) {
            matchesDate = false;
        }
        
        return matchesSearch && matchesPriority && matchesStatus && matchesDate;
    });

    updateFilterResults();
    renderTasks();
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('priorityFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('dateFilter').value = '';
    applyFilters();
}

function updateFilterResults() {
    const resultsEl = document.getElementById('filterResults');
    const totalTasks = tasks.length;
    const filteredCount = filteredTasks.length;
    
    if (filteredCount === totalTasks) {
        resultsEl.textContent = `Showing all ${totalTasks} tasks`;
    } else {
        resultsEl.textContent = `Showing ${filteredCount} of ${totalTasks} tasks`;
    }
}

function renderTasks() {
    const container = document.getElementById('tasksContainer');
    
    if (filteredTasks.length === 0) {
        if (tasks.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); font-style: italic; margin-top: 50px;">No tasks yet. Add one above to get started!</div>';
        } else {
            container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); font-style: italic; margin-top: 50px;">No tasks match your current filters.</div>';
        }
        return;
    }

    container.innerHTML = filteredTasks.map(task => {
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
    
    const profile = db.getUserProfile(currentUser.id);
    document.getElementById('darkModeToggle').checked = (profile && profile.darkMode) || currentUser.darkMode || false;
}

function updateProfile(e) {
    e.preventDefault();
    
    const name = document.getElementById('profileName').value;
    const email = document.getElementById('profileEmail').value;

    // Update current user
    const updatedUser = db.updateUser(currentUser.id, { name, email });
    currentUser = updatedUser;
    localStorage.setItem('taskflow_current_user', JSON.stringify(currentUser));

    showSuccess('Profile updated successfully!');
    setTimeout(() => {
        clearMessages();
    }, 3000);
}

function initializeDarkMode() {
    const savedUser = localStorage.getItem('taskflow_current_user');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        const profile = db.getUserProfile(user.id);
        if ((profile && profile.darkMode) || user.darkMode) {
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
    db.updateUserProfile(currentUser.id, { darkMode: isDark });
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

// Mobile menu functions
function toggleMobileMenu() {
    const mobileNav = document.getElementById('mobileNav');
    const toggle = document.getElementById('mobileMenuToggle');
    
    mobileNav.classList.toggle('show');
    toggle.classList.toggle('active');
}

function closeMobileMenu() {
    const mobileNav = document.getElementById('mobileNav');
    const toggle = document.getElementById('mobileMenuToggle');
    
    mobileNav.classList.remove('show');
    toggle.classList.remove('active');
}