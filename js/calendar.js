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
    let currentDate = new Date(), selectedDate = new Date(), selectedTask = null;
    let tasks = {};
    let currentUser = null;
    let userProfileData = {};
    const taskModal = new bootstrap.Modal('#taskModal');
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            $('#login-section').addClass('d-none');
            $('#app-container').removeClass('d-none');
            
            // // Load user profile data
            // await loadUserProfile();
            
            // // Update profile section
            // updateProfileDisplay();
            
            loadUserTasks();
            // Clear login form
            $('#login-form')[0].reset();
        } else {
            currentUser = null;
            $('#login-section').removeClass('d-none');
            $('#app-container').addClass('d-none');
            // Clear all task data
            tasks = {};
            selectedTask = null;
        }
    });
    // Calendar rendering
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
    
    const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
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
                        <div><span class="priority-${task.priority} task-priority"></span><strong>${task.title}</strong></div>
                        <small class="text-muted">${task.time || 'All day'}</small>
                    </div>
                    ${task.description ? `<p class="mt-2 mb-0 text-muted small">${task.description}</p>` : ''}
                </li>
            `).join(''));
        }
        $('#task-details').toggleClass('d-none', !selectedTask);
    };
    
    const showTaskDetails = task => {
        selectedTask = task;
        $('#task-detail-title').text(task.title);
        $('#task-description').html(
            task.description ? 
            `<p>${task.description}</p>` : 
            '<p class="text-muted">No description provided.</p>'
        );
        
        $('#task-time').text(
            task.time.start ? 
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
        
        $('#task-details').removeClass('d-none');
    };

    const saveTasksForDate = async (date) => {
        if (!currentUser) return;
        
        const tasksRef = doc(db, 'users', currentUser.uid, 'tasks', date);
        try {
            await setDoc(tasksRef, { items: tasks[date] || [] });
        } catch (error) {
            console.error("Error saving tasks:", error);
        }
    };
    
    $('#saveTaskBtn').click(async () => {
      const id = $('#taskId').val();
      const personName = $('#personName').val();
      const title = $('#taskTitle').val();
      const startTime = $('#taskStartTime').val();
      const endTime = $('#taskEndTime').val();
      const type = $('#taskType').val();
      const description = $('#taskDescription').val();
      const date = $('#taskDate').val();
    
      if (!title || !personName || !date) {
        return alert('Please fill all required fields.');
      }
    
      const task = {
        id: id ? parseInt(id) : Date.now(),
        personName,
        title,
        time: { start: startTime, end: endTime },
        type,
        description,
        completed: false,
        history: []
      };
    
      const taskDate = date;
    
      if (!tasks[taskDate]) tasks[taskDate] = [];
    
      if (id) {
        const index = tasks[taskDate].findIndex(t => t.id == id);
        if (index !== -1) {
          const oldTask = tasks[taskDate][index];
          const changes = {};
      
          // Compare fields to detect changes
          if (oldTask.title !== title) changes.title = { old: oldTask.title, new: title };
          if (oldTask.personName !== personName) changes.personName = { old: oldTask.personName, new: personName };
          if ((oldTask.time?.start || '') !== startTime || (oldTask.time?.end || '') !== endTime)
            changes.time = { old: `${oldTask.time?.start || ''}-${oldTask.time?.end || ''}`, new: `${startTime}-${endTime}` };
          if (oldTask.type !== type) changes.type = { old: oldTask.type, new: type };
          if (oldTask.description !== description) changes.description = { old: oldTask.description, new: description };
      
          task.history = oldTask.history || [];
      
          if (Object.keys(changes).length > 0) {
            task.history.push({
              date: new Date().toISOString(),
              action: 'Updated',
              changes
            });
          }
      
          tasks[taskDate][index] = task;
        }
      }
       else {
        tasks[taskDate].push(task);
      }
    
      await saveTasksForDate(taskDate);
      renderCalendar();
      $('#taskModal').modal('hide');
    });
    
    // Show Edit Options Modal
    function openEditOptions(taskId, taskDate) {
      $('#editOptionsModal').data('task-id', taskId);
      $('#editOptionsModal').data('task-date', taskDate);
      console.log('Task ID:', taskId, 'Task Date:', taskDate);
      console.log('openEditOptions called with taskId:', taskId, 'and taskDate:', taskDate);
      $('#editOptionsModal').modal('show');
    }
    
    // Mark as Completed
    $('#markCompletedBtn').click(async () => {
      const taskId = $('#editOptionsModal').data('task-id');
      const taskDate = $('#editOptionsModal').data('task-date');
    
      const task = tasks[taskDate].find(t => t.id == taskId);
      if (task) {
        task.completed = true;
        task.history.push({
          date: new Date().toISOString(),
          action: 'Marked as completed'
        });
        await saveTasksForDate(taskDate);
        renderCalendar();
        $('#editOptionsModal').modal('hide');
        showTaskDetails(task);
      }
    });
    
    // Open Follow-up Modal
    $('#openFollowUpModalBtn').click(() => {
      const taskId = $('#editOptionsModal').data('task-id');
      $('#originalTaskId').val(taskId);
      $('#followUpModal').modal('show');
      $('#editOptionsModal').modal('hide');
    });
    
    // Save Follow-up Task
    $('#saveFollowUpBtn').click(async () => {
      const originalTaskId = $('#originalTaskId').val();
      const personName = $('#followPersonName').val();
      const title = $('#followTitle').val();
      const startTime = $('#followStartTime').val();
      const endTime = $('#followEndTime').val();
      const type = $('#followType').val();
      const description = $('#followDescription').val();
      const followUpDate = $('#followUpDate').val();
    
      if (!title || !personName || !followUpDate) {
        return alert('Please fill all required fields.');
      }
    
      const task = {
        id: Date.now(),
        personName,
        title,
        time: { start: startTime, end: endTime },
        type,
        description,
        completed: false,
        history: [{
          date: new Date().toISOString(),
          action: `Follow-up created from task ${originalTaskId}`
        }]
      };
    
      if (!tasks[followUpDate]) tasks[followUpDate] = [];
      tasks[followUpDate].push(task);
      await saveTasksForDate(followUpDate);
      renderCalendar();
      $('#followUpModal').modal('hide');
    });
    
    $(document).on('click', '#delete-task-btn', async () => {
        if (!selectedTask || !confirm('Delete this task?')) return;
        const dateStr = formatDate(selectedDate);
        tasks[dateStr] = tasks[dateStr].filter(t => t.id !== selectedTask.id);
        await deleteTaskFromFirestore(dateStr, selectedTask.id);
        selectedTask = null;
        renderCalendar();
    });
    
    $(document).on('click', '.task-item', function() {
        const taskId = parseInt($(this).data('task-id'));
        const task = tasks[formatDate(selectedDate)]?.find(t => t.id === taskId);
        if (task) showTaskDetails(task);
    });
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
    // Event handlers
    $(document).on('click', '#add-task-btn', async () => {
        $('#modalTitle').text('Add New Task');
        $('#taskForm')[0].reset();
        $('#taskId').val('');
        $('#taskDate').val(formatDate(selectedDate));
        taskModal.show();
    });

    $(document).on('click', '#edit-task-btn', () => {
        if (!selectedTask) {
          alert("No task selected. (Simulate selection for demo)");
          return;
        }
        const taskId = selectedTask.id;
        const taskDate = selectedDate.toISOString().split('T')[0];
        
        openEditOptions(taskId, taskDate);
      });
  
      $('#markCompletedBtn').click(() => {
        selectedTask.completed = true;
        alert("Marked as completed.");
        $('#editOptionsModal').modal('hide');
        renderCalendar();
      });
  
      $('#openFollowUpModalBtn').click(() => {
        $('#editOptionsModal').modal('hide');
        $('#followUpForm')[0].reset();
        $('#originalTaskId').val(selectedTask.id);
        $('#followUpModal').modal('show');
      });
      onAuthStateChanged(auth, (user) => {
        if (user) {
            loadUserTasks();
        }
    });
});

