import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC87g6-ZLkXW9bPFy3Kn0ZASKYG-EiRArE",
    authDomain: "eventseatmanagement.firebaseapp.com",
    projectId: "eventseatmanagement",
    storageBucket: "eventseatmanagement.appspot.com",
    messagingSenderId: "911745257961",
    appId: "1:911745257961:web:2759656a91df70fd5dbb78",
    measurementId: "G-9K4SXKD384"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

$(document).ready(() => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let currentDate = new Date();
    let selectedDate = new Date();
    let selectedTask = null;
    let tasks = {};
    let currentUser = null;
    const taskModal = new bootstrap.Modal('#taskModal');

    // Utility Functions
    const formatDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const isSameDay = (d1, d2) => d1.toDateString() === d2.toDateString();
    const logError = (msg, error) => console.error(msg, error);

    const saveTasks = async (date, taskList) => {
        if (!currentUser) return;
        const tasksRef = doc(db, 'users', currentUser.uid, 'tasks', date);
        try {
            await setDoc(tasksRef, { items: taskList }, { merge: false });
            console.log(`Tasks saved for ${date}:`, taskList);
        } catch (error) {
            logError(`Error saving tasks for ${date}:`, error);
        }
    };

    const findTask = (taskId) => {
        for (const date in tasks) {
            const task = tasks[date].find(t => t.id == taskId);
            if (task) return { task, date };
        }
        return null;
    };

    // Render Calendar
    const renderCalendar = () => {
        const year = currentDate.getFullYear(), month = currentDate.getMonth();
        $('#current-month').text(`${monthNames[month]} ${year}`);

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let date = 1, calendarBody = '';

        for (let i = 0; i < 6 && date <= daysInMonth; i++) {
            calendarBody += '<tr>';
            for (let j = 0; j < 7; j++) {
                if (i === 0 && j < firstDay || date > daysInMonth) {
                    calendarBody += '<td class="calendar-day empty"></td>';
                } else {
                    const dateStr = formatDate(new Date(year, month, date));
                    const classes = [
                        'calendar-day',
                        isSameDay(new Date(year, month, date), new Date()) ? 'today' : '',
                        isSameDay(new Date(year, month, date), selectedDate) ? 'selected' : '',
                        tasks[dateStr]?.length > 0 ? 'has-tasks' : ''
                    ].filter(Boolean).join(' ');
                    calendarBody += `<td class="${classes}" data-date="${dateStr}"><div class="day-number">${date}</div></td>`;
                    date++;
                }
            }
            calendarBody += '</tr>';
        }
        $('#calendar-body').html(calendarBody);
        updateTasksPanel();
    };

    // Update Tasks Panel
    const updateTasksPanel = () => {
        const dateStr = formatDate(selectedDate);
        const dateTasks = tasks[dateStr] || [];
        $('#tasks-date').text(`Tasks for ${selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`);

        $('#no-tasks-message').toggleClass('d-none', dateTasks.length > 0);
        $('#tasks-list').html(dateTasks.length > 0 ? dateTasks.map(task => `
            <li class="task-item p-3 mb-2 bg-white rounded shadow-sm ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="d-flex justify-content-between align-items-start">
                    <div><span class="priority-${task.priority || 'low'} task-priority"></span><strong>${task.title}</strong></div>
                    <small class="text-muted">${task.time?.start ? `${task.time.start} - ${task.time.end}` : 'All day'}</small>
                </div>
                ${task.description ? `<p class="mt-2 mb-0 text-muted small">${task.description}</p>` : ''}
            </li>
        `).join('') : '');
        $('#task-details').toggleClass('d-none', !selectedTask);
    };

    // Show Task Details
    const showTaskDetails = task => {
        selectedTask = task;
        const $taskDetails = $('#task-details').removeClass('d-none');
        $('#task-detail-title').text(task.title);
        $('#task-description').html(task.description ? `<p>${task.description}</p>` : '<p class="text-muted">No description provided.</p>');
        $('#task-time').text(task.time?.start ? `${formatDate(selectedDate)}, ${task.time.start} - ${task.time.end}` : 'All day');
        $('#task-status-badge').removeClass('bg-success bg-secondary')
            .addClass(task.completed ? 'bg-success' : 'bg-secondary')
            .text(task.completed ? 'Completed' : 'Pending');

        let combinedHistory = [...(task.history || [])];
        console.log('Task history before merge:', combinedHistory);
        if (task.followUpFrom) {
            let currentTask = task;
            while (currentTask.followUpFrom) {
                const originalTask = Object.values(tasks).flat().find(t => String(t.id) === String(currentTask.followUpFrom));
                console.log('Looking for original task with ID:', currentTask.followUpFrom, 'Found:', originalTask);
                if (originalTask?.history) {
                    const filteredHistory = originalTask.history.filter(entry => 
                        !(entry.action === 'Follow-up created' && entry.changes.followUpId?.new === currentTask.id)
                    );
                    combinedHistory = [...filteredHistory, ...combinedHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
                }
                currentTask = originalTask || currentTask; // Stop if not found
            }
        } else {
            combinedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        console.log('Combined history:', combinedHistory);

        $('#history-list').html(combinedHistory.length > 0 ? `
            <div class="task-history-container">
                <table class="task-history-table">
                    <thead><tr><th>Date</th><th>Action</th><th>Field</th><th>Old Value</th><th>New Value</th></tr></thead>
                    <tbody>${combinedHistory.map(entry => 
                        Object.entries(entry.changes || {}).map(([field, change], index) => `
                            <tr>
                                ${index === 0 ? `
                                    <td rowspan="${Object.keys(entry.changes).length}">${new Date(entry.date).toLocaleString()}</td>
                                    <td rowspan="${Object.keys(entry.changes).length}">${entry.action}</td>
                                ` : ''}
                                <td>${field}</td>
                                <td>${change.old !== undefined ? `<span class="history-change-old">${change.old ?? 'None'}</span>` : ''}</td>
                                <td><span class="history-change-new">${change.new ?? 'None'}</span></td>
                            </tr>
                        `).join('')
                    ).join('')}</tbody>
                </table>
            </div>
        ` : '<div class="text-muted small">No history available</div>');

        const followUps = task.followUps || [];
        $('#follow-up-list').html(followUps.length > 0 ? `
            <div class="follow-up-container mt-3">
                <h6>Follow-up Tasks:</h6>
                <ul class="list-group">${followUps.map(followUp => {
                    const followUpTask = tasks[followUp.date]?.find(t => t.id === followUp.id);
                    return followUpTask ? `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <span>${followUpTask.title} (${followUp.date})</span>
                            <span class="badge ${followUpTask.completed ? 'bg-success' : 'bg-secondary'}">${followUpTask.completed ? 'Completed' : 'Pending'}</span>
                        </li>
                    ` : '';
                }).join('')}</ul>
            </div>
        ` : '<div class="text-muted small mt-3">No follow-up tasks.</div>');
    };

    // Load User Tasks
    const loadUserTasks = () => {
        if (!auth.currentUser) return;
        onSnapshot(collection(db, 'users', auth.currentUser.uid, 'tasks'), snapshot => {
            tasks = {};
            snapshot.forEach(doc => tasks[doc.id] = doc.data().items || []);
            renderCalendar();
        });
    };

    // Event Handlers
    onAuthStateChanged(auth, user => {
        currentUser = user;
        $('#login-section').toggleClass('d-none', !!user);
        $('#app-container').toggleClass('d-none', !user);
        if (user) loadUserTasks();
        else tasks = {}, selectedTask = null;
        $('#login-form')[0].reset();
    });

    $('#saveTaskBtn').click(async () => {
        const taskId = $('#taskId').val();
        const taskDate = $('#taskDate').val();
        const taskData = {
            id: taskId ? parseInt(taskId) : Date.now(),
            personName: $('#personName').val(),
            title: $('#taskTitle').val(),
            time: { start: $('#taskStartTime').val(), end: $('#taskEndTime').val() },
            type: $('#taskType').val(),
            description: $('#taskDescription').val(),
            completed: $('#taskCompleted').is(':checked'),
            history: []
        };

        if (!taskData.title || !taskData.personName) return alert('Title and Person Name are required');

        tasks[taskDate] = tasks[taskDate] || [];
        const existingIndex = taskId ? tasks[taskDate].findIndex(t => t.id == taskId) : -1;
        const oldTask = existingIndex >= 0 ? tasks[taskDate][existingIndex] : null;

        const changes = oldTask ? {
            ...(oldTask.personName !== taskData.personName && { personName: { old: oldTask.personName, new: taskData.personName } }),
            ...(oldTask.title !== taskData.title && { title: { old: oldTask.title, new: taskData.title } }),
            ...(oldTask.type !== taskData.type && { type: { old: oldTask.type, new: taskData.type } }),
            ...((oldTask.time.start !== taskData.time.start || oldTask.time.end !== taskData.time.end) && {
                time: { old: `${oldTask.time.start || ''} - ${oldTask.time.end || ''}`, new: `${taskData.time.start} - ${taskData.time.end}` }
            }),
            ...(oldTask.description !== taskData.description && { description: { old: oldTask.description || 'No description', new: taskData.description || 'No description' } }),
            ...(oldTask.completed !== taskData.completed && { completed: { old: oldTask.completed, new: taskData.completed } })
        } : {
            personName: { new: taskData.personName },
            title: { new: taskData.title },
            type: { new: taskData.type },
            time: { new: `${taskData.time.start} - ${taskData.time.end}` },
            description: { new: taskData.description || 'No description' }
        };

        taskData.history = oldTask?.history || [];
        taskData.followUps = oldTask?.followUps || [];
        if (Object.keys(changes).length) {
            taskData.history.unshift({ date: new Date().toISOString(), action: taskId ? 'Task updated' : 'Task created', changes });
        }

        if (existingIndex >= 0) tasks[taskDate][existingIndex] = taskData;
        else tasks[taskDate].push(taskData);

        await saveTasks(taskDate, tasks[taskDate]);
        $('#taskModal').modal('hide');
        renderCalendar();
        showTaskDetails(taskData);
        $('#taskForm')[0].reset();
        $('#taskId').val('');
        $('#modalTitle').text('Add New Task');
    });

    $('#saveFollowUpBtn').click(async () => {
        const taskId = $('#originalTaskId').val();
        const taskDate = $('#followUpDate').val();
        const followUpData = {
            id: Date.now(),
            personName: $('#followPersonName').val(),
            title: $('#followTitle').val(),
            time: { start: $('#followStartTime').val(), end: $('#followEndTime').val() },
            type: $('#followType').val(),
            description: $('#followDescription').val(),
            completed: false,
            followUpFrom: taskId,
            history: []
        };

        if (!followUpData.title || !followUpData.personName || !taskDate) return alert('Please fill all required fields');

        const original = findTask(taskId);
        if (!original) return console.warn(`Original task with ID ${taskId} not found`);

        followUpData.history.push({
            date: new Date().toISOString(),
            action: 'Follow-up created',
            changes: {
                personName: { old: original.task.personName, new: followUpData.personName },
                title: { old: original.task.title, new: followUpData.title },
                type: { old: original.task.type, new: followUpData.type },
                time: { old: `${original.task.time.start || ''} - ${original.task.time.end || ''}`, new: `${followUpData.time.start} - ${followUpData.time.end}` },
                description: { old: original.task.description || 'No description', new: followUpData.description || 'No description' },
                completed: { old: original.task.completed, new: false },
                followUpFrom: { new: taskId }
            }
        });

        tasks[taskDate] = tasks[taskDate] || [];
        tasks[taskDate].push(followUpData);

        original.task.history = original.task.history || [];
        original.task.history.unshift({
            date: new Date().toISOString(),
            action: 'Follow-up created',
            changes: {
                followUpId: { old: null, new: followUpData.id },
                followUpTitle: { old: null, new: followUpData.title },
                followUpDate: { old: null, new: taskDate },
                followUpTime: { old: null, new: `${followUpData.time.start} - ${followUpData.time.end}` }
            }
        });
        original.task.followUps = original.task.followUps || [];
        original.task.followUps.push({ id: followUpData.id, date: taskDate });

        await Promise.all([
            saveTasks(taskDate, tasks[taskDate]),
            saveTasks(original.date, tasks[original.date])
        ]);

        $('#followUpForm')[0].reset();
        $('#originalTaskId').val('');
        $('#followUpModal').modal('hide');
        renderCalendar();
        showTaskDetails(original.task);
    });

    // Delegated Event Handlers
    $(document).on('click', '.calendar-day:not(.empty)', e => {
        selectedDate = new Date($(e.currentTarget).data('date'));
        selectedTask = null;
        renderCalendar();
    }).on('click', '.task-item', e => {
        const taskId = parseInt($(e.currentTarget).data('task-id'));
        const task = tasks[formatDate(selectedDate)]?.find(t => t.id === taskId);
        if (task) showTaskDetails(task);
    }).on('click', '#prev-month, #next-month', e => {
        currentDate.setMonth(currentDate.getMonth() + ($(e.currentTarget).is('#prev-month') ? -1 : 1));
        renderCalendar();
    }).on('click', '#today-btn', () => {
        currentDate = selectedDate = new Date();
        renderCalendar();
    }).on('click', '#add-task-btn', () => {
        $('#taskForm')[0].reset();
        $('#taskId').val('');
        $('#taskDate').val(formatDate(selectedDate));
        $('#modalTitle').text('Add New Task');
        taskModal.show();
    }).on('click', '#edit-task-btn', () => {
        if (!selectedTask) return alert("No task selected.");
        openEditOptions(selectedTask.id, formatDate(selectedDate));
    }).on('click', '#editTaskDetailsBtn', () => {
        const { taskId, taskDate } = $('#editOptionsModal').data();
        const task = tasks[taskDate].find(t => t.id == taskId);
        if (task) populateTaskForm(task, taskDate, 'Edit Task');
        $('#editOptionsModal').modal('hide');
        taskModal.show();
    }).on('click', '#delete-task-btn', async () => {
        if (!selectedTask || !confirm('Delete this task?')) return;
        const dateStr = formatDate(selectedDate);
        tasks[dateStr] = tasks[dateStr].filter(t => t.id !== selectedTask.id);
        await saveTasks(dateStr, tasks[dateStr]);
        selectedTask = null;
        renderCalendar();
    }).on('click', '#markCompletedBtn', async () => {
        const { taskId, taskDate } = $('#editOptionsModal').data();
        const task = tasks[taskDate].find(t => t.id == taskId);
        if (task) {
            task.completed = true;
            task.history.unshift({ date: new Date().toISOString(), action: 'Marked as completed', changes: { completed: { old: false, new: true } } });
            await saveTasks(taskDate, tasks[taskDate]);
            renderCalendar();
            $('#editOptionsModal').modal('hide');
            showTaskDetails(task);
        }
    }).on('click', '#openFollowUpModalBtn', () => {
        $('#originalTaskId').val($('#editOptionsModal').data('task-id'));
        $('#followUpModal').modal('show');
        $('#editOptionsModal').modal('hide');
    });

    // Helper Functions
    const openEditOptions = (taskId, taskDate) => {
        $('#editOptionsModal').data({ 'task-id': taskId, 'task-date': taskDate }).modal('show');
    };

    const populateTaskForm = (task, taskDate, modalTitle) => {
        $('#modalTitle').text(modalTitle);
        $('#taskId').val(task.id);
        $('#taskDate').val(taskDate);
        $('#personName').val(task.personName);
        $('#taskTitle').val(task.title);
        $('#taskStartTime').val(task.time?.start || '');
        $('#taskEndTime').val(task.time?.end || '');
        $('#taskType').val(task.type);
        $('#taskDescription').val(task.description || '');
        $('#taskCompleted').prop('checked', task.completed);
    };
});