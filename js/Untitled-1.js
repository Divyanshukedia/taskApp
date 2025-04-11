import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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
const storage = getStorage(app);

$(document).ready(function() {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let currentDate = new Date();
    let selectedDate = new Date();
    let selectedTask = null;
    let tasks = {};
    let currentUser = null;
    const taskModal = new bootstrap.Modal('#taskModal');

    // Handle authentication state changes
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            $('#login-section').addClass('d-none');
            $('#app-container').removeClass('d-none');
            loadUserTasks();
            $('#login-form')[0].reset();
        } else {
            currentUser = null;
            $('#login-section').removeClass('d-none');
            $('#app-container').addClass('d-none');
            tasks = {};
            selectedTask = null;
        }
    });

    // Render the calendar
    const renderCalendar = () => {
        const year = currentDate.getFullYear(), month = currentDate.getMonth();
        $('#current-month').text(`${monthNames[month]} ${year}`);
        
        let date = 1, calendarBody = '', firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
        
        for (let i = 0; i < 6; i++) {
            calendarBody += '<tr>';
            for (let j = 0; j < 7; j++) {
                if (i === 0 && j < firstDay || date > daysInMonth) {
                    calendarBody += '<td class="calendar-day empty"></td>';
                } else {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                    const isToday = isSameDay(new Date(year, month, date), new Date());
                    const isSelected = isSameDay(new Date(year, month, date), selectedDate);
                    const hasTasks = tasks[dateStr]?.length > 0;
                    
                    calendarBody += `<td class="calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasTasks ? 'has-tasks' : ''}" data-date="${dateStr}">
                        <div class="day-number">${date}</div></td>`;
                    date++;
                }
            }
            calendarBody += '</tr>';
            if (date > daysInMonth) break;
        }
        $('#calendar-body').html(calendarBody);
        updateTasksPanel();
    };

    // Delete task from Firestore
    const deleteTaskFromFirestore = async (date, taskId) => {
        if (!currentUser) return;
        
        const tasksRef = doc(db, 'users', currentUser.uid, 'tasks', date);
        try {
            const docSnap = await getDoc(tasksRef);
            if (docSnap.exists()) {
                const updatedTasks = docSnap.data().items.filter(t => t.id !== taskId);
                await setDoc(tasksRef, { items: updatedTasks });
            }
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };
    
    // Utility functions
    const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // Update tasks panel
    const updateTasksPanel = () => {
        const dateStr = formatDate(selectedDate), dateTasks = tasks[dateStr] || [];
        $('#tasks-date').text(`Tasks for ${selectedDate.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'})}`);
        
        if (dateTasks.length === 0) {
            $('#no-tasks-message').removeClass('d-none');
            $('#tasks-list').empty();
        } else {
            $('#no-tasks-message').addClass('d-none');
            $('#tasks-list').html(dateTasks.map(task => `
                <li class="task-item p-3 mb-2 bg-white rounded shadow-sm ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div><span class="priority-${task.priority || 'low'} task-priority"></span><strong>${task.title}</strong></div>
                        <small class="text-muted">${task.time?.start ? `${task.time.start} - ${task.time.end}` : 'All day'}</small>
                    </div>
                    ${task.description ? `<p class="mt-2 mb-0 text-muted small">${task.description}</p>` : ''}
                </li>
            `).join(''));
        }
        $('#task-details').toggleClass('d-none', !selectedTask);
    };
    
    // Show task details with follow-ups
    const showTaskDetails = task => {
        selectedTask = task;
        $('#task-detail-title').text(task.title);
        $('#task-description').html(
            task.description ? 
            `<p>${task.description}</p>` : 
            '<p class="text-muted">No description provided.</p>'
        );
        
        $('#task-time').text(
            task.time?.start ? 
            `${formatDate(selectedDate)}, ${task.time.start} - ${task.time.end}` : 
            'All day'
        );
        const statusBadge = $('#task-status-badge');
        statusBadge.removeClass('bg-success bg-secondary').addClass(task.completed ? 'bg-success' : 'bg-secondary').text(task.completed ? 'Completed' : 'Pending');
        
        // Update history display
        $('#history-list').html(task.history?.length > 0 ? `
            <div class="task-history-container">
                <table class="task-history-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Action</th>
                            <th>Field</th>
                            <th>Old Value</th>
                            <th>New Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${task.history.map(entry => 
                            Object.entries(entry.changes || {}).map(([field, change], index) => `
                                <tr>
                                    ${index === 0 ? `
                                        <td rowspan="${Object.keys(entry.changes).length}">
                                            ${new Date(entry.date).toLocaleString()}
                                        </td>
                                        <td rowspan="${Object.keys(entry.changes).length}">
                                            ${entry.action}
                                        </td>
                                    ` : ''}
                                    <td>${field}</td>
                                    <td>${change.old ? `<span class="history-change-old">${change.old}</span>` : ''}</td>
                                    <td><span class="history-change-new">${change.new}</span></td>
                                </tr>
                            `).join('')
                        ).join('')}
                    </tbody>
                </table>
            </div>
        ` : '<div class="text-muted small">No history available</div>');

        // Display follow-up tasks
        const followUps = task.followUps || [];
        $('#follow-up-list').html(followUps.length > 0 ? `
            <div class="follow-up-container mt-3">
                <h6>Follow-up Tasks:</h6>
                <ul class="list-group">
                    ${followUps.map(followUp => {
                        const followUpTask = tasks[followUp.date]?.find(t => t.id === followUp.id);
                        return followUpTask ? `
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <span>${followUpTask.title} (${followUp.date})</span>
                                <span class="badge ${followUpTask.completed ? 'bg-success' : 'bg-secondary'}">
                                    ${followUpTask.completed ? 'Completed' : 'Pending'}
                                </span>
                            </li>
                        ` : '';
                    }).join('')}
                </ul>
            </div>
        ` : '<div class="text-muted small mt-3">No follow-up tasks.</div>');

        $('#task-details').removeClass('d-none');
    };

    // Save tasks to Firestore
    const saveTasksForDate = async (date) => {
        if (!currentUser) return;
        
        const tasksRef = doc(db, 'users', currentUser.uid, 'tasks', date);
        try {
            const tasksToSave = tasks[date] || [];
            await setDoc(tasksRef, { items: tasksToSave }, { merge: false });
            console.log(`Tasks saved for ${date}:`, tasksToSave);
        } catch (error) {
            console.error("Error saving tasks:", error);
        }
    };
    
    // Save task handler
    $('#saveTaskBtn').click(async () => {
        console.log('Save Task button clicked.');
        const taskId = $('#taskId').val();
        const taskDate = $('#taskDate').val();
        const personName = $('#personName').val();
        const title = $('#taskTitle').val();
        const startTime = $('#taskStartTime').val();
        const endTime = $('#taskEndTime').val();
        const type = $('#taskType').val();
        const description = $('#taskDescription').val();
        const completed = $('#taskCompleted').is(':checked');

        if (!title) return alert('Title is required');
        if (!personName) return alert('Person Name is required');

        const taskData = {
            id: taskId ? parseInt(taskId) : Date.now(),
            personName,
            title,
            time: { start: startTime, end: endTime },
            description,
            type,
            completed,
            history: []
        };

        const changes = {};
        if (!tasks[taskDate]) tasks[taskDate] = [];

        if (taskId) {
            const existingIndex = tasks[taskDate].findIndex(t => t.id == taskId);
            const oldTask = tasks[taskDate][existingIndex];
            if (oldTask) {
                taskData.history = oldTask.history || [];
                taskData.followUps = oldTask.followUps || [];

                if (oldTask.personName !== personName) changes.personName = { old: oldTask.personName, new: personName };
                if (oldTask.title !== title) changes.title = { old: oldTask.title, new: title };
                if (oldTask.type !== type) changes.type = { old: oldTask.type, new: type };
                if (oldTask.time.start !== startTime || oldTask.time.end !== endTime) {
                    changes.time = {
                        old: `${oldTask.time.start || ''} - ${oldTask.time.end || ''}`,
                        new: `${startTime} - ${endTime}`
                    };
                }
                if (oldTask.description !== description) {
                    changes.description = { 
                        old: oldTask.description || 'No description', 
                        new: description || 'No description'
                    };
                }
                if (oldTask.completed !== completed) changes.completed = { old: oldTask.completed, new: completed };

                if (Object.keys(changes).length > 0) {
                    taskData.history.unshift({
                        date: new Date().toISOString(),
                        action: 'Task updated',
                        changes
                    });
                }
                tasks[taskDate][existingIndex] = taskData;
            }
        } else {
            taskData.history.push({
                date: new Date().toISOString(),
                action: 'Task created',
                changes: {
                    personName: { new: personName },
                    title: { new: title },
                    type: { new: type },
                    time: { new: `${startTime} - ${endTime}` },
                    description: { new: description || 'No description' }
                }
            });
            tasks[taskDate].push(taskData);
        }

        await saveTasksForDate(taskDate);
        $('#taskModal').modal('hide');
        renderCalendar();

        const savedTask = tasks[taskDate].find(t => t.id == taskData.id);
        if (savedTask) showTaskDetails(savedTask);

        $('#taskForm')[0].reset();
        $('#taskId').val('');
        $('#modalTitle').text('Add New Task');
        $('#saveTaskBtn').text('Save Task');
    });
    
    // Open edit options modal
    function openEditOptions(taskId, taskDate) {
        $('#editOptionsModal').data('task-id', taskId);
        $('#editOptionsModal').data('task-date', taskDate);
        $('#editOptionsModal').modal('show');
    }
    
    // Mark as completed
    $('#markCompletedBtn').click(async () => {
        const taskId = $('#editOptionsModal').data('task-id');
        const taskDate = $('#editOptionsModal').data('task-date');
    
        const task = tasks[taskDate].find(t => t.id == taskId);
        if (task) {
            task.completed = true;
            task.history = task.history || [];
            task.history.unshift({
                date: new Date().toISOString(),
                action: 'Marked as completed',
                changes: { completed: { old: false, new: true } }
            });
            await saveTasksForDate(taskDate);
            renderCalendar();
            $('#editOptionsModal').modal('hide');
            showTaskDetails(task);
        }
    });
    
    // Open follow-up modal
    $('#openFollowUpModalBtn').click(() => {
        const taskId = $('#editOptionsModal').data('task-id');
        $('#originalTaskId').val(taskId);
        $('#followUpModal').modal('show');
        $('#editOptionsModal').modal('hide');
    });
    
    // Save follow-up task (Updated to include more details in original task history)
    $('#saveFollowUpBtn').click(async () => {
        const taskId = $('#originalTaskId').val();
        const personName = $('#followPersonName').val();
        const title = $('#followTitle').val();
        const startTime = $('#followStartTime').val();
        const endTime = $('#followEndTime').val();
        const type = $('#followType').val();
        const description = $('#followDescription').val();
        const taskDate = $('#followUpDate').val();
      
        if (!title || !personName || !taskDate) {
            return alert('Please fill all required fields.');
        }
      
        const newTaskId = Date.now();
      
        const followUpTask = {
            id: newTaskId,
            personName,
            title,
            time: { start: startTime, end: endTime },
            type,
            description,
            completed: false,
            followUpFrom: taskId,
            history: [{
                date: new Date().toISOString(),
                action: 'Follow-up created',
                changes: {
                    personName: { new: personName },
                    title: { new: title },
                    type: { new: type },
                    time: { new: `${startTime} - ${endTime}` },
                    description: { new: description || 'No description' },
                    followUpFrom: { new: taskId }
                }
            }]
        };
      
        if (!tasks[taskDate]) tasks[taskDate] = [];
        tasks[taskDate].push(followUpTask);
      
        const allDates = Object.keys(tasks);
        let originalTaskFound = false;
      
        for (const date of allDates) {
            const index = tasks[date].findIndex(t => t.id == taskId);
            if (index !== -1) {
                const originalTask = tasks[date][index];
                originalTask.history = originalTask.history || [];
                // Enhanced history entry with follow-up details
                originalTask.history.unshift({
                    date: new Date().toISOString(),
                    action: 'Follow-up created',
                    changes: {
                        followUpId: { new: newTaskId },
                        followUpTitle: { new: title },
                        followUpDate: { new: taskDate },
                        followUpTime: { new: `${startTime} - ${endTime}` }
                    }
                });
                if (!originalTask.followUps) originalTask.followUps = [];
                originalTask.followUps.push({ id: newTaskId, date: taskDate });
                tasks[date][index] = originalTask;
                await saveTasksForDate(date);
                originalTaskFound = true;
                break;
            }
        }
      
        if (!originalTaskFound) {
            console.warn(`Original task with ID ${taskId} not found in any date group.`);
        }
      
        await saveTasksForDate(taskDate);
        renderCalendar();
      
        $('#followUpForm')[0].reset();
        $('#originalTaskId').val('');
        $('#followUpModal').modal('hide');

        // Show details of the original task to reflect the new follow-up
        const originalTaskDate = Object.keys(tasks).find(date => tasks[date].some(t => t.id == taskId));
        const originalTask = tasks[originalTaskDate]?.find(t => t.id == taskId);
        if (originalTask) showTaskDetails(originalTask);
    });
    
    // Edit task details
    $(document).on('click', '#editTaskDetailsBtn', () => {
        const taskId = $('#editOptionsModal').data('task-id');
        const taskDate = $('#editOptionsModal').data('task-date');
        const task = tasks[taskDate].find(t => t.id == taskId);

        if (task) {
            $('#modalTitle').text('Edit Task');
            $('#taskId').val(task.id);
            $('#taskDate').val(taskDate);
            $('#personName').val(task.personName);
            $('#taskTitle').val(task.title);
            $('#taskStartTime').val(task.time?.start || '');
            $('#taskEndTime').val(task.time?.end || '');
            $('#taskType').val(task.type);
            $('#taskDescription').val(task.description || '');
            $('#taskCompleted').prop('checked', task.completed);

            $('#editOptionsModal').modal('hide');
            taskModal.show();
        }
    });

    // Delete task
    $(document).on('click', '#delete-task-btn', async () => {
        if (!selectedTask || !confirm('Delete this task?')) return;
        const dateStr = formatDate(selectedDate);
        tasks[dateStr] = tasks[dateStr].filter(t => t.id !== selectedTask.id);
        await deleteTaskFromFirestore(dateStr, selectedTask.id);
        selectedTask = null;
        renderCalendar();
    });
    
    // Task item click
    $(document).on('click', '.task-item', function() {
        const taskId = parseInt($(this).data('task-id'));
        const task = tasks[formatDate(selectedDate)]?.find(t => t.id === taskId);
        if (task) showTaskDetails(task);
    });

    // Calendar navigation
    $(document).on('click', '#prev-month, #next-month', async () => {
        currentDate.setMonth(currentDate.getMonth() + ($(this).is('#prev-month') ? -1 : 1));
        renderCalendar();
    });
    
    $(document).on('click', '#today-btn', async () => {
        currentDate = new Date();
        selectedDate = new Date();
        renderCalendar();
    });
    
    $(document).on('click', '.calendar-day:not(.empty)', function() {
        selectedDate = new Date($(this).data('date'));
        selectedTask = null;
        renderCalendar();
    });

    // Load user tasks from Firestore
    const loadUserTasks = () => {
        if (!auth.currentUser) return;
        
        const tasksRef = collection(db, 'users', auth.currentUser.uid, 'tasks');
        onSnapshot(tasksRef, (snapshot) => {
            tasks = {};
            snapshot.forEach(doc => {
                const date = doc.id;
                tasks[date] = doc.data().items || [];
            });
            renderCalendar();
        });
    };

    // Add task button
    $(document).on('click', '#add-task-btn', async () => {
        $('#modalTitle').text('Add New Task');
        $('#taskForm')[0].reset();
        $('#taskId').val('');
        $('#taskDate').val(formatDate(selectedDate));
        taskModal.show();
    });

    // Edit task button
    $(document).on('click', '#edit-task-btn', () => {
        if (!selectedTask) {
            alert("No task selected.");
            return;
        }
        const taskId = selectedTask.id;
        const taskDate = formatDate(selectedDate);
        openEditOptions(taskId, taskDate);
    });
});