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
    let tasks = {};

    // Function to render all tasks
    const renderAllTasks = () => {
        const container = $('#all-tasks-container');
        container.empty();

        if (!auth.currentUser || !tasks || Object.keys(tasks).length === 0) {
            container.html('<div class="alert alert-info">No tasks found</div>');
            return;
        }

        // Sort dates in descending order
        Object.keys(tasks)
            .sort((a, b) => new Date(b) - new Date(a))
            .forEach(date => {
                const dateTasks = tasks[date];
                if (!dateTasks.length) return;
                
                const dateHeader = $(`
                    <div class="task-date-group">
                        <div class="task-date-header">
                            ${new Date(date).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </div>
                    </div>
                `);
                
                dateTasks.forEach(task => {
                    dateHeader.append(createTaskElement(task, date));
                });
                
                container.append(dateHeader);
            });
    };

    const createTaskElement = (task, date) => {
        return $(`
            <div class="task-item p-3 mb-3 bg-white rounded shadow-sm ${task.completed ? 'completed' : ''}">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <span class="priority-${task.priority} task-priority"></span>
                        <strong>${task.title}</strong>
                        <span class="badge ms-2 ${task.completed ? 'bg-success' : 'bg-secondary'}">
                            ${task.completed ? 'Completed' : 'Pending'}
                        </span>
                    </div>
                    <small class="text-muted">${task.time || 'All day'}</small>
                </div>
                ${task.description ? `<p class="mt-2 mb-2">${task.description}</p>` : ''}
                ${renderTaskHistory(task.history)}
            </div>
        `);
    };

    const renderTaskHistory = (history = []) => {
        if (!history.length) return '<div class="text-muted small mt-2">No history available</div>';
        
        return `
            <div class="task-history mt-3">
                <h6 class="small"><i class="fas fa-history me-1"></i>History</h6>
                ${history.map(entry => `
                    <div class="task-history-item small mt-2">
                        <div class="task-history-date">
                            ${new Date(entry.date).toLocaleString()}
                            <span class="ms-2 fw-bold">${entry.action}</span>
                        </div>
                        ${entry.changes ? Object.entries(entry.changes).map(([field, change]) => `
                            <div class="history-change mt-1">
                                <strong>${field}:</strong>
                                ${change.old ? `<div class="history-change-old">Was: ${change.old}</div>` : ''}
                                <div class="history-change-new">Now: ${change.new}</div>
                            </div>
                        `).join('') : ''}
                    </div>
                `).join('')}
            </div>
        `;
    };

    // Load tasks when tasks page is shown
    $(document).on('click', '.nav-link[data-page="tasks"]', function() {
        loadAllTasks();
    });

    const loadAllTasks = async () => {
        if (!auth.currentUser) return;
        
        const tasksRef = collection(db, 'users', auth.currentUser.uid, 'tasks');
        const querySnapshot = await getDocs(tasksRef);
        
        tasks = {};
        querySnapshot.forEach(doc => {
            tasks[doc.id] = doc.data().items || [];
        });
        
        renderAllTasks();
    };

    // Add task button from tasks page
    $(document).on('click', '#add-task-global-btn', async () => {
        $('#modalTitle').text('Add New Task');
        $('#taskForm')[0].reset();
        $('#taskId').val('');
        $('#taskDate').val(formatDate(new Date())); // Default to today
        taskModal.show();
    });
});